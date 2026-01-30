# Research Questions -> Experiments -> Metrics

This maps each locked research question (RQ1-RQ5) to the exact experiment
config(s) and the primary metrics used to answer it.

| RQ | Primary experiment(s) | Primary metrics (from config) |
| --- | --- | --- |
| RQ1 Participation dynamics | `experiments/paper/01-calibration-participation.yaml` | voter_participation_rate, average_turnout, quorum_reach_rate, voter_retention_rate, participation_trend |
| RQ2 Governance capture mitigation | `experiments/paper/04-governance-capture-mitigations.yaml` | whale_influence, governance_capture_risk, single_entity_control, collusion_threshold, voting_power_utilization |
| RQ3 Proposal pipeline effects | `experiments/paper/05-proposal-pipeline.yaml` | proposal_pass_rate, avg_time_to_decision, proposal_abandonment_rate, quorum_reach_rate, governance_overhead |
| RQ4 Treasury resilience | `experiments/paper/06-treasury-resilience.yaml` | treasury_volatility, treasury_growth_rate, final_treasury, treasury_trend, proposal_pass_rate |
| RQ5 Inter-DAO cooperation | `experiments/paper/07-inter-dao-cooperation.yaml` | inter_dao_proposal_success_rate, inter_dao_voting_participation, cross_dao_approval_alignment, total_shared_budget, resource_flow_volume |

Supporting experiments (cross-cutting validation and robustness):
- `experiments/paper/00-academic-baseline.yaml` (baseline levels across all metrics)
- `experiments/paper/02-ablation-governance.yaml` (causal impact of core mechanisms)
- `experiments/paper/03-sensitivity-quorum.yaml` (quorum sensitivity curve)
