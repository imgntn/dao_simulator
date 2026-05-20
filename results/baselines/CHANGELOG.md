# Calibration Baseline Changelog

Every baseline regeneration is logged here. Each entry must explain *why* the baseline changed —
catching scores creeping upward "naturally" via small undocumented changes is the whole point.

## v1 — 2026-05-18 — Initial seed baseline

- Seeded `calibration-baseline.json` from in-memory scores (gitcoin=0.922 … nouns=0.780).
- Seeded `experiment-baseline.json` from experiment findings documented in memory.
- `configHash: seed-v1` and `gitSha: seed-v1` are placeholders — the first real run via
  `scripts/generate-calibration-baseline.ts` will replace this file with measured values
  and bump to v2.
- Confidence intervals are approximate placeholders pending the first real measurement.

Reason: bootstrap the validation loop with the historically-recorded scores so the differ
can detect regressions immediately, without waiting hours for a first real generation pass.

## v2 — 2026-05-19 — v1 measurement — replace seeded placeholder with real backtest results

- Git SHA: `854537f6ac5a3f187b381c76280be444f27b1693`
- Config hash: `5ff76ac80237904e`
- DAOs: 14
- Average score: 0.840

## v3 — 2026-05-19 — v2 measurement — captures averaged per-metric details after averageReports fix

- Git SHA: `854537f6ac5a3f187b381c76280be444f27b1693`
- Config hash: `5ff76ac80237904e`
- DAOs: 14
- Average score: 0.840
