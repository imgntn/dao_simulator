# Experiment Status

**Last Updated:** 2026-03-17

## Summary

| Status | Count |
|--------|-------|
| Complete | 15 |
| Running | 2 (07, 12 — rerunning for paper output) |
| Total Runs Completed | ~21,770 |

## Experiment Details

| # | Experiment | Expected | Actual | Status | Notes |
|---|-----------|----------|--------|--------|-------|
| 00 | Academic Baseline | 100 | 100 | COMPLETE | pass rate 0.987 |
| 01 | Calibration Participation | 900 | 900 | COMPLETE | 9 configs x 100 runs |
| 02 | Ablation Governance | 800 | 800 | COMPLETE | 8 configs x 100 runs |
| 03 | Sensitivity Quorum | 900 | 900 | COMPLETE | 9 configs x 100 runs |
| 04 | Governance Capture Mitigations | 2,700 | 2,700 | COMPLETE | 27 configs x 100 runs |
| 05 | Proposal Pipeline | 900 | 900 | COMPLETE | 9 configs x 100 runs |
| 06 | Treasury Resilience | 1,200 | 1,200 | COMPLETE | 12 configs x 100 runs |
| 07 | Inter-DAO Cooperation | 500 | 500 | RUNNING | Rerunning for summary.json |
| 08 | Scale Sweep | 500 | 500 | COMPLETE | 5 configs x 100 runs |
| 09 | Voting Mechanisms | 600 | 600 | COMPLETE | 6 configs x 100 runs |
| 10 | Calibration Validation | 4,200 | 4,200 | COMPLETE | 14 DAOs x 300 runs |
| 11 | Advanced Mechanisms | 500 | 500 | COMPLETE | IRV, futarchy, delegation |
| 12 | LLM Agent Reasoning | 1,000 | 1,000 | RUNNING | Rerunning to paper dir |
| 13 | Cross-DAO Governance Comparison | 1,680 | 1,680 | COMPLETE | 56 configs x 30 runs |
| 14 | Black Swan Resilience | 1,200 | 1,200 | COMPLETE | 12 configs x 100 runs |
| 15 | Counterfactual Expansion | 2,940 | 2,940 | COMPLETE | 98 configs x 30 runs |
| 16 | RL Activation | 150 | 150 | COMPLETE | 5 RL tiers tested |

## ESM Fix (2026-03-17)

Experiments 10, 13, and 15 (calibration-based) were failing with `require is not defined` in ESM fork workers. Fixed by setting `globalThis.__nodeRequire = createRequire(import.meta.url)` in `fork-worker.ts` and using it as fallback in `calibration-loader.ts`, `simulation.ts`, `checkpoint.ts`, `response-cache.ts`, `dao.ts`, and `server-paths.ts`.

## Paper Update Pipeline

All 15 completed experiments fed into paper update (`paper-update.ts --no-llm --allow-stale`):
- Updated 14 LaTeX sections with latest numbers
- Generated 3 charts (quorum_passrate, scale_participation, voting_comparison)
- Regenerated executive summary
- Total: 19,170 runs across 15 experiments
