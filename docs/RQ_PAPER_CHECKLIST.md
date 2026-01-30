# RQ -> Paper Checklist (Figures and Tables)

Use this as a concrete checklist for wiring each research question to
specific figures/tables in `paper/` and in the generated report pack.

Legend: [ ] = todo, [x] = done

## RQ1 Participation dynamics
- [ ] Experiment: `experiments/paper/01-calibration-participation.yaml`
- [ ] Figure: Turnout vs participation_target_rate (line or heatmap)
- [ ] Figure: Voter retention vs participation_target_rate
- [ ] Table: Summary stats (mean, std, CI) for turnout/quorum/retention

## RQ2 Governance capture mitigation
- [ ] Experiment: `experiments/paper/04-governance-capture-mitigations.yaml`
- [ ] Figure: Whale influence vs mitigation settings (cap/quad/velocity)
- [ ] Figure: Governance capture risk vs throughput tradeoff
- [ ] Table: Top mitigation configs with lowest capture risk

## RQ3 Proposal pipeline effects
- [ ] Experiment: `experiments/paper/05-proposal-pipeline.yaml`
- [ ] Figure: Time-to-decision vs temp-check fraction
- [ ] Figure: Pass rate vs fast-track settings
- [ ] Table: Abandonment and quorum reach by pipeline settings

## RQ4 Treasury resilience
- [ ] Experiment: `experiments/paper/06-treasury-resilience.yaml`
- [ ] Figure: Treasury volatility vs stabilization settings
- [ ] Figure: Treasury trend/growth under different buffer fractions
- [ ] Table: Final treasury + volatility by config

## RQ5 Inter-DAO cooperation
- [ ] Experiment: `experiments/paper/07-inter-dao-cooperation.yaml`
- [ ] Figure: Inter-DAO success rate by scenario
- [ ] Figure: Resource flow volume vs scenario
- [ ] Table: Cross-DAO alignment + shared budget summary

## Baseline + robustness (supporting)
- [ ] Baseline: `experiments/paper/00-academic-baseline.yaml`
  - [ ] Table: Baseline headline metrics (all anchors)
- [ ] Ablation: `experiments/paper/02-ablation-governance.yaml`
  - [ ] Figure: Mechanism removal impact bars
- [ ] Sensitivity: `experiments/paper/03-sensitivity-quorum.yaml`
  - [ ] Figure: Quorum sensitivity curve
