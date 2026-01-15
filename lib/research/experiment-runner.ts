/**
 * Experiment Runner
 *
 * Executes experiments defined by ExperimentConfig.
 * Handles loading configs, running simulations, and collecting metrics.
 */

import { DAOSimulation, type DAOSimulationConfig } from '../engine/simulation';
import { getTemplate } from '../dao-designer';
import { toSimulationConfig } from '../dao-designer/builder';
import { setSeed } from '../utils/random';
import type { DAODesignerConfig } from '../dao-designer/types';
import type {
  ExperimentConfig,
  RunResult,
  TimelineEntry,
  MetricConfig,
  BuiltinMetricType,
  ExperimentSummary,
  MetricsSummary,
  ReproducibilityManifest,
} from './experiment-config';

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

/**
 * Set a nested property using dot notation
 */
function setNestedProperty(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
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
    this.config = config;
    this.progressCallback = progressCallback;
  }

  /**
   * Run the complete experiment
   */
  async run(): Promise<ExperimentSummary> {
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
    const summary = this.generateSummary(results, startTime);

    return summary;
  }

  /**
   * Run a single simulation
   */
  async runSingle(
    daoConfig: DAODesignerConfig,
    seed: number,
    sweepValue: number | string | boolean | undefined,
    runIndexWithinSweep: number
  ): Promise<RunResult> {
    const runStartTime = Date.now();

    // Set random seed for reproducibility
    setSeed(seed);

    // Convert to simulation config
    const simConfig = this.toSimConfig(daoConfig, seed);

    // Create and run simulation
    const simulation = new DAOSimulation(simConfig);
    const stepsToRun = this.config.execution.stepsPerRun;

    await simulation.run(stepsToRun);

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
      config: daoConfig,
      seed,
      metrics,
      timeline,
      startedAt: new Date(runStartTime).toISOString(),
      completedAt: new Date(runEndTime).toISOString(),
      durationMs: runEndTime - runStartTime,
      stepsCompleted: stepsToRun,
    };
  }

  /**
   * Generate all DAO configurations to run (handling sweeps)
   */
  private generateConfigs(): Array<{
    daoConfig: DAODesignerConfig;
    sweepValue?: number | string | boolean;
  }> {
    const baseConfig = this.loadBaseConfig();
    const configs: Array<{ daoConfig: DAODesignerConfig; sweepValue?: number | string | boolean }> = [];

    if (!this.config.sweep) {
      // No sweep - just run the base config
      configs.push({ daoConfig: baseConfig });
    } else {
      // Generate sweep values
      const sweepValues = this.getSweepValues();

      for (const value of sweepValues) {
        // Clone base config and apply sweep value
        const sweptConfig = JSON.parse(JSON.stringify(baseConfig)) as DAODesignerConfig;
        setNestedProperty(sweptConfig, this.config.sweep.parameter, value);
        configs.push({ daoConfig: sweptConfig, sweepValue: value });
      }
    }

    return configs;
  }

  /**
   * Load the base DAO configuration
   */
  private loadBaseConfig(): DAODesignerConfig {
    let config: DAODesignerConfig;

    if (this.config.baseConfig.template) {
      // Load from template
      const template = getTemplate(this.config.baseConfig.template);
      if (!template) {
        throw new Error(`Unknown template: ${this.config.baseConfig.template}`);
      }
      config = JSON.parse(JSON.stringify(template)) as DAODesignerConfig;
    } else if (this.config.baseConfig.inline) {
      // Use inline config
      config = JSON.parse(JSON.stringify(this.config.baseConfig.inline)) as DAODesignerConfig;
    } else if (this.config.baseConfig.file) {
      // Load from file - would need fs access
      throw new Error('File-based config loading not yet implemented');
    } else {
      throw new Error('No base configuration specified');
    }

    // Apply overrides
    if (this.config.baseConfig.overrides) {
      config = deepMerge(config, this.config.baseConfig.overrides);
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
        return Math.floor(Math.random() * 2147483647);
      default:
        return baseSeed + runIndex;
    }
  }

  /**
   * Convert DAODesignerConfig to DAOSimulationConfig
   */
  private toSimConfig(daoConfig: DAODesignerConfig, seed: number): DAOSimulationConfig {
    const simConfig = toSimulationConfig(daoConfig);

    // Add seed
    simConfig.seed = seed;

    // Apply simulation overrides
    if (this.config.baseConfig.simulationOverrides) {
      const overrides = this.config.baseConfig.simulationOverrides;
      if (overrides.checkpointInterval !== undefined) {
        simConfig.checkpointInterval = overrides.checkpointInterval;
      }
      if (overrides.eventLogging !== undefined) {
        simConfig.eventLogging = overrides.eventLogging;
      }
    }

    // Disable IndexedDB for CLI (not available in Node)
    simConfig.useIndexedDB = false;

    return simConfig;
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
    if (metricConfig.type === 'builtin' && metricConfig.builtin) {
      return this.extractBuiltinMetric(simulation, metricConfig.builtin);
    }

    if (metricConfig.type === 'custom' && metricConfig.expression) {
      return this.extractCustomMetric(simulation, metricConfig.expression);
    }

    return 0;
  }

  /**
   * Extract a builtin metric
   */
  private extractBuiltinMetric(simulation: DAOSimulation, metric: BuiltinMetricType): number {
    const dao = simulation.dao;
    const dataCollector = simulation.dataCollector;
    const latestStats = dataCollector.getLatestStats();

    switch (metric) {
      case 'proposal_pass_rate': {
        const proposals = dao.proposals;
        if (proposals.length === 0) return 0;
        const passed = proposals.filter((p: any) => p.status === 'passed' || p.status === 'executed').length;
        return passed / proposals.length;
      }

      case 'average_turnout': {
        const proposals = dao.proposals;
        if (proposals.length === 0) return 0;
        let totalTurnout = 0;
        for (const proposal of proposals) {
          const votes = (proposal as any).votes || [];
          const totalVotes = votes.reduce((sum: number, v: any) => sum + (v.weight || 1), 0);
          const totalSupply = dao.members.reduce((sum: number, m: any) => sum + (m.tokens || 0), 0);
          if (totalSupply > 0) {
            totalTurnout += totalVotes / totalSupply;
          }
        }
        return totalTurnout / proposals.length;
      }

      case 'final_treasury':
        return dao.treasury.funds;

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

  /**
   * Generate experiment summary
   */
  private generateSummary(results: RunResult[], startTime: number): ExperimentSummary {
    const endTime = Date.now();

    // Group results by sweep value
    const groupedResults = this.groupResultsBySweepValue(results);

    // Calculate metrics summary for each group
    const metricsSummary: MetricsSummary[] = [];

    for (const [sweepValue, groupResults] of groupedResults) {
      const summary = this.calculateMetricsSummary(groupResults, sweepValue);
      metricsSummary.push(summary);
    }

    // Generate reproducibility manifest
    const manifest = this.generateManifest(results, startTime, endTime);

    return {
      experimentId: `${this.config.name}-${Date.now()}`,
      experimentName: this.config.name,
      totalRuns: results.length,
      successfulRuns: results.length, // All runs that complete are successful
      failedRuns: 0,
      totalDurationMs: endTime - startTime,
      metricsSummary,
      manifest,
    };
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
   * Calculate metrics summary for a group of results
   */
  private calculateMetricsSummary(results: RunResult[], sweepValue: string): MetricsSummary {
    const metricNames = Object.keys(results[0]?.metrics || {});
    const metrics: MetricsSummary['metrics'] = [];

    for (const name of metricNames) {
      const values = results.map((r) => r.metrics[name]).filter((v) => typeof v === 'number');

      if (values.length === 0) {
        metrics.push({ name, mean: 0, median: 0, std: 0, min: 0, max: 0, values: [] });
        continue;
      }

      const sorted = [...values].sort((a, b) => a - b);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const median =
        values.length % 2 === 0
          ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
          : sorted[Math.floor(values.length / 2)];
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);

      metrics.push({
        name,
        mean,
        median,
        std,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        values,
      });
    }

    return {
      sweepValue: sweepValue === '_no_sweep_' ? undefined : this.parseSweepValue(sweepValue),
      runCount: results.length,
      metrics,
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
  daoConfig: DAODesignerConfig,
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

  // Return the single run result - we need to run it again to get the full result
  // This is a bit inefficient but keeps the API clean
  const simpleRunner = new ExperimentRunner(experimentConfig);
  return simpleRunner.runSingle(
    daoConfig,
    experimentConfig.execution.baseSeed!,
    undefined,
    0
  );
}
