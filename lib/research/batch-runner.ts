/**
 * Batch Runner
 *
 * Manages batch execution of multiple simulation runs with:
 * - Concurrency control (run N simulations at once)
 * - Checkpoint/resume for long experiments
 * - Progress tracking and reporting
 * - Error handling and retry logic
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ResearchConfig } from './config-resolver';
import type {
  ExperimentConfig,
  RunResult,
  ExperimentSummary,
  CityBaseConfig,
  CityScenarioConfig,
} from './experiment-config';
import { canonicalJson, sha256 } from './campaign-manifest';
import { ExperimentRunner, type ProgressCallback } from './experiment-runner';
import { WorkerPool } from './worker-pool';
import type { WorkerTask } from './simulation-worker';
import { assertFiniteRunResults } from './metric-validation';
import { buildStableRunId } from './run-identity';
import { campaignConditionId } from './condition-identity';

// =============================================================================
// TYPES
// =============================================================================

export interface BatchConfig {
  // Maximum concurrent simulations (default: 1 for sequential)
  concurrency: number;

  // Checkpoint settings
  checkpointDir?: string;
  checkpointInterval?: number; // Save checkpoint every N runs

  // Retry settings
  maxRetries: number;
  retryDelayMs: number;

  // Timeout per run (0 = no timeout)
  runTimeoutMs: number;
}

export interface BatchProgress {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  inProgressRuns: number;
  currentSweepValue?: number | string | boolean;
  percentComplete: number;
  estimatedRemainingMs?: number;
  runsPerSecond: number;
}

export type BatchProgressCallback = (progress: BatchProgress) => void;

export interface BatchCheckpoint {
  experimentName: string;
  configHash: string;
  totalRuns: number;
  completedRunIds: string[];
  completedResults: RunResult[];
  failedRunIds: string[];
  timestamp: string;
}

export interface RunTask {
  id: string;
  daoConfig: ResearchConfig | { baseCityConfig: CityBaseConfig; scenario: CityScenarioConfig };
  sweepValue?: number | string | boolean;
  runIndex: number;
  seed: number;
  stepsPerRun: number;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  concurrency: 1,
  checkpointInterval: 10,
  maxRetries: 2,
  retryDelayMs: 100,
  runTimeoutMs: 60000, // 1 minute per run
};

const CHECKPOINT_REPLACE_RETRY_DELAYS_MS = [25, 50, 100, 200, 400, 800, 1600];
const TRANSIENT_CHECKPOINT_REPLACE_CODES = new Set(['EACCES', 'EBUSY', 'EPERM']);
let checkpointTemporarySequence = 0;

function isTransientCheckpointReplaceError(error: unknown): boolean {
  return (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && TRANSIENT_CHECKPOINT_REPLACE_CODES.has(String(error.code))
  );
}

async function replaceCheckpointFile(
  temporaryPath: string,
  checkpointPath: string
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.promises.rename(temporaryPath, checkpointPath);
      return;
    } catch (error) {
      const delayMs = CHECKPOINT_REPLACE_RETRY_DELAYS_MS[attempt];
      if (!isTransientCheckpointReplaceError(error) || delayMs === undefined) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Checkpoint persistence failed after ${attempt + 1} replace attempts: ${detail}`,
          { cause: error }
        );
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

async function removeCheckpointFile(checkpointPath: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.promises.unlink(checkpointPath);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      const delayMs = CHECKPOINT_REPLACE_RETRY_DELAYS_MS[attempt];
      if (!isTransientCheckpointReplaceError(error) || delayMs === undefined) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Checkpoint cleanup failed after ${attempt + 1} remove attempts: ${detail}`,
          { cause: error }
        );
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

// =============================================================================
// BATCH RUNNER CLASS
// =============================================================================

export class BatchRunner {
  private experimentConfig: ExperimentConfig;
  private batchConfig: BatchConfig;
  private progressCallback?: BatchProgressCallback;

  // State tracking
  private completedResults: RunResult[] = [];
  private failedRunIds: Set<string> = new Set();
  private startTime: number = 0;
  private completedCount: number = 0;
  private checkpointWrite: Promise<void> = Promise.resolve();

  constructor(
    experimentConfig: ExperimentConfig,
    batchConfig: Partial<BatchConfig> = {},
    progressCallback?: BatchProgressCallback
  ) {
    this.experimentConfig = experimentConfig;
    this.batchConfig = { ...DEFAULT_BATCH_CONFIG, ...batchConfig };
    this.progressCallback = progressCallback;
  }

  /**
   * Run the batch experiment with concurrency control
   */
  async run(): Promise<BatchResult> {
    this.startTime = Date.now();
    this.completedResults = [];
    this.failedRunIds.clear();
    this.completedCount = 0;

    // Generate all run tasks
    const tasks = this.generateTasks();
    const totalRuns = tasks.length;

    // Check for existing checkpoint
    const checkpoint = await this.loadCheckpoint();
    let completedIds = new Set<string>();

    if (checkpoint) {
      // Resume from checkpoint
      this.completedResults = checkpoint.completedResults;
      this.completedCount = checkpoint.completedResults.length;
      checkpoint.failedRunIds.forEach((id) => this.failedRunIds.add(id));

      // Find where to resume
      completedIds = new Set(checkpoint.completedRunIds);

      console.log(`Resuming from checkpoint: ${this.completedCount}/${totalRuns} completed`);
    }

    // Run tasks with concurrency control
    const remainingTasks = tasks.filter(task => !completedIds.has(task.id));
    await this.runTasksWithConcurrency(remainingTasks, totalRuns);

    // Sort results by the canonical task plan for deterministic ordering.
    const taskOrder = new Map(tasks.map((task, index) => [task.id, index]));
    this.completedResults.sort(
      (a, b) =>
        (taskOrder.get(a.runId) ?? Number.MAX_SAFE_INTEGER) -
        (taskOrder.get(b.runId) ?? Number.MAX_SAFE_INTEGER)
    );

    // Generate summary
    const endTime = Date.now();
    const summary = this.generateSummary(totalRuns, endTime);

    // Clean up checkpoint on success
    if (this.failedRunIds.size === 0) {
      await this.deleteCheckpoint();
    }

    return {
      results: this.completedResults,
      summary,
      failedRunIds: Array.from(this.failedRunIds),
    };
  }

  /**
   * Generate all run tasks
   */
  generateTasks(): RunTask[] {
    const runner = new ExperimentRunner(this.experimentConfig);
    const configs = runner.generateConfigs();

    const tasks: RunTask[] = [];
    for (const { daoConfig, sweepValue } of configs) {
      for (let i = 0; i < this.experimentConfig.execution.runsPerConfig; i++) {
        // Common random numbers: replicate i uses the same seed in every
        // condition, enabling paired counterfactual estimates.
        const seed = runner.getSeedForRun(i, sweepValue);
        const runId = buildStableRunId(this.experimentConfig, sweepValue, i);
        const configuredHorizon = 'research_horizon_steps' in daoConfig
          ? Number(daoConfig.research_horizon_steps)
          : this.experimentConfig.execution.stepsPerRun;
        if (!Number.isSafeInteger(configuredHorizon) || configuredHorizon <= 0) {
          throw new Error(
            `Invalid research horizon for run ${runId}: expected a positive safe integer`
          );
        }

        tasks.push({
          id: runId,
          daoConfig,
          sweepValue,
          runIndex: i,
          seed,
          stepsPerRun: configuredHorizon,
        });
      }
    }

    return tasks;
  }

  /**
   * Run tasks with concurrency control
   * Uses Worker Threads for true CPU parallelism when concurrency > 1
   */
  private async runTasksWithConcurrency(tasks: RunTask[], totalRuns: number): Promise<void> {
    let { concurrency } = this.batchConfig;
    const { checkpointInterval } = this.batchConfig;

    if (this.experimentConfig.mode === 'city' && concurrency > 1) {
      concurrency = 1;
    }

    // Use Worker Threads for parallelism when concurrency > 1
    if (concurrency > 1) {
      await this.runTasksWithWorkerPool(tasks, totalRuns, concurrency);
      return;
    }

    // Sequential execution (concurrency = 1)
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const result = await this.runSingleTask(task);

      if (result.success && result.result) {
        this.completedResults.push(result.result);
        this.completedCount++;
        this.failedRunIds.delete(task.id);
      } else {
        this.failedRunIds.add(result.taskId);
      }

      // Report progress
      this.reportProgress(totalRuns);

      // Save checkpoint periodically
      if (checkpointInterval && (i + 1) % checkpointInterval === 0) {
        await this.saveCheckpoint(tasks.map((t) => t.id), totalRuns);
      }
    }
  }

  /**
   * Run tasks using Worker Thread pool for true CPU parallelism
   */
  private async runTasksWithWorkerPool(tasks: RunTask[], totalRuns: number, workerCount: number): Promise<void> {
    const { checkpointInterval } = this.batchConfig;
    if (this.experimentConfig.mode === 'city') {
      throw new Error('City experiments do not support worker pool execution');
    }

    // Create worker pool
    const pool = new WorkerPool({ workerCount });

    try {
      // Convert tasks to worker tasks
      const workerTasks: Omit<WorkerTask, 'taskId'>[] = tasks.map((task) => ({
        runId: task.id,
        conditionId: campaignConditionId(task.sweepValue, task.daoConfig),
        config: task.daoConfig as ResearchConfig,
        simConfig: {
          checkpointInterval: this.experimentConfig.baseConfig.simulationOverrides?.checkpointInterval,
          eventLogging: this.experimentConfig.baseConfig.simulationOverrides?.eventLogging,
        },
        seed: task.seed,
          stepsPerRun: task.stepsPerRun,
          learningEpisodesPerRun: this.experimentConfig.execution.learningEpisodesPerRun,
        metrics: this.experimentConfig.metrics,
        includeTimeline: this.experimentConfig.output.includeTimeline ?? false,
        timelineStride: this.experimentConfig.output.timelineStride,
        sweepValue: task.sweepValue,
        runIndex: task.runIndex,
        experimentName: this.experimentConfig.name,
      }));

      // Submit all tasks and track progress
      let checkpointCounter = 0;
      let checkpointFailure: unknown;
      const taskPromises = workerTasks.map(async (workerTask, index) => {
        let result: RunResult;
        try {
          result = await pool.submit(workerTask);
        } catch (error) {
          if (checkpointFailure !== undefined) {
            throw checkpointFailure;
          }
          console.error(`Task ${tasks[index].id} failed:`, (error as Error)?.message || error);
          if ((error as Error)?.stack) console.error((error as Error).stack);
          this.failedRunIds.add(tasks[index].id);
          this.reportProgress(totalRuns);
          return { success: false, taskId: tasks[index].id };
        }

        this.completedResults.push(result);
        this.completedCount++;
        this.failedRunIds.delete(tasks[index].id);

        // Report progress
        this.reportProgress(totalRuns);

        // Checkpoint persistence is infrastructure, not simulation execution.
        // A persistence failure must abort the batch rather than misclassify a
        // successfully simulated task as a failed scientific run.
        checkpointCounter++;
        if (checkpointInterval && checkpointCounter % checkpointInterval === 0) {
          try {
            await this.saveCheckpoint(tasks.map((t) => t.id), totalRuns);
          } catch (error) {
            checkpointFailure = error;
            await pool.forceShutdown();
            throw error;
          }
        }

        return { success: true, taskId: tasks[index].id, result };
      });

      // Wait for all tasks
      await Promise.all(taskPromises);

    } finally {
      // Always shutdown the pool
      await pool.shutdown();
    }
  }

  /**
   * Run a single task with retry logic
   */
  private async runSingleTask(task: RunTask): Promise<TaskResult> {
    const { maxRetries, retryDelayMs, runTimeoutMs } = this.batchConfig;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Run with timeout
        const result = await this.runWithTimeout(task, runTimeoutMs);
        return { success: true, taskId: task.id, result };
      } catch (error) {
        console.warn(`Task ${task.id} failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);

        if (attempt < maxRetries) {
          await this.delay(retryDelayMs);
        }
      }
    }

    return { success: false, taskId: task.id };
  }

  /**
   * Run a task with timeout
   */
  private async runWithTimeout(task: RunTask, timeoutMs: number): Promise<RunResult> {
    const runner = new ExperimentRunner(this.experimentConfig);

    if (timeoutMs <= 0) {
      return runner.runSingle(
        task.daoConfig,
        task.seed,
        task.sweepValue,
        task.runIndex,
        task.stepsPerRun,
      );
    }

    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Run timeout')), timeoutMs);
    });

    try {
      const result = await Promise.race([
        runner.runSingle(
          task.daoConfig,
          task.seed,
          task.sweepValue,
          task.runIndex,
          task.stepsPerRun,
        ),
        timeoutPromise,
      ]);
      clearTimeout(timer!);
      return result;
    } catch (err) {
      clearTimeout(timer!);
      throw err;
    }
  }

  /**
   * Report progress
   */
  private reportProgress(totalRuns: number): void {
    if (!this.progressCallback) return;

    const elapsed = Date.now() - this.startTime;
    const runsPerSecond = this.completedCount / (elapsed / 1000);
    const remainingRuns = totalRuns - this.completedCount - this.failedRunIds.size;
    const estimatedRemainingMs = remainingRuns > 0 ? (remainingRuns / runsPerSecond) * 1000 : 0;

    this.progressCallback({
      totalRuns,
      completedRuns: this.completedCount,
      failedRuns: this.failedRunIds.size,
      inProgressRuns: 0, // Would need more tracking for async
      percentComplete: ((this.completedCount + this.failedRunIds.size) / totalRuns) * 100,
      estimatedRemainingMs,
      runsPerSecond,
    });
  }

  /**
   * Generate experiment summary
   */
  private generateSummary(totalRuns: number, endTime: number): ExperimentSummary {
    const runner = new ExperimentRunner(this.experimentConfig);
    return runner.generateSummary(this.completedResults, this.startTime, this.failedRunIds.size);
  }

  /**
   * Get checkpoint file path
   */
  private getCheckpointPath(): string {
    const dir = this.batchConfig.checkpointDir || '.checkpoints';
    let safeName = this.experimentConfig.name
      .normalize('NFKC')
      .split('')
      .map((character) => character.charCodeAt(0) <= 31 ? '-' : character)
      .join('')
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/[. ]+$/g, '')
      .slice(0, 120);
    if (!safeName) safeName = 'experiment';
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(safeName)) {
      safeName = `experiment-${safeName}`;
    }
    const filename = `${safeName}.checkpoint.json`;
    return path.join(dir, filename);
  }

  /**
   * Save checkpoint
   */
  private async saveCheckpoint(allTaskIds: string[], totalRuns: number): Promise<void> {
    const expectedIds = new Set([
      ...allTaskIds,
      ...this.completedResults.map(result => result.runId),
    ]);
    const checkpointOperation = this.checkpointWrite.then(async () => {
      const checkpointPath = this.getCheckpointPath();
      const dir = path.dirname(checkpointPath);
      await fs.promises.mkdir(dir, { recursive: true });

      const completedResults = this.completedResults.filter(result =>
        expectedIds.has(result.runId)
      );
      assertFiniteRunResults(completedResults, 'Batch checkpoint export');
      const checkpoint: BatchCheckpoint = {
        experimentName: this.experimentConfig.name,
        configHash: `sha256:${sha256(canonicalJson(this.experimentConfig))}`,
        totalRuns,
        completedRunIds: completedResults.map(result => result.runId),
        completedResults,
        failedRunIds: Array.from(this.failedRunIds).filter(id => expectedIds.has(id)),
        timestamp: new Date().toISOString(),
      };
      const temporaryPath =
        `${checkpointPath}.${process.pid}.${checkpointTemporarySequence++}.tmp`;
      try {
        await fs.promises.writeFile(temporaryPath, JSON.stringify(checkpoint, null, 2));
        await replaceCheckpointFile(temporaryPath, checkpointPath);
      } finally {
        await fs.promises.unlink(temporaryPath).catch(error => {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        });
      }
    });
    // Keep the serialization tail recoverable. The caller still receives the
    // current failure, while a later explicit save is not chained to a
    // permanently rejected promise.
    this.checkpointWrite = checkpointOperation.catch(() => undefined);
    await checkpointOperation;
  }

  /**
   * Load checkpoint if exists
   */
  private async loadCheckpoint(): Promise<BatchCheckpoint | null> {
    const checkpointPath = this.getCheckpointPath();

    if (!fs.existsSync(checkpointPath)) {
      return null;
    }

    try {
      const content = await fs.promises.readFile(checkpointPath, 'utf8');
      const checkpoint = JSON.parse(content) as BatchCheckpoint;

      // Verify config hash matches
      const currentHash = `sha256:${sha256(canonicalJson(this.experimentConfig))}`;

      if (checkpoint.configHash !== currentHash) {
        throw new Error('Checkpoint configuration hash mismatch; refusing unsafe resume');
      }
      if (checkpoint.experimentName !== this.experimentConfig.name) {
        throw new Error('Checkpoint experiment name mismatch; refusing unsafe resume');
      }

      const expectedTasks = this.generateTasks();
      const expectedIds = new Set(expectedTasks.map(task => task.id));
      if (checkpoint.totalRuns !== expectedTasks.length) {
        throw new Error('Checkpoint run count mismatch; refusing unsafe resume');
      }
      if (new Set(checkpoint.completedRunIds).size !== checkpoint.completedRunIds.length) {
        throw new Error('Checkpoint contains duplicate completed run IDs');
      }
      if (checkpoint.completedRunIds.some(id => !expectedIds.has(id))) {
        throw new Error('Checkpoint contains a run outside the current task plan');
      }
      if (checkpoint.completedResults.some(result => !expectedIds.has(result.runId))) {
        throw new Error('Checkpoint contains a result outside the current task plan');
      }

      return checkpoint;
    } catch (error) {
      throw new Error(`Failed to load checkpoint safely: ${(error as Error).message}`);
    }
  }

  /**
   * Delete checkpoint file
   */
  private async deleteCheckpoint(): Promise<void> {
    const checkpointPath = this.getCheckpointPath();
    await removeCheckpointFile(checkpointPath);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// RESULT TYPES
// =============================================================================

interface TaskResult {
  success: boolean;
  taskId: string;
  result?: RunResult;
}

export interface BatchResult {
  results: RunResult[];
  summary: ExperimentSummary;
  failedRunIds: string[];
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Run a batch experiment with default settings
 */
export async function runBatch(
  experimentConfig: ExperimentConfig,
  options: {
    concurrency?: number;
    progressCallback?: BatchProgressCallback;
  } = {}
): Promise<BatchResult> {
  const runner = new BatchRunner(
    experimentConfig,
    { concurrency: options.concurrency ?? 1 },
    options.progressCallback
  );
  return runner.run();
}
