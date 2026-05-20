/**
 * Baseline Configuration for Calibration Validation
 *
 * Frozen, canonical configuration used to generate baselines and to
 * re-run the validation loop. Any change to this file MUST be accompanied
 * by an intentional baseline regeneration (see scripts/accept-calibration-baseline.ts)
 * and a `BASELINE-CHANGE:` line in the commit message.
 */

import { createHash } from 'crypto';
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
});

/**
 * Per-metric drift thresholds (multiplied by baseline CI width).
 * If `current.metric` falls outside `baseline.metric ± thresholdMultiplier * ci_width`,
 * the metric is flagged as a regression.
 */
export const METRIC_THRESHOLD_MULTIPLIER: number = 1.5;

/**
 * Headline experiment findings to verify on each full-suite run.
 * Each entry maps experiment ID → expected qualitative finding.
 *
 * `magnitudeRange` is the acceptable [min, max] for the headline number
 * (units depend on the experiment — usually a delta vs. baseline in
 * calibration-score points or pass-rate percentage points).
 */
export interface ExperimentFinding {
  description: string;
  direction: 'positive' | 'negative' | 'neutral';
  magnitudeRange: [number, number];
  metric: string;
}

export const EXPERIMENT_BASELINE_FINDINGS: Readonly<Record<string, ExperimentFinding>> = Object.freeze({
  'exp-10-calibration-validation': {
    description: '14-DAO calibration validation average score',
    direction: 'positive',
    magnitudeRange: [0.82, 0.90],
    metric: 'avg_calibration_score',
  },
  'exp-11-advanced-mechanisms': {
    description: 'Advanced mechanisms (IRV, futarchy, liquid+decay) vs majority: null result',
    direction: 'neutral',
    magnitudeRange: [-0.05, 0.05],
    metric: 'mechanism_score_delta',
  },
  'exp-13-cross-dao-governance': {
    description: 'Cross-DAO governance comparison: scale dominates rule choice',
    direction: 'positive',
    magnitudeRange: [0.10, 0.40],
    metric: 'scale_effect_size',
  },
  'exp-14-black-swan-resilience': {
    description: 'Black swan reduces participation and approval rate',
    direction: 'negative',
    magnitudeRange: [-0.30, -0.05],
    metric: 'black_swan_participation_delta',
  },
  'exp-15-counterfactual-expansion': {
    description: 'Counterfactual governance: most rules within ±0.05 of historical',
    direction: 'neutral',
    magnitudeRange: [-0.05, 0.05],
    metric: 'counterfactual_pass_rate_delta',
  },
  'exp-16-rl-activation': {
    description: 'RL tiers 1–3 progressively improve agent reward',
    direction: 'positive',
    magnitudeRange: [0.02, 0.20],
    metric: 'tier3_vs_baseline_reward',
  },
  'exp-17-gemma4-e4b': {
    description: 'Gemma 4 E4B with enriched DAO briefing + thinking mode improves governance',
    direction: 'positive',
    magnitudeRange: [0.04, 0.10],
    metric: 'llm_thinking_score_delta',
  },
});

/**
 * Compute a stable hash of the entire baseline configuration.
 * Used by CalibrationValidator to detect silent config drift —
 * if this hash doesn't match the baseline file's `configHash`,
 * the validator refuses to compare and exits with code 2.
 */
export function computeBaselineConfigHash(): string {
  const payload = JSON.stringify({
    daos: BASELINE_DAO_IDS,
    daoSuite: DAO_SUITE_CONFIG,
    config: BASELINE_CALIBRATION_CONFIG,
    fastSeeds: CALIBRATION_FAST_SEEDS,
    fullSeeds: CALIBRATION_FULL_SEEDS,
    smokeSeeds: CALIBRATION_SMOKE_SEEDS,
    findings: EXPERIMENT_BASELINE_FINDINGS,
    metricThresholdMultiplier: METRIC_THRESHOLD_MULTIPLIER,
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

/**
 * Exit codes used by all CI entry points.
 * Keep stable — CI configurations depend on these.
 */
export const EXIT_OK = 0;
export const EXIT_REGRESSION = 1;
export const EXIT_CONFIG_DRIFT = 2;
export const EXIT_INFRA_FAILURE = 3;
