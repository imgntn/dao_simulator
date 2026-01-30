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

// =============================================================================
// TYPES
// =============================================================================

export interface WorkerTask {
  taskId: number;
  config: ResearchConfig;
  simConfig: SimulationOverrides;
  seed: number;
  stepsPerRun: number;
  metrics: MetricConfig[];
  includeTimeline: boolean;
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
  await simulation.run(task.stepsPerRun);

  // Collect metrics
  const metrics = collectMetrics(simulation, task.metrics);

  // Collect timeline if requested
  let timeline: TimelineEntry[] | undefined;
  if (task.includeTimeline) {
    timeline = collectTimeline(simulation);
  }

  const runEndTime = Date.now();

  // Build run ID
  const sweepPart = task.sweepValue !== undefined ? `-${String(task.sweepValue).replace(/\./g, '_')}` : '';
  const runId = `${task.experimentName}${sweepPart}-run-${String(task.runIndex + 1).padStart(3, '0')}`;

  return {
    runId,
    experimentName: task.experimentName,
    sweepValue: task.sweepValue,
    runIndex: task.runIndex,
    config: simConfig,
    seed: task.seed,
    metrics,
    timeline,
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

  return metrics;
}

/**
 * Extract a single metric from the simulation
 */
function extractMetric(simulation: DAOSimulation, metricConfig: MetricConfig): number {
  if (metricConfig.type === 'builtin' && metricConfig.builtin) {
    return extractBuiltinMetric(simulation, metricConfig.builtin);
  }

  if (metricConfig.type === 'custom' && metricConfig.expression) {
    return extractCustomMetric(simulation, metricConfig.expression);
  }

  return 0;
}

/**
 * Extract a builtin metric
 */
function extractBuiltinMetric(simulation: DAOSimulation, metric: BuiltinMetricType): number {
  const dao = simulation.dao;
  const dataCollector = simulation.dataCollector;
  const latestStats = dataCollector.getLatestStats();

  switch (metric) {
    case 'proposal_pass_rate': {
      const proposals = dao.proposals;
      if (proposals.length === 0) return 0;
      const passed = proposals.filter((p: any) =>
        p.status === 'approved' || p.status === 'passed' || p.status === 'executed'
      ).length;
      return passed / proposals.length;
    }

    case 'average_turnout': {
      const proposals = dao.proposals;
      if (proposals.length === 0) return 0;
      let totalTurnout = 0;
      for (const proposal of proposals) {
        const votesMap = (proposal as any).votes;
        let totalVotes = 0;
        if (votesMap instanceof Map) {
          for (const [, voteData] of votesMap) {
            totalVotes += voteData.weight || 1;
          }
        } else if (Array.isArray(votesMap)) {
          totalVotes = votesMap.reduce((sum: number, v: any) => sum + (v.weight || 1), 0);
        }
        const totalSupply = dao.members.reduce((sum: number, m: any) => sum + (m.tokens || 0), 0);
        if (totalSupply > 0) {
          totalTurnout += totalVotes / totalSupply;
        }
      }
      return totalTurnout / proposals.length;
    }

    case 'final_treasury':
      return dao.treasury.getTokenBalance('DAO_TOKEN') || dao.treasury.funds;

    case 'final_token_price':
      return dao.treasury.getTokenPrice('DAO_TOKEN');

    case 'final_member_count':
      return dao.members.length;

    case 'final_gini':
      return latestStats?.gini ?? 0;

    case 'final_reputation_gini':
      return latestStats?.repGini ?? 0;

    case 'total_proposals':
      return dao.proposals.length;

    case 'total_projects':
      return dao.projects.length;

    case 'average_token_balance':
      return latestStats?.avgTokens ?? 0;

    default:
      return 0;
  }
}

/**
 * Extract a custom metric using an expression
 */
function extractCustomMetric(simulation: DAOSimulation, expression: string): number {
  try {
    const dao = simulation.dao;
    const dataCollector = simulation.dataCollector;
    const proposals = dao.proposals;
    const members = dao.members;

    // eslint-disable-next-line no-new-func
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

  return history.map((entry, index) => ({
    step: entry.step,
    memberCount: entry.memberCount,
    proposalCount: entry.proposalCount,
    projectCount: entry.projectCount,
    tokenPrice: entry.tokenPrice,
    treasuryFunds: entry.treasuryFunds,
    gini: modelVars[index]?.gini ?? 0,
    reputationGini: modelVars[index]?.repGini ?? 0,
  }));
}
