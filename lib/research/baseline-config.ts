/**
 * Baseline Configuration for Calibration Validation
 *
 * Frozen, canonical configuration used to generate baselines and to
 * re-run the validation loop. Any change to this file MUST be accompanied
 * by an intentional baseline regeneration (see scripts/accept-calibration-baseline.ts)
 * and a `BASELINE-CHANGE:` line in the commit message.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { canonicalJson, sha256 } from './campaign-manifest';
import {
  CALIBRATION_FAST_SEEDS,
  CALIBRATION_FULL_SEEDS,
  CALIBRATION_SMOKE_SEEDS,
} from './canonical-seeds';

/**
 * The 14 DAOs covered by the calibration baseline.
 * Order matters for baseline file determinism.
 */
export const BASELINE_DAO_IDS: readonly string[] = Object.freeze([
  'aave',
  'arbitrum',
  'balancer',
  'compound',
  'curve',
  'dydx',
  'ens',
  'gitcoin',
  'lido',
  'maker_sky',
  'nouns',
  'optimism',
  'sushiswap',
  'uniswap',
]);

/**
 * Per-DAO suite tuning. Defaults: 10 episodes, 720 steps.
 * High-variance DAOs (Nouns) get more episodes; ultra-stable DAOs
 * may be reduced to save time once adaptive sampling has data.
 *
 * The `dropThreshold` is how far below baseline a score may slip
 * before being flagged as a regression. Looser for noisy DAOs.
 */
export interface DaoSuiteConfig {
  episodes: number;
  stepsPerEpisode: number;
  dropThreshold: number;
}

const DEFAULT_DAO_CONFIG: DaoSuiteConfig = {
  episodes: 10,
  stepsPerEpisode: 720,
  dropThreshold: 0.02,
};

export const DAO_SUITE_CONFIG: Readonly<Record<string, DaoSuiteConfig>> = Object.freeze({
  aave: DEFAULT_DAO_CONFIG,
  arbitrum: DEFAULT_DAO_CONFIG,
  balancer: DEFAULT_DAO_CONFIG,
  compound: DEFAULT_DAO_CONFIG,
  curve: DEFAULT_DAO_CONFIG,
  dydx: DEFAULT_DAO_CONFIG,
  ens: DEFAULT_DAO_CONFIG,
  gitcoin: DEFAULT_DAO_CONFIG,
  lido: DEFAULT_DAO_CONFIG,
  maker_sky: DEFAULT_DAO_CONFIG,
  nouns: { episodes: 10, stepsPerEpisode: 720, dropThreshold: 0.04 },
  optimism: DEFAULT_DAO_CONFIG,
  sushiswap: DEFAULT_DAO_CONFIG,
  uniswap: DEFAULT_DAO_CONFIG,
});

/**
 * The frozen simulation config applied to every calibration validation run.
 * Every knob the simulation reads is pinned here so the baseline reflects
 * a single, reproducible configuration.
 */
export const BASELINE_CALIBRATION_CONFIG = Object.freeze({
  oracleType: 'calibrated_gbm' as const,
  forumEnabled: true,
  learningEnabled: false,
  useRealGovernance: false,
  evaluationMode: 'temporal_holdout' as const,
  includeUncalibratedNull: true,
  trainingProfileDir: path.join('results', 'historical', 'validation', 'train'),
  holdoutProfileDir: path.join('results', 'historical', 'validation', 'holdout'),
});

/**
 * Hash the exact chronological calibration profiles consumed by the baseline.
 * This prevents aggregate and temporal evaluations—or two different historical
 * snapshots—from sharing a config hash and being compared as if equivalent.
 */
export function computeCalibrationProfileBundleHash(
  rootDir: string = process.cwd()
): string {
  const profileFiles = BASELINE_DAO_IDS.flatMap(daoId => [
    path.join(BASELINE_CALIBRATION_CONFIG.trainingProfileDir, `${daoId}_profile.json`),
    path.join(BASELINE_CALIBRATION_CONFIG.holdoutProfileDir, `${daoId}_profile.json`),
  ]).sort();
  const bundle = profileFiles.map(relativePath => {
    const absolutePath = path.resolve(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(
        `Missing calibration profile required for baseline hashing: ${absolutePath}`
      );
    }
    return {
      path: relativePath.replaceAll(path.sep, '/'),
      sha256: sha256(fs.readFileSync(absolutePath)),
    };
  });
  return sha256(canonicalJson(bundle));
}

/**
 * Per-metric drift thresholds (multiplied by baseline CI width).
 * If `current.metric` falls outside `baseline.metric ± thresholdMultiplier * ci_width`,
 * the metric is flagged as a regression.
 */
export const METRIC_THRESHOLD_MULTIPLIER: number = 1.5;

/**
 * Executable headline-measurement contracts for each full-suite replay.
 * Expected directions and ranges live only in a measured experiment-baseline
 * artifact; scientific hypotheses live in the preregistered research metadata.
 */
export interface ExperimentReplayContract {
  description: string;
  metric: string;
}

export const EXPERIMENT_REPLAY_CONTRACTS: Readonly<
  Record<string, ExperimentReplayContract>
> = Object.freeze({
  'exp-10-calibration-validation': {
    description: '14-DAO calibration validation average score',
    metric: 'avg_calibration_score',
  },
  'exp-11-advanced-mechanisms': {
    description: 'Advanced mechanisms (IRV, futarchy, liquid+decay) vs majority: null result',
    metric: 'mechanism_score_delta',
  },
  'exp-13-cross-dao-governance': {
    description: 'Range of governance activity across calibrated DAO-rule conditions',
    metric: 'governance_activity_range',
  },
  'exp-14-black-swan-resilience': {
    description: 'Black-swan participation contrast against the no-shock condition',
    metric: 'black_swan_participation_delta',
  },
  'exp-15-counterfactual-expansion': {
    description: 'Counterfactual governance pass-rate contrast across rules',
    metric: 'counterfactual_pass_rate_delta',
  },
  'exp-16-rl-activation': {
    description: 'Full RL stack changes governance activity relative to disabled learning',
    metric: 'full_rl_governance_activity_delta',
  },
  'exp-17-gemma4-e4b': {
    description: 'Gemma 4 E4B thinking-mode governance-activity contrast',
    metric: 'llm_thinking_governance_activity_delta',
  },
});

/**
 * Compute a stable hash of the entire baseline configuration.
 * Used by CalibrationValidator to detect silent config drift —
 * if this hash doesn't match the baseline file's `configHash`,
 * the validator refuses to compare and exits with code 2.
 */
export function computeBaselineConfigHash(): string {
  const payload = {
    daos: BASELINE_DAO_IDS,
    daoSuite: DAO_SUITE_CONFIG,
    config: BASELINE_CALIBRATION_CONFIG,
    fastSeeds: CALIBRATION_FAST_SEEDS,
    fullSeeds: CALIBRATION_FULL_SEEDS,
    smokeSeeds: CALIBRATION_SMOKE_SEEDS,
    replayContracts: EXPERIMENT_REPLAY_CONTRACTS,
    metricThresholdMultiplier: METRIC_THRESHOLD_MULTIPLIER,
    calibrationProfileBundleHash: computeCalibrationProfileBundleHash(),
  };
  return sha256(canonicalJson(payload));
}

/**
 * Exit codes used by all CI entry points.
 * Keep stable — CI configurations depend on these.
 */
export const EXIT_OK = 0;
export const EXIT_REGRESSION = 1;
export const EXIT_CONFIG_DRIFT = 2;
export const EXIT_INFRA_FAILURE = 3;
