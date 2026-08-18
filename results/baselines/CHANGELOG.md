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

Publication audit note (2026-07-18): this entry documents a non-measured bootstrap artifact,
not scientific evidence. The placeholder JSON was removed from the active artifact tree and
remains recoverable in Git history; every retained baseline JSON below is measured and carries
the producing Git SHA. Historical files use content-addressed names to disambiguate repeated
version numbers from the legacy and chronological baseline lineages.

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

## v1 — 2026-07-17 — Publication-readiness baseline regenerated after chronological holdout and missing-data schema correction

- Git SHA: `5829bdbea511af349fef6aed168d03912ca9baf9`
- Config hash: `f2af9efb7755ff7d7104398740d2a13ef5c6793a4b6dfc6e92461fa803f5cec5`
- DAOs: 14
- Average score: 0.442

## v2 — 2026-07-18 — Replace the legacy aggregate-profile reference with an explicitly pinned chronological train/holdout regression baseline

- Git SHA: `9a2214a885f8027cb3321cf0988fe2a31e3c331e`
- Config hash: `9b16d443b0089d904634a562191651422bf520b08f64bc53fa2e15fe78c0b232`
- DAOs: 14
- Average score: 0.404

## v3 — 2026-07-18 — Measured chronological regression reference after separating scientific hypotheses from replay drift contracts

- Git SHA: `2255202389f57871570cd417f47860bf636848a8`
- Config hash: `385c7bdc842d39666688f237f8752b38fee4ec1d563432ebb3f18f00dd4826a3`
- DAOs: 14
- Average score: 0.404

## v4 — 2026-07-18 — Post-fix temporal baseline preserving observed zero rates and calibrated participation without double-counting fatigue

- Git SHA: `7feb4c20bc07b5b480be4b2a06491dfd82342142`
- Config hash: `385c7bdc842d39666688f237f8752b38fee4ec1d563432ebb3f18f00dd4826a3`
- DAOs: 14
- Average score: 0.433
