# DAO Governance Research — Plain English Summaries

## What This Is

Non-technical summaries of each research question, written from real experiment data. Every number comes from completed simulation runs — no estimates, no projections.

## Research Questions

| RQ | Title | Runs | Key Finding |
|----|-------|------|-------------|
| [RQ1](./rq1-participation.md) | Quorum Design & Governance Cliffs | 2,300 | Quorum cliff at 10-25%; participation targeting is most effective lever |
| [RQ2](./rq2-governance-capture.md) | Governance Capture Mitigation | 2,700 | Quadratic voting threshold=250 cuts whale influence 43%; vote caps and velocity penalties have zero effect |
| [RQ3](./rq3-proposal-pipeline.md) | Governance Throughput | 900 | Temp-check 50% lifts pass rate 96.4%→98.5% with wider margins of victory |
| [RQ4](./rq4-treasury.md) | The Cost of Stability | 1,200 | Stabilization halves volatility; all configs show negative growth -0.71 |
| [RQ5](./rq5-cooperation.md) | Inter-DAO Cooperation | 500 | Cooperation is costly — isolated DAOs retain more treasury; 23% success rate |
| [RQ6](./rq6-llm-agent-reasoning.md) | LLM Governance | 350 | LLM thinking mode IMPROVES pass rates +6.7pt; enriched prompts + Gemma 4 E4B reverse prior finding |
| [RQ7](./rq7-counterfactual-governance.md) | Counterfactual Governance Rules | 2,940 | Conviction voting 0% pass for ALL 14 DAOs; quadratic consistently best; supermajority paradoxically yields 100% for some DAOs |
| Scale Sweep | Member Count Effects | 500 | 50→500 members cuts capture 18%, single entity control 60% |
| Voting Mechanisms | IRV / Futarchy / Liquid Democracy | 600 | IRV/futarchy/liquid democracy identical to majority rule |
| Black Swan | Shock Resilience | 1,200 | Conviction most resilient to shocks despite failing normally |
| RL Activation | Reinforcement Learning | 150 | Basic Q-learning gives 8pt pass rate boost; diminishing returns |
| Calibration Validation | Digital Twin Accuracy | 4,200 | 14 DAOs differentiated; Nouns 40% pass rate |
| Advanced Mechanisms | IRV / Futarchy (extended) | 600 | All produce null result vs majority |

## Total Experiment Scale

- **21,919 simulation runs** across 13 research areas
- **18 experiments** covering quorum design, capture mitigation, pipeline effects, treasury policy, inter-DAO cooperation, AI governance, counterfactual rule comparison, scale effects, voting mechanisms, shock resilience, reinforcement learning, calibration validation, and advanced mechanisms
- **14 calibrated digital twin DAOs** (Aave, Uniswap, Compound, Arbitrum, Optimism, ENS, Lido, Gitcoin, MakerDAO, Curve, Nouns, Balancer, dYdX, SushiSwap)
- RQ1-RQ5 at N=100 runs/config; RQ6 at N=30/config across 3 models; RQ7 at N=30/config across 14 DAOs × 7 rules; calibration validation at N=300/DAO

## Last Updated

- 2026-04-07
- Source data: `results/paper/*/summary.json` and `results/experiments/*/summary.json`
