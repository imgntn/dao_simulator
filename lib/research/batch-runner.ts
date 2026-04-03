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
import { ExperimentRunner, type ProgressCallback } from './experiment-runner';
import { WorkerPool } from './worker-pool';
import type { WorkerTask } from './simulation-worker';

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

interface RunTask {
  id: string;
  daoConfig: ResearchConfig | { baseCityConfig: CityBaseConfig; scenario: CityScenarioConfig };
  sweepValue?: number | string | boolean;
  runIndex: number;
  seed: number;
}

function shortHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).slice(0, 8);
}

function compactSweepPart(sweepValue: string): string {
  const sanitized = sweepValue.replace(/[^a-zA-Z0-9._=-]+/g, '_');
  if (sanitized.length <= 80) {
    return sanitized;
  }
  return `sweep_${shortHash(sanitized)}`;
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
    let startIndex = 0;

    if (checkpoint) {
      // Resume from checkpoint
      this.completedResults = checkpoint.completedResults;
      this.completedCount = checkpoint.completedResults.length;
      checkpoint.failedRunIds.forEach((id) => this.failedRunIds.add(id));

      // Find where to resume
      const completedIds = new Set(checkpoint.completedRunIds);
      startIndex = tasks.findIndex((t) => !completedIds.has(t.id));

      console.log(`Resuming from checkpoint: ${this.completedCount}/${totalRuns} completed`);
    }

    // Run tasks with concurrency control
    const remainingTasks = tasks.slice(startIndex);
    await this.runTasksWithConcurrency(remainingTasks, totalRuns);

    // Sort results by runIndex for deterministic ordering
    this.completedResults.sort((a, b) => (a.runIndex || 0) - (b.runIndex || 0));

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
  private generateTasks(): RunTask[] {
    const runner = new ExperimentRunner(this.experimentConfig);
    const configs = runner.generateConfigs();

    const tasks: RunTask[] = [];
    let globalIndex = 0;

    for (const { daoConfig, sweepValue } of configs) {
      for (let i = 0; i < this.experimentConfig.execution.runsPerConfig; i++) {
        const seed = this.getSeed(globalIndex);
        const sweepPart = sweepValue !== undefined
          ? `-${compactSweepPart(String(sweepValue).replace(/\./g, '_'))}`
          : '';
        const experimentId = this.experimentConfig.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
        const runId = `${experimentId}${sweepPart}-run-${String(i + 1).padStart(3, '0')}`;

        tasks.push({
          id: runId,
          daoConfig,
          sweepValue,
          runIndex: i,
          seed,
        });

        globalIndex++;
      }
    }

    return tasks;
  }

  /**
   * Get seed for a run
   */
  private getSeed(runIndex: number): number {
    const { seedStrategy, baseSeed = 12345, fixedSeeds } = this.experimentConfig.execution;

    switch (seedStrategy) {
      case 'sequential':
        return baseSeed + runIndex;
      case 'fixed':
        return fixedSeeds?.[runIndex] ?? baseSeed;
      case 'random':
        console.warn('[batch-runner] Warning: "random" seed strategy is non-deterministic and breaks reproducibility');
        return Math.floor(Math.random() * 2147483647);
      default:
        return baseSeed + runIndex;
    }
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
        config: task.daoConfig as ResearchConfig,
        simConfig: {
          checkpointInterval: this.experimentConfig.baseConfig.simulationOverrides?.checkpointInterval,
          eventLogging: this.experimentConfig.baseConfig.simulationOverrides?.eventLogging,
        },
        seed: task.seed,
        stepsPerRun: this.experimentConfig.execution.stepsPerRun,
        metrics: this.experimentConfig.metrics,
        includeTimeline: this.experimentConfig.output.includeTimeline ?? false,
        sweepValue: task.sweepValue,
        runIndex: task.runIndex,
        experimentName: this.experimentConfig.name,
      }));

      // Submit all tasks and track progress
      let checkpointCounter = 0;
      const taskPromises = workerTasks.map(async (workerTask, index) => {
        try {
          const result = await pool.submit(workerTask);
          this.completedResults.push(result);
          this.completedCount++;

          // Report progress
          this.reportProgress(totalRuns);

          // Checkpoint periodically
          checkpointCounter++;
          if (checkpointInterval && checkpointCounter % checkpointInterval === 0) {
            await this.saveCheckpoint(tasks.map((t) => t.id), totalRuns);
          }

          return { success: true, taskId: tasks[index].id, result };
        } catch (error) {
          console.error(`Task ${tasks[index].id} failed:`, (error as Error)?.message || error);
          if ((error as Error)?.stack) console.error((error as Error).stack);
          this.failedRunIds.add(tasks[index].id);
          this.reportProgress(totalRuns);
          return { success: false, taskId: tasks[index].id };
        }
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
      return runner.runSingle(task.daoConfig, task.seed, task.sweepValue, task.runIndex);
    }

    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Run timeout')), timeoutMs);
    });

    try {
      const result = await Promise.race([
        runner.runSingle(task.daoConfig, task.seed, task.sweepValue, task.runIndex),
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
    return runner.generateSummary(this.completedResults, this.startTime);
  }

  /**
   * Get checkpoint file path
   */
  private getCheckpointPath(): string {
    const dir = this.batchConfig.checkpointDir || '.checkpoints';
    const filename = `${this.experimentConfig.name.replace(/\s+/g, '-')}.checkpoint.json`;
    return path.join(dir, filename);
  }

  /**
   * Save checkpoint
   */
  private async saveCheckpoint(allTaskIds: string[], totalRuns: number): Promise<void> {
    const checkpointPath = this.getCheckpointPath();
    const dir = path.dirname(checkpointPath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate config hash
    const configStr = JSON.stringify(this.experimentConfig);
    let configHash = 0;
    for (let i = 0; i < configStr.length; i++) {
      configHash = ((configHash << 5) - configHash + configStr.charCodeAt(i)) | 0;
    }

    const checkpoint: BatchCheckpoint = {
      experimentName: this.experimentConfig.name,
      configHash: `hash:${Math.abs(configHash).toString(16)}`,
      totalRuns,
      completedRunIds: this.completedResults.map((r) => r.runId),
      completedResults: this.completedResults,
      failedRunIds: Array.from(this.failedRunIds),
      timestamp: new Date().toISOString(),
    };

    await fs.promises.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
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
      const configStr = JSON.stringify(this.experimentConfig);
      let configHash = 0;
      for (let i = 0; i < configStr.length; i++) {
        configHash = ((configHash << 5) - configHash + configStr.charCodeAt(i)) | 0;
      }
      const currentHash = `hash:${Math.abs(configHash).toString(16)}`;

      if (checkpoint.configHash !== currentHash) {
        console.warn('Checkpoint config hash mismatch - starting fresh');
        return null;
      }

      return checkpoint;
    } catch (error) {
      console.warn('Failed to load checkpoint:', error);
      return null;
    }
  }

  /**
   * Delete checkpoint file
   */
  private async deleteCheckpoint(): Promise<void> {
    const checkpointPath = this.getCheckpointPath();
    if (fs.existsSync(checkpointPath)) {
      await fs.promises.unlink(checkpointPath);
    }
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
