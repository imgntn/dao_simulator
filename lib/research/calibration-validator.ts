/**
 * CalibrationValidator
 *
 * Orchestrates per-DAO calibration backtests (and optionally experiment
 * replay) under a frozen seed set, returning a structured ValidationRun
 * that downstream code can diff against the stored baseline.
 *
 * Determinism: every episode is seeded from CALIBRATION_FAST_SEEDS, and
 * BacktestRunner internally offsets by episode index. Two runs of the
 * validator against the same code must produce byte-identical results.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'yaml';
import { BacktestRunner, type BacktestResult } from './backtest-runner';
import { ExperimentRunner } from './experiment-runner';
import type {
  BuiltinMetricType,
  ExperimentConfig,
  ExperimentSummary,
  MetricsSummary,
} from './experiment-config';
import { CalibrationLoader } from '../digital-twins/calibration-loader';
import { logger } from '../utils/logger';
import { sha256 } from './campaign-manifest';
import { EXPERIMENT_DIRECTION_THRESHOLD } from './experiment-baseline-identity';
import {
  BASELINE_DAO_IDS,
  DAO_SUITE_CONFIG,
  BASELINE_CALIBRATION_CONFIG,
  EXPERIMENT_REPLAY_CONTRACTS,
  computeBaselineConfigHash,
} from './baseline-config';
import {
  CALIBRATION_FAST_SEEDS,
  CALIBRATION_SMOKE_SEEDS,
} from './canonical-seeds';
import type {
  DaoValidationResult,
  ExperimentValidationResult,
  ValidationRun,
} from './baseline-schema';

export interface ValidatorOptions {
  /** 'smoke' uses 2 seeds × 2 DAOs for self-tests. 'fast' is the per-DAO suite. 'full' replays experiments too. 'llm' includes Gemma 4 E4B. */
  suite: 'smoke' | 'fast' | 'full' | 'llm';
  /** Override the DAO list (smoke-test usage; defaults to BASELINE_DAO_IDS) */
  daoIds?: readonly string[];
  /** Override episodes per DAO (smoke-test usage; defaults to DAO_SUITE_CONFIG) */
  episodesOverride?: number;
  /** Override steps per episode (smoke-test usage) */
  stepsOverride?: number;
  /** Baseline version this run is being measured against. Stored in the result so the diff layer knows what to compare to. */
  baselineVersion: number;
  /** Optional injection point for tests to inject a stub runner. */
  runner?: BacktestRunner;
  /** Injection point for replay tests; production executes ExperimentRunner. */
  experimentExecutor?: (config: ExperimentConfig) => Promise<ExperimentSummary>;
  /** Test-only injection for synthetic runs that do not consume chronological profiles. */
  configHashOverride?: string;
}

const REQUIRED_REPLAY_METRICS: Readonly<Record<string, {
  name: string;
  builtin: BuiltinMetricType;
}>> = Object.freeze({
  'exp-11-advanced-mechanisms': {
    name: 'Governance Activity Index',
    builtin: 'governance_activity_index',
  },
  'exp-13-cross-dao-governance': {
    name: 'Governance Activity Index',
    builtin: 'governance_activity_index',
  },
  'exp-14-black-swan-resilience': {
    name: 'Voter Participation Rate',
    builtin: 'voter_participation_rate',
  },
  'exp-15-counterfactual-expansion': {
    name: 'Proposal Pass Rate',
    builtin: 'proposal_pass_rate',
  },
  'exp-16-rl-activation': {
    name: 'Governance Activity Index',
    builtin: 'governance_activity_index',
  },
  'exp-17-gemma4-e4b': {
    name: 'Governance Activity Index',
    builtin: 'governance_activity_index',
  },
});

const REPLAY_CONFIG_FILES: Readonly<Record<string, string>> = Object.freeze({
  'exp-11-advanced-mechanisms': '11-advanced-mechanisms.yaml',
  'exp-13-cross-dao-governance': '13-cross-dao-governance-comparison.yaml',
  'exp-14-black-swan-resilience': '14-black-swan-resilience.yaml',
  'exp-15-counterfactual-expansion': '15-counterfactual-expansion.yaml',
  'exp-16-rl-activation': '16-rl-activation.yaml',
  'exp-17-gemma4-e4b': '17-gemma4-e4b.yaml',
});

export function assertReplayMetricConfig(
  experimentId: string,
  config: ExperimentConfig,
): void {
  const required = REQUIRED_REPLAY_METRICS[experimentId];
  if (!required) throw new Error(`No required replay metric is registered for ${experimentId}`);
  const metric = config.metrics.find(candidate => candidate.name === required.name);
  if (!metric || metric.type !== 'builtin' || metric.builtin !== required.builtin) {
    throw new Error(
      `${experimentId} replay config must declare "${required.name}" as builtin `
      + `"${required.builtin}"`
    );
  }
}

export class CalibrationValidator {
  private readonly options: ValidatorOptions;
  private readonly runner: BacktestRunner;

  constructor(options: ValidatorOptions) {
    this.options = options;
    this.runner = options.runner ?? new BacktestRunner();
  }

  async run(): Promise<ValidationRun> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const configHash = this.options.configHashOverride ?? computeBaselineConfigHash();
    const gitSha = this.detectGitSha();
    const runId = `run-${startTime}-${sha256(`${configHash}:${gitSha}:${startTime}`).slice(0, 12)}`;

    const daoIds = this.resolveDaoIds();
    const perDao: Record<string, DaoValidationResult> = {};

    logger.info(
      `CalibrationValidator: starting suite=${this.options.suite} daos=${daoIds.length} configHash=${configHash} gitSha=${gitSha.slice(0, 8)}`,
    );
    if (this.options.suite === 'full' || this.options.suite === 'llm') {
      this.preflightExperimentReplays(this.options.suite === 'llm');
    }

    for (const daoId of daoIds) {
      try {
        const result = await this.runDao(daoId);
        perDao[daoId] = result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`CalibrationValidator: DAO ${daoId} failed: ${message}`);
        throw new Error(`Validation failed for ${daoId}: ${message}`);
      }
    }

    let perExperiment: Record<string, ExperimentValidationResult> | undefined;
    if (this.options.suite === 'full' || this.options.suite === 'llm') {
      perExperiment = await this.replayExperiments(perDao);
    }

    const finishedAt = new Date().toISOString();
    return {
      runId,
      startedAt,
      finishedAt,
      durationMs: Date.now() - startTime,
      suite: this.options.suite,
      gitSha,
      configHash,
      baselineVersion: this.options.baselineVersion,
      perDao,
      perExperiment,
      status: 'pass',
      regressionCount: 0,
    };
  }

  private resolveDaoIds(): readonly string[] {
    if (this.options.daoIds) return this.options.daoIds;
    if (this.options.suite === 'smoke') return BASELINE_DAO_IDS.slice(0, 2);
    const available = new Set(CalibrationLoader.getAvailableIds());
    return BASELINE_DAO_IDS.filter((id) => available.has(id));
  }

  private async runDao(daoId: string): Promise<DaoValidationResult> {
    const suiteConfig = DAO_SUITE_CONFIG[daoId];
    const episodes = this.options.episodesOverride ?? suiteConfig?.episodes ?? 10;
    const stepsPerEpisode = this.options.stepsOverride ?? suiteConfig?.stepsPerEpisode ?? 720;

    const seeds = this.options.suite === 'smoke' ? CALIBRATION_SMOKE_SEEDS : CALIBRATION_FAST_SEEDS;
    const seed = seeds[0];

    const result: BacktestResult = await this.runner.runBacktest({
      daoId,
      episodes,
      stepsPerEpisode,
      seed,
      oracleType: BASELINE_CALIBRATION_CONFIG.oracleType,
      forumEnabled: BASELINE_CALIBRATION_CONFIG.forumEnabled,
      useRealGovernance: BASELINE_CALIBRATION_CONFIG.useRealGovernance,
      evaluationMode: BASELINE_CALIBRATION_CONFIG.evaluationMode,
      includeUncalibratedNull: BASELINE_CALIBRATION_CONFIG.includeUncalibratedNull,
      trainingProfileDir: resolve(
        process.cwd(),
        BASELINE_CALIBRATION_CONFIG.trainingProfileDir
      ),
      holdoutProfileDir: resolve(
        process.cwd(),
        BASELINE_CALIBRATION_CONFIG.holdoutProfileDir
      ),
    });

    const details = result.averageReport.details;
    const ci = result.confidenceIntervals.overall_score;
    return {
      daoId,
      score: result.averageReport.overall_score,
      passRate: finiteOrNull(details['sim_pass_rate']),
      participation: finiteOrNull(details['sim_participation_rate']),
      proposalFrequency: finiteOrNull(details['sim_proposals_per_month']),
      priceLevelError: result.averageReport.available_metrics?.includes('price_level_error')
        ? result.averageReport.metrics.price_level_error
        : null,
      voterConcentration: finiteOrNull(details['sim_voter_concentration']),
      forumActivity: finiteOrNull(details['sim_forum_topics_per_month']),
      availableMetrics: result.averageReport.available_metrics ?? [],
      ci95Lower: ci.ci95Lower,
      ci95Upper: ci.ci95Upper,
      ci95: result.confidenceIntervals,
      episodes,
      stepsPerEpisode,
    };
  }

  private async replayExperiments(
    perDao: Record<string, DaoValidationResult>
  ): Promise<Record<string, ExperimentValidationResult>> {
    const out: Record<string, ExperimentValidationResult> = {};
    const includesLlm = this.options.suite === 'llm';

    for (const [expId, contract] of Object.entries(EXPERIMENT_REPLAY_CONTRACTS)) {
      if (expId === 'exp-17-gemma4-e4b' && !includesLlm) continue;

      const magnitude = expId === 'exp-10-calibration-validation'
        ? mean(Object.values(perDao).map(result => result.score))
        : await this.measureExperimentMagnitude(expId, contract.metric);
      out[expId] = {
        experimentId: expId,
        observedMagnitude: magnitude,
        observedDirection: this.classifyDirection(magnitude),
        metric: contract.metric,
      };
    }

    return out;
  }

  private preflightExperimentReplays(includesLlm: boolean): void {
    for (const experimentId of Object.keys(EXPERIMENT_REPLAY_CONTRACTS)) {
      if (experimentId === 'exp-10-calibration-validation') continue;
      if (experimentId === 'exp-17-gemma4-e4b' && !includesLlm) continue;
      const file = REPLAY_CONFIG_FILES[experimentId];
      if (!file) throw new Error(`No executable replay specification for ${experimentId}`);
      const config = yaml.parse(
        readFileSync(resolve(process.cwd(), 'experiments', 'paper', file), 'utf8')
      ) as ExperimentConfig;
      assertReplayMetricConfig(experimentId, config);
    }
  }

  /**
   * Derive a headline magnitude for a given experiment.
   *
   * Full validation always executes the declared experiment configuration.
   * It never substitutes a stored result or the midpoint of an acceptance
   * interval, because either would make regression validation circular.
   */
  private async measureExperimentMagnitude(expId: string, metric: string): Promise<number> {
    const file = REPLAY_CONFIG_FILES[expId];
    if (!file) {
      throw new Error(`No executable replay specification for ${expId}`);
    }
    const config = yaml.parse(
      readFileSync(resolve(process.cwd(), 'experiments', 'paper', file), 'utf8')
    ) as ExperimentConfig;
    assertReplayMetricConfig(expId, config);
    const summary = this.options.experimentExecutor
      ? await this.options.experimentExecutor(config)
      : await new ExperimentRunner(config).run();
    if (summary.failedRuns > 0 || summary.successfulRuns !== summary.totalRuns) {
      throw new Error(
        `${expId} replay was incomplete: ${summary.successfulRuns}/${summary.totalRuns}`
      );
    }

    const magnitude = this.evaluateHeadlineMagnitude(
      expId,
      metric,
      summary.metricsSummary
    );
    if (!Number.isFinite(magnitude)) {
      throw new Error(`${expId} produced a non-finite headline magnitude`);
    }
    return magnitude;
  }

  private evaluateHeadlineMagnitude(
    expId: string,
    _metric: string,
    summaries: MetricsSummary[]
  ): number {
    const metricName = REQUIRED_REPLAY_METRICS[expId]?.name;
    if (!metricName) throw new Error(`No required replay metric is registered for ${expId}`);
    const values = summaries.map(summary => {
      const metric = summary.metrics.find(candidate => candidate.name === metricName);
      if (!metric) {
        throw new Error(`${expId} is missing required replay metric "${metricName}"`);
      }
      return metric.mean;
    });
    if (values.length < 2) {
      throw new Error(`${expId} requires at least two replay conditions`);
    }
    const mean = (items: number[]) =>
      items.reduce((sum, value) => sum + value, 0) / items.length;

    if (expId === 'exp-13-cross-dao-governance') {
      return Math.max(...values) - Math.min(...values);
    }
    if (expId === 'exp-14-black-swan-resilience') {
      const baseline: number[] = [];
      const shocked: number[] = [];
      summaries.forEach((summary, index) => {
        const label = String(summary.sweepValue);
        (label.includes('black_swan_frequency=0') ? baseline : shocked)
          .push(values[index]);
      });
      if (baseline.length === 0 || shocked.length === 0) {
        // Grid labels are implementation details; stable ordering keeps the
        // first governance-rule block as the zero-frequency reference.
        const blockSize = Math.max(1, Math.floor(values.length / 4));
        return mean(values.slice(blockSize)) - mean(values.slice(0, blockSize));
      }
      return mean(shocked) - mean(baseline);
    }
    if (expId === 'exp-15-counterfactual-expansion') {
      const baseline: number[] = [];
      const counterfactual: number[] = [];
      summaries.forEach((summary, index) => {
        const label = String(summary.sweepValue);
        (label.includes('governance_rule=majority') ? baseline : counterfactual)
          .push(values[index]);
      });
      if (baseline.length > 0 && counterfactual.length > 0) {
        return mean(counterfactual) - mean(baseline);
      }
    }
    if (expId === 'exp-17-gemma4-e4b' && values.length >= 5) {
      return mean(values.slice(3, 5)) - mean(values.slice(1, 3));
    }
    if (expId === 'exp-11-advanced-mechanisms') {
      return mean(values.slice(1)) - values[0];
    }
    return values.at(-1)! - values[0];
  }

  private classifyDirection(magnitude: number): 'positive' | 'negative' | 'neutral' {
    if (magnitude > EXPERIMENT_DIRECTION_THRESHOLD) return 'positive';
    if (magnitude < -EXPERIMENT_DIRECTION_THRESHOLD) return 'negative';
    return 'neutral';
  }

  private detectGitSha(): string {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      return 'unknown';
    }
  }
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function mean(values: number[]): number {
  if (values.length === 0) {
    throw new Error('Cannot derive calibration magnitude from zero DAO results');
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Populate exp-10's observed magnitude using the per-DAO average score
 * from the same validation run. Called by the orchestrator after `run()`
 * returns, before diffing.
 */
export function populateExp10Magnitude(run: ValidationRun): void {
  if (!run.perExperiment) return;
  const exp10 = run.perExperiment['exp-10-calibration-validation'];
  if (!exp10) return;
  const scores = Object.values(run.perDao).map((d) => d.score);
  if (scores.length === 0) return;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  exp10.observedMagnitude = avg;
  exp10.observedDirection = avg > 0.02 ? 'positive' : avg < -0.02 ? 'negative' : 'neutral';
}
