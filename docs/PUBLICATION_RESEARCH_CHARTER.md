# DAO Simulator Publication Research Charter

**Status:** Active implementation charter
**Established:** 2026-07-17
**Legacy baseline:** `5829bdbea511af349fef6aed168d03912ca9baf9`
**Pilot decisions:** [`PILOT_DECISION_LOG.md`](PILOT_DECISION_LOG.md)

## Primary contribution

The paper will present and evaluate a historically calibrated, reproducible multi-agent simulation framework for counterfactual DAO governance mechanism analysis. The contribution is the combination of explicit agent heterogeneity, proposal-time governance semantics, held-out empirical calibration, paired-seed counterfactual experiments, and claim-level artifact provenance.

The paper will not claim that the simulator predicts every DAO or that simulated treatment effects transfer unconditionally to deployed governance systems. Findings are conditional on documented model structure, calibration data, intervention definitions, and uncertainty.

### Held-out validation claim boundary (2026-07-18)

The frozen publication-scale temporal holdout evaluated 14 DAOs with 30
episodes of 1,440 steps per DAO and a paired uncalibrated simulator null
(840 trajectories total). The mean composite held-out similarity score was
0.473. The calibrated simulator outperformed historical persistence for 5 of
14 DAOs and the uncalibrated simulator for 8 of 14 DAOs; mean skill was
-0.027 versus persistence and +0.173 versus the uncalibrated null.

These results support describing the system as a historically conditioned
mechanistic or generative simulator with DAO-dependent held-out fidelity.
They do not support a universal forecasting-accuracy claim. The paper must
report the composite score, its metric construction, per-DAO uncertainty,
both null comparisons, and failure cases together.

## Confirmatory research questions

1. **Quorum and participation:** How do quorum and participation rules affect proposal completion, representativeness, and governance failure rates across calibrated DAO contexts?
2. **Capture mitigation:** How do quadratic voting, delegation constraints, and related mitigations affect concentration and capture risk without destroying participation or decision throughput?
3. **Proposal throughput:** How do proposal-pipeline interventions change decision time, proposal completion, and accepted-proposal quality?
4. **Treasury resilience:** How do governance rules and treasury policies affect solvency and recovery under explicitly parameterized shocks and yield assumptions?

## Exploratory research questions

- How well do intervention effects transport across DAOs?
- Which agent, forum, delegation, learning, and market-feedback mechanisms drive the confirmatory effects?
- Under what conditions does inter-DAO cooperation improve ecosystem resilience?
- Do reproducibly frozen LLM agents add explanatory or behavioral value beyond matched non-LLM controls?

Cross-DAO city and LLM results remain exploratory until their determinism, order invariance, and provenance gates pass.

## Primary estimands and provisional practical effects

These thresholds are provisional design inputs and must be finalized from domain reasoning before the final power analysis:

| Research question | Primary estimand | Provisional smallest practical effect |
|---|---|---:|
| Quorum/participation | Paired change in valid proposal completion rate | 5 percentage points |
| Capture mitigation | Paired change in the top token-holding decile's share of proposal-time cast vote weight | 0.05 absolute share |
| Proposal throughput | Paired change in median time to valid decision | 10% |
| Treasury resilience | Paired change in maximum peak-to-trough treasury drawdown | 0.05 absolute drawdown fraction |

Secondary outcomes include turnout, quorum attainment, pass rate, voter concentration, proposal quality, treasury drawdown, recovery time, and inequality/mobility measures. Each must have a versioned metric-registry definition before use.

### Developmental-pilot endpoint amendment (2026-07-17)

The immutable developmental pilot showed that the original RQ2 delegation-HHI
endpoint was exactly zero in all 216 runs because the experiment manipulates
proposal-time vote-weight policies rather than token-delegation flows. The
same pilot showed that the original RQ4 survival endpoint was exactly one in
all 288 runs. Before any confirmatory run, RQ2 was therefore amended to
proposal-time whale vote-weight share and RQ4 to maximum treasury drawdown.
Both replacement outcomes were already registered built-in metrics captured
in every pilot run. The rejected endpoints and this amendment remain in the
audit trail and cannot support confirmatory claims.

## Confirmatory-design rules

- Conditions share common replicate seeds.
- Each research question declares one primary outcome.
- Analysis families and multiple-comparison corrections are frozen before final execution.
- Pilot results may change sample sizes and designs through a recorded decision, but not create undisclosed confirmatory hypotheses.
- Final campaign configurations, analysis code, calibration inputs, and metric versions are frozen together.
- Negative and null results are reported.
- Every numerical manuscript claim resolves to an immutable raw-data-derived artifact.

## Publication-ready definition

Publication readiness requires meaningful green validation; correct proposal-time metrics; reconciled economic ledgers; deterministic sequential, parallel, resumed, and city-order execution; held-out calibration with null-model comparisons; immutable SHA-256 campaign provenance; exact run accounting; pilot-supported sample sizes; claim-linked tables and figures; and independent clean-environment reproduction.
