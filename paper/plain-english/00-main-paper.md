# DAO Governance Research — Plain English Summaries

## What This Is

Non-technical summaries of each research question, written from real experiment data. Every number comes from completed simulation runs — no estimates, no projections.

## Research Questions

| RQ | Title | Runs | Key Finding |
|----|-------|------|-------------|
| [RQ1](./rq1-participation.md) | Quorum Design & Governance Cliffs | 2,300 | A 5-point quorum miscalibration silently kills governance |
| [RQ2](./rq2-governance-capture.md) | Governance Capture Mitigation | 2,700 | Quadratic voting cut whale power 43% and *improved* speed |
| [RQ3](./rq3-proposal-pipeline.md) | Governance Throughput | 900 | The speed-quality tradeoff is a false dilemma |
| [RQ4](./rq4-treasury.md) | The Cost of Stability | 1,200 | Stabilization halves volatility at ~17% treasury cost |
| [RQ5](./rq5-cooperation.md) | Inter-DAO Cooperation | 500 | Specialized partnerships generate 50% more proposals |
| [RQ6](./rq6-llm-agent-reasoning.md) | LLM Governance (Exploratory) | 52 | Hybrid AI governance works; pure-LLM does not |

## Total Experiment Scale

- **7,652 simulation runs** across 6 research questions
- **13 experiments** covering quorum design, capture mitigation, pipeline effects, treasury policy, inter-DAO cooperation, and AI governance
- **14 calibrated digital twin DAOs** (Aave, Uniswap, Compound, Arbitrum, Optimism, ENS, Lido, Gitcoin, MakerDAO, Curve, Nouns, Balancer, dYdX, SushiSwap)
- All experiments at N=100 runs/config (except RQ6 at N=13/config and calibration validation at N=100/DAO)

## Last Updated

- 2026-03-01
- Source data: `results/paper/*/summary.json` and `results/experiments/12-llm-reasoning-v4/summary.json`
