/**
 * Canonical Seeds for Calibration Validation
 *
 * These seeds define the deterministic basis of the calibration baseline.
 * They are FROZEN — never edit them, never reorder them. Changing them
 * invalidates every baseline that was generated against them.
 *
 * If a future change requires more episodes, append new seeds to the end —
 * existing positions must remain stable.
 *
 * RNG audit (2026-05-18):
 *   - DAOSimulation.run() seeds via resetGlobalRandom() in constructor.
 *   - lib/agents/learning/neural-network.ts uses Math.random, but learning is
 *     disabled for calibration (BacktestRunner forces learning_enabled=false).
 *   - lib/research/statistics.ts bootstrap CI uses Math.random for resampling,
 *     downstream of the simulation — does not affect sim trajectory.
 *   - lib/research/experiment-runner.ts uses Math.random only for the 'random'
 *     seed strategy; calibration uses sequential seeds from this file.
 *   - lib/research/batch-runner.ts and lib/browser/simulation-store.ts are
 *     not on the calibration code path.
 *   Conclusion: BacktestRunner is fully deterministic given a seed.
 */

/**
 * 10 seeds for the fast suite (per-DAO calibration validation).
 * Mirrors BacktestRunner default of 10 episodes per DAO.
 * Each seed is offset by +episode internally; these are the BASE seeds.
 */
export const CALIBRATION_FAST_SEEDS: readonly number[] = Object.freeze([
  4242,
  17,
  9001,
  31337,
  1024,
  65537,
  271828,
  314159,
  86753,
  20260518,
]);

/**
 * 30 seeds for the full suite (experiment replay).
 * Used by the FindingChecker when verifying that headline experiment
 * findings still hold against the current code.
 */
export const CALIBRATION_FULL_SEEDS: readonly number[] = Object.freeze([
  4242, 17, 9001, 31337, 1024, 65537, 271828, 314159, 86753, 20260518,
  77777, 13, 51, 800, 1729, 6174, 999, 42424, 8675309, 4815162342,
  101, 909, 3030, 70707, 12321, 555, 88, 33, 11, 1,
]);

/**
 * 2 seeds for the smoke test (validation-of-the-validator).
 * Tiny suite used by tests/calibration-loop.test.ts.
 */
export const CALIBRATION_SMOKE_SEEDS: readonly number[] = Object.freeze([
  4242,
  17,
]);

/**
 * Canonical seed for any single-shot deterministic operation
 * (e.g. choosing a representative episode for trace export).
 */
export const CALIBRATION_CANONICAL_SEED: number = 4242;
