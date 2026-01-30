# RQ -> Paper Checklist (Paper 1: Participation + Capture)

Use this as a concrete checklist for wiring each research question to
specific figures/tables in `paper_p1/` and in the generated report pack.

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

## Baseline + robustness (supporting)
- [ ] Baseline: `experiments/paper/00-academic-baseline.yaml`
  - [ ] Table: Baseline headline metrics (all anchors)
- [ ] Ablation: `experiments/paper/02-ablation-governance.yaml`
  - [ ] Figure: Mechanism removal impact bars
- [ ] Sensitivity: `experiments/paper/03-sensitivity-quorum.yaml`
  - [ ] Figure: Quorum sensitivity curve
