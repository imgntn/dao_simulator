# Experiment Status

**Last Updated:** 2026-03-25

## Summary

| Status | Count |
|--------|-------|
| Complete | 17 |
| Paused | 1 (12b big-tier LLM, 50%) |
| Total Runs Completed | 21,869 |

## Experiment Details

| # | Experiment | Runs | Status |
|---|-----------|------|--------|
| 00 | Academic Baseline | 100 | COMPLETE |
| 01 | Calibration Participation | 900 | COMPLETE |
| 02 | Ablation Governance | 800 | COMPLETE |
| 03 | Sensitivity Quorum | 900 | COMPLETE |
| 04 | Governance Capture Mitigations | 2,700 | COMPLETE |
| 05 | Proposal Pipeline | 900 | COMPLETE |
| 06 | Treasury Resilience | 1,200 | COMPLETE |
| 07 | Inter-DAO Cooperation | 500 | COMPLETE |
| 08 | Scale Sweep | 500 | COMPLETE |
| 09 | Voting Mechanisms | 600 | COMPLETE |
| 10 | Calibration Validation | 4,200 | COMPLETE |
| 11 | Advanced Mechanisms | 500 | COMPLETE |
| 12 | LLM Small Models | 300 | COMPLETE |
| 12b | LLM Big Models | 150/300 | PAUSED 50% |
| 13 | Cross-DAO Governance Comparison | 1,680 | COMPLETE |
| 14 | Black Swan Resilience | 1,200 | COMPLETE |
| 15 | Counterfactual Expansion | 2,940 | COMPLETE |
| 16 | RL Activation | 150 | COMPLETE |

## Key Findings

1. **Scale is #1** — 50→500 members: -18% capture risk, -60% single entity control
2. **Quadratic voting only anti-whale tool** — threshold=250 cuts whale influence 43%; vote caps and velocity penalties have zero effect
3. **Advanced mechanisms null result** — IRV, futarchy, liquid democracy identical to majority
4. **LLMs decrease governance** — all-LLM drops pass rates 7-9pt below baseline
5. **Conviction voting broken** — 0% pass rate for ALL 14 calibrated DAOs
6. **Black swan paradox** — conviction most resilient to shocks despite failing normally
7. **RL diminishing returns** — basic Q-learning +8.1pt, tiers 2-4 add only +0.2pt
8. **Quorum cliff** — sharp binary threshold at 10-25%, not gradual
9. **Cooperation is costly** — isolated DAOs retain more treasury, 23% cross-DAO success
10. **Calibration works** — 14 real DAOs differentiated (Nouns 40% pass rate)

## Resume Commands

### 12b Big-Tier LLM (paused at 50%)
```bash
ollama serve
npx tsx scripts/run-experiment.ts experiments/paper/12b-llm-big-models.yaml --resume --concurrency 3
```

### Paper LLM Prose Update (needs Ollama + qwen2.5:32b)
```bash
ollama serve
npm run paper:update
```

## Testing

914 tests passing across 42 test files (0 failures, 0 type errors).
