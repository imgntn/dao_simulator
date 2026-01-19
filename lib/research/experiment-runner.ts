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
  MetricStatistics,
  ReproducibilityManifest,
  StatisticalSignificance,
  SweepComparison,
  PowerAnalysisResult,
} from './experiment-config';
import * as stats from './statistics';
import { WorkerPool, getRecommendedWorkerCount } from './worker-pool';
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
    const summary = this.generateSummary(results, startTime);

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
          daoConfig,
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
    const allResults = await Promise.all(taskPromises);
    results.push(...allResults);

    // Shutdown the pool
    await pool.shutdown();

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
   * Public for use by BatchRunner
   */
  generateConfigs(): Array<{
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
        // 'approved' is what basic proposals get when they pass
        // 'passed' and 'executed' are from multi-stage proposals
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
          // votes is a Map<string, {vote: boolean, weight: number}>
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
   * Public for use by BatchRunner
   */
  generateSummary(results: RunResult[], startTime: number): ExperimentSummary {
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
      successfulRuns: results.length, // All runs that complete are successful
      failedRuns: 0,
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

    // Pairwise t-tests between consecutive sweep values
    for (let i = 0; i < sweepValues.length - 1; i++) {
      const sv1 = sweepValues[i];
      const sv2 = sweepValues[i + 1];
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

    // ANOVA for 3+ sweep values
    if (sweepValues.length >= 3) {
      for (const metricName of metricNames) {
        const groups: number[][] = sweepValues.map(sv => {
          const results = groupedResults.get(sv) || [];
          return results.map(r => r.metrics[metricName]).filter(v => typeof v === 'number');
        });

        if (groups.every(g => g.length >= 2)) {
          const anova = stats.oneWayAnova(groups);
          anovaResults.push({
            metricName,
            fStatistic: anova.fStatistic,
            dfBetween: anova.dfBetween,
            dfWithin: anova.dfWithin,
            pValue: anova.pValue,
            significant: anova.significant,
          });
        }
      }
    }

    // Overall power analysis
    const avgRunsPerConfig = metricsSummary.reduce((sum, s) => sum + s.runCount, 0) / metricsSummary.length;
    const primaryMetric = metricsSummary[0]?.metrics[0];
    const avgStd = metricsSummary.reduce((sum, s) => sum + (s.metrics[0]?.std || 0), 0) / metricsSummary.length;
    const power = stats.powerAnalysis(Math.round(avgRunsPerConfig), avgStd);

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
          recommendations.push(
            `Non-normal distribution detected for "${metric.name}" (skewness=${metric.skewness.toFixed(2)}). ` +
            `Consider using bootstrap confidence intervals or non-parametric tests.`
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
          coefficientOfVariation: 0,
          skewness: 0,
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
        coefficientOfVariation: analysis.coefficientOfVariation,
        skewness: analysis.skewness,
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
