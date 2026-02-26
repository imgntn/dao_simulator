# DAO Simulation Research Quality Report

**Generated:** 2026-02-26
**Results Directory:** 12-llm-reasoning-v4

---

## Executive Summary

**Experiment:** 12-llm-reasoning-v4
**Total Runs:** 8
**Runs per Configuration:** 3
**Sweep Values:** llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1, llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1, llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0
**Statistical Power:** 7%
**Metrics Analyzed:** 10

### Overall Quality Assessment

❌ **Issues Detected** - 3 critical issue(s), 5 warning(s).

### Key Statistics

| Aspect | Value |
|--------|-------|
| Significant Effects | 1 of 10 metrics |
| Critical Issues | 3 |
| Warnings | 5 |
| Minimum Effect Detectable | d = 2.286 |

## Key Findings

1. **LLM Avg Latency**: Significant effect (F=96.0, p<0.001). Ranges from 0.0000 (at Sweep Value=llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1) to 1380.7575 (at Sweep Value=llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0).

2. 9 metrics showed no significant variation across Sweep Value values.

## Methodology

### Experimental Design

- **Design Type:** Parameter sweep study
- **Independent Variable:** Sweep Value (3 levels: llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1, llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1, llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0)
- **Dependent Variables:** 10 governance metrics
- **Replication:** 3 simulation runs per configuration
- **Total Runs:** 8

### Statistical Methods

- **Descriptive Statistics:** Mean, median, standard deviation, coefficient of variation
  - **Confidence Intervals:** 95% CI using t-distribution (bootstrap CI reported when available)
- **Omnibus Test:** One-way ANOVA for each metric
- **Post-hoc Comparisons:** Welch's t-test with effect size (Cohen's d)
- **Effect Size Interpretation:**
  - Negligible: |d| < 0.2
  - Small: 0.2 ≤ |d| < 0.5
  - Medium: 0.5 ≤ |d| < 0.8
  - Large: 0.8 ≤ |d| < 1.2
  - Very Large: |d| ≥ 1.2

### Limitations

1. **Simulated Environment:** Results reflect model assumptions, not real DAO behavior
2. **Fixed Parameters:** Only Sweep Value was varied; other parameters held constant
3. **Distribution Assumptions:** Some metrics violate normality assumptions
4. **Model Validity:** See code review for known simulation issues

## Metric Analysis by Category

### Basic Outcome

| Metric | Sweep Value=llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | Sweep Value=llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | Sweep Value=llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | Significant | Effect |
|--------|------|------|------|-------------|--------|
| Proposal Pass Rate | 0 | 0.5000 | 0.5000 |  | -1.00 |
| Average Turnout | 0 | 0.1083 | 0.2161 |  | -18.33 |
| Final Treasury | 10670 | 11010 | 10590 |  | 0.82 |

### Governance Efficiency

| Metric | Sweep Value=llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | Sweep Value=llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | Sweep Value=llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | Significant | Effect |
|--------|------|------|------|-------------|--------|
| Avg Margin of Victory | 0 | 0.2399 | 0.5155 |  | -2.38 |
| Proposal Abandonment Rate | 0 | 0 | 0 |  | - |

### Participation Quality

| Metric | Sweep Value=llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | Sweep Value=llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | Sweep Value=llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | Significant | Effect |
|--------|------|------|------|-------------|--------|
| Voter Participation Rate | 0 | 0.1863 | 0.3115 |  | -14.14 |

### Temporal Dynamics

| Metric | Sweep Value=llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | Sweep Value=llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | Sweep Value=llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | Significant | Effect |
|--------|------|------|------|-------------|--------|
| Governance Activity Index | 0 | 0.0019 | 0.0061 |  | -1.46 |

### Other Metrics

| Metric | Sweep Value=llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | Sweep Value=llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | Sweep Value=llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | Significant | Effect |
|--------|------|------|------|-------------|--------|
| LLM Vote Consistency | 0 | 0.6625 | 0.7474 |  | -4.32 |
| LLM Cache Hit Rate | 0 | 0 | 0 |  | - |
| LLM Avg Latency | 0 | 807.9841 | 1381 | ✓ | -27.29 |

## Distribution Quality Analysis

This section identifies metrics with distribution characteristics that may affect statistical validity.

### High Variability Metrics (CV > 50%)

| Metric | Sweep Value | Mean | Std | CV | Issue |
|--------|-------------|------|-----|----|----|
| Proposal Pass Rate | llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 0.5000 | 0.5774 | 115.5% | 🔴 Critical |
| Proposal Pass Rate | llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | 0.5000 | 0.7071 | 141.4% | 🔴 Critical |
| Average Turnout | llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 0.1083 | 0.0908 | 83.9% | 🟡 Warning |
| Voter Participation Rate | llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 0.1863 | 0.1449 | 77.8% | 🟡 Warning |
| Avg Margin of Victory | llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 0.2399 | 0.2795 | 116.5% | 🔴 Critical |
| Avg Margin of Victory | llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | 0.5155 | 0.3064 | 59.4% | 🟡 Warning |
| Governance Activity Index | llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 0.0019 | 0.0024 | 123.4% | 🔴 Critical |
| Governance Activity Index | llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | 0.0061 | 0.0059 | 97.1% | 🟡 Warning |
| LLM Vote Consistency | llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 0.6625 | 0.4715 | 71.2% | 🟡 Warning |

### Non-Symmetric Distributions

Metrics where mean and median diverge significantly, suggesting skewed distributions:

| Metric | Sweep Value | Mean | Median | Skew Indicator |
|--------|-------------|------|--------|----------------|
| (none) | - | - | - | - |

### Constant/Zero Metrics

Metrics with no variance (may indicate unimplemented features or degenerate cases):

| Metric | Value | Note |
|--------|-------|------|
| Proposal Abandonment Rate | 0 | Always zero - may be unimplemented |
| LLM Cache Hit Rate | 0 | Always zero - may be unimplemented |

## Treasury Distribution Deep Dive

The treasury shows high variability which warrants special attention.

### Treasury Statistics by Sweep Value

| Sweep Value | Mean | Median | Std | CV | Min | Max | 95% CI |
|--------|------|--------|-----|----|----|-----|--------|
| llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 10670 | 10670 | 273 | 2.6% | 10478 | 10863 | [8222, 13119] |
| llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 11010 | 11108 | 586 | 5.3% | 10233 | 11592 | [10077, 11943] |
| llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | 10590 | 10590 | 133 | 1.3% | 10495 | 10684 | [9392, 11788] |

### Treasury Distribution Analysis

### Related Treasury Metrics

| Metric | Sweep Value=llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | Sweep Value=llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | Sweep Value=llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 |
|--------|------|------|------|

### Potential Causes of Treasury Variability

1. **Proposal Pass Rate Effect**: At low quorum, ~9% of proposals pass. Each passed proposal may have significant treasury impact.

2. **Compounding Effects**: Treasury changes compound over simulation steps, amplifying initial differences.

3. **Staking Interest Bug** (from code review): Interest may compound per-step rather than per-year, causing exponential growth in some runs.

4. **Initial Conditions**: Small variations in early proposal outcomes cascade into large final differences.

### Recommendations

- Treasury variability is within acceptable bounds
- Standard parametric tests should be valid

## Statistical Significance Analysis

### ANOVA Results (Overall Effect of Sweep Value)

| Metric | F-Statistic | df | p-value | Significant |
|--------|-------------|-----|---------|-------------|
| LLM Avg Latency | 96.01 | (2, 5) | <0.001 | ✓ **Yes** |
| Average Turnout | 4.67 | (2, 5) | 0.0718 | No |
| Voter Participation Rate | 3.87 | (2, 5) | 0.0967 | No |
| LLM Vote Consistency | 2.50 | (2, 5) | 0.1772 | No |
| Avg Margin of Victory | 2.03 | (2, 5) | 0.2265 | No |
| Governance Activity Index | 1.90 | (2, 5) | 0.2439 | No |
| Final Treasury | 0.66 | (2, 5) | 0.5577 | No |
| Proposal Pass Rate | 0.63 | (2, 5) | 0.5724 | No |
| Proposal Abandonment Rate | 0.00 | (2, 5) | 1.0000 | No |
| LLM Cache Hit Rate | 0.00 | (2, 5) | 1.0000 | No |

### Pairwise Comparisons (Significant Metrics Only)

| Metric | Comparison | t-statistic | Cohen's d | Effect Size |
|--------|------------|-------------|-----------|-------------|
| LLM Avg Latency | llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 vs llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | -13.16 | -7.60 | very_large |
| LLM Avg Latency | llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 vs llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | -7.20 | -5.10 | very_large |

## Power Analysis

| Metric | Value |
|--------|-------|
| Current Runs per Config | 3 |
| Recommended Runs | 63 |
| Current Power | 7.0% |
| Minimum Detectable Effect | d = 2.2862 |

**Interpretation:**
⚠️ Consider increasing sample size to 63 runs per configuration for 80% power to detect medium effects (d = 0.5).

## Recommendations

### Data Quality Improvements

#### Critical (Must Address)

- **Proposal Pass Rate**: Very high variability (CV=141.4%). Distribution may be non-normal or parameter has high stochasticity.
- **Avg Margin of Victory**: Very high variability (CV=116.5%). Distribution may be non-normal or parameter has high stochasticity. Very large effect size (d=-2.38). This metric is highly sensitive to the sweep parameter.
- **Governance Activity Index**: Very high variability (CV=123.4%). Distribution may be non-normal or parameter has high stochasticity. Very large effect size (d=-1.46). This metric is highly sensitive to the sweep parameter.

#### Warnings (Should Address)

- **Average Turnout**: High variability (CV=83.9%). Consider more runs or controlled conditions.
- **Voter Participation Rate**: High variability (CV=77.8%). Consider more runs or controlled conditions.
- **Proposal Abandonment Rate**: Metric is always zero across all conditions. May indicate unimplemented feature or degenerate case.
- **LLM Vote Consistency**: High variability (CV=71.2%). Consider more runs or controlled conditions.
- **LLM Cache Hit Rate**: Metric is always zero across all conditions. May indicate unimplemented feature or degenerate case.

### Simulation Improvements

Based on the code review and these results:

1. **Implement Voting Power Snapshots**: Current live-balance voting allows manipulation
2. **Fix Quorum Calculation**: Should check total participation, not just votes-for
3. **Add Seed Reset**: Ensure deterministic reproducibility between runs
4. **Fix Staking Interest**: Compound annually, not per-step
5. **Implement Delegation Chains**: Required for realistic high-quorum scenarios

### Statistical Improvements

1. **Use Bootstrap CI** for non-normal metrics (Treasury, Pass Rate at low quorum)
2. **Report Median** alongside mean for skewed distributions
3. **Consider Log-Transform** for treasury analysis
4. **Run Multiple Seeds** and report aggregated results

## Appendix: Full Statistics

### Raw Statistics by Metric and Sweep Value

#### Proposal Pass Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 2 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | - | 0.0000 | 0.0000 | 0.00% |
| llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 4 | 0.500000 | 0.500000 | 0.577350 | 0.288675 | [-0.4187, 1.4187] | - | 1.0000 | 0.0000 | 1.0000 | 115.47% |
| llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | 2 | 0.500000 | 0.500000 | 0.707107 | 0.500000 | [-5.8531, 6.8531] | - | 0.5000 | 0.0000 | 1.0000 | 141.42% |

#### Average Turnout

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 2 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | - | 0.0000 | 0.0000 | 0.00% |
| llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 4 | 0.108265 | 0.118856 | 0.090802 | 0.045401 | [-0.0362, 0.2528] | - | 0.1254 | 0.0000 | 0.1953 | 83.87% |
| llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | 2 | 0.216107 | 0.216107 | 0.016676 | 0.011791 | [0.0663, 0.3659] | [0.2043, 0.2279] | 0.0118 | 0.2043 | 0.2279 | 7.72% |

#### Final Treasury

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 2 | 10670.360911 | 10670.360911 | 272.526996 | 192.705687 | [8221.8030, 13118.9188] | [10477.6552, 10863.0666] | 192.7057 | 10477.6552 | 10863.0666 | 2.55% |
| llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 4 | 11010.264204 | 11107.965331 | 586.370946 | 293.185473 | [10077.2172, 11943.3112] | [10577.1205, 11424.3880] | 619.8849 | 10233.0169 | 11592.1093 | 5.33% |
| llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | 2 | 10589.727441 | 10589.727441 | 133.358609 | 94.298776 | [9391.5479, 11787.9070] | [10495.4287, 10684.0262] | 94.2988 | 10495.4287 | 10684.0262 | 1.26% |

#### Voter Participation Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 2 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | - | 0.0000 | 0.0000 | 0.00% |
| llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 4 | 0.186309 | 0.221782 | 0.144907 | 0.072454 | [-0.0443, 0.4169] | - | 0.1938 | 0.0000 | 0.3017 | 77.78% |
| llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | 2 | 0.311503 | 0.311503 | 0.031154 | 0.022029 | [0.0316, 0.5914] | [0.2895, 0.3335] | 0.0220 | 0.2895 | 0.3335 | 10.00% |

#### Avg Margin of Victory

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 2 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | - | 0.0000 | 0.0000 | 0.00% |
| llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 4 | 0.239876 | 0.216894 | 0.279516 | 0.139758 | [-0.2049, 0.6846] | - | 0.4568 | 0.0000 | 0.5257 | 116.53% |
| llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | 2 | 0.515460 | 0.515460 | 0.306425 | 0.216675 | [-2.2377, 3.2686] | [0.2988, 0.7321] | 0.2167 | 0.2988 | 0.7321 | 59.45% |

#### Proposal Abandonment Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Min | Max | CV |
|------|---|------|--------|-----|----|----|-----|-----|----|
| llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 2 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 4 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | 2 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |

#### Governance Activity Index

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 2 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | - | 0.0000 | 0.0000 | 0.00% |
| llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 4 | 0.001929 | 0.001416 | 0.002380 | 0.001190 | [-0.0019, 0.0057] | - | 0.0033 | 0.0000 | 0.0049 | 123.37% |
| llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | 2 | 0.006057 | 0.006057 | 0.005881 | 0.004158 | [-0.0468, 0.0589] | [0.0019, 0.0102] | 0.0042 | 0.0019 | 0.0102 | 97.08% |

#### LLM Vote Consistency

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 2 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | - | 0.0000 | 0.0000 | 0.00% |
| llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 4 | 0.662500 | 0.825000 | 0.471478 | 0.235739 | [-0.0877, 1.4127] | - | 0.5125 | 0.0000 | 1.0000 | 71.17% |
| llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | 2 | 0.747367 | 0.747367 | 0.244516 | 0.172899 | [-1.4495, 2.9443] | [0.5745, 0.9203] | 0.1729 | 0.5745 | 0.9203 | 32.72% |

#### LLM Cache Hit Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Min | Max | CV |
|------|---|------|--------|-----|----|----|-----|-----|----|
| llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 2 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 4 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | 2 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |

#### LLM Avg Latency

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| llm_agent_mode=disabled_llm_enabled=false_llm_hybrid_fraction=0_num_llm_agents=0_num_llm_reporters=0_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 2 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | - | 0.0000 | 0.0000 | 0.00% |
| llm_agent_mode=hybrid_llm_enabled=true_llm_hybrid_fraction=0.3_num_llm_agents=4_num_llm_reporters=1_num_developers=4_num_investors=2_num_traders=1_num_passive_members=4_num_proposal_creators=2_num_validators=1_num_delegators=2_num_governance_experts=1_num_risk_managers=1 | 4 | 807.984149 | 798.479167 | 122.801167 | 61.400583 | [612.5801, 1003.3882] | [702.4783, 932.5000] | 201.4742 | 702.4783 | 932.5000 | 15.20% |
| llm_agent_mode=all_llm_enabled=true_llm_hybrid_fraction=1_num_llm_agents=8_num_llm_reporters=1_num_developers=0_num_investors=0_num_traders=0_num_passive_members=0_num_proposal_creators=0_num_validators=0_num_delegators=0_num_governance_experts=0_num_risk_managers=0 | 2 | 1380.757464 | 1380.757464 | 71.560056 | 50.600601 | [737.8159, 2023.6991] | [1330.1569, 1431.3581] | 50.6006 | 1330.1569 | 1431.3581 | 5.18% |

---

*Report generated by DAO Simulator Research Quality Report Generator*
