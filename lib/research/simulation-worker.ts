/**
 * Simulation Worker
 *
 * Worker thread script that runs individual simulations.
 * Communicates with main thread via message passing.
 */

import { parentPort, workerData } from 'worker_threads';
import { DAOSimulation } from '../engine/simulation';
import { resolveSimulationConfig, type ResearchConfig } from './config-resolver';
import { setSeed } from '../utils/random';
import type { RunResult, MetricConfig, BuiltinMetricType, TimelineEntry, SimulationOverrides } from './experiment-config';
import { extractBuiltinMetric } from './builtin-metric-extractor';
import { assertFiniteMetricRecord } from './metric-validation';
import { runLearningEpisodes } from './learning-episodes';
import { collectLlmRunDiagnostics } from './llm-run-diagnostics';
import { sampleTimeline } from './timeline-sampling';

// =============================================================================
// TYPES
// =============================================================================

export interface WorkerTask {
  taskId: number;
  runId: string;
  conditionId: string;
  config: ResearchConfig;
  simConfig: SimulationOverrides;
  seed: number;
  stepsPerRun: number;
  learningEpisodesPerRun?: number;
  metrics: MetricConfig[];
  includeTimeline: boolean;
  timelineStride?: number;
  sweepValue?: number | string | boolean;
  runIndex: number;
  experimentName: string;
}

export interface WorkerResult {
  taskId: number;
  success: boolean;
  result?: RunResult;
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS FOR STATISTICAL CALCULATIONS
// =============================================================================

/**
 * Calculate Gini coefficient for an array of values
 * Returns value between 0 (perfect equality) and 1 (perfect inequality)
 */
function calculateGini(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);

  if (sum === 0) return 0;

  let giniSum = 0;
  for (let i = 0; i < n; i++) {
    giniSum += (2 * (i + 1) - n - 1) * sorted[i];
  }

  return giniSum / (n * sum);
}

/**
 * Calculate coefficient of variation (std / mean)
 */
function calculateCV(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;

  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = values.length > 1
    ? squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1)
    : 0;
  const std = Math.sqrt(variance);

  return std / mean;
}

/**
 * Calculate linear regression slope (trend)
 */
function calculateSlope(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Get proposal statuses categorized
 */
interface ProposalStats {
  total: number;
  passed: number;
  rejected: number;
  open: number;
  expired: number;
}

function getProposalStats(proposals: any[]): ProposalStats {
  const stats: ProposalStats = {
    total: proposals.length,
    passed: 0,
    rejected: 0,
    open: 0,
    expired: 0,
  };

  for (const p of proposals) {
    const status = p.status?.toLowerCase() || 'unknown';
    if (status === 'approved' || status === 'completed' || status === 'passed' || status === 'executed') {
      stats.passed++;
    } else if (status === 'rejected') {
      stats.rejected++;
    } else if (status === 'open' || status === 'active' || status === 'voting') {
      stats.open++;
    } else if (status === 'expired' || status === 'abandoned') {
      stats.expired++;
    }
  }

  return stats;
}

/**
 * Get voting data from a proposal
 */
interface VoteData {
  voterId: string;
  vote: boolean;
  weight: number;
}

function getProposalVotes(proposal: any): VoteData[] {
  const votes: VoteData[] = [];
  const votesMap = proposal.votes;

  if (votesMap instanceof Map) {
    for (const [voterId, voteData] of votesMap) {
      votes.push({
        voterId,
        vote: voteData.vote,
        weight: voteData.weight || 1,
      });
    }
  } else if (Array.isArray(votesMap)) {
    for (const v of votesMap) {
      votes.push({
        voterId: v.voterId || v.id,
        vote: v.vote,
        weight: v.weight || 1,
      });
    }
  }

  return votes;
}

/**
 * Get total voting power (tokens + staked)
 */
function getTotalVotingPower(members: any[]): number {
  return members.reduce((sum, m) => sum + (m.tokens || 0) + (m.stakedTokens || 0), 0);
}

/**
 * Get member token holdings sorted descending
 */
function getMemberTokensSorted(members: any[]): { id: string; tokens: number }[] {
  return members
    .map(m => ({ id: m.uniqueId, tokens: (m.tokens || 0) + (m.stakedTokens || 0) }))
    .sort((a, b) => b.tokens - a.tokens);
}

// =============================================================================
// WORKER IMPLEMENTATION
// =============================================================================

if (parentPort) {
  const port = parentPort;

  port.on('message', async (task: WorkerTask) => {
    try {
      const result = await runSimulation(task);
      port.postMessage({
        taskId: task.taskId,
        success: true,
        result,
      } as WorkerResult);
    } catch (error) {
      port.postMessage({
        taskId: task.taskId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } as WorkerResult);
    }
  });
}

/**
 * Run a single simulation in the worker
 */
async function runSimulation(task: WorkerTask): Promise<RunResult> {
  const runStartTime = Date.now();

  // Set random seed for reproducibility
  setSeed(task.seed);

  // Convert to simulation config
  const simConfig = resolveSimulationConfig(task.config, task.seed, task.simConfig);

  // Create and run simulation
  const simulation = new DAOSimulation(simConfig);
  await runLearningEpisodes(
    simulation,
    task.stepsPerRun,
    task.learningEpisodesPerRun ?? 1
  );

  // Collect metrics
  const metrics = collectMetrics(simulation, task.metrics);

  // Collect timeline if requested
  let timeline: TimelineEntry[] | undefined;
  if (task.includeTimeline) {
    timeline = sampleTimeline(collectTimeline(simulation), task.timelineStride ?? 1);
  }

  const runEndTime = Date.now();

  return {
    runId: task.runId,
    experimentName: task.experimentName,
    conditionId: task.conditionId,
    sweepValue: task.sweepValue,
    runIndex: task.runIndex,
    config: simConfig,
    seed: task.seed,
    metrics,
    timeline,
    llmDiagnostics: collectLlmRunDiagnostics(simulation),
    startedAt: new Date(runStartTime).toISOString(),
    completedAt: new Date(runEndTime).toISOString(),
    durationMs: runEndTime - runStartTime,
    stepsCompleted: task.stepsPerRun,
  };
}

/**
 * Collect metrics from a completed simulation
 */
function collectMetrics(simulation: DAOSimulation, metricConfigs: MetricConfig[]): Record<string, number> {
  const metrics: Record<string, number> = {};

  for (const metricConfig of metricConfigs) {
    const value = extractMetric(simulation, metricConfig);
    metrics[metricConfig.name] = value;
  }

  assertFiniteMetricRecord(metrics, 'Worker-thread metric extraction');
  return metrics;
}

/**
 * Extract a single metric from the simulation
 */
function extractMetric(simulation: DAOSimulation, metricConfig: MetricConfig): number {
  // Explicit builtin metric
  if (metricConfig.type === 'builtin' && metricConfig.builtin) {
    return extractBuiltinMetric(simulation, metricConfig.builtin);
  }

  // Custom expression metric
  if (metricConfig.type === 'custom' && metricConfig.expression) {
    return extractCustomMetric(simulation, metricConfig.expression);
  }

  throw new Error(`Metric "${metricConfig.name}" has an invalid explicit configuration`);
}

/**
 * Extract a builtin metric - comprehensive implementation matching fork-worker.ts
 */
function extractCustomMetric(simulation: DAOSimulation, expression: string): number {
  try {
    const dao = simulation.dao;
    const dataCollector = simulation.dataCollector;
    const proposals = dao.proposals;
    const members = dao.members;

    const fn = new Function('dao', 'dataCollector', 'proposals', 'members', `return ${expression}`);
    const result = fn(dao, dataCollector, proposals, members);

    return typeof result === 'number' ? result : 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Collect timeline data from simulation
 */
function collectTimeline(simulation: DAOSimulation): TimelineEntry[] {
  const history = simulation.dataCollector.history;
  const modelVars = simulation.dataCollector.modelVars;

  const modelVarsByStep = new Map<number, any>();
  for (const mv of modelVars) {
    modelVarsByStep.set(mv.step, mv);
  }

  return history.map((entry) => {
    const mv = modelVarsByStep.get(entry.step);
    return {
      step: entry.step,
      memberCount: entry.memberCount,
      proposalCount: entry.proposalCount,
      projectCount: entry.projectCount,
      tokenPrice: entry.tokenPrice,
      treasuryFunds: entry.treasuryFunds,
      gini: mv?.gini ?? 0,
      reputationGini: mv?.repGini ?? 0,
      participationRate: mv?.avgParticipationRate ?? 0,
    };
  });
}
