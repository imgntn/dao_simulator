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
import {
  deriveSeed,
  SEED_DERIVATION_SCHEMA_VERSION,
  setSeed,
} from '../utils/random';
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
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { canonicalJson, sha256, sha256File } from './campaign-manifest';
import { buildStableRunId } from './run-identity';
import { extractBuiltinMetric } from './builtin-metric-extractor';
import { assertFiniteRunResults } from './metric-validation';
import {
  METRIC_REGISTRY,
  METRIC_REGISTRY_SCHEMA_VERSION,
} from './metric-registry';
import { validateExperimentConfig } from './experiment-config-validator';
import { runLearningEpisodes } from './learning-episodes';
import { collectLlmRunDiagnostics } from './llm-run-diagnostics';
import { sampleTimeline } from './timeline-sampling';
import { campaignConditionId } from './condition-identity';

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

function resolveResearchHorizon(config: RunConfig, fallback: number): number {
  if ('research_horizon_steps' in config && config.research_horizon_steps !== undefined) {
    const value = Number(config.research_horizon_steps);
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error('research_horizon_steps must be a positive safe integer');
    }
    return value;
  }
  return fallback;
}

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

  constructor(config: ExperimentConfig, progressCallback?: ProgressCallback) {
    validateExperimentConfig(config);
    this.config = config;
    this.progressCallback = progressCallback;
  }

  /**
   * Run the complete experiment
   * Uses parallel execution if workers > 1
   */
  async run(): Promise<ExperimentSummary> {
    if (typeof process !== 'undefined') {
      process.env.DAO_SIM_RESEARCH_MODE = '1';
    }
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
        const seed = this.getSeedForRun(i, sweepValue);

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
        const result = await this.runSingle(
          daoConfig,
          seed,
          sweepValue,
          i,
          resolveResearchHorizon(daoConfig, this.config.execution.stepsPerRun),
        );
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
        const seed = this.getSeedForRun(i, sweepValue);

        tasks.push({
          runId: this.buildRunId(sweepValue, i),
          conditionId: campaignConditionId(sweepValue, daoConfig),
          config: daoConfig as ResearchConfig,
          simConfig: {
            checkpointInterval: this.config.baseConfig.simulationOverrides?.checkpointInterval,
            eventLogging: this.config.baseConfig.simulationOverrides?.eventLogging,
          },
          seed,
          stepsPerRun: resolveResearchHorizon(
            daoConfig,
            this.config.execution.stepsPerRun,
          ),
          learningEpisodesPerRun: this.config.execution.learningEpisodesPerRun,
          metrics: this.config.metrics,
          includeTimeline: this.config.output.includeTimeline ?? false,
          timelineStride: this.config.output.timelineStride,
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
    runIndexWithinSweep: number,
    stepsOverride?: number,
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
    const stepsToRun = stepsOverride
      ?? resolveResearchHorizon(daoConfig, this.config.execution.stepsPerRun);

    await runLearningEpisodes(
      simulation,
      stepsToRun,
      this.config.execution.learningEpisodesPerRun ?? 1
    );

    // Collect metrics
    const metrics = this.collectMetrics(simulation);

    // Collect timeline if requested
    let timeline: TimelineEntry[] | undefined;
    if (this.config.output.includeTimeline) {
      timeline = sampleTimeline(
        this.collectTimeline(simulation),
        this.config.output.timelineStride ?? 1,
      );
    }

    const runEndTime = Date.now();

    // Build run ID
    const runId = this.buildRunId(sweepValue, runIndexWithinSweep);

    return {
      runId,
      experimentName: this.config.name,
      conditionId: campaignConditionId(sweepValue, daoConfig),
      sweepValue,
      runIndex: runIndexWithinSweep,
      config: simConfig,
      seed,
      metrics,
      timeline,
      llmDiagnostics: collectLlmRunDiagnostics(simulation),
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
    const runId = this.buildRunId(sweepValue, runIndexWithinSweep);

    return {
      runId,
      experimentName: this.config.name,
      conditionId: campaignConditionId(sweepValue, runConfig),
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

  private buildRunId(
    sweepValue: number | string | boolean | undefined,
    runIndexWithinSweep: number
  ): string {
    return buildStableRunId(this.config, sweepValue, runIndexWithinSweep);
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
        const final = simulation.dao.treasury.getTokenBalance(
          tokenSymbol || simulation.dao.tokenSymbol
        );
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
        return extractBuiltinMetric(simulation, metric);
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
          const tokenSymbol = context.tokenByDao.get(sim.dao.daoId) || sim.dao.tokenSymbol;
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
          const tokenSymbol = context.tokenByDao.get(sim.dao.daoId) || sim.dao.tokenSymbol;
          total += sim.dao.treasury.getTokenBalance(tokenSymbol);
        }
        return total;
      }

      case 'participation_convergence': {
        const rates = simulations.map(sim => extractBuiltinMetric(sim, 'voter_participation_rate'));
        if (rates.length === 0) return 0;
        const cv = calculateCV(rates);
        return Math.max(0, 1 - cv);
      }

      case 'governance_quality_variance': {
        const risks = simulations.map(sim => extractBuiltinMetric(sim, 'governance_capture_risk'));
        return calculateVariance(risks);
      }

      case 'transferred_member_impact': {
        if (simulations.length < 2) return 0;
        const flows = daoIds.map(id => (context.transfersIn.get(id) || 0) - (context.transfersOut.get(id) || 0));
        const participation = simulations.map(sim => extractBuiltinMetric(sim, 'voter_participation_rate'));
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
      if (parameterValues.some(item => item.values.length !== len)) {
        throw new Error('Zip sweep dimensions must have equal lengths');
      }
      const combinations: Array<Record<string, number | string | boolean>> = [];
      for (let i = 0; i < len; i++) {
        const combo: Record<string, number | string | boolean> = {};
        for (const pv of parameterValues) {
          combo[pv.parameter] = pv.values[i];
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
  getSeedForRun(
    runIndex: number,
    sweepValue?: number | string | boolean
  ): number {
    if (this.config.sweep?.parameter === 'seed') {
      if (
        typeof sweepValue !== 'number' ||
        !Number.isSafeInteger(sweepValue)
      ) {
        throw new Error('A seed sweep requires safe-integer numeric sweep values');
      }
      const seed = sweepValue + runIndex;
      if (!Number.isSafeInteger(seed)) {
        throw new Error(`Derived seed is outside the safe integer range: ${seed}`);
      }
      return seed;
    }

    const { seedStrategy, baseSeed = 12345, fixedSeeds } = this.config.execution;

    switch (seedStrategy) {
      case 'sequential':
        return baseSeed + runIndex;
      case 'fixed':
        if (!fixedSeeds || fixedSeeds[runIndex] === undefined) {
          throw new Error(`Missing fixed seed for replicate index ${runIndex}`);
        }
        return fixedSeeds[runIndex];
      case 'random':
        throw new Error('"random" seed strategy is prohibited for reproducible research');
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
      if (!Number.isFinite(value)) {
        throw new Error(`Metric "${metricConfig.name}" produced non-finite value: ${value}`);
      }
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
      return extractBuiltinMetric(simulation, metricConfig.builtin);
    }

    // Custom expression metric
    if (metricConfig.type === 'custom' && metricConfig.expression) {
      return this.extractCustomMetric(simulation, metricConfig.expression);
    }

    throw new Error(`Metric "${metricConfig.name}" has an invalid explicit configuration`);
  }

  /**
   * Extract a builtin metric - comprehensive implementation
   */
  private extractCustomMetric(simulation: DAOSimulation, expression: string): number {
    try {
      // Create a sandboxed context with simulation data
      const dao = simulation.dao;
      const dataCollector = simulation.dataCollector;
      const proposals = dao.proposals;
      const members = dao.members;

      // Use Function constructor to evaluate expression
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
        participationRate: mv?.avgParticipationRate ?? 0,
      };
    });
  }

  /**
   * Generate experiment summary
   * Public for use by BatchRunner
   */
  generateSummary(results: RunResult[], startTime: number, failedCount: number = 0): ExperimentSummary {
    assertFiniteRunResults(results, `Experiment "${this.config.name}" summary`);
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
      const values = results.map((r) => r.metrics[name]);
      for (const value of values) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new Error(
            `Metric "${name}" contains a non-finite replicate value before aggregation`
          );
        }
      }

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
    const rootDir = process.cwd();
    const gitValue = (args: string[], fallback: string): string => {
      try {
        return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim();
      } catch {
        return fallback;
      }
    };
    const packagePath = path.join(rootDir, 'package.json');
    const lockfilePath = path.join(rootDir, 'package-lock.json');
    const simulatorVersion = fs.existsSync(packagePath)
      ? String(JSON.parse(fs.readFileSync(packagePath, 'utf8')).version ?? 'unknown')
      : 'unknown';
    const gitStatus = gitValue(['status', '--porcelain'], 'unknown');
    const selectedMetricDefinitions = Object.fromEntries(
      this.config.metrics
        .filter(metric => metric.type === 'builtin' && metric.builtin)
        .map(metric => metric.builtin!)
        .sort()
        .map(id => [id, METRIC_REGISTRY[id]])
    ) as Partial<typeof METRIC_REGISTRY>;
    const subsystemStreams = [
      'scheduler:activation',
      'events',
      'shocks',
      'shocks:schedule',
      'forum',
      'membership',
      'governance',
      'markets',
      'llm:assignment',
      'initialization:agents',
      'initialization:calibration',
    ];
    const namespaces = this.config.mode === 'city'
      ? Array.from(new Set(
          (this.config.scenarios ?? [])
            .flatMap(scenario => scenario.daos)
            .map(dao => `dao:${dao.id}`)
        )).sort()
      : ['simulation'];
    const derivedSubsystemSeeds = Object.fromEntries(
      Array.from(new Set(seeds)).sort((a, b) => a - b).map(seed => [
        String(seed),
        Object.fromEntries(
          namespaces.flatMap(namespace =>
            subsystemStreams.map(stream => {
              const id = `${namespace}:${stream}`;
              return [id, deriveSeed(seed, id)];
            })
          )
        ),
      ])
    );

    return {
      schemaVersion: 2,
      experimentId: `${this.config.name}-${startTime}`,
      configHash: `sha256:${sha256(canonicalJson(this.config))}`,
      software: {
        simulatorVersion,
        nodeVersion: process.version || 'unknown',
        platform: process.platform || 'unknown',
        architecture: process.arch || 'unknown',
        gitCommit: gitValue(['rev-parse', 'HEAD'], 'unknown'),
        gitBranch: gitValue(['branch', '--show-current'], 'unknown'),
        gitDirty: gitStatus !== '' && gitStatus !== 'unknown',
        packageLockHash: fs.existsSync(lockfilePath)
          ? `sha256:${sha256File(lockfilePath)}`
          : 'missing',
      },
      execution: {
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        totalRuns: results.length,
        seeds,
        workerCount: this.config.execution.workers ?? 1,
        command: process.argv,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: Intl.DateTimeFormat().resolvedOptions().locale,
        rngAlgorithm: 'mulberry32',
        rngSchemaVersion: 2,
        seedDerivationSchemaVersion: SEED_DERIVATION_SCHEMA_VERSION,
        derivedSubsystemSeeds,
      },
      metricDefinitions: {
        registrySchemaVersion: METRIC_REGISTRY_SCHEMA_VERSION,
        hash: `sha256:${sha256(canonicalJson(selectedMetricDefinitions))}`,
        versions: Object.fromEntries(
          Object.entries(selectedMetricDefinitions).map(([id, definition]) => [
            id,
            definition!.definitionVersion,
          ])
        ),
      },
      resultsHash: `sha256:${sha256(canonicalJson(results.map((result) => ({
        runId: result.runId,
        seed: result.seed,
        metrics: result.metrics,
      }))))}`,
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
      seedStrategy: 'fixed',
      baseSeed: seed ?? 42,
      fixedSeeds: [seed ?? 42],
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
