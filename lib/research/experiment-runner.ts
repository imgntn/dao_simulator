/**
 * Experiment Runner
 *
 * Executes experiments defined by ExperimentConfig.
 * Handles loading configs, running simulations, and collecting metrics.
 */

import { DAOSimulation, type DAOSimulationConfig } from '../engine/simulation';
import { DAOCity } from '../engine/dao-city';
import type { DAOCityConfig } from '../types/dao-city';
import { getBaselineConfig } from './baselines';
import { resolveSimulationConfig, type ResearchConfig } from './config-resolver';
import { mergePopulation, type PopulationSpec } from './population';
import { applySweepValue } from './sweep-mapper';
import { setSeed } from '../utils/random';
import { settings } from '../config/settings';
import type { LearningState } from '../agents/learning/learning-mixin';
import type {
  ExperimentConfig,
  CityBaseConfig,
  CityScenarioConfig,
  RunResult,
  TimelineEntry,
  MetricConfig,
  BuiltinMetricType,
  ExperimentSummary,
  MetricsSummary,
  MetricStatistics,
  ReproducibilityManifest,
  StatisticalSignificance,
  SweepComparison,
  PowerAnalysisResult,
} from './experiment-config';
import * as stats from './statistics';
import { WorkerPool } from './worker-pool';
import type { WorkerTask } from './simulation-worker';

// =============================================================================
// DEEP MERGE UTILITY
// =============================================================================

/**
 * Deep merge two objects
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue as object, sourceValue as object) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

type CityRunConfig = {
  baseCityConfig: CityBaseConfig;
  scenario: CityScenarioConfig;
};

type RunConfig = ResearchConfig | CityRunConfig;

interface CityRunContext {
  city: DAOCity;
  scenario: CityScenarioConfig;
  tokenByDao: Map<string, string>;
  initialMembers: Map<string, number>;
  initialTreasury: Map<string, number>;
  initialTokenPrice: Map<string, number>;
  priceHistory: Map<string, number[]>;
  transferRequests: Map<string, number>;
  transferCompletions: Map<string, number>;
  transfersIn: Map<string, number>;
  transfersOut: Map<string, number>;
  transferOrigins: Map<string, Map<string, number>>;
  attackAttempts: Map<string, number>;
  attackSuccesses: Map<string, number>;
  attackDetections: Map<string, number>;
  attackMitigations: Map<string, number>;
  vetoActions: Map<string, number>;
  coordinatedDefenseActions: number;
  ecosystemAlerts: number;
  ecosystemAlertIds: Set<string>;
  maliciousProposals: Map<string, Set<string>>;
  stepCount: number;
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

function calculateCorrelation(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;

  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;

  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }

  const denom = Math.sqrt(varA * varB);
  return denom === 0 ? 0 : cov / denom;
}

function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
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
 * Proposal statistics interface
 */
interface ProposalStats {
  total: number;
  passed: number;
  rejected: number;
  open: number;
  expired: number;
}

/**
 * Get proposal statuses categorized
 */
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
 * Vote data interface
 */
interface VoteData {
  voterId: string;
  vote: boolean;
  weight: number;
}

/**
 * Get voting data from a proposal
 */
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
// EXPERIMENT RUNNER CLASS
// =============================================================================

export interface RunProgress {
  currentRun: number;
  totalRuns: number;
  currentSweepValue?: number | string | boolean;
  percentComplete: number;
}

export type ProgressCallback = (progress: RunProgress) => void;

export class ExperimentRunner {
  private config: ExperimentConfig;
  private progressCallback?: ProgressCallback;

  /** Persisted Q-tables from previous runs (type -> states) */
  private persistedLearningStates: Map<string, LearningState[]> | null = null;

  constructor(config: ExperimentConfig, progressCallback?: ProgressCallback) {
    this.config = config;
    this.progressCallback = progressCallback;
  }

  /**
   * Run the complete experiment
   * Uses parallel execution if workers > 1
   */
  async run(): Promise<ExperimentSummary> {
    const workerCount = this.config.execution.workers ?? 1;

    if (workerCount > 1) {
      return this.runParallel(workerCount);
    }

    return this.runSequential();
  }

  /**
   * Run the experiment sequentially (single-threaded)
   */
  private async runSequential(): Promise<ExperimentSummary> {
    const startTime = Date.now();
    const results: RunResult[] = [];

    // Generate all configurations to run
    const configs = this.generateConfigs();
    const totalRuns = configs.length * this.config.execution.runsPerConfig;

    let runIndex = 0;

    for (const { daoConfig, sweepValue } of configs) {
      for (let i = 0; i < this.config.execution.runsPerConfig; i++) {
        const seed = this.getSeed(runIndex);

        // Report progress
        if (this.progressCallback) {
          this.progressCallback({
            currentRun: runIndex + 1,
            totalRuns,
            currentSweepValue: sweepValue,
            percentComplete: ((runIndex + 1) / totalRuns) * 100,
          });
        }

        // Run single simulation
        const result = await this.runSingle(daoConfig, seed, sweepValue, i);
        results.push(result);

        runIndex++;
      }
    }

    // Generate summary
    const summary = this.generateSummary(results, startTime, 0);

    return summary;
  }

  /**
   * Run the experiment in parallel using Worker Threads
   */
  private async runParallel(workerCount: number): Promise<ExperimentSummary> {
    const startTime = Date.now();

    // Generate all configurations to run
    const configs = this.generateConfigs();
    const totalRuns = configs.length * this.config.execution.runsPerConfig;

    // Create worker pool
    const pool = new WorkerPool({ workerCount });

    // Build all tasks
    const tasks: Omit<WorkerTask, 'taskId'>[] = [];
    let runIndex = 0;

    for (const { daoConfig, sweepValue } of configs) {
      for (let i = 0; i < this.config.execution.runsPerConfig; i++) {
        const seed = this.getSeed(runIndex);

        tasks.push({
          config: daoConfig as ResearchConfig,
          simConfig: {
            checkpointInterval: this.config.baseConfig.simulationOverrides?.checkpointInterval,
            eventLogging: this.config.baseConfig.simulationOverrides?.eventLogging,
          },
          seed,
          stepsPerRun: this.config.execution.stepsPerRun,
          metrics: this.config.metrics,
          includeTimeline: this.config.output.includeTimeline ?? false,
          sweepValue,
          runIndex: i,
          experimentName: this.config.name,
        });

        runIndex++;
      }
    }

    // Submit all tasks and track progress
    let completedRuns = 0;
    const results: RunResult[] = [];

    // Submit tasks in batches to allow progress tracking
    const taskPromises = tasks.map(async (task, index) => {
      const result = await pool.submit(task);
      completedRuns++;

      // Report progress
      if (this.progressCallback) {
        this.progressCallback({
          currentRun: completedRuns,
          totalRuns,
          currentSweepValue: task.sweepValue,
          percentComplete: (completedRuns / totalRuns) * 100,
        });
      }

      return result;
    });

    // Wait for all tasks to complete
    const settledResults = await Promise.allSettled(taskPromises);
    const allResults: RunResult[] = [];
    let failedCount = 0;
    for (const result of settledResults) {
      if (result.status === 'fulfilled') {
        allResults.push(result.value);
      } else {
        failedCount++;
        console.error('Worker task failed:', result.reason);
      }
    }
    results.push(...allResults);

    // Shutdown the pool
    await pool.shutdown();

    // Generate summary
    const summary = this.generateSummary(results, startTime, failedCount);

    return summary;
  }

  /**
   * Run a single simulation
   */
  async runSingle(
    daoConfig: RunConfig,
    seed: number,
    sweepValue: number | string | boolean | undefined,
    runIndexWithinSweep: number
  ): Promise<RunResult> {
    if (this.config.mode === 'city') {
      return this.runSingleCity(daoConfig as CityRunConfig, seed, sweepValue, runIndexWithinSweep);
    }
    const runStartTime = Date.now();

    // Set random seed for reproducibility
    setSeed(seed);

    // Convert to simulation config (city mode already handled above)
    const simConfig = resolveSimulationConfig(
      daoConfig as ResearchConfig,
      seed,
      this.config.baseConfig.simulationOverrides
    );

    // Create and run simulation
    const simulation = new DAOSimulation(simConfig);
    const stepsToRun = this.config.execution.stepsPerRun;

    // Import persisted Q-tables from previous runs if available
    if (settings.learning_persist_q_tables && this.persistedLearningStates) {
      simulation.importLearningStates(this.persistedLearningStates);
    }

    await simulation.run(stepsToRun);

    // Signal end of learning episode (decays exploration, increments episode counts)
    simulation.endLearningEpisode();

    // Merge shared experience across same-type agents if enabled
    if (settings.learning_shared_experience) {
      simulation.mergeSharedExperience();
    }

    // Persist Q-tables for next run if enabled
    if (settings.learning_persist_q_tables) {
      this.persistedLearningStates = simulation.exportLearningStates();
    }

    // Collect metrics
    const metrics = this.collectMetrics(simulation);

    // Collect timeline if requested
    let timeline: TimelineEntry[] | undefined;
    if (this.config.output.includeTimeline) {
      timeline = this.collectTimeline(simulation);
    }

    const runEndTime = Date.now();

    // Build run ID
    const sweepPart = sweepValue !== undefined ? `-${String(sweepValue).replace(/\./g, '_')}` : '';
    const runId = `${this.config.name}${sweepPart}-run-${String(runIndexWithinSweep + 1).padStart(3, '0')}`;

    return {
      runId,
      experimentName: this.config.name,
      sweepValue,
      runIndex: runIndexWithinSweep,
      config: simConfig,
      seed,
      metrics,
      timeline,
      startedAt: new Date(runStartTime).toISOString(),
      completedAt: new Date(runEndTime).toISOString(),
      durationMs: runEndTime - runStartTime,
      stepsCompleted: stepsToRun,
    };
  }

  private async runSingleCity(
    runConfig: CityRunConfig,
    seed: number,
    sweepValue: number | string | boolean | undefined,
    runIndexWithinSweep: number
  ): Promise<RunResult> {
    const runStartTime = Date.now();

    // Set random seed for reproducibility
    setSeed(seed);

    const cityConfig = this.buildCityConfig(runConfig.baseCityConfig, runConfig.scenario);
    const city = new DAOCity(cityConfig);
    const context = this.initializeCityRunContext(city, runConfig.scenario);

    const stepsToRun = this.config.execution.stepsPerRun;
    for (let step = 0; step < stepsToRun; step++) {
      await city.step();
      this.recordCityStep(context);
    }

    const metrics = this.collectCityMetrics(context);
    const runEndTime = Date.now();

    // Build run ID
    const sweepPart = sweepValue !== undefined ? `-${String(sweepValue).replace(/\./g, '_')}` : '';
    const runId = `${this.config.name}${sweepPart}-run-${String(runIndexWithinSweep + 1).padStart(3, '0')}`;

    return {
      runId,
      experimentName: this.config.name,
      sweepValue,
      runIndex: runIndexWithinSweep,
      config: cityConfig,
      seed,
      metrics,
      startedAt: new Date(runStartTime).toISOString(),
      completedAt: new Date(runEndTime).toISOString(),
      durationMs: runEndTime - runStartTime,
      stepsCompleted: stepsToRun,
    };
  }

  private buildCityConfig(baseCityConfig: CityBaseConfig, scenario: CityScenarioConfig): DAOCityConfig {
    const defaultConfig: DAOCityConfig = {
      daos: [],
      globalMarketplaceConfig: {
        initialLiquidity: 50000,
        volatility: 0.02,
        priceUpdateFrequency: 1,
        baseTokenSymbol: 'STABLE',
      },
      bridgeFeeRate: 0.01,
      bridgeDelay: 5,
      enableInterDAOProposals: true,
    };

    const mergedBase = deepMerge(defaultConfig, baseCityConfig);
    const mergedScenario = scenario.overrides ? deepMerge(mergedBase, scenario.overrides) : mergedBase;

    // Map scenario-level marketConfig fields onto globalMarketplaceConfig where applicable
    if (scenario.marketConfig && mergedScenario.globalMarketplaceConfig) {
      const marketConfig = scenario.marketConfig as Record<string, unknown>;
      if (typeof marketConfig.volatility === 'number') {
        mergedScenario.globalMarketplaceConfig.volatility = marketConfig.volatility;
      }
      if (typeof marketConfig.priceUpdateFrequency === 'number') {
        mergedScenario.globalMarketplaceConfig.priceUpdateFrequency = marketConfig.priceUpdateFrequency;
      }
    }

    if (scenario.interDAOProposalRate !== undefined) {
      mergedScenario.interDAOProposalRate = scenario.interDAOProposalRate;
    }

    if (scenario.interDAOProposalConfig) {
      mergedScenario.interDAOProposalConfig = {
        ...(mergedScenario.interDAOProposalConfig || {}),
        ...scenario.interDAOProposalConfig,
      };
    }

    if (scenario.attackConfig) {
      mergedScenario.attackConfig = scenario.attackConfig;
    }

    if (scenario.interDAODefense) {
      mergedScenario.interDAODefense = {
        ...(mergedScenario.interDAODefense || {}),
        ...scenario.interDAODefense,
      };
    }

    // NOTE: scenario.daos wholesale replaces base config DAOs.
    // Scenarios must fully specify all DAOs (no per-DAO merging).
    mergedScenario.daos = scenario.daos;
    return mergedScenario as DAOCityConfig;
  }

  private initializeCityRunContext(city: DAOCity, scenario: CityScenarioConfig): CityRunContext {
    const tokenByDao = new Map<string, string>();
    for (const dao of scenario.daos) {
      tokenByDao.set(dao.id, dao.tokenSymbol);
    }

    const context: CityRunContext = {
      city,
      scenario,
      tokenByDao,
      initialMembers: new Map(),
      initialTreasury: new Map(),
      initialTokenPrice: new Map(),
      priceHistory: new Map(),
      transferRequests: new Map(),
      transferCompletions: new Map(),
      transfersIn: new Map(),
      transfersOut: new Map(),
      transferOrigins: new Map(),
      attackAttempts: new Map(),
      attackSuccesses: new Map(),
      attackDetections: new Map(),
      attackMitigations: new Map(),
      vetoActions: new Map(),
      coordinatedDefenseActions: 0,
      ecosystemAlerts: 0,
      ecosystemAlertIds: new Set(),
      maliciousProposals: new Map(),
      stepCount: 0,
    };

    const marketplace = city.getGlobalMarketplace();

    for (const [daoId, tokenSymbol] of tokenByDao.entries()) {
      const sim = city.getSimulation(daoId);
      if (!sim) continue;
      context.initialMembers.set(daoId, sim.dao.members.length);
      context.initialTreasury.set(daoId, sim.dao.treasury.getTokenBalance(tokenSymbol));
      const initialPrice = marketplace.getTokenPrice(tokenSymbol);
      context.initialTokenPrice.set(daoId, initialPrice);
      context.priceHistory.set(daoId, [initialPrice]);
      context.transferOrigins.set(daoId, new Map());
    }

    // Track city-level events
    const eventBus = city.getEventBus();
    eventBus.subscribe('member_transfer_queued', (data) => {
      const request = data.request as { fromDaoId: string; toDaoId: string } | undefined;
      if (!request) return;
      context.transferRequests.set(request.fromDaoId, (context.transferRequests.get(request.fromDaoId) || 0) + 1);
    });

    eventBus.subscribe('member_transfer_completed', (data) => {
      const result = data.result as { fromDaoId: string; toDaoId: string } | undefined;
      if (!result) return;

      context.transferCompletions.set(result.fromDaoId, (context.transferCompletions.get(result.fromDaoId) || 0) + 1);
      context.transfersOut.set(result.fromDaoId, (context.transfersOut.get(result.fromDaoId) || 0) + 1);
      context.transfersIn.set(result.toDaoId, (context.transfersIn.get(result.toDaoId) || 0) + 1);

      const originMap = context.transferOrigins.get(result.toDaoId);
      if (originMap) {
        originMap.set(result.fromDaoId, (originMap.get(result.fromDaoId) || 0) + 1);
      }
    });

    eventBus.subscribe('cross_dao_alert', (data) => {
      const alertId = data.alertId as string | undefined;
      if (alertId) {
        context.ecosystemAlertIds.add(alertId);
      } else {
        context.ecosystemAlerts += 1;
      }
    });

    eventBus.subscribe('coordinated_defense_action', () => {
      context.coordinatedDefenseActions += 1;
    });

    // Track per-DAO events
    for (const [daoId] of tokenByDao.entries()) {
      const sim = city.getSimulation(daoId);
      if (!sim) continue;

      sim.eventBus.subscribe('sybil_attack_started', (data) => {
        context.attackAttempts.set(daoId, (context.attackAttempts.get(daoId) || 0) + 1);
        const proposalId = data.proposalId as string | undefined;
        if (!proposalId) return;
        const malicious = context.maliciousProposals.get(daoId) || new Set<string>();
        malicious.add(proposalId);
        context.maliciousProposals.set(daoId, malicious);
      });
      sim.eventBus.subscribe('sybil_attack_succeeded', () => {
        context.attackSuccesses.set(daoId, (context.attackSuccesses.get(daoId) || 0) + 1);
      });
      sim.eventBus.subscribe('flashloan_attack_succeeded', () => {
        context.attackAttempts.set(daoId, (context.attackAttempts.get(daoId) || 0) + 1);
        context.attackSuccesses.set(daoId, (context.attackSuccesses.get(daoId) || 0) + 1);
      });
      sim.eventBus.subscribe('flashloan_attack_failed', () => {
        context.attackAttempts.set(daoId, (context.attackAttempts.get(daoId) || 0) + 1);
      });
      sim.eventBus.subscribe('flashloan_borrowed', (data) => {
        const proposalId = data.proposalId as string | undefined;
        if (!proposalId) return;
        const malicious = context.maliciousProposals.get(daoId) || new Set<string>();
        malicious.add(proposalId);
        context.maliciousProposals.set(daoId, malicious);
      });
      sim.eventBus.subscribe('attack_detected', () => {
        context.attackDetections.set(daoId, (context.attackDetections.get(daoId) || 0) + 1);
      });
      sim.eventBus.subscribe('attack_mitigated', () => {
        context.attackMitigations.set(daoId, (context.attackMitigations.get(daoId) || 0) + 1);
      });
      sim.eventBus.subscribe('timelock_vetoed', () => {
        context.vetoActions.set(daoId, (context.vetoActions.get(daoId) || 0) + 1);
      });
      sim.eventBus.subscribe('house_veto_triggered', () => {
        context.vetoActions.set(daoId, (context.vetoActions.get(daoId) || 0) + 1);
      });
      sim.eventBus.subscribe('security_veto_initiated', () => {
        context.vetoActions.set(daoId, (context.vetoActions.get(daoId) || 0) + 1);
      });
      sim.eventBus.subscribe('citizen_veto_vote', () => {
        context.vetoActions.set(daoId, (context.vetoActions.get(daoId) || 0) + 1);
      });
      sim.eventBus.subscribe('staker_veto_signal', () => {
        context.vetoActions.set(daoId, (context.vetoActions.get(daoId) || 0) + 1);
      });
      sim.eventBus.subscribe('mutual_veto_triggered', () => {
        context.vetoActions.set(daoId, (context.vetoActions.get(daoId) || 0) + 1);
      });
    }

    return context;
  }

  private recordCityStep(context: CityRunContext): void {
    const marketplace = context.city.getGlobalMarketplace();
    context.stepCount += 1;
    for (const [daoId, tokenSymbol] of context.tokenByDao.entries()) {
      const history = context.priceHistory.get(daoId);
      if (!history) continue;
      history.push(marketplace.getTokenPrice(tokenSymbol));
    }
  }

  private collectCityMetrics(context: CityRunContext): Record<string, number> {
    const metrics: Record<string, number> = {};

    for (const metricConfig of this.config.metrics) {
      const scope = metricConfig.scope ?? 'per_dao';
      const metricName = this.normalizeMetricName(metricConfig.builtin ?? metricConfig.name);

      if (scope === 'ecosystem') {
        const key = `ecosystem.${metricConfig.name}`;
        metrics[key] = this.extractCityEcosystemMetric(metricName, context);
        continue;
      }

      for (const [daoId] of context.tokenByDao.entries()) {
        const sim = context.city.getSimulation(daoId);
        if (!sim) continue;
        const key = `${daoId}.${metricConfig.name}`;
        metrics[key] = this.extractCityDaoMetric(sim, daoId, metricName, context);
      }
    }

    return metrics;
  }

  private extractCityDaoMetric(
    simulation: DAOSimulation,
    daoId: string,
    metric: BuiltinMetricType,
    context: CityRunContext
  ): number {
    const marketplace = context.city.getGlobalMarketplace();
    const tokenSymbol = context.tokenByDao.get(daoId);
    const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

    switch (metric) {
      case 'final_treasury':
        return tokenSymbol ? simulation.dao.treasury.getTokenBalance(tokenSymbol) : simulation.dao.treasury.funds;

      case 'final_token_price':
        return tokenSymbol ? marketplace.getTokenPrice(tokenSymbol) : 0;

      case 'token_price_change': {
        const initial = context.initialTokenPrice.get(daoId) ?? 0;
        const final = tokenSymbol ? marketplace.getTokenPrice(tokenSymbol) : 0;
        return initial > 0 ? (final - initial) / initial : 0;
      }

      case 'token_price_volatility': {
        const history = context.priceHistory.get(daoId) || [];
        return calculateCV(history);
      }

      case 'price_governance_correlation': {
        const history = context.priceHistory.get(daoId) || [];
        const proposalCounts = simulation.dataCollector.history.map(h => h.proposalCount || 0);
        return calculateCorrelation(history, proposalCounts);
      }

      case 'final_market_rank': {
        if (!tokenSymbol) return 0;
        const ranking = marketplace.getTokenRankings().find(r => r.tokenSymbol === tokenSymbol);
        return ranking?.rank ?? 0;
      }

      case 'market_cap': {
        if (!tokenSymbol) return 0;
        const info = marketplace.getTokenInfo(tokenSymbol);
        return info ? info.price * info.circulatingSupply : 0;
      }

      case 'trading_volume':
        return tokenSymbol ? marketplace.getTokenVolume24h(tokenSymbol) : 0;

      case 'net_member_flow': {
        const inFlow = context.transfersIn.get(daoId) || 0;
        const outFlow = context.transfersOut.get(daoId) || 0;
        return inFlow - outFlow;
      }

      case 'transfer_origin_distribution': {
        const originMap = context.transferOrigins.get(daoId);
        if (!originMap || originMap.size === 0) return 0;
        const total = Array.from(originMap.values()).reduce((sum, v) => sum + v, 0);
        if (total === 0) return 0;
        let hhi = 0;
        for (const count of originMap.values()) {
          const share = count / total;
          hhi += share * share;
        }
        return hhi;
      }

      case 'attack_attempts':
        return context.attackAttempts.get(daoId) || 0;

      case 'successful_attacks':
        return context.attackSuccesses.get(daoId) || 0;

      case 'attack_success_rate': {
        const attempts = context.attackAttempts.get(daoId) || 0;
        const successes = context.attackSuccesses.get(daoId) || 0;
        return attempts > 0 ? clamp01(successes / attempts) : 0;
      }

      case 'attack_detection_rate': {
        const attempts = context.attackAttempts.get(daoId) || 0;
        const detections = context.attackDetections.get(daoId) || 0;
        return attempts > 0 ? clamp01(detections / attempts) : 0;
      }

      case 'attack_mitigation_rate': {
        const detections = context.attackDetections.get(daoId) || 0;
        const mitigations = context.attackMitigations.get(daoId) || 0;
        if (detections <= 0) return 0;
        return clamp01(mitigations / detections);
      }

      case 'treasury_loss': {
        const initial = context.initialTreasury.get(daoId) ?? 0;
        const final = simulation.dao.treasury.getTokenBalance(tokenSymbol || 'DAO_TOKEN');
        return initial > final ? initial - final : 0;
      }

      case 'malicious_proposal_pass_rate': {
        const malicious = context.maliciousProposals.get(daoId);
        if (!malicious || malicious.size === 0) return 0;
        let passed = 0;
        for (const proposalId of malicious.values()) {
          const proposal = simulation.dao.proposals.find(p => p.uniqueId === proposalId);
          if (proposal && (proposal.status === 'approved' || proposal.status === 'completed')) {
            passed++;
          }
        }
        return clamp01(passed / malicious.size);
      }

      case 'veto_actions':
        return context.vetoActions.get(daoId) || 0;

      default:
        return this.extractBuiltinMetric(simulation, metric);
    }
  }

  private extractCityEcosystemMetric(metric: BuiltinMetricType, context: CityRunContext): number {
    const marketplace = context.city.getGlobalMarketplace();
    const daoIds = Array.from(context.tokenByDao.keys());
    const simulations = daoIds.map(id => context.city.getSimulation(id)).filter(Boolean) as DAOSimulation[];

    switch (metric) {
      case 'total_market_cap': {
        const rankings = marketplace.getTokenRankings();
        return rankings.reduce((sum, r) => sum + r.marketCap, 0);
      }

      case 'market_concentration': {
        const caps = marketplace.getTokenRankings().map(r => r.marketCap);
        const total = caps.reduce((sum, v) => sum + v, 0);
        if (total === 0) return 0;
        return caps.reduce((hhi, cap) => {
          const share = cap / total;
          return hhi + share * share;
        }, 0);
      }

      case 'price_dispersion': {
        const prices = marketplace.getTokenRankings().map(r => r.currentPrice);
        return calculateVariance(prices);
      }

      case 'cross_dao_alerts':
        return context.ecosystemAlertIds.size > 0 ? context.ecosystemAlertIds.size : context.ecosystemAlerts;

      case 'coordinated_defense_actions': {
        return context.coordinatedDefenseActions;
      }

      case 'ecosystem_survival_rate': {
        if (simulations.length === 0) return 0;
        let survivors = 0;
        for (const sim of simulations) {
          const tokenSymbol = context.tokenByDao.get(sim.dao.daoId) || 'DAO_TOKEN';
          const treasury = sim.dao.treasury.getTokenBalance(tokenSymbol);
          if (sim.dao.members.length > 0 && treasury > 0) {
            survivors++;
          }
        }
        return survivors / simulations.length;
      }

      case 'ecosystem_recovery_time': {
        if (simulations.length === 0) return 0;
        let totalRecovery = 0;
        for (const sim of simulations) {
          const history = sim.dataCollector.history;
          if (history.length === 0) continue;
          const initial = context.initialTreasury.get(sim.dao.daoId) ?? 0;
          let dipped = false;
          let recoveryStep = history[history.length - 1]?.step || 0;
          for (const entry of history) {
            if (entry.treasuryFunds < initial) {
              dipped = true;
            }
            if (dipped && entry.treasuryFunds >= initial) {
              recoveryStep = entry.step;
              break;
            }
          }
          totalRecovery += recoveryStep;
        }
        return simulations.length > 0 ? totalRecovery / simulations.length : 0;
      }

      case 'ecosystem_treasury_total': {
        let total = 0;
        for (const sim of simulations) {
          const tokenSymbol = context.tokenByDao.get(sim.dao.daoId) || 'DAO_TOKEN';
          total += sim.dao.treasury.getTokenBalance(tokenSymbol);
        }
        return total;
      }

      case 'participation_convergence': {
        const rates = simulations.map(sim => this.extractBuiltinMetric(sim, 'voter_participation_rate'));
        if (rates.length === 0) return 0;
        const cv = calculateCV(rates);
        return Math.max(0, 1 - cv);
      }

      case 'governance_quality_variance': {
        const risks = simulations.map(sim => this.extractBuiltinMetric(sim, 'governance_capture_risk'));
        return calculateVariance(risks);
      }

      case 'transferred_member_impact': {
        if (simulations.length < 2) return 0;
        const flows = daoIds.map(id => (context.transfersIn.get(id) || 0) - (context.transfersOut.get(id) || 0));
        const participation = simulations.map(sim => this.extractBuiltinMetric(sim, 'voter_participation_rate'));
        return Math.abs(calculateCorrelation(flows, participation));
      }

      case 'transfer_count': {
        let total = 0;
        for (const count of context.transferCompletions.values()) {
          total += count;
        }
        return total;
      }

      case 'transfer_request_count': {
        let total = 0;
        for (const count of context.transferRequests.values()) {
          total += count;
        }
        return total;
      }

      case 'transfer_completion_rate': {
        let requests = 0;
        let completions = 0;
        for (const count of context.transferRequests.values()) {
          requests += count;
        }
        for (const count of context.transferCompletions.values()) {
          completions += count;
        }
        return requests > 0 ? completions / requests : 0;
      }

      case 'total_ecosystem_members': {
        return simulations.reduce((sum, sim) => sum + sim.dao.members.length, 0);
      }

      case 'ecosystem_member_gini': {
        const counts = simulations.map(sim => sim.dao.members.length);
        return calculateGini(counts);
      }

      case 'dao_dominance_index': {
        const counts = simulations.map(sim => sim.dao.members.length);
        const total = counts.reduce((sum, v) => sum + v, 0);
        if (total === 0) return 0;
        return counts.reduce((hhi, count) => {
          const share = count / total;
          return hhi + share * share;
        }, 0);
      }

      case 'inter_dao_proposal_count': {
        return context.city.getState().interDaoProposals.length;
      }

      case 'inter_dao_proposal_success_rate': {
        const proposals = context.city.getState().interDaoProposals;
        if (proposals.length === 0) return 0;
        const success = proposals.filter(p => p.status === 'approved' || p.status === 'executed').length;
        return success / proposals.length;
      }

      case 'collaboration_proposal_rate':
      case 'treaty_proposal_rate':
      case 'resource_sharing_rate':
      case 'joint_venture_rate': {
        const proposals = context.city.getState().interDaoProposals;
        if (proposals.length === 0) return 0;
        const typeMap: Record<string, string> = {
          collaboration_proposal_rate: 'collaboration',
          treaty_proposal_rate: 'treaty',
          resource_sharing_rate: 'resource_sharing',
          joint_venture_rate: 'joint_venture',
        };
        const targetType = typeMap[metric] || metric.replace('_proposal_rate', '');
        const count = proposals.filter(p => p.proposalType === targetType).length;
        return count / proposals.length;
      }

      case 'inter_dao_voting_participation': {
        const proposals = context.city.getState().interDaoProposals;
        if (proposals.length === 0) return 0;
        let totalParticipation = 0;
        let count = 0;
        for (const proposal of proposals) {
          for (const result of Object.values(proposal.votingResults)) {
            const totalVotes = result.votesFor + result.votesAgainst;
            if (result.totalEligibleVoters > 0) {
              totalParticipation += totalVotes / result.totalEligibleVoters;
              count++;
            }
          }
        }
        return count > 0 ? totalParticipation / count : 0;
      }

      case 'cross_dao_approval_alignment': {
        const proposals = context.city.getState().interDaoProposals;
        if (proposals.length === 0) return 0;
        let totalAlignment = 0;
        for (const proposal of proposals) {
          const approvals = Object.values(proposal.votingResults).map(r => r.approved ? 1 as number : 0 as number);
          if (approvals.length === 0) continue;
          const approvalRate = approvals.reduce((sum, v) => sum + v, 0) / approvals.length;
          const alignment = 1 - 2 * Math.min(approvalRate, 1 - approvalRate);
          totalAlignment += alignment;
        }
        return totalAlignment / proposals.length;
      }

      case 'total_shared_budget': {
        const proposals = context.city.getState().interDaoProposals;
        return proposals
          .filter(p => p.status === 'approved' || p.status === 'executed')
          .reduce((sum, p) => sum + (p.sharedBudget || 0), 0);
      }

      case 'resource_flow_volume': {
        const proposals = context.city.getState().interDaoProposals;
        return proposals
          .filter(p => p.status === 'approved' || p.status === 'executed')
          .reduce((sum, p) => sum + (p.resourceAmount || 0), 0);
      }

      default:
        return 0;
    }
  }

  private normalizeMetricName(name: string): BuiltinMetricType {
    const normalized = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') as BuiltinMetricType;
    return normalized;
  }

  /**
   * Generate all DAO configurations to run (handling sweeps)
   * Public for use by BatchRunner
   * Supports single-parameter sweeps and multi-parameter grid searches
   */
  generateConfigs(): Array<{
    daoConfig: RunConfig;
    sweepValue?: number | string | boolean;
    gridValues?: Record<string, number | string | boolean>;
  }> {
    if (this.config.mode === 'city') {
      return this.generateCityConfigs();
    }

    const baseConfig = this.loadBaseConfig();
    const configs: Array<{
      daoConfig: RunConfig;
      sweepValue?: number | string | boolean;
      gridValues?: Record<string, number | string | boolean>;
    }> = [];

    if (!this.config.sweep) {
      // No sweep - just run the base config
      configs.push({ daoConfig: baseConfig });
    } else if (this.config.sweep.grid) {
      // Multi-parameter grid search
      const gridCombinations = this.generateGridCombinations();

      for (const combination of gridCombinations) {
        // Clone base config and apply all grid parameters
        let sweptConfig = JSON.parse(JSON.stringify(baseConfig)) as ResearchConfig;

        for (const [param, value] of Object.entries(combination)) {
          sweptConfig = applySweepValue(sweptConfig, param, value);
        }

        // Create a composite sweep value string for identification
        const sweepLabel = Object.entries(combination)
          .map(([k, v]) => `${k.split('.').pop()}=${v}`)
          .join('_');

        configs.push({
          daoConfig: sweptConfig,
          sweepValue: sweepLabel,
          gridValues: combination,
        });
      }
    } else if (this.config.sweep.parameter) {
      // Single parameter sweep (original behavior)
      const sweepValues = this.getSweepValues();

      for (const value of sweepValues) {
        // Clone base config and apply sweep value
        const sweptConfig = applySweepValue(baseConfig, this.config.sweep.parameter, value);
        configs.push({ daoConfig: sweptConfig, sweepValue: value });
      }
    }

    return configs;
  }

  /**
   * Generate all combinations for a multi-parameter grid search (Cartesian product)
   */
  private generateGridCombinations(): Array<Record<string, number | string | boolean>> {
    if (!this.config.sweep?.grid) return [];

    // Get values for each parameter
    const parameterValues: Array<{
      parameter: string;
      values: (number | string | boolean)[];
    }> = [];

    for (const gridParam of this.config.sweep.grid) {
      let values: (number | string | boolean)[];

      if (gridParam.values) {
        values = gridParam.values;
      } else if (gridParam.range) {
        const { min, max, step } = gridParam.range;
        values = [];
        for (let v = min; v <= max; v += step) {
          values.push(Math.round(v * 1000) / 1000);
        }
      } else {
        continue; // Skip if no values specified
      }

      parameterValues.push({ parameter: gridParam.parameter, values });
    }

    // Check if this is a zip sweep (parallel iteration) vs grid (Cartesian product)
    if (this.config.sweep?.type === 'zip') {
      // Zip: iterate parameters in parallel (each row is one config)
      const len = parameterValues[0]?.values.length || 0;
      const combinations: Array<Record<string, number | string | boolean>> = [];
      for (let i = 0; i < len; i++) {
        const combo: Record<string, number | string | boolean> = {};
        for (const pv of parameterValues) {
          combo[pv.parameter] = pv.values[i % pv.values.length];
        }
        combinations.push(combo);
      }
      return combinations;
    }

    // Generate Cartesian product
    const combinations: Array<Record<string, number | string | boolean>> = [];

    function generateCombinations(
      index: number,
      current: Record<string, number | string | boolean>
    ) {
      if (index === parameterValues.length) {
        combinations.push({ ...current });
        return;
      }

      const { parameter, values } = parameterValues[index];
      for (const value of values) {
        current[parameter] = value;
        generateCombinations(index + 1, current);
      }
    }

    generateCombinations(0, {});
    return combinations;
  }

  /**
   * Generate configs for multi-DAO (city) experiments
   */
  private generateCityConfigs(): Array<{
    daoConfig: RunConfig;
    sweepValue?: number | string | boolean;
  }> {
    const baseCityConfig = this.config.baseCityConfig;
    const scenarios = this.config.scenarios || [];

    if (!baseCityConfig || scenarios.length === 0) {
      throw new Error('City mode requires baseCityConfig and scenarios');
    }

    return scenarios.map((scenario) => ({
      daoConfig: { baseCityConfig, scenario },
      sweepValue: scenario.name,
    }));
  }

  /**
   * Load the base DAO configuration
   */
  private loadBaseConfig(): ResearchConfig {
    let config: ResearchConfig;
    let basePopulation: PopulationSpec | undefined;

    if (this.config.baseConfig.template) {
      const baseline = getBaselineConfig(this.config.baseConfig.template);
      if (!baseline) {
        throw new Error(`Unknown baseline: ${this.config.baseConfig.template}`);
      }
      config = JSON.parse(JSON.stringify(baseline.config)) as ResearchConfig;
      basePopulation = baseline.population;
    } else if (this.config.baseConfig.inline) {
      config = JSON.parse(JSON.stringify(this.config.baseConfig.inline)) as ResearchConfig;
    } else if (this.config.baseConfig.file) {
      throw new Error('File-based config loading not yet implemented');
    } else {
      throw new Error('No base configuration specified');
    }

    const mergedPopulation = mergePopulation(basePopulation, this.config.baseConfig.population);

    if (mergedPopulation) {
      config.population = mergedPopulation;
    }

    if (this.config.baseConfig.overrides) {
      config = deepMerge(config, this.config.baseConfig.overrides as Partial<ResearchConfig>);
    }

    return config;
  }

  /**
   * Get sweep values from sweep config
   */
  private getSweepValues(): (number | string | boolean)[] {
    if (!this.config.sweep) return [];

    if (this.config.sweep.values) {
      return this.config.sweep.values;
    }

    if (this.config.sweep.range) {
      const { min, max, step } = this.config.sweep.range;
      const values: number[] = [];
      for (let v = min; v <= max; v += step) {
        values.push(Math.round(v * 1000) / 1000); // Avoid floating point issues
      }
      return values;
    }

    return [];
  }

  /**
   * Get seed for a specific run
   */
  private getSeed(runIndex: number): number {
    const { seedStrategy, baseSeed = 12345, fixedSeeds } = this.config.execution;

    switch (seedStrategy) {
      case 'sequential':
        return baseSeed + runIndex;
      case 'fixed':
        if (fixedSeeds && fixedSeeds[runIndex] !== undefined) {
          return fixedSeeds[runIndex];
        }
        return baseSeed;
      case 'random':
        console.warn('[experiment-runner] Warning: "random" seed strategy is non-deterministic and breaks reproducibility');
        return Math.floor(Math.random() * 2147483647);
      default:
        return baseSeed + runIndex;
    }
  }

  /**
   * Collect metrics from a completed simulation
   */
  private collectMetrics(simulation: DAOSimulation): Record<string, number> {
    const metrics: Record<string, number> = {};

    for (const metricConfig of this.config.metrics) {
      const value = this.extractMetric(simulation, metricConfig);
      metrics[metricConfig.name] = value;
    }

    return metrics;
  }

  /**
   * Extract a single metric from the simulation
   */
  private extractMetric(simulation: DAOSimulation, metricConfig: MetricConfig): number {
    // Explicit builtin metric
    if (metricConfig.type === 'builtin' && metricConfig.builtin) {
      return this.extractBuiltinMetric(simulation, metricConfig.builtin);
    }

    // Custom expression metric
    if (metricConfig.type === 'custom' && metricConfig.expression) {
      return this.extractCustomMetric(simulation, metricConfig.expression);
    }

    // If no type specified, try to infer from name
    // This allows YAML configs to just specify { name: "proposal_pass_rate" }
    // without requiring explicit type: builtin and builtin: proposal_pass_rate
    if (!metricConfig.type && metricConfig.name) {
      // Try the metric name as a builtin metric (handles both snake_case and PascalCase)
      const builtinName = metricConfig.name.toLowerCase().replace(/\s+/g, '_') as BuiltinMetricType;
      try {
        return this.extractBuiltinMetric(simulation, builtinName);
      } catch {
        // Not a valid builtin metric, fall through to return 0
      }
    }

    return 0;
  }

  /**
   * Extract a builtin metric - comprehensive implementation
   */
  private extractBuiltinMetric(simulation: DAOSimulation, metric: BuiltinMetricType): number {
    const dao = simulation.dao;
    const dataCollector = simulation.dataCollector;
    const latestStats = dataCollector.getLatestStats();
    const history = dataCollector.history || [];
    const proposals = dao.proposals || [];
    const members = dao.members || [];

    switch (metric) {
      // =========================================================================
      // BASIC OUTCOME METRICS
      // =========================================================================

      case 'proposal_pass_rate': {
        const stats = getProposalStats(proposals);
        const resolved = stats.passed + stats.rejected;
        return resolved > 0 ? stats.passed / resolved : 0;
      }

      case 'average_turnout': {
        if (proposals.length === 0) return 0;
        const totalSupply = getTotalVotingPower(members);
        if (totalSupply === 0) return 0;

        let totalTurnout = 0;
        for (const proposal of proposals) {
          const votes = getProposalVotes(proposal);
          const votingPower = votes.reduce((sum, v) => sum + v.weight, 0);
          totalTurnout += votingPower / totalSupply;
        }
        return totalTurnout / proposals.length;
      }

      case 'final_treasury':
        return dao.treasury?.getTokenBalance?.('DAO_TOKEN') ?? dao.treasury?.funds ?? 0;

      case 'final_token_price':
        return dao.treasury?.getTokenPrice?.('DAO_TOKEN') ?? 1;

      case 'final_member_count':
        return members.length;

      case 'final_gini':
        return latestStats?.gini ?? calculateGini(members.map(m => m.tokens || 0));

      case 'final_reputation_gini':
        return latestStats?.repGini ?? calculateGini(members.map(m => m.reputation || 0));

      case 'total_proposals':
        return proposals.length;

      case 'total_projects':
        return dao.projects?.length ?? 0;

      case 'average_token_balance': {
        if (members.length === 0) return 0;
        const totalTokens = members.reduce((sum, m) => sum + (m.tokens || 0), 0);
        return totalTokens / members.length;
      }

      // =========================================================================
      // GOVERNANCE EFFICIENCY METRICS
      // =========================================================================

      case 'quorum_reach_rate': {
        if (proposals.length === 0) return 0;
        const totalSupply = getTotalVotingPower(members);
        const quorumThreshold = (simulation.governanceRule as { quorumPercentage?: number } | undefined)?.quorumPercentage ?? 0.04;

        let quorumMet = 0;
        for (const proposal of proposals) {
          const votes = getProposalVotes(proposal);
          const votingPower = votes.reduce((sum, v) => sum + v.weight, 0);
          if (votingPower / totalSupply >= quorumThreshold) {
            quorumMet++;
          }
        }
        return quorumMet / proposals.length;
      }

      case 'avg_margin_of_victory': {
        const resolvedProposals = proposals.filter(p =>
          p.status === 'approved' || p.status === 'completed' ||
          p.status === 'rejected'
        );
        if (resolvedProposals.length === 0) return 0;

        let totalMargin = 0;
        for (const p of resolvedProposals) {
          const total = (p.votesFor || 0) + (p.votesAgainst || 0);
          if (total > 0) {
            totalMargin += Math.abs((p.votesFor || 0) - (p.votesAgainst || 0)) / total;
          }
        }
        return totalMargin / resolvedProposals.length;
      }

      case 'avg_time_to_decision': {
        const resolvedProposals = proposals.filter(p =>
          p.status === 'approved' || p.status === 'completed' ||
          p.status === 'rejected' || p.status === 'expired'
        );
        if (resolvedProposals.length === 0) return 0;

        let totalTime = 0;
        for (const p of resolvedProposals) {
          const creationTime = p.creationTime || 0;
          const resolvedTime = p.resolvedTime ?? simulation.currentStep;
          totalTime += resolvedTime - creationTime;
        }
        return totalTime / resolvedProposals.length;
      }

      case 'proposal_abandonment_rate': {
        const stats = getProposalStats(proposals);
        if (stats.total === 0) return 0;
        return stats.expired / stats.total;
      }

      case 'proposal_rejection_rate': {
        const stats = getProposalStats(proposals);
        const resolved = stats.passed + stats.rejected;
        return resolved > 0 ? stats.rejected / resolved : 0;
      }

      case 'governance_overhead': {
        const stats = getProposalStats(proposals);
        const resolved = stats.passed + stats.rejected;
        if (resolved === 0) return 0;

        let totalVotesCast = 0;
        for (const p of proposals) {
          const votes = getProposalVotes(p);
          totalVotesCast += votes.length;
        }
        return totalVotesCast / resolved;
      }

      // =========================================================================
      // PARTICIPATION QUALITY METRICS
      // =========================================================================

      case 'unique_voter_count': {
        const uniqueVoters = new Set<string>();
        for (const p of proposals) {
          const votes = getProposalVotes(p);
          for (const v of votes) {
            uniqueVoters.add(v.voterId);
          }
        }
        return uniqueVoters.size;
      }

      case 'voter_participation_rate': {
        if (proposals.length === 0) return 0;

        let totalRate = 0;
        let counted = 0;

        for (const p of proposals) {
          const votes = getProposalVotes(p);
          const eligible = p.snapshotTaken
            ? p.votingPowerSnapshot.size
            : members.length;
          if (eligible <= 0) continue;

          const uniqueVoters = new Set<string>(votes.map(v => v.voterId));
          totalRate += uniqueVoters.size / eligible;
          counted++;
        }

        return counted > 0 ? totalRate / counted : 0;
      }

      case 'voter_concentration_gini': {
        const voterCounts = new Map<string, number>();
        for (const p of proposals) {
          const votes = getProposalVotes(p);
          for (const v of votes) {
            voterCounts.set(v.voterId, (voterCounts.get(v.voterId) || 0) + 1);
          }
        }
        const allMemberVotes = members.map(m => voterCounts.get(m.uniqueId) || 0);
        return calculateGini(allMemberVotes);
      }

      case 'delegate_concentration': {
        const voterPower = new Map<string, number>();
        let totalPower = 0;

        for (const p of proposals) {
          const votes = getProposalVotes(p);
          for (const v of votes) {
            voterPower.set(v.voterId, (voterPower.get(v.voterId) || 0) + v.weight);
            totalPower += v.weight;
          }
        }

        if (totalPower === 0) return 0;

        const sortedPowers = Array.from(voterPower.values()).sort((a, b) => b - a);
        const top10Count = Math.max(1, Math.ceil(sortedPowers.length * 0.1));
        const top10Power = sortedPowers.slice(0, top10Count).reduce((a, b) => a + b, 0);

        return top10Power / totalPower;
      }

      case 'avg_votes_per_proposal': {
        if (proposals.length === 0) return 0;

        let totalVoters = 0;
        for (const p of proposals) {
          const votes = getProposalVotes(p);
          totalVoters += votes.length;
        }
        return totalVoters / proposals.length;
      }

      case 'voter_retention_rate': {
        if (proposals.length < 2) return 0;

        const midpoint = Math.floor(proposals.length / 2);
        const firstHalfVoters = new Set<string>();
        const secondHalfVoters = new Set<string>();

        for (let i = 0; i < proposals.length; i++) {
          const votes = getProposalVotes(proposals[i]);
          for (const v of votes) {
            if (i < midpoint) {
              firstHalfVoters.add(v.voterId);
            } else {
              secondHalfVoters.add(v.voterId);
            }
          }
        }

        if (firstHalfVoters.size === 0) return 0;

        let retained = 0;
        for (const voter of firstHalfVoters) {
          if (secondHalfVoters.has(voter)) {
            retained++;
          }
        }
        return retained / firstHalfVoters.size;
      }

      case 'voting_power_utilization': {
        const totalSupply = getTotalVotingPower(members);
        if (totalSupply === 0 || proposals.length === 0) return 0;

        let totalUsed = 0;
        for (const p of proposals) {
          const votes = getProposalVotes(p);
          totalUsed += votes.reduce((sum, v) => sum + v.weight, 0);
        }

        return totalUsed / (totalSupply * proposals.length);
      }

      // =========================================================================
      // ECONOMIC HEALTH METRICS
      // =========================================================================

      case 'treasury_volatility': {
        const treasuryHistory = history.map(h => h.treasuryFunds || 0);
        return calculateCV(treasuryHistory);
      }

      case 'treasury_growth_rate': {
        if (history.length < 2) return 0;
        const initial = history[0]?.treasuryFunds || 0;
        const final = history[history.length - 1]?.treasuryFunds || dao.treasury?.funds || 0;
        return initial > 0 ? (final - initial) / initial : 0;
      }

      case 'emergency_topup_total': {
        return simulation.totalEmergencyTopup || 0;
      }

      case 'staking_participation': {
        let totalTokens = 0;
        let stakedTokens = 0;
        for (const m of members) {
          totalTokens += (m.tokens || 0) + (m.stakedTokens || 0);
          stakedTokens += m.stakedTokens || 0;
        }
        return totalTokens > 0 ? stakedTokens / totalTokens : 0;
      }

      case 'token_concentration_gini': {
        const holdings = members.map(m => (m.tokens || 0) + (m.stakedTokens || 0));
        return calculateGini(holdings);
      }

      case 'avg_member_wealth': {
        if (members.length === 0) return 0;
        const totalWealth = members.reduce((sum, m) =>
          sum + (m.tokens || 0) + (m.stakedTokens || 0), 0);
        return totalWealth / members.length;
      }

      case 'wealth_mobility': {
        const holdings = getMemberTokensSorted(members);
        if (holdings.length < 2) return 0;
        const gini = calculateGini(holdings.map(h => h.tokens));
        return 1 - gini;
      }

      // =========================================================================
      // ATTACK RESISTANCE METRICS
      // =========================================================================

      case 'whale_influence': {
        if (proposals.length === 0) return 0;

        let totalRate = 0;
        let counted = 0;

        for (const p of proposals) {
          const votes = getProposalVotes(p);
          if (votes.length === 0) {
            totalRate += 0;
            counted++;
            continue;
          }

          let whaleIds: Set<string>;
          if (p.snapshotTaken && p.votingPowerSnapshot.size > 0) {
            const snapshotHoldings = Array.from(p.votingPowerSnapshot.entries())
              .map(([memberId, power]) => ({ memberId, power }))
              .sort((a, b) => b.power - a.power);
            const top10Count = Math.max(1, Math.ceil(snapshotHoldings.length * 0.1));
            whaleIds = new Set(snapshotHoldings.slice(0, top10Count).map(m => m.memberId));
          } else {
            const sortedMembers = getMemberTokensSorted(members);
            const top10Count = Math.max(1, Math.ceil(sortedMembers.length * 0.1));
            whaleIds = new Set(sortedMembers.slice(0, top10Count).map(m => m.id));
          }

          let whaleVotes = 0;
          let totalVotes = 0;
          for (const v of votes) {
            totalVotes += v.weight;
            if (whaleIds.has(v.voterId)) {
              whaleVotes += v.weight;
            }
          }

          totalRate += totalVotes > 0 ? whaleVotes / totalVotes : 0;
          counted++;
        }

        return counted > 0 ? totalRate / counted : 0;
      }

      case 'whale_proposal_rate': {
        if (proposals.length === 0) return 0;

        const sortedMembers = getMemberTokensSorted(members);
        const top10Count = Math.max(1, Math.ceil(sortedMembers.length * 0.1));
        const whaleIds = new Set(sortedMembers.slice(0, top10Count).map(m => m.id));

        let whaleProposals = 0;
        for (const p of proposals) {
          // Fix: Proposal class uses 'creator' field
          if (whaleIds.has(p.creator)) {
            whaleProposals++;
          }
        }

        return whaleProposals / proposals.length;
      }

      case 'governance_capture_risk': {
        // Measure voting power concentration affecting outcomes
        // Calculate what % of winning vote weight came from top 10% of voters
        const memberInfluence = new Map<string, number>();
        let totalInfluence = 0;

        for (const p of proposals) {
          // Only count resolved proposals
          if (p.status !== 'approved' && p.status !== 'rejected' &&
              p.status !== 'completed') {
            continue;
          }

          const votes = getProposalVotes(p);
          const isApproved = p.status === 'approved' || p.status === 'completed';

          for (const v of votes) {
            // Did this voter vote with the winning side?
            const votedWithWinner = (v.vote && isApproved) || (!v.vote && !isApproved);

            if (votedWithWinner) {
              memberInfluence.set(v.voterId, (memberInfluence.get(v.voterId) || 0) + v.weight);
              totalInfluence += v.weight;
            }
          }
        }

        if (totalInfluence === 0) return 0;

        // Sort influences descending and calculate top 10% concentration
        const influences = Array.from(memberInfluence.values()).sort((a, b) => b - a);
        const top10Count = Math.max(1, Math.ceil(influences.length * 0.1));
        const top10Influence = influences.slice(0, top10Count).reduce((a, b) => a + b, 0);

        // Return as 0-1 scale: what fraction of "winning influence" came from top 10%
        return top10Influence / totalInfluence;
      }

      case 'vote_buying_vulnerability': {
        const closeVotes = proposals.filter(p => {
          const total = (p.votesFor || 0) + (p.votesAgainst || 0);
          if (total === 0) return false;
          const margin = Math.abs((p.votesFor || 0) - (p.votesAgainst || 0)) / total;
          return margin < 0.1;
        });

        if (closeVotes.length === 0) return 0;

        let totalFlipCost = 0;
        for (const p of closeVotes) {
          const margin = Math.abs((p.votesFor || 0) - (p.votesAgainst || 0));
          totalFlipCost += margin / 2 + 1;
        }

        return totalFlipCost / closeVotes.length;
      }

      case 'single_entity_control': {
        const totalSupply = getTotalVotingPower(members);
        if (totalSupply === 0) return 0;

        let maxPower = 0;
        for (const m of members) {
          const power = (m.tokens || 0) + (m.stakedTokens || 0);
          maxPower = Math.max(maxPower, power);
        }

        return Math.max(0, Math.min(1, maxPower / totalSupply));
      }

      case 'collusion_threshold': {
        // Apply quadratic adjustment to token holdings for collusion calculation.
        // Raw tokens overstate whale power when quadratic voting or caps are in play.
        // Using sqrt-compressed power gives a more realistic collusion metric.
        const adjustedMembers = members
          .map(m => {
            const raw = (m.tokens || 0) + (m.stakedTokens || 0);
            // Sqrt compression reflects diminishing marginal voting power
            return { id: m.uniqueId, power: Math.sqrt(Math.max(0, raw)) };
          })
          .sort((a, b) => b.power - a.power);

        const totalPower = adjustedMembers.reduce((s, m) => s + m.power, 0);
        if (totalPower === 0 || adjustedMembers.length === 0) return 1;

        let accumulated = 0;
        let count = 0;

        for (const m of adjustedMembers) {
          accumulated += m.power;
          count++;
          if (accumulated > totalPower / 2) {
            break;
          }
        }

        return count / members.length;
      }

      // =========================================================================
      // TEMPORAL DYNAMICS METRICS
      // =========================================================================

      case 'participation_trend': {
        if (proposals.length < 2) return 0;

        const totalSupply = getTotalVotingPower(members);
        if (totalSupply === 0) return 0;

        const participationOverTime = proposals.map(p => {
          const votes = getProposalVotes(p);
          return votes.reduce((sum, v) => sum + v.weight, 0) / totalSupply;
        });

        return calculateSlope(participationOverTime);
      }

      case 'treasury_trend': {
        const treasuryHistory = history.map(h => h.treasuryFunds || 0);
        return calculateSlope(treasuryHistory);
      }

      case 'member_growth_rate': {
        if (history.length < 2) return 0;
        const initial = history[0]?.memberCount || members.length;
        const final = history[history.length - 1]?.memberCount || members.length;
        return initial > 0 ? (final - initial) / initial : 0;
      }

      case 'proposal_rate': {
        const steps = simulation.currentStep || 1;
        return (proposals.length / steps) * 100;
      }

      case 'governance_activity_index': {
        const stats = getProposalStats(proposals);
        const resolved = stats.passed + stats.rejected;
        const resolutionRate = stats.total > 0 ? resolved / stats.total : 0;

        const totalSupply = getTotalVotingPower(members);
        let avgParticipation = 0;
        if (proposals.length > 0 && totalSupply > 0) {
          for (const p of proposals) {
            const votes = getProposalVotes(p);
            avgParticipation += votes.reduce((sum, v) => sum + v.weight, 0) / totalSupply;
          }
          avgParticipation /= proposals.length;
        }

        const steps = simulation.currentStep || 1;
        const proposalRate = proposals.length / steps;

        return proposalRate * avgParticipation * resolutionRate;
      }

      default:
        return 0;
    }
  }

  /**
   * Extract a custom metric using an expression
   */
  private extractCustomMetric(simulation: DAOSimulation, expression: string): number {
    try {
      // Create a sandboxed context with simulation data
      const dao = simulation.dao;
      const dataCollector = simulation.dataCollector;
      const proposals = dao.proposals;
      const members = dao.members;

      // Use Function constructor to evaluate expression
      // eslint-disable-next-line no-new-func
      const fn = new Function('dao', 'dataCollector', 'proposals', 'members', `return ${expression}`);
      const result = fn(dao, dataCollector, proposals, members);

      return typeof result === 'number' ? result : 0;
    } catch (error) {
      console.warn(`Failed to evaluate custom metric expression: ${expression}`, error);
      return 0;
    }
  }

  /**
   * Collect timeline data from simulation
   */
  private collectTimeline(simulation: DAOSimulation): TimelineEntry[] {
    const history = simulation.dataCollector.history;
    const modelVars = simulation.dataCollector.modelVars;

    // Build step→modelVars index for safe alignment
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
      };
    });
  }

  /**
   * Generate experiment summary
   * Public for use by BatchRunner
   */
  generateSummary(results: RunResult[], startTime: number, failedCount: number = 0): ExperimentSummary {
    const endTime = Date.now();

    // Group results by sweep value
    const groupedResults = this.groupResultsBySweepValue(results);

    // Calculate metrics summary for each group
    const metricsSummary: MetricsSummary[] = [];

    for (const [sweepValue, groupResults] of groupedResults) {
      const summary = this.calculateMetricsSummary(groupResults, sweepValue);
      metricsSummary.push(summary);
    }

    // Calculate statistical significance across sweep values
    const statisticalSignificance = this.calculateStatisticalSignificance(
      groupedResults,
      metricsSummary
    );

    // Generate reproducibility manifest
    const manifest = this.generateManifest(results, startTime, endTime);

    return {
      experimentId: `${this.config.name}-${Date.now()}`,
      experimentName: this.config.name,
      totalRuns: results.length,
      successfulRuns: results.length,
      failedRuns: failedCount,
      totalDurationMs: endTime - startTime,
      metricsSummary,
      statisticalSignificance,
      manifest,
    };
  }

  /**
   * Calculate statistical significance across sweep values
   */
  private calculateStatisticalSignificance(
    groupedResults: Map<string, RunResult[]>,
    metricsSummary: MetricsSummary[]
  ): StatisticalSignificance | undefined {
    const sweepValues = Array.from(groupedResults.keys()).filter(k => k !== '_no_sweep_');

    // If no sweep or only one value, limited statistical analysis
    if (sweepValues.length < 2) {
      const primaryMetric = metricsSummary[0]?.metrics[0];
      const runsPerConfig = metricsSummary[0]?.runCount || 0;

      return {
        pairwiseComparisons: [],
        overallPowerAnalysis: {
          currentRunsPerConfig: runsPerConfig,
          recommendedRuns: 30,
          currentPower: runsPerConfig >= 30 ? 0.8 : runsPerConfig / 30 * 0.8,
          minimumEffectDetectable: primaryMetric ? (1.96 + 0.84) / Math.sqrt(runsPerConfig / 2) : 1,
          explanation: sweepValues.length < 2
            ? 'No parameter sweep to compare. Consider adding sweep values for comparative analysis.'
            : `Single configuration with ${runsPerConfig} runs.`,
        },
        recommendations: this.generateRecommendations(metricsSummary, sweepValues.length),
      };
    }

    const metricNames = metricsSummary[0]?.metrics.map(m => m.name) || [];
    const pairwiseComparisons: SweepComparison[] = [];
    const anovaResults: StatisticalSignificance['anova'] = [];

    // All-pairs t-tests between sweep values
    for (let i = 0; i < sweepValues.length; i++) {
      for (let j = i + 1; j < sweepValues.length; j++) {
        const sv1 = sweepValues[i];
        const sv2 = sweepValues[j];
        const group1 = groupedResults.get(sv1) || [];
        const group2 = groupedResults.get(sv2) || [];

        for (const metricName of metricNames) {
          const values1 = group1.map(r => r.metrics[metricName]).filter(v => typeof v === 'number');
          const values2 = group2.map(r => r.metrics[metricName]).filter(v => typeof v === 'number');

          if (values1.length >= 2 && values2.length >= 2) {
            const tTest = stats.independentTTest(values1, values2);
            const effectSize = stats.cohensD(values1, values2);

            pairwiseComparisons.push({
              sweepValue1: this.parseSweepValue(sv1),
              sweepValue2: this.parseSweepValue(sv2),
              metricName,
              tStatistic: tTest.tStatistic,
              degreesOfFreedom: tTest.degreesOfFreedom,
              pValue: tTest.pValue,
              significant: tTest.significant,
              effectSize: {
                cohensD: effectSize.cohensD,
                interpretation: effectSize.interpretation,
              },
            });
          }
        }
      }
    }

    // Apply Benjamini-Hochberg correction for multiple comparisons
    if (pairwiseComparisons.length > 1) {
      const rawPValues = pairwiseComparisons.map(c => c.pValue);
      const correctedPValues = stats.benjaminiHochberg(rawPValues);
      for (let i = 0; i < pairwiseComparisons.length; i++) {
        pairwiseComparisons[i].correctedPValue = correctedPValues[i];
        pairwiseComparisons[i].correctionMethod = 'benjamini-hochberg';
        pairwiseComparisons[i].significant = correctedPValues[i] < 0.05;
      }
    }

    // ANOVA for 3+ sweep values (with effect sizes and non-parametric alternative)
    if (sweepValues.length >= 3) {
      for (const metricName of metricNames) {
        const groups: number[][] = sweepValues.map(sv => {
          const results = groupedResults.get(sv) || [];
          return results.map(r => r.metrics[metricName]).filter(v => typeof v === 'number');
        });

        if (groups.every(g => g.length >= 2)) {
          const anova = stats.oneWayAnova(groups);
          const effectSizes = stats.anovaEffectSizes(groups);

          // Check if data is non-normal (high skewness in any group)
          const groupSkewness = groups.map(g => {
            const analysis = stats.analyzeDistribution(g);
            return Math.abs(analysis.skewness);
          });
          const maxSkewness = Math.max(...groupSkewness);
          const useNonParametric = maxSkewness > 1;

          // Run Kruskal-Wallis if non-normal
          const kruskalWallis = useNonParametric ? stats.kruskalWallis(groups) : undefined;

          anovaResults.push({
            metricName,
            fStatistic: anova.fStatistic,
            dfBetween: anova.dfBetween,
            dfWithin: anova.dfWithin,
            pValue: anova.pValue,
            significant: anova.significant,
            // Enhanced with effect sizes
            etaSquared: effectSizes.etaSquared,
            omegaSquared: effectSizes.omegaSquared,
            effectSizeInterpretation: effectSizes.interpretation,
            // Non-parametric alternative if needed
            kruskalWallis: kruskalWallis ? {
              hStatistic: kruskalWallis.hStatistic,
              pValue: kruskalWallis.pValue,
              significant: kruskalWallis.significant,
            } : undefined,
            nonNormalWarning: useNonParametric,
          });
        }
      }
    }

    // Overall power analysis (using detailed version)
    const avgRunsPerConfig = metricsSummary.reduce((sum, s) => sum + s.runCount, 0) / metricsSummary.length;
    const detailedPower = stats.detailedPowerAnalysis(Math.round(avgRunsPerConfig));
    const power = {
      recommendedRuns: detailedPower.recommendedN.medium,
      currentPower: detailedPower.currentPower,
      minimumEffectDetectable: detailedPower.minimumDetectableEffect,
      explanation: `Power for medium effect (d=0.5): ${(detailedPower.currentPower * 100).toFixed(0)}%. ` +
        `Recommended N for small/medium/large effects: ${detailedPower.recommendedN.small}/${detailedPower.recommendedN.medium}/${detailedPower.recommendedN.large}.`,
    };

    return {
      pairwiseComparisons,
      anova: anovaResults.length > 0 ? anovaResults : undefined,
      overallPowerAnalysis: {
        currentRunsPerConfig: Math.round(avgRunsPerConfig),
        ...power,
      },
      recommendations: this.generateRecommendations(metricsSummary, sweepValues.length),
    };
  }

  /**
   * Generate recommendations based on statistical analysis
   */
  private generateRecommendations(
    metricsSummary: MetricsSummary[],
    numSweepValues: number
  ): string[] {
    const recommendations: string[] = [];
    const avgRuns = metricsSummary.reduce((sum, s) => sum + s.runCount, 0) / metricsSummary.length;

    // Sample size recommendations
    if (avgRuns < 10) {
      recommendations.push(
        `⚠️ Low sample size (${Math.round(avgRuns)} runs per config). ` +
        `Recommend at least 10 runs, ideally 30+ for robust statistical power.`
      );
    } else if (avgRuns < 30) {
      recommendations.push(
        `Sample size of ${Math.round(avgRuns)} runs is acceptable. ` +
        `For detecting small effect sizes, consider 30+ runs per configuration.`
      );
    } else {
      recommendations.push(
        `✓ Good sample size (${Math.round(avgRuns)} runs per config) for statistical analysis.`
      );
    }

    // Variability recommendations
    for (const summary of metricsSummary) {
      for (const metric of summary.metrics) {
        if (metric.coefficientOfVariation > 0.5) {
          recommendations.push(
            `High variability in "${metric.name}" (CV=${(metric.coefficientOfVariation * 100).toFixed(1)}%). ` +
            `Consider longer simulation runs or more controlled initial conditions.`
          );
          break;  // Only report once per metric
        }
      }
    }

    // Skewness recommendations
    for (const summary of metricsSummary) {
      for (const metric of summary.metrics) {
        if (Math.abs(metric.skewness) > 1) {
          const bootstrapNote = metric.bootstrapCi95
            ? 'Bootstrap CIs are included in stats export.'
            : 'Consider using bootstrap confidence intervals or non-parametric tests.';
          recommendations.push(
            `Non-normal distribution detected for "${metric.name}" (skewness=${metric.skewness.toFixed(2)}). ` +
            bootstrapNote
          );
          break;
        }
      }
    }

    // Sweep recommendations
    if (numSweepValues < 2) {
      recommendations.push(
        `No parameter sweep configured. Add sweep values to compare configurations.`
      );
    } else if (numSweepValues === 2) {
      recommendations.push(
        `Two configurations being compared. Consider adding more sweep values ` +
        `to understand the parameter's effect across a broader range.`
      );
    }

    return recommendations;
  }

  /**
   * Group results by sweep value
   */
  private groupResultsBySweepValue(results: RunResult[]): Map<string, RunResult[]> {
    const grouped = new Map<string, RunResult[]>();

    for (const result of results) {
      const key = result.sweepValue !== undefined ? String(result.sweepValue) : '_no_sweep_';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(result);
    }

    return grouped;
  }

  /**
   * Calculate metrics summary for a group of results with full statistical analysis
   */
  private calculateMetricsSummary(results: RunResult[], sweepValue: string): MetricsSummary {
    const metricNames = Object.keys(results[0]?.metrics || {});
    const metrics: MetricStatistics[] = [];

    for (const name of metricNames) {
      const values = results.map((r) => r.metrics[name]).filter((v) => typeof v === 'number');

      if (values.length === 0) {
        metrics.push({
          name,
          mean: 0,
          median: 0,
          std: 0,
          min: 0,
          max: 0,
          values: [],
          standardError: 0,
          ci95: { lower: 0, upper: 0, level: 0.95 },
          ci99: { lower: 0, upper: 0, level: 0.99 },
          bootstrapCi95: undefined,
          bootstrapCi99: undefined,
          coefficientOfVariation: 0,
          skewness: 0,
          iqr: 0,
        });
        continue;
      }

      // Use statistics module for comprehensive analysis
      const analysis = stats.analyzeDistribution(values);

      metrics.push({
        name,
        mean: analysis.mean,
        median: analysis.median,
        std: analysis.std,
        min: analysis.min,
        max: analysis.max,
        values,
        standardError: analysis.standardError,
        ci95: analysis.ci95,
        ci99: analysis.ci99,
        bootstrapCi95: analysis.bootstrapCi95,
        bootstrapCi99: analysis.bootstrapCi99,
        coefficientOfVariation: analysis.coefficientOfVariation,
        skewness: analysis.skewness,
        iqr: analysis.iqr,
      });
    }

    // Calculate power analysis for this configuration
    const primaryMetric = metrics[0];
    const powerAnalysis: PowerAnalysisResult = primaryMetric
      ? {
          currentRunsPerConfig: results.length,
          ...stats.powerAnalysis(results.length, primaryMetric.std),
        }
      : {
          currentRunsPerConfig: results.length,
          recommendedRuns: 30,
          currentPower: 0,
          minimumEffectDetectable: 1,
          explanation: 'No metrics available for power analysis',
        };

    return {
      sweepValue: sweepValue === '_no_sweep_' ? undefined : this.parseSweepValue(sweepValue),
      runCount: results.length,
      metrics,
      powerAnalysis,
    };
  }

  /**
   * Parse sweep value back to original type
   */
  private parseSweepValue(value: string): number | string | boolean {
    if (value === 'true') return true;
    if (value === 'false') return false;
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
    return value;
  }

  /**
   * Generate reproducibility manifest
   */
  private generateManifest(results: RunResult[], startTime: number, endTime: number): ReproducibilityManifest {
    const seeds = results.map((r) => r.seed);

    // Generate config hash (simple hash for now)
    const configStr = JSON.stringify(this.config);
    let configHash = 0;
    for (let i = 0; i < configStr.length; i++) {
      configHash = ((configHash << 5) - configHash + configStr.charCodeAt(i)) | 0;
    }

    // Generate results hash
    const resultsStr = JSON.stringify(results.map((r) => r.metrics));
    let resultsHash = 0;
    for (let i = 0; i < resultsStr.length; i++) {
      resultsHash = ((resultsHash << 5) - resultsHash + resultsStr.charCodeAt(i)) | 0;
    }

    return {
      experimentId: `${this.config.name}-${startTime}`,
      configHash: `hash:${Math.abs(configHash).toString(16)}`,
      software: {
        simulatorVersion: '0.2.0',
        nodeVersion: process.version || 'unknown',
        platform: process.platform || 'unknown',
      },
      execution: {
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        totalRuns: results.length,
        seeds,
        workerCount: this.config.execution.workers ?? 1,
      },
      resultsHash: `hash:${Math.abs(resultsHash).toString(16)}`,
    };
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Run an experiment from config
 */
export async function runExperiment(
  config: ExperimentConfig,
  progressCallback?: ProgressCallback
): Promise<ExperimentSummary> {
  const runner = new ExperimentRunner(config, progressCallback);
  return runner.run();
}

/**
 * Run a single simulation with a DAO config
 */
export async function runSingleSimulation(
  daoConfig: DAOSimulationConfig,
  steps: number,
  seed?: number
): Promise<RunResult> {
  const experimentConfig: ExperimentConfig = {
    name: 'single-run',
    baseConfig: { inline: daoConfig },
    execution: {
      runsPerConfig: 1,
      seedStrategy: seed !== undefined ? 'fixed' : 'random',
      baseSeed: seed ?? Math.floor(Math.random() * 2147483647),
      stepsPerRun: steps,
    },
    metrics: [
      { name: 'Proposal Pass Rate', type: 'builtin', builtin: 'proposal_pass_rate' },
      { name: 'Final Treasury', type: 'builtin', builtin: 'final_treasury' },
      { name: 'Final Token Price', type: 'builtin', builtin: 'final_token_price' },
      { name: 'Final Gini', type: 'builtin', builtin: 'final_gini' },
    ],
    output: {
      directory: 'results',
      formats: ['json'],
    },
  };

  const runner = new ExperimentRunner(experimentConfig);
  const summary = await runner.run();

  // Extract the single result from the summary
  if (summary.metricsSummary.length > 0 && summary.metricsSummary[0].metrics.length > 0) {
    // Reconstruct a RunResult from the summary metrics
    const metrics: Record<string, number> = {};
    for (const m of summary.metricsSummary[0].metrics) {
      metrics[m.name] = m.mean;
    }
    return {
      runId: `${experimentConfig.name}-run-001`,
      experimentName: experimentConfig.name,
      sweepValue: undefined,
      runIndex: 0,
      config: experimentConfig.baseConfig.inline || {},
      seed: experimentConfig.execution.baseSeed!,
      metrics,
      startedAt: summary.manifest.execution.startedAt,
      completedAt: summary.manifest.execution.completedAt,
      durationMs: summary.totalDurationMs,
      stepsCompleted: steps,
    } as RunResult;
  }
  throw new Error('No results from simulation run');
}
