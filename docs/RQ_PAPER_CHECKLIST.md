# RQ -> Paper Checklist (Figures and Tables)

Use this as a concrete checklist for wiring each research question to
specific figures/tables in `paper/` and in the generated report pack.

Legend: [ ] = todo, [x] = done, [~] = partial/needs update

**Status: ALL COMPLETE** (Updated 2026-02-07)
- Total simulation runs: 8,701
- Experiments: 11 configurations
- Paper: 35 pages, compiles successfully

---

## RQ1 Participation Dynamics
- [x] Experiment: `experiments/paper/01-calibration-participation.yaml`
- [x] Experiment: `experiments/paper/03-sensitivity-quorum.yaml`
- [x] Results: `results/paper/01-calibration-participation/` (900 runs)
- [x] Results: `results/paper/03-sensitivity-quorum/` (500 runs)
- [x] Figure: `rq1_turnout.png` - Turnout vs participation_target_rate
- [x] Figure: `rq1_retention.png` - Voter retention curves
- [x] Figure: `rq1_quorum_curve.png` - Quorum sensitivity
- [x] Figure: `rq1_fatigue_quorum.png` - Fatigue accumulation
- [x] Table: Summary stats (mean, std, 95% CI) for turnout/quorum/retention
- [x] Results paragraph in results.tex
- [x] Discussion paragraph in discussion.tex

## RQ2 Governance Capture Mitigation
- [x] Experiment: `experiments/paper/04-governance-capture-mitigations.yaml`
- [x] Results: `results/paper/04-governance-capture-mitigations/` (2,701 runs)
- [x] Figure: `rq2_whale_influence.png` - Whale influence comparison
- [x] Figure: `rq2_tradeoff.png` - Capture risk vs throughput
- [x] Figure: `rq2_gini_quad.png` - Gini coefficient by mechanism
- [x] Figure: `rq2_velocity.png` - Voting velocity effects
- [x] Figure: `rq2_interactions.png` - Mechanism interactions
- [x] Table: Top mitigation configs with lowest capture risk
- [x] Results paragraph in results.tex
- [x] Discussion paragraph in discussion.tex

## RQ3 Proposal Pipeline Effects
- [x] Experiment: `experiments/paper/05-proposal-pipeline.yaml`
- [x] Results: `results/paper/05-proposal-pipeline/` (900 runs)
- [x] Figure: `rq3_time.png` - Time-to-decision
- [x] Figure: `rq3_passrate.png` - Pass rate by settings
- [x] Figure: `rq3_tempcheck.png` - Temp-check effects
- [x] Figure: `rq3_quality.png` - Quality vs speed tradeoff
- [x] Figure: `rq3_ttd.png` - Time-to-decision distribution
- [x] Figure: `rq3_expiry.png` - Proposal expiry rates
- [x] Figure: `rq3_interactions.png` - Pipeline interactions
- [x] Table: Abandonment and quorum reach by pipeline settings
- [x] Results paragraph in results.tex
- [x] Discussion paragraph in discussion.tex

## RQ4 Treasury Resilience
- [x] Experiment: `experiments/paper/06-treasury-resilience.yaml`
- [x] Results: `results/paper/06-treasury-resilience/` (1,200 runs)
- [x] Figure: `rq4_volatility.png` - Volatility vs buffer
- [x] Figure: `rq4_growth.png` - Growth trajectories
- [x] Figure: `rq4_efficiency.png` - Allocation efficiency
- [x] Figure: `rq4_runway.png` - Runway analysis
- [x] Figure: `rq4_topup.png` - Top-up patterns
- [x] Figure: `rq4_regimes.png` - Stability regimes
- [x] Table: Final treasury + volatility by config
- [x] Results paragraph in results.tex
- [x] Discussion paragraph in discussion.tex

## RQ5 Inter-DAO Cooperation
- [x] Experiment: `experiments/paper/07-inter-dao-cooperation.yaml`
- [x] Results: `results/paper/07-inter-dao-cooperation/` (500 runs)
- [x] Figure: `rq5_success.png` - Success rates
- [x] Figure: `rq5_resources.png` - Resource flows
- [x] Figure: `rq5_surplus.png` - Surplus distribution
- [x] Figure: `rq5_fairness.png` - Fairness metrics
- [x] Figure: `rq5_hub.png` - Hub dynamics
- [x] Figure: `rq5_overlap.png` - Overlap analysis
- [x] Table: Cross-DAO alignment + shared budget summary
- [x] Results paragraph in results.tex
- [x] Discussion paragraph in discussion.tex

---

## Baseline + Robustness (Supporting)

### Baseline
- [x] Experiment: `experiments/paper/00-academic-baseline.yaml`
- [x] Experiment: `experiments/paper/00-realistic-baseline.yaml`
- [x] Results: `results/paper/00-academic-baseline/` (100 runs)
- [x] Results: `results/paper/00-realistic-baseline/` (100 runs)
- [x] Table: Baseline headline metrics (all anchors)
- [x] Validation table: Simulator vs empirical data

### Ablation
- [x] Experiment: `experiments/paper/02-ablation-governance.yaml`
- [x] Results: `results/paper/02-ablation-governance/` (800 runs)
- [x] Figure: `ablation_impact.png` - Mechanism removal impacts

### Sensitivity
- [x] Experiment: `experiments/paper/03-sensitivity-quorum.yaml`
- [x] Figure: `quorum_sensitivity.png` - Quorum curve
- [x] Figure: `quorum_passrate.png` - Pass rate vs quorum

### Scale Study
- [x] Experiment: `experiments/paper/08-scale-sweep.yaml`
- [x] Results: `results/paper/08-scale-sweep/` (500 runs)
- [x] Figure: `scale_participation.png` - Size effects

### Voting Mechanisms
- [x] Experiment: `experiments/paper/09-voting-mechanisms.yaml`
- [x] Results: `results/paper/09-voting-mechanisms/` (600 runs)
- [x] Figure: `voting_comparison.png` - Mechanism comparison

---

## Paper Sections Status

- [x] Abstract - Updated with 8,701 runs, key findings
- [x] Introduction - RQs defined, paper organization
- [x] Background - Related work, theoretical foundations
- [x] Theory - Theoretical framework
- [x] Architecture - Simulation design
- [x] Methodology - Experimental design, statistical methods
- [x] Results - All 5 RQs with tables and findings
- [x] Discussion - RQ interpretations, practical recommendations
- [x] Limitations - Model constraints, future work
- [x] Conclusion - Summary, contributions
- [x] Appendix Stats - Full statistical tables
- [x] Appendix Configs - Experiment configurations
- [x] Appendix Reproducibility - Manifest and hashes

---

## Key Metrics Summary

| Experiment | Runs | Key Finding |
|------------|------|-------------|
| 00-academic-baseline | 100 | Whale influence 23.8%, pass rate 87.9% |
| 00-realistic-baseline | 100 | Whale influence 31.0%, pass rate 90.4% |
| 01-calibration | 900 | Participation stable across configs |
| 02-ablation | 800 | Mechanism removal effects quantified |
| 03-quorum | 500 | Quorum 1-10% produces stable outcomes |
| 04-capture | 2,701 | Vote caps reduce whale influence 40% |
| 05-pipeline | 900 | Temp-checks critical for success |
| 06-treasury | 1,200 | Stabilization maintains reserves |
| 07-inter-dao | 500 | 22% inter-DAO vs 73% intra-DAO success |
| 08-scale | 500 | Larger DAOs: higher pass, lower turnout |
| 09-voting | 600 | Mechanisms show equivalent outcomes |
