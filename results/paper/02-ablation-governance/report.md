# DAO Simulation Research Quality Report

**Generated:** 2026-01-30
**Results Directory:** 02-ablation-governance

---

## Executive Summary

**Experiment:** 02-ablation-governance
**Total Runs:** 200
**Runs per Configuration:** 25
**Sweep Values:** treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0, treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01, treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0, treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01, treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0, treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01, treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0, treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01
**Statistical Power:** 44%
**Metrics Analyzed:** 38

### Overall Quality Assessment

❌ **Issues Detected** - 4 critical issue(s), 6 warning(s).

### Key Statistics

| Aspect | Value |
|--------|-------|
| Significant Effects | 20 of 38 metrics |
| Critical Issues | 4 |
| Warnings | 6 |
| Minimum Effect Detectable | d = 0.792 |

## Key Findings

1. **Voter Concentration Gini**: Significant effect (F=538.1, p<0.001). Ranges from 0.2286 (at Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0) to 0.3636 (at Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0).

2. **Governance Capture Risk**: Significant effect (F=397.7, p<0.001). Ranges from 0.3362 (at Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01) to 0.4762 (at Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01).

3. **Whale Influence**: Significant effect (F=168.7, p<0.001). Ranges from 0.3407 (at Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01) to 0.5049 (at Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01).

4. **Delegate Concentration**: Significant effect (F=167.6, p<0.001). Ranges from 0.3187 (at Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01) to 0.4039 (at Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01).

5. **Proposal Pass Rate**: Significant effect (F=90.6, p<0.001). Ranges from 0.0096 (at Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0) to 0.0891 (at Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0).

6. 18 metrics showed no significant variation across Sweep Value values.

## Methodology

### Experimental Design

- **Design Type:** Parameter sweep study
- **Independent Variable:** Sweep Value (8 levels: treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0, treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01, treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0, treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01, treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0, treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01, treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0, treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01)
- **Dependent Variables:** 38 governance metrics
- **Replication:** 25 simulation runs per configuration
- **Total Runs:** 200

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

| Metric | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|-------------|--------|
| Proposal Pass Rate | 0.0098 | 0.0131 | 0.0891 | 0.0792 | 0.0096 | 0.0126 | 0.0859 | 0.0769 | ✓ | 5.11 |
| Average Turnout | 0.0603 | 0.0653 | 0.0766 | 0.0713 | 0.0605 | 0.0644 | 0.0790 | 0.0793 | ✓ | -2.31 |
| Final Treasury | 11713 | 11934 | 11852 | 11915 | 31215 | 29004 | 38304 | 35654 | ✓ | -1.19 |
| Final Token Price | 2.4591 | 5.4602 | 2.3139 | 3.0653 | 2.7785 | 4.9150 | 4.3576 | 3.8865 |  | 0.55 |
| Final Member Count | 210.0000 | 210.0000 | 210.0000 | 210.0000 | 210.0000 | 210.0000 | 210.0000 | 210.0000 |  | - |
| Total Proposals | 202.8800 | 210.0400 | 202.0400 | 205.7600 | 202.6000 | 204.3200 | 206.5200 | 204.9600 |  | 0.53 |

### Governance Efficiency

| Metric | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|-------------|--------|
| Quorum Reach Rate | 0.3091 | 0.3406 | 0.3428 | 0.3235 | 0.3166 | 0.3357 | 0.3562 | 0.3481 | ✓ | -1.17 |
| Avg Margin of Victory | 0.4875 | 0.4892 | 0.5126 | 0.5229 | 0.4800 | 0.4814 | 0.5123 | 0.5178 | ✓ | 1.55 |
| Avg Time to Decision | 1030 | 1013 | 1024 | 1037 | 1022 | 1019 | 1021 | 1022 |  | -0.55 |
| Proposal Abandonment Rate | 0.0211 | 0.0203 | 0.0235 | 0.0218 | 0.0235 | 0.0217 | 0.0217 | 0.0234 |  | -0.34 |
| Proposal Rejection Rate | 0.9902 | 0.9869 | 0.9109 | 0.9208 | 0.9904 | 0.9874 | 0.9141 | 0.9231 | ✓ | -5.11 |
| Governance Overhead | 16.8495 | 18.4437 | 20.9064 | 19.7234 | 17.2249 | 18.1885 | 21.6593 | 21.8972 | ✓ | -2.27 |

### Participation Quality

| Metric | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|-------------|--------|
| Unique Voter Count | 206.0000 | 206.0000 | 206.0000 | 206.0000 | 206.0000 | 206.0000 | 206.0000 | 206.0000 |  | - |
| Voter Participation Rate | 0.0785 | 0.0860 | 0.0973 | 0.0919 | 0.0801 | 0.0847 | 0.1009 | 0.1018 | ✓ | -2.23 |
| Voter Concentration Gini | 0.3636 | 0.3594 | 0.2286 | 0.2390 | 0.3613 | 0.3592 | 0.2300 | 0.2295 | ✓ | -12.56 |
| Delegate Concentration | 0.3966 | 0.4029 | 0.3248 | 0.3334 | 0.3986 | 0.4039 | 0.3216 | 0.3187 | ✓ | 5.28 |
| Avg Votes Per Proposal | 16.4906 | 18.0691 | 20.4224 | 19.2923 | 16.8230 | 17.7951 | 21.1950 | 21.3803 | ✓ | -2.23 |
| Voter Retention Rate | 0.9979 | 0.9988 | 1.0000 | 1.0000 | 0.9973 | 0.9975 | 1.0000 | 1.0000 | ✓ | 0.96 |
| Voting Power Utilization | 0.0603 | 0.0653 | 0.0766 | 0.0713 | 0.0605 | 0.0644 | 0.0790 | 0.0793 | ✓ | -2.31 |

### Economic Health

| Metric | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|-------------|--------|
| Treasury Volatility | 0.1947 | 0.1892 | 0.1911 | 0.1835 | 0.4313 | 0.4908 | 0.4385 | 0.4340 | ✓ | -3.96 |
| Treasury Growth Rate | -0.7145 | -0.7128 | -0.7147 | -0.7132 | -0.3334 | -0.3960 | -0.1943 | -0.2566 | ✓ | -1.11 |
| Staking Participation | 0.1224 | 0.1225 | 0.1241 | 0.1216 | 0.1213 | 0.1228 | 0.1235 | 0.1236 |  | 0.46 |
| Token Concentration Gini | 0.5512 | 0.5499 | 0.5477 | 0.5571 | 0.5529 | 0.5574 | 0.5479 | 0.5560 |  | 0.75 |
| Avg Member Wealth | 117.6967 | 117.6313 | 116.1778 | 118.7508 | 118.8482 | 117.3981 | 116.6542 | 116.7585 |  | -0.46 |
| Wealth Mobility | 0.4488 | 0.4501 | 0.4523 | 0.4429 | 0.4471 | 0.4426 | 0.4521 | 0.4440 |  | -0.75 |

### Attack Resistance

| Metric | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|-------------|--------|
| Whale Influence | 0.3579 | 0.3407 | 0.4987 | 0.5049 | 0.3480 | 0.3434 | 0.4934 | 0.4985 | ✓ | -6.19 |
| Whale Proposal Rate | 0.0927 | 0.1040 | 0.0954 | 0.0939 | 0.1010 | 0.0964 | 0.0934 | 0.1006 |  | -0.62 |
| Governance Capture Risk | 0.4650 | 0.4725 | 0.3419 | 0.3453 | 0.4695 | 0.4762 | 0.3399 | 0.3362 | ✓ | 8.85 |
| Vote Buying Vulnerability | 78.6579 | 78.1338 | 87.2124 | 85.0547 | 77.1755 | 76.0824 | 93.8570 | 87.9265 | ✓ | -1.15 |
| Single Entity Control | 0.0404 | 0.0404 | 0.0410 | 0.0402 | 0.0400 | 0.0405 | 0.0408 | 0.0408 |  | 0.46 |
| Collusion Threshold | 0.1166 | 0.1187 | 0.1232 | 0.1156 | 0.1141 | 0.1109 | 0.1206 | 0.1175 |  | 0.59 |

### Temporal Dynamics

| Metric | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|-------------|--------|
| Participation Trend | 1.40e-5 | 3.40e-5 | -1.10e-5 | -1.30e-5 | 2.40e-5 | 3.00e-6 | 1.10e-5 | 2.10e-5 |  | 0.51 |
| Treasury Trend | -1.0830 | -0.9837 | -0.9620 | -0.8382 | 6.9336 | 3.8829 | 4.4893 | 6.4843 | ✓ | -0.93 |
| Member Growth Rate | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |  | - |
| Proposal Rate | 10.1440 | 10.5020 | 10.1020 | 10.2880 | 10.1300 | 10.2160 | 10.3260 | 10.2480 |  | 0.53 |
| Governance Activity Index | 0.0060 | 0.0067 | 0.0076 | 0.0072 | 0.0060 | 0.0064 | 0.0080 | 0.0080 | ✓ | -2.04 |

### Final State

| Metric | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|-------------|--------|
| Final Gini | 0.5512 | 0.5499 | 0.5477 | 0.5571 | 0.5529 | 0.5574 | 0.5479 | 0.5560 |  | 0.75 |
| Final Reputation Gini | 0.9755 | 0.9751 | 0.9754 | 0.9750 | 0.9753 | 0.9750 | 0.9752 | 0.9755 |  | 0.43 |

## Distribution Quality Analysis

This section identifies metrics with distribution characteristics that may affect statistical validity.

### High Variability Metrics (CV > 50%)

| Metric | Sweep Value | Mean | Std | CV | Issue |
|--------|-------------|------|-----|----|----|
| Proposal Pass Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 0.0098 | 0.0059 | 60.0% | 🟡 Warning |
| Proposal Pass Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 0.0131 | 0.0086 | 65.8% | 🟡 Warning |
| Proposal Pass Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 0.0096 | 0.0055 | 57.4% | 🟡 Warning |
| Proposal Pass Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 0.0126 | 0.0066 | 51.9% | 🟡 Warning |
| Final Treasury | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 31214.8557 | 23259.0088 | 74.5% | 🟡 Warning |
| Final Treasury | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 29004.1702 | 22200.8252 | 76.5% | 🟡 Warning |
| Final Treasury | treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 38304.4329 | 31465.5237 | 82.1% | 🟡 Warning |
| Final Treasury | treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 35654.3912 | 29810.9975 | 83.6% | 🟡 Warning |
| Final Token Price | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 2.4591 | 2.6385 | 107.3% | 🔴 Critical |
| Final Token Price | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 5.4602 | 7.9217 | 145.1% | 🔴 Critical |
| Final Token Price | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 2.3139 | 1.4716 | 63.6% | 🟡 Warning |
| Final Token Price | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 3.0653 | 4.5088 | 147.1% | 🔴 Critical |
| Final Token Price | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 2.7785 | 2.4338 | 87.6% | 🟡 Warning |
| Final Token Price | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 4.9150 | 9.4814 | 192.9% | 🔴 Critical |
| Final Token Price | treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 4.3576 | 5.8674 | 134.6% | 🔴 Critical |
| Final Token Price | treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 3.8865 | 5.3612 | 137.9% | 🔴 Critical |
| Proposal Abandonment Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 0.0235 | 0.0137 | 58.6% | 🟡 Warning |
| Proposal Abandonment Rate | treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 0.0217 | 0.0120 | 55.4% | 🟡 Warning |
| Treasury Growth Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -0.3334 | 0.4923 | 147.7% | 🔴 Critical |
| Treasury Growth Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -0.3960 | 0.4677 | 118.1% | 🔴 Critical |
| Treasury Growth Rate | treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -0.1943 | 0.6599 | 339.7% | 🔴 Critical |
| Treasury Growth Rate | treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -0.2566 | 0.6054 | 235.9% | 🔴 Critical |
| Participation Trend | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 0.0000 | 0.0001 | 558.2% | 🔴 Critical |
| Participation Trend | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 0.0000 | 0.0001 | 153.7% | 🔴 Critical |
| Participation Trend | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -0.0000 | 0.0001 | 1112.7% | 🔴 Critical |
| Participation Trend | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -0.0000 | 0.0001 | 910.7% | 🔴 Critical |
| Participation Trend | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 0.0000 | 0.0001 | 449.8% | 🔴 Critical |
| Participation Trend | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 0.0000 | 0.0001 | 3507.8% | 🔴 Critical |
| Participation Trend | treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 0.0000 | 0.0001 | 987.2% | 🔴 Critical |
| Participation Trend | treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 0.0000 | 0.0001 | 604.1% | 🔴 Critical |
| Treasury Trend | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 6.9336 | 12.2247 | 176.3% | 🔴 Critical |
| Treasury Trend | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 3.8829 | 14.0491 | 361.8% | 🔴 Critical |
| Treasury Trend | treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 4.4893 | 17.7271 | 394.9% | 🔴 Critical |
| Treasury Trend | treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 6.4843 | 14.9055 | 229.9% | 🔴 Critical |

### Non-Symmetric Distributions

Metrics where mean and median diverge significantly, suggesting skewed distributions:

| Metric | Sweep Value | Mean | Median | Skew Indicator |
|--------|-------------|------|--------|----------------|
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 11712.7053 | 12029.2102 | Left-skewed (-0.57) |
| Final Treasury | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 29004.1702 | 15757.1883 | Right-skewed (0.60) |
| Voter Retention Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 0.9979 | 1.0000 | Left-skewed (-0.68) |
| Voter Retention Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 0.9973 | 1.0000 | Left-skewed (-0.68) |
| Treasury Growth Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -0.3960 | -0.6500 | Right-skewed (0.54) |
| Collusion Threshold | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 0.1156 | 0.1000 | Right-skewed (0.54) |

### Constant/Zero Metrics

Metrics with no variance (may indicate unimplemented features or degenerate cases):

| Metric | Value | Note |
|--------|-------|------|
| Final Member Count | 210.0000 | Deterministic value |
| Unique Voter Count | 206.0000 | Deterministic value |
| Member Growth Rate | 0 | Always zero - may be unimplemented |

## Treasury Distribution Deep Dive

The treasury shows high variability which warrants special attention.

### Treasury Statistics by Sweep Value

| Sweep Value | Mean | Median | Std | CV | Min | Max | 95% CI |
|--------|------|--------|-----|----|----|-----|--------|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 11713 | 12029 | 559 | 4.8% | 10310 | 12036 | [11482, 11943] |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 11934 | 12030 | 338 | 2.8% | 10401 | 12039 | [11795, 12074] |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 11852 | 12030 | 444 | 3.7% | 10333 | 12039 | [11669, 12035] |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 11915 | 12030 | 283 | 2.4% | 10998 | 12042 | [11798, 12031] |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 31215 | 21055 | 23259 | 74.5% | 9298 | 80628 | [21614, 40816] |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 29004 | 15757 | 22201 | 76.5% | 9310 | 65352 | [19840, 38168] |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 38304 | 24155 | 31466 | 82.1% | 9243 | 111550 | [25316, 51293] |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 35654 | 22629 | 29811 | 83.6% | 9402 | 112051 | [23349, 47960] |

### Treasury Distribution Analysis

### Related Treasury Metrics

| Metric | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | Sweep Value=treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 |
|--------|------|------|------|------|------|------|------|------|
| Treasury Volatility | 0.1947 | 0.1892 | 0.1911 | 0.1835 | 0.4313 | 0.4908 | 0.4385 | 0.4340 |
| Treasury Growth Rate | -0.7145 | -0.7128 | -0.7147 | -0.7132 | -0.3334 | -0.3960 | -0.1943 | -0.2566 |
| Treasury Trend | -1.08 | -0.98 | -0.96 | -0.84 | 6.93 | 3.88 | 4.49 | 6.48 |

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
| Voter Concentration Gini | 538.05 | (7, 192) | <0.001 | ✓ **Yes** |
| Governance Capture Risk | 397.69 | (7, 192) | <0.001 | ✓ **Yes** |
| Whale Influence | 168.69 | (7, 192) | <0.001 | ✓ **Yes** |
| Delegate Concentration | 167.61 | (7, 192) | <0.001 | ✓ **Yes** |
| Proposal Pass Rate | 90.64 | (7, 192) | <0.001 | ✓ **Yes** |
| Proposal Rejection Rate | 90.64 | (7, 192) | <0.001 | ✓ **Yes** |
| Treasury Volatility | 76.31 | (7, 192) | <0.001 | ✓ **Yes** |
| Average Turnout | 23.47 | (7, 192) | <0.001 | ✓ **Yes** |
| Voting Power Utilization | 23.47 | (7, 192) | <0.001 | ✓ **Yes** |
| Governance Overhead | 21.11 | (7, 192) | <0.001 | ✓ **Yes** |
| Voter Participation Rate | 20.61 | (7, 192) | <0.001 | ✓ **Yes** |
| Avg Votes Per Proposal | 20.61 | (7, 192) | <0.001 | ✓ **Yes** |
| Governance Activity Index | 15.04 | (7, 192) | <0.001 | ✓ **Yes** |
| Final Treasury | 9.75 | (7, 192) | <0.001 | ✓ **Yes** |
| Treasury Growth Rate | 8.45 | (7, 192) | <0.001 | ✓ **Yes** |
| Avg Margin of Victory | 7.42 | (7, 192) | <0.001 | ✓ **Yes** |
| Voter Retention Rate | 4.87 | (7, 192) | <0.001 | ✓ **Yes** |
| Vote Buying Vulnerability | 3.99 | (7, 192) | <0.001 | ✓ **Yes** |
| Quorum Reach Rate | 3.63 | (7, 192) | 0.0011 | ✓ **Yes** |
| Treasury Trend | 2.88 | (7, 192) | 0.0070 | ✓ **Yes** |
| Token Concentration Gini | 1.40 | (7, 192) | 0.2066 | No |
| Wealth Mobility | 1.40 | (7, 192) | 0.2066 | No |
| Final Gini | 1.40 | (7, 192) | 0.2066 | No |
| Final Token Price | 1.11 | (7, 192) | 0.3599 | No |
| Whale Proposal Rate | 0.80 | (7, 192) | 0.5870 | No |
| Avg Time to Decision | 0.79 | (7, 192) | 0.5974 | No |
| Total Proposals | 0.72 | (7, 192) | 0.6522 | No |
| Proposal Rate | 0.72 | (7, 192) | 0.6522 | No |
| Collusion Threshold | 0.69 | (7, 192) | 0.6792 | No |
| Avg Member Wealth | 0.65 | (7, 192) | 0.7102 | No |
| Participation Trend | 0.63 | (7, 192) | 0.7287 | No |
| Single Entity Control | 0.61 | (7, 192) | 0.7505 | No |
| Staking Participation | 0.61 | (7, 192) | 0.7506 | No |
| Final Reputation Gini | 0.35 | (7, 192) | 0.9304 | No |
| Proposal Abandonment Rate | 0.32 | (7, 192) | 0.9458 | No |
| Final Member Count | 0.00 | (7, 192) | 1.0000 | No |
| Unique Voter Count | 0.00 | (7, 192) | 1.0000 | No |
| Member Growth Rate | 0.00 | (7, 192) | 1.0000 | No |

### Pairwise Comparisons (Significant Metrics Only)

| Metric | Comparison | t-statistic | Cohen's d | Effect Size |
|--------|------------|-------------|-----------|-------------|
| Proposal Pass Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -17.92 | -5.07 | very_large |
| Proposal Pass Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -9.90 | -2.80 | very_large |
| Proposal Pass Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -14.37 | -4.06 | very_large |
| Proposal Pass Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -11.87 | -3.36 | very_large |
| Proposal Pass Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -16.53 | -4.68 | very_large |
| Proposal Pass Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -9.29 | -2.63 | very_large |
| Proposal Pass Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -13.39 | -3.79 | very_large |
| Proposal Pass Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -11.03 | -3.12 | very_large |
| Proposal Pass Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 18.07 | 5.11 | very_large |
| Proposal Pass Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 17.14 | 4.85 | very_large |
| Proposal Pass Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 9.96 | 2.82 | very_large |
| Proposal Pass Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 9.47 | 2.68 | very_large |
| Proposal Pass Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -14.47 | -4.09 | very_large |
| Proposal Pass Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -11.96 | -3.38 | very_large |
| Proposal Pass Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -13.76 | -3.89 | very_large |
| Proposal Pass Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -11.32 | -3.20 | very_large |
| Average Turnout | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | -2.85 | -0.81 | large |
| Average Turnout | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -8.18 | -2.31 | very_large |
| Average Turnout | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -5.76 | -1.63 | very_large |
| Average Turnout | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -8.17 | -2.31 | very_large |
| Average Turnout | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -6.97 | -1.97 | very_large |
| Average Turnout | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -5.40 | -1.53 | very_large |
| Average Turnout | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -2.98 | -0.84 | large |
| Average Turnout | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -5.76 | -1.63 | very_large |
| Average Turnout | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -5.00 | -1.41 | very_large |
| Average Turnout | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 7.43 | 2.10 | very_large |
| Average Turnout | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 5.81 | 1.64 | very_large |
| Average Turnout | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 5.17 | 1.46 | very_large |
| Average Turnout | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 3.42 | 0.97 | large |
| Average Turnout | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.08 | -0.87 | large |
| Average Turnout | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -2.76 | -0.78 | medium |
| Average Turnout | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -7.58 | -2.14 | very_large |
| Average Turnout | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -6.58 | -1.86 | very_large |
| Average Turnout | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -6.13 | -1.73 | very_large |
| Average Turnout | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -5.31 | -1.50 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -4.19 | -1.19 | large |
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -3.89 | -1.10 | large |
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -4.22 | -1.19 | large |
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -4.01 | -1.14 | large |
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -4.14 | -1.17 | large |
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -3.84 | -1.09 | large |
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -4.19 | -1.19 | large |
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.98 | -1.13 | large |
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -4.16 | -1.18 | large |
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -3.86 | -1.09 | large |
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -4.20 | -1.19 | large |
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.99 | -1.13 | large |
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -4.15 | -1.17 | large |
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -3.85 | -1.09 | large |
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -4.19 | -1.19 | large |
| Final Treasury | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.98 | -1.13 | large |
| Quorum Reach Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | -3.40 | -0.96 | large |
| Quorum Reach Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.67 | -1.04 | large |
| Quorum Reach Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -3.18 | -0.90 | large |
| Quorum Reach Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -4.14 | -1.17 | large |
| Quorum Reach Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -2.89 | -0.82 | large |
| Quorum Reach Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.16 | -0.89 | large |
| Avg Margin of Victory | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -2.76 | -0.78 | medium |
| Avg Margin of Victory | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.96 | -1.12 | large |
| Avg Margin of Victory | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -2.93 | -0.83 | large |
| Avg Margin of Victory | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.62 | -1.02 | large |
| Avg Margin of Victory | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -2.68 | -0.76 | medium |
| Avg Margin of Victory | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 4.02 | 1.14 | large |
| Avg Margin of Victory | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 4.01 | 1.13 | large |
| Avg Margin of Victory | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 5.42 | 1.53 | very_large |
| Avg Margin of Victory | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 5.47 | 1.55 | very_large |
| Avg Margin of Victory | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.61 | -1.02 | large |
| Avg Margin of Victory | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.99 | -1.13 | large |
| Avg Margin of Victory | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.58 | -1.01 | large |
| Avg Margin of Victory | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.96 | -1.12 | large |
| Proposal Rejection Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 17.92 | 5.07 | very_large |
| Proposal Rejection Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 9.90 | 2.80 | very_large |
| Proposal Rejection Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 14.37 | 4.06 | very_large |
| Proposal Rejection Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 11.87 | 3.36 | very_large |
| Proposal Rejection Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 16.53 | 4.68 | very_large |
| Proposal Rejection Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 9.29 | 2.63 | very_large |
| Proposal Rejection Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 13.39 | 3.79 | very_large |
| Proposal Rejection Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 11.03 | 3.12 | very_large |
| Proposal Rejection Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -18.07 | -5.11 | very_large |
| Proposal Rejection Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -17.14 | -4.85 | very_large |
| Proposal Rejection Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -9.96 | -2.82 | very_large |
| Proposal Rejection Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -9.47 | -2.68 | very_large |
| Proposal Rejection Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 14.47 | 4.09 | very_large |
| Proposal Rejection Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 11.96 | 3.38 | very_large |
| Proposal Rejection Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 13.76 | 3.89 | very_large |
| Proposal Rejection Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 11.32 | 3.20 | very_large |
| Governance Overhead | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | -3.18 | -0.90 | large |
| Governance Overhead | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -8.04 | -2.27 | very_large |
| Governance Overhead | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -6.16 | -1.74 | very_large |
| Governance Overhead | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -2.95 | -0.84 | large |
| Governance Overhead | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -7.98 | -2.26 | very_large |
| Governance Overhead | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -7.46 | -2.11 | very_large |
| Governance Overhead | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -4.21 | -1.19 | large |
| Governance Overhead | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -4.79 | -1.35 | very_large |
| Governance Overhead | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -4.68 | -1.32 | very_large |
| Governance Overhead | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 6.60 | 1.87 | very_large |
| Governance Overhead | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 5.00 | 1.41 | very_large |
| Governance Overhead | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 4.77 | 1.35 | very_large |
| Governance Overhead | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 3.02 | 0.85 | large |
| Governance Overhead | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.00 | -0.85 | large |
| Governance Overhead | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.04 | -0.86 | large |
| Governance Overhead | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -6.84 | -1.93 | very_large |
| Governance Overhead | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -6.51 | -1.84 | very_large |
| Governance Overhead | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -5.46 | -1.54 | very_large |
| Governance Overhead | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -5.25 | -1.48 | very_large |
| Voter Participation Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | -3.25 | -0.92 | large |
| Voter Participation Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -7.83 | -2.22 | very_large |
| Voter Participation Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -6.18 | -1.75 | very_large |
| Voter Participation Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -2.95 | -0.83 | large |
| Voter Participation Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -7.88 | -2.23 | very_large |
| Voter Participation Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -7.49 | -2.12 | very_large |
| Voter Participation Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -4.04 | -1.14 | large |
| Voter Participation Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -4.70 | -1.33 | very_large |
| Voter Participation Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -4.62 | -1.31 | very_large |
| Voter Participation Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 6.41 | 1.81 | very_large |
| Voter Participation Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 4.81 | 1.36 | very_large |
| Voter Participation Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 4.77 | 1.35 | very_large |
| Voter Participation Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 2.98 | 0.84 | large |
| Voter Participation Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -2.96 | -0.84 | large |
| Voter Participation Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.01 | -0.85 | large |
| Voter Participation Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -6.75 | -1.91 | very_large |
| Voter Participation Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -6.51 | -1.84 | very_large |
| Voter Participation Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -5.36 | -1.51 | very_large |
| Voter Participation Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -5.21 | -1.47 | very_large |
| Voter Concentration Gini | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 39.68 | 11.22 | very_large |
| Voter Concentration Gini | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 27.66 | 7.82 | very_large |
| Voter Concentration Gini | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 27.57 | 7.80 | very_large |
| Voter Concentration Gini | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 29.23 | 8.27 | very_large |
| Voter Concentration Gini | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 41.55 | 11.75 | very_large |
| Voter Concentration Gini | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 27.90 | 7.89 | very_large |
| Voter Concentration Gini | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 27.70 | 7.84 | very_large |
| Voter Concentration Gini | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 29.50 | 8.35 | very_large |
| Voter Concentration Gini | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -44.42 | -12.56 | very_large |
| Voter Concentration Gini | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -40.37 | -11.42 | very_large |
| Voter Concentration Gini | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -29.12 | -8.23 | very_large |
| Voter Concentration Gini | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -27.44 | -7.76 | very_large |
| Voter Concentration Gini | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 28.76 | 8.14 | very_large |
| Voter Concentration Gini | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 30.72 | 8.69 | very_large |
| Voter Concentration Gini | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 27.31 | 7.72 | very_large |
| Voter Concentration Gini | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 29.04 | 8.21 | very_large |
| Delegate Concentration | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 16.18 | 4.58 | very_large |
| Delegate Concentration | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 15.72 | 4.45 | very_large |
| Delegate Concentration | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 15.60 | 4.41 | very_large |
| Delegate Concentration | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 16.88 | 4.77 | very_large |
| Delegate Concentration | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 18.04 | 5.10 | very_large |
| Delegate Concentration | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 17.81 | 5.04 | very_large |
| Delegate Concentration | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 17.26 | 4.88 | very_large |
| Delegate Concentration | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 18.66 | 5.28 | very_large |
| Delegate Concentration | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -17.29 | -4.89 | very_large |
| Delegate Concentration | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -17.10 | -4.84 | very_large |
| Delegate Concentration | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -17.01 | -4.81 | very_large |
| Delegate Concentration | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -16.67 | -4.72 | very_large |
| Delegate Concentration | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 2.85 | 0.81 | large |
| Delegate Concentration | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 16.55 | 4.68 | very_large |
| Delegate Concentration | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 17.94 | 5.08 | very_large |
| Delegate Concentration | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 16.51 | 4.67 | very_large |
| Delegate Concentration | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 17.76 | 5.02 | very_large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | -3.25 | -0.92 | large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -7.83 | -2.22 | very_large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -6.18 | -1.75 | very_large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -2.95 | -0.83 | large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -7.88 | -2.23 | very_large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -7.49 | -2.12 | very_large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -4.04 | -1.14 | large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -4.70 | -1.33 | very_large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -4.62 | -1.31 | very_large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 6.41 | 1.81 | very_large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 4.81 | 1.36 | very_large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 4.77 | 1.35 | very_large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 2.98 | 0.84 | large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -2.96 | -0.84 | large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.01 | -0.85 | large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -6.75 | -1.91 | very_large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -6.51 | -1.84 | very_large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -5.36 | -1.51 | very_large |
| Avg Votes Per Proposal | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -5.21 | -1.47 | very_large |
| Voter Retention Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.38 | -0.96 | large |
| Voter Retention Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.38 | -0.96 | large |
| Voter Retention Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.38 | -0.96 | large |
| Voter Retention Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.38 | -0.96 | large |
| Voter Retention Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 3.41 | 0.96 | large |
| Voter Retention Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 3.41 | 0.96 | large |
| Voter Retention Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.41 | -0.96 | large |
| Voter Retention Rate | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.41 | -0.96 | large |
| Voting Power Utilization | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | -2.85 | -0.81 | large |
| Voting Power Utilization | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -8.18 | -2.31 | very_large |
| Voting Power Utilization | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -5.76 | -1.63 | very_large |
| Voting Power Utilization | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -8.17 | -2.31 | very_large |
| Voting Power Utilization | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -6.97 | -1.97 | very_large |
| Voting Power Utilization | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -5.40 | -1.53 | very_large |
| Voting Power Utilization | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -2.98 | -0.84 | large |
| Voting Power Utilization | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -5.76 | -1.63 | very_large |
| Voting Power Utilization | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -5.00 | -1.41 | very_large |
| Voting Power Utilization | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 7.43 | 2.10 | very_large |
| Voting Power Utilization | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 5.81 | 1.64 | very_large |
| Voting Power Utilization | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 5.17 | 1.46 | very_large |
| Voting Power Utilization | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 3.42 | 0.97 | large |
| Voting Power Utilization | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.08 | -0.87 | large |
| Voting Power Utilization | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -2.76 | -0.78 | medium |
| Voting Power Utilization | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -7.58 | -2.14 | very_large |
| Voting Power Utilization | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -6.58 | -1.86 | very_large |
| Voting Power Utilization | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -6.13 | -1.73 | very_large |
| Voting Power Utilization | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -5.31 | -1.50 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -13.03 | -3.69 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -13.77 | -3.90 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -8.89 | -2.51 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -11.38 | -3.22 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -13.29 | -3.76 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -14.00 | -3.96 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -9.08 | -2.57 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -11.61 | -3.28 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -12.71 | -3.59 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -13.54 | -3.83 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -8.86 | -2.51 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -11.21 | -3.17 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -13.06 | -3.69 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -13.84 | -3.92 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -9.11 | -2.58 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -11.52 | -3.26 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -3.87 | -1.09 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -3.40 | -0.96 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.94 | -1.11 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.78 | -1.07 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -3.85 | -1.09 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -3.39 | -0.96 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.93 | -1.11 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.77 | -1.07 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -3.87 | -1.09 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -3.40 | -0.96 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.94 | -1.11 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.78 | -1.07 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -3.86 | -1.09 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -3.39 | -0.96 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.93 | -1.11 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.77 | -1.07 | large |
| Whale Influence | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -14.30 | -4.05 | very_large |
| Whale Influence | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -15.46 | -4.37 | very_large |
| Whale Influence | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -18.00 | -5.09 | very_large |
| Whale Influence | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -14.82 | -4.19 | very_large |
| Whale Influence | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -16.61 | -4.70 | very_large |
| Whale Influence | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -17.92 | -5.07 | very_large |
| Whale Influence | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -21.55 | -6.10 | very_large |
| Whale Influence | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -17.26 | -4.88 | very_large |
| Whale Influence | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 15.79 | 4.47 | very_large |
| Whale Influence | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 16.63 | 4.70 | very_large |
| Whale Influence | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 17.05 | 4.82 | very_large |
| Whale Influence | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 17.97 | 5.08 | very_large |
| Whale Influence | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -20.39 | -5.77 | very_large |
| Whale Influence | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -16.40 | -4.64 | very_large |
| Whale Influence | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -21.89 | -6.19 | very_large |
| Whale Influence | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -17.30 | -4.89 | very_large |
| Governance Capture Risk | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25.92 | 7.33 | very_large |
| Governance Capture Risk | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25.65 | 7.26 | very_large |
| Governance Capture Risk | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 22.50 | 6.36 | very_large |
| Governance Capture Risk | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 26.68 | 7.55 | very_large |
| Governance Capture Risk | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 30.58 | 8.65 | very_large |
| Governance Capture Risk | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 30.46 | 8.61 | very_large |
| Governance Capture Risk | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25.71 | 7.27 | very_large |
| Governance Capture Risk | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 31.29 | 8.85 | very_large |
| Governance Capture Risk | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -27.65 | -7.82 | very_large |
| Governance Capture Risk | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -25.84 | -7.31 | very_large |
| Governance Capture Risk | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -27.43 | -7.76 | very_large |
| Governance Capture Risk | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | -25.57 | -7.23 | very_large |
| Governance Capture Risk | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 23.80 | 6.73 | very_large |
| Governance Capture Risk | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 28.39 | 8.03 | very_large |
| Governance Capture Risk | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 22.92 | 6.48 | very_large |
| Governance Capture Risk | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 26.57 | 7.52 | very_large |
| Vote Buying Vulnerability | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.51 | -0.99 | large |
| Vote Buying Vulnerability | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.30 | -0.93 | large |
| Vote Buying Vulnerability | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 2.73 | 0.77 | medium |
| Vote Buying Vulnerability | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.63 | -1.03 | large |
| Vote Buying Vulnerability | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -4.05 | -1.15 | large |
| Vote Buying Vulnerability | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -2.69 | -0.76 | medium |
| Treasury Trend | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -2.85 | -0.81 | large |
| Treasury Trend | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -3.28 | -0.93 | large |
| Treasury Trend | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -3.24 | -0.92 | large |
| Treasury Trend | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -3.23 | -0.91 | large |
| Treasury Trend | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | -3.18 | -0.90 | large |
| Governance Activity Index | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | -3.23 | -0.91 | large |
| Governance Activity Index | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -5.84 | -1.65 | very_large |
| Governance Activity Index | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -4.56 | -1.29 | very_large |
| Governance Activity Index | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -7.21 | -2.04 | very_large |
| Governance Activity Index | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -5.66 | -1.60 | very_large |
| Governance Activity Index | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | -3.04 | -0.86 | large |
| Governance Activity Index | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 3.04 | 0.86 | large |
| Governance Activity Index | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -4.43 | -1.25 | very_large |
| Governance Activity Index | treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -3.49 | -0.99 | large |
| Governance Activity Index | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 5.59 | 1.58 | very_large |
| Governance Activity Index | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 4.08 | 1.15 | large |
| Governance Activity Index | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 4.36 | 1.23 | very_large |
| Governance Activity Index | treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 2.78 | 0.79 | medium |
| Governance Activity Index | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -6.91 | -1.95 | very_large |
| Governance Activity Index | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -5.51 | -1.56 | very_large |
| Governance Activity Index | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | -5.45 | -1.54 | very_large |
| Governance Activity Index | treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 vs treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | -4.30 | -1.22 | very_large |

## Power Analysis

| Metric | Value |
|--------|-------|
| Current Runs per Config | 25 |
| Recommended Runs | 63 |
| Current Power | 43.6% |
| Minimum Detectable Effect | d = 0.7920 |

**Interpretation:**
⚠️ Consider increasing sample size to 63 runs per configuration for 80% power to detect medium effects (d = 0.5).

## Recommendations

### Data Quality Improvements

#### Critical (Must Address)

- **Final Token Price**: Very high variability (CV=192.9%). Distribution may be non-normal or parameter has high stochasticity.
- **Treasury Growth Rate**: Very high variability (CV=339.7%). Distribution may be non-normal or parameter has high stochasticity. Non-symmetric distribution at sweep=treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 (mean=-0.3960, median=-0.6500). Consider bootstrap CI.
- **Participation Trend**: Very high variability (CV=3507.8%). Distribution may be non-normal or parameter has high stochasticity.
- **Treasury Trend**: Very high variability (CV=394.9%). Distribution may be non-normal or parameter has high stochasticity.

#### Warnings (Should Address)

- **Proposal Pass Rate**: High variability (CV=65.8%). Consider more runs or controlled conditions.
- **Final Treasury**: High variability (CV=83.6%). Consider more runs or controlled conditions.
- **Proposal Abandonment Rate**: High variability (CV=58.6%). Consider more runs or controlled conditions.
- **Voter Retention Rate**: Non-symmetric distribution at sweep=treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 (mean=0.9979, median=1.0000). Consider bootstrap CI.
- **Collusion Threshold**: Non-symmetric distribution at sweep=treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 (mean=0.1156, median=0.1000). Consider bootstrap CI.
- **Member Growth Rate**: Metric is always zero across all conditions. May indicate unimplemented feature or degenerate case.

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
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.009829 | 0.010256 | 0.005895 | 0.001179 | [0.0074, 0.0123] | [0.0071, 0.0117] | 0.0087 | 0.0000 | 0.0205 | 59.98% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.013076 | 0.010471 | 0.008604 | 0.001721 | [0.0095, 0.0166] | [0.0084, 0.0154] | 0.0138 | 0.0000 | 0.0304 | 65.80% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.089135 | 0.090909 | 0.021333 | 0.004267 | [0.0803, 0.0979] | [0.0847, 0.1008] | 0.0285 | 0.0370 | 0.1307 | 23.93% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.079155 | 0.076087 | 0.034511 | 0.006902 | [0.0649, 0.0934] | [0.0641, 0.0914] | 0.0484 | 0.0293 | 0.1594 | 43.60% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.009552 | 0.009852 | 0.005478 | 0.001096 | [0.0073, 0.0118] | [0.0074, 0.0112] | 0.0092 | 0.0000 | 0.0192 | 57.35% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.012636 | 0.009901 | 0.006560 | 0.001312 | [0.0099, 0.0153] | [0.0111, 0.0164] | 0.0064 | 0.0046 | 0.0270 | 51.92% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.085866 | 0.082524 | 0.025792 | 0.005158 | [0.0752, 0.0965] | [0.0794, 0.1004] | 0.0291 | 0.0520 | 0.1422 | 30.04% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.076891 | 0.076923 | 0.027619 | 0.005524 | [0.0655, 0.0883] | [0.0716, 0.0921] | 0.0447 | 0.0306 | 0.1283 | 35.92% |

#### Average Turnout

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.060344 | 0.059430 | 0.005743 | 0.001149 | [0.0580, 0.0627] | [0.0600, 0.0642] | 0.0091 | 0.0524 | 0.0711 | 9.52% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.065327 | 0.065035 | 0.006573 | 0.001315 | [0.0626, 0.0680] | [0.0644, 0.0690] | 0.0083 | 0.0485 | 0.0783 | 10.06% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.076587 | 0.076910 | 0.008103 | 0.001621 | [0.0732, 0.0799] | [0.0747, 0.0809] | 0.0095 | 0.0616 | 0.0926 | 10.58% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.071305 | 0.072358 | 0.007578 | 0.001516 | [0.0682, 0.0744] | [0.0679, 0.0742] | 0.0083 | 0.0580 | 0.0874 | 10.63% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.060517 | 0.059808 | 0.007169 | 0.001434 | [0.0576, 0.0635] | [0.0584, 0.0646] | 0.0078 | 0.0481 | 0.0761 | 11.85% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.064418 | 0.064654 | 0.006640 | 0.001328 | [0.0617, 0.0672] | [0.0619, 0.0668] | 0.0102 | 0.0514 | 0.0784 | 10.31% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.078956 | 0.078720 | 0.009830 | 0.001966 | [0.0749, 0.0830] | [0.0750, 0.0831] | 0.0109 | 0.0556 | 0.0975 | 12.45% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.079290 | 0.076554 | 0.012328 | 0.002466 | [0.0742, 0.0844] | [0.0762, 0.0859] | 0.0148 | 0.0626 | 0.1095 | 15.55% |

#### Final Treasury

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 11712.705279 | 12029.210183 | 558.737098 | 111.747420 | [11482.0699, 11943.3406] | [11376.4042, 11865.8809] | 592.1262 | 10310.2405 | 12035.6866 | 4.77% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 11934.457627 | 12030.085112 | 338.062007 | 67.612401 | [11794.9125, 12074.0028] | [11954.7382, 12032.1793] | 2.4866 | 10400.9793 | 12038.7414 | 2.83% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 11852.111527 | 12029.889800 | 444.263742 | 88.852748 | [11668.7285, 12035.4946] | [11613.7297, 12002.2661] | 1.6018 | 10333.0755 | 12039.2304 | 3.75% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 11914.651624 | 12030.010903 | 282.765450 | 56.553090 | [11797.9318, 12031.3715] | [11717.8000, 11983.0503] | 5.4787 | 10997.8704 | 12042.3820 | 2.37% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 31214.855677 | 21055.080440 | 23259.008834 | 4651.801767 | [21614.0087, 40815.7027] | [22320.6994, 38733.8669] | 39358.6670 | 9298.4705 | 80627.9219 | 74.51% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 29004.170233 | 15757.188279 | 22200.825155 | 4440.165031 | [19840.1200, 38168.2205] | [23205.2431, 40924.5444] | 44290.2229 | 9310.3328 | 65351.7305 | 76.54% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 38304.432923 | 24154.701745 | 31465.523713 | 6293.104743 | [25316.1031, 51292.7627] | [20149.0942, 42320.6753] | 48111.9178 | 9243.0776 | 111549.9873 | 82.15% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 35654.391156 | 22629.317064 | 29810.997511 | 5962.199502 | [23349.0162, 47959.7661] | [27978.9656, 51563.4127] | 35815.8239 | 9401.8603 | 112050.5982 | 83.61% |

#### Final Token Price

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 2.459081 | 1.254965 | 2.638487 | 0.527697 | [1.3700, 3.5482] | [1.5152, 3.6707] | 0.6275 | 0.9320 | 11.6359 | 107.30% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 5.460208 | 2.306003 | 7.921679 | 1.584336 | [2.1903, 8.7301] | [3.0936, 8.5825] | 2.7039 | 0.9333 | 31.3716 | 145.08% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 2.313923 | 1.783606 | 1.471595 | 0.294319 | [1.7065, 2.9214] | [1.7175, 2.8355] | 1.9960 | 0.9296 | 6.0468 | 63.60% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 3.065324 | 1.851188 | 4.508821 | 0.901764 | [1.2042, 4.9265] | [1.7100, 5.9244] | 1.1397 | 1.0322 | 22.7982 | 147.09% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 2.778541 | 1.688927 | 2.433756 | 0.486751 | [1.7739, 3.7831] | [1.9041, 3.6021] | 1.9251 | 0.9370 | 10.6720 | 87.59% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 4.915034 | 1.699481 | 9.481368 | 1.896274 | [1.0013, 8.8287] | [2.8535, 10.8066] | 3.0714 | 1.0197 | 46.6925 | 192.91% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 4.357581 | 1.953470 | 5.867374 | 1.173475 | [1.9356, 6.7795] | [1.9059, 6.0819] | 3.0299 | 0.9955 | 23.1933 | 134.65% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 3.886489 | 2.141923 | 5.361242 | 1.072248 | [1.6735, 6.0995] | [2.1227, 6.3138] | 1.7356 | 1.0237 | 24.6027 | 137.95% |

#### Final Member Count

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |

#### Total Proposals

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 202.880000 | 203.000000 | 13.448420 | 2.689684 | [197.3288, 208.4312] | [196.6800, 208.3600] | 17.0000 | 180.0000 | 226.0000 | 6.63% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 210.040000 | 208.000000 | 13.980582 | 2.796116 | [204.2691, 215.8109] | [204.0800, 215.0800] | 13.0000 | 186.0000 | 245.0000 | 6.66% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 202.040000 | 203.000000 | 17.970995 | 3.594199 | [194.6219, 209.4581] | [194.4400, 208.8800] | 20.0000 | 165.0000 | 240.0000 | 8.89% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 205.760000 | 209.000000 | 15.508815 | 3.101763 | [199.3583, 212.1617] | [200.5600, 212.2000] | 26.0000 | 173.0000 | 227.0000 | 7.54% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 202.600000 | 200.000000 | 14.297436 | 2.859487 | [196.6983, 208.5017] | [195.6400, 206.5600] | 23.0000 | 174.0000 | 229.0000 | 7.06% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 204.320000 | 206.000000 | 11.756984 | 2.351397 | [199.4670, 209.1730] | [198.6800, 209.5600] | 16.0000 | 183.0000 | 232.0000 | 5.75% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 206.520000 | 204.000000 | 17.095613 | 3.419123 | [199.4633, 213.5767] | [200.0800, 212.4800] | 18.0000 | 173.0000 | 241.0000 | 8.28% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 204.960000 | 203.000000 | 17.548694 | 3.509739 | [197.7163, 212.2037] | [201.4400, 217.8000] | 28.0000 | 174.0000 | 244.0000 | 8.56% |

#### Quorum Reach Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.309132 | 0.306604 | 0.027178 | 0.005436 | [0.2979, 0.3204] | [0.3054, 0.3276] | 0.0333 | 0.2514 | 0.3584 | 8.79% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.340556 | 0.336585 | 0.037345 | 0.007469 | [0.3251, 0.3560] | [0.3261, 0.3513] | 0.0468 | 0.2559 | 0.4266 | 10.97% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.342819 | 0.341346 | 0.036914 | 0.007383 | [0.3276, 0.3581] | [0.3372, 0.3629] | 0.0580 | 0.2727 | 0.4010 | 10.77% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.323487 | 0.320930 | 0.048348 | 0.009670 | [0.3035, 0.3434] | [0.3002, 0.3401] | 0.0606 | 0.2418 | 0.4198 | 14.95% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.316649 | 0.314410 | 0.037866 | 0.007573 | [0.3010, 0.3323] | [0.3047, 0.3362] | 0.0565 | 0.2538 | 0.3906 | 11.96% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.335665 | 0.336207 | 0.031593 | 0.006319 | [0.3226, 0.3487] | [0.3212, 0.3471] | 0.0402 | 0.2658 | 0.4203 | 9.41% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.356235 | 0.350230 | 0.049905 | 0.009981 | [0.3356, 0.3768] | [0.3364, 0.3809] | 0.0615 | 0.2514 | 0.4510 | 14.01% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.348066 | 0.345133 | 0.061576 | 0.012315 | [0.3226, 0.3735] | [0.3355, 0.3806] | 0.0676 | 0.2525 | 0.4918 | 17.69% |

#### Avg Margin of Victory

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.487457 | 0.484282 | 0.036521 | 0.007304 | [0.4724, 0.5025] | [0.4661, 0.4905] | 0.0500 | 0.4333 | 0.5814 | 7.49% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.489179 | 0.480479 | 0.038807 | 0.007761 | [0.4732, 0.5052] | [0.4747, 0.5030] | 0.0644 | 0.4335 | 0.5765 | 7.93% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.512562 | 0.514701 | 0.027178 | 0.005436 | [0.5013, 0.5238] | [0.5020, 0.5211] | 0.0454 | 0.4784 | 0.5688 | 5.30% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.522894 | 0.531813 | 0.025810 | 0.005162 | [0.5122, 0.5335] | [0.5157, 0.5355] | 0.0352 | 0.4500 | 0.5791 | 4.94% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.480042 | 0.477997 | 0.029990 | 0.005998 | [0.4677, 0.4924] | [0.4645, 0.4889] | 0.0492 | 0.4274 | 0.5329 | 6.25% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.481399 | 0.486300 | 0.027778 | 0.005556 | [0.4699, 0.4929] | [0.4737, 0.4927] | 0.0375 | 0.4131 | 0.5191 | 5.77% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.512320 | 0.514138 | 0.033085 | 0.006617 | [0.4987, 0.5260] | [0.5047, 0.5302] | 0.0416 | 0.4504 | 0.5951 | 6.46% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.517772 | 0.517222 | 0.036541 | 0.007308 | [0.5027, 0.5329] | [0.4986, 0.5275] | 0.0500 | 0.4242 | 0.5775 | 7.06% |

#### Avg Time to Decision

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 1029.946288 | 1028.361111 | 43.458418 | 8.691684 | [1012.0075, 1047.8850] | [1006.8255, 1038.4455] | 58.1178 | 907.9305 | 1102.3524 | 4.22% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 1013.181478 | 1004.286408 | 47.089438 | 9.417888 | [993.7439, 1032.6190] | [997.6856, 1036.4631] | 66.3554 | 918.3831 | 1091.5463 | 4.65% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 1024.263042 | 1035.727273 | 41.608101 | 8.321620 | [1007.0881, 1041.4380] | [1001.1092, 1036.9446] | 74.1487 | 948.0727 | 1092.3478 | 4.06% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 1036.532403 | 1040.004525 | 36.868919 | 7.373784 | [1021.3137, 1051.7511] | [1023.8912, 1051.6980] | 46.3570 | 954.4778 | 1096.2757 | 3.56% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 1021.957119 | 1021.019704 | 36.047091 | 7.209418 | [1007.0776, 1036.8366] | [1008.8994, 1034.0756] | 37.2538 | 940.4247 | 1100.9676 | 3.53% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 1019.297694 | 1024.591346 | 31.709787 | 6.341957 | [1006.2085, 1032.3869] | [1005.1780, 1034.1646] | 45.1385 | 953.0408 | 1097.3363 | 3.11% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 1021.191268 | 1023.887701 | 42.321444 | 8.464289 | [1003.7218, 1038.6607] | [999.0101, 1030.8661] | 32.8161 | 895.2926 | 1133.9200 | 4.14% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 1022.470730 | 1014.965665 | 34.577052 | 6.915410 | [1008.1980, 1036.7434] | [1008.8528, 1036.3505] | 58.1887 | 962.5352 | 1095.6257 | 3.38% |

#### Proposal Abandonment Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.021106 | 0.018868 | 0.010191 | 0.002038 | [0.0169, 0.0253] | [0.0172, 0.0266] | 0.0128 | 0.0049 | 0.0505 | 48.28% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.020326 | 0.020513 | 0.009537 | 0.001907 | [0.0164, 0.0243] | [0.0152, 0.0226] | 0.0130 | 0.0043 | 0.0398 | 46.92% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.023471 | 0.022624 | 0.009065 | 0.001813 | [0.0197, 0.0272] | [0.0196, 0.0284] | 0.0116 | 0.0060 | 0.0466 | 38.62% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.021821 | 0.019139 | 0.010168 | 0.002034 | [0.0176, 0.0260] | [0.0188, 0.0267] | 0.0116 | 0.0049 | 0.0417 | 46.59% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.023453 | 0.021739 | 0.013744 | 0.002749 | [0.0178, 0.0291] | [0.0170, 0.0249] | 0.0117 | 0.0000 | 0.0688 | 58.60% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.021719 | 0.023697 | 0.008863 | 0.001773 | [0.0181, 0.0254] | [0.0200, 0.0265] | 0.0125 | 0.0048 | 0.0370 | 40.81% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.021707 | 0.019324 | 0.012026 | 0.002405 | [0.0167, 0.0267] | [0.0172, 0.0272] | 0.0143 | 0.0000 | 0.0546 | 55.40% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.023359 | 0.022124 | 0.009577 | 0.001915 | [0.0194, 0.0273] | [0.0206, 0.0269] | 0.0096 | 0.0094 | 0.0542 | 41.00% |

#### Proposal Rejection Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.990171 | 0.989744 | 0.005895 | 0.001179 | [0.9877, 0.9926] | [0.9884, 0.9929] | 0.0087 | 0.9795 | 1.0000 | 0.60% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.986924 | 0.989529 | 0.008604 | 0.001721 | [0.9834, 0.9905] | [0.9848, 0.9917] | 0.0138 | 0.9696 | 1.0000 | 0.87% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.910865 | 0.909091 | 0.021333 | 0.004267 | [0.9021, 0.9197] | [0.8989, 0.9168] | 0.0285 | 0.8693 | 0.9630 | 2.34% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.920845 | 0.923913 | 0.034511 | 0.006902 | [0.9066, 0.9351] | [0.9089, 0.9367] | 0.0484 | 0.8406 | 0.9707 | 3.75% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.990448 | 0.990148 | 0.005478 | 0.001096 | [0.9882, 0.9927] | [0.9888, 0.9927] | 0.0092 | 0.9808 | 1.0000 | 0.55% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.987364 | 0.990099 | 0.006560 | 0.001312 | [0.9847, 0.9901] | [0.9838, 0.9890] | 0.0064 | 0.9730 | 0.9954 | 0.66% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.914134 | 0.917476 | 0.025792 | 0.005158 | [0.9035, 0.9248] | [0.8992, 0.9215] | 0.0291 | 0.8578 | 0.9480 | 2.82% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.923109 | 0.923077 | 0.027619 | 0.005524 | [0.9117, 0.9345] | [0.9069, 0.9286] | 0.0447 | 0.8717 | 0.9694 | 2.99% |

#### Governance Overhead

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 16.849503 | 16.625668 | 1.432833 | 0.286567 | [16.2581, 17.4409] | [16.7249, 17.9049] | 1.0797 | 14.4972 | 19.5638 | 8.50% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 18.443738 | 18.526971 | 2.057910 | 0.411582 | [17.5943, 19.2932] | [18.0145, 19.7387] | 2.3239 | 14.4634 | 24.7204 | 11.16% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 20.906377 | 20.807692 | 2.075320 | 0.415064 | [20.0497, 21.7630] | [20.4126, 22.0733] | 3.0151 | 17.4562 | 25.5894 | 9.93% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 19.723391 | 19.777273 | 1.840867 | 0.368173 | [18.9635, 20.4833] | [19.1096, 20.4013] | 2.6447 | 15.6796 | 23.1795 | 9.33% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 17.224940 | 17.169231 | 1.865702 | 0.373140 | [16.4548, 17.9951] | [16.5950, 18.0648] | 2.1928 | 13.7766 | 20.8278 | 10.83% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 18.188454 | 18.221675 | 1.756097 | 0.351219 | [17.4636, 18.9133] | [17.3495, 18.7560] | 2.1257 | 14.5787 | 22.7353 | 9.65% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 21.659331 | 21.312796 | 2.651327 | 0.530265 | [20.5649, 22.7537] | [20.5913, 22.7148] | 2.1456 | 13.8492 | 26.2727 | 12.24% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 21.897245 | 21.700000 | 3.066923 | 0.613385 | [20.6313, 23.1632] | [21.0652, 23.5757] | 4.2402 | 16.8764 | 29.3067 | 14.01% |

#### Unique Voter Count

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |

#### Voter Participation Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.078527 | 0.078513 | 0.006511 | 0.001302 | [0.0758, 0.0812] | [0.0782, 0.0834] | 0.0060 | 0.0675 | 0.0910 | 8.29% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.086043 | 0.086783 | 0.009569 | 0.001914 | [0.0821, 0.0900] | [0.0845, 0.0917] | 0.0111 | 0.0669 | 0.1139 | 11.12% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.097250 | 0.096412 | 0.010024 | 0.002005 | [0.0931, 0.1014] | [0.0948, 0.1029] | 0.0138 | 0.0805 | 0.1201 | 10.31% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.091868 | 0.092911 | 0.008598 | 0.001720 | [0.0883, 0.0954] | [0.0886, 0.0951] | 0.0125 | 0.0743 | 0.1066 | 9.36% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.080110 | 0.079423 | 0.008847 | 0.001769 | [0.0765, 0.0838] | [0.0770, 0.0847] | 0.0100 | 0.0626 | 0.0978 | 11.04% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.084739 | 0.084684 | 0.008292 | 0.001658 | [0.0813, 0.0882] | [0.0810, 0.0874] | 0.0079 | 0.0675 | 0.1067 | 9.79% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.100928 | 0.100067 | 0.012637 | 0.002527 | [0.0957, 0.1061] | [0.0953, 0.1058] | 0.0093 | 0.0650 | 0.1229 | 12.52% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.101811 | 0.100407 | 0.014121 | 0.002824 | [0.0960, 0.1076] | [0.0980, 0.1092] | 0.0190 | 0.0782 | 0.1361 | 13.87% |

#### Voter Concentration Gini

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.363602 | 0.365033 | 0.012882 | 0.002576 | [0.3583, 0.3689] | [0.3548, 0.3645] | 0.0132 | 0.3351 | 0.3882 | 3.54% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.359402 | 0.358013 | 0.011147 | 0.002229 | [0.3548, 0.3640] | [0.3538, 0.3635] | 0.0171 | 0.3402 | 0.3799 | 3.10% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.228565 | 0.227713 | 0.011120 | 0.002224 | [0.2240, 0.2332] | [0.2222, 0.2314] | 0.0146 | 0.2124 | 0.2520 | 4.87% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.239035 | 0.240808 | 0.018471 | 0.003694 | [0.2314, 0.2467] | [0.2332, 0.2476] | 0.0188 | 0.2046 | 0.2760 | 7.73% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.361264 | 0.363236 | 0.009972 | 0.001994 | [0.3571, 0.3654] | [0.3581, 0.3651] | 0.0136 | 0.3443 | 0.3785 | 2.76% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.359175 | 0.355696 | 0.011749 | 0.002350 | [0.3543, 0.3640] | [0.3562, 0.3659] | 0.0149 | 0.3422 | 0.3831 | 3.27% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.230021 | 0.224570 | 0.020521 | 0.004104 | [0.2216, 0.2385] | [0.2203, 0.2368] | 0.0206 | 0.1943 | 0.2795 | 8.92% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.229544 | 0.230809 | 0.018975 | 0.003795 | [0.2217, 0.2374] | [0.2198, 0.2321] | 0.0201 | 0.1999 | 0.2782 | 8.27% |

#### Delegate Concentration

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.396614 | 0.399785 | 0.011764 | 0.002353 | [0.3918, 0.4015] | [0.3903, 0.3988] | 0.0164 | 0.3700 | 0.4125 | 2.97% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.402933 | 0.403345 | 0.010724 | 0.002145 | [0.3985, 0.4074] | [0.3988, 0.4082] | 0.0165 | 0.3845 | 0.4204 | 2.66% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.324789 | 0.325020 | 0.018817 | 0.003763 | [0.3170, 0.3326] | [0.3143, 0.3292] | 0.0282 | 0.2850 | 0.3625 | 5.79% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.333364 | 0.330225 | 0.016324 | 0.003265 | [0.3266, 0.3401] | [0.3290, 0.3395] | 0.0198 | 0.3039 | 0.3643 | 4.90% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.398562 | 0.397710 | 0.010047 | 0.002009 | [0.3944, 0.4027] | [0.3941, 0.4020] | 0.0156 | 0.3787 | 0.4162 | 2.52% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.403909 | 0.404757 | 0.013462 | 0.002692 | [0.3984, 0.4095] | [0.4013, 0.4122] | 0.0123 | 0.3825 | 0.4511 | 3.33% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.321620 | 0.318689 | 0.020968 | 0.004194 | [0.3130, 0.3303] | [0.3118, 0.3291] | 0.0162 | 0.2948 | 0.3833 | 6.52% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.318701 | 0.317924 | 0.019856 | 0.003971 | [0.3105, 0.3269] | [0.3092, 0.3230] | 0.0297 | 0.2859 | 0.3694 | 6.23% |

#### Avg Votes Per Proposal

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 16.490601 | 16.487685 | 1.367337 | 0.273467 | [15.9262, 17.0550] | [16.4457, 17.5152] | 1.2556 | 14.1803 | 19.1055 | 8.29% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 18.069119 | 18.224490 | 2.009504 | 0.401901 | [17.2396, 18.8986] | [17.7172, 19.3032] | 2.3240 | 14.0521 | 23.9266 | 11.12% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 20.422401 | 20.246512 | 2.104963 | 0.420993 | [19.5535, 21.2913] | [19.8683, 21.6224] | 2.9076 | 16.9107 | 25.2238 | 10.31% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 19.292303 | 19.511211 | 1.805635 | 0.361127 | [18.5470, 20.0376] | [18.6088, 20.0027] | 2.6186 | 15.5934 | 22.3762 | 9.36% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 16.823016 | 16.678733 | 1.857968 | 0.371594 | [16.0561, 17.5899] | [16.3066, 17.7292] | 2.0918 | 13.1472 | 20.5330 | 11.04% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 17.795097 | 17.783654 | 1.741412 | 0.348282 | [17.0763, 18.5139] | [16.9588, 18.3734] | 1.6515 | 14.1847 | 22.4058 | 9.79% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 21.194973 | 21.014019 | 2.653810 | 0.530762 | [20.0995, 22.2904] | [19.9159, 22.2676] | 1.9524 | 13.6436 | 25.8039 | 12.52% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 21.380331 | 21.085427 | 2.965309 | 0.593062 | [20.1563, 22.6044] | [20.6334, 22.9105] | 3.9876 | 16.4153 | 28.5861 | 13.87% |

#### Voter Retention Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.997856 | 1.000000 | 0.003171 | 0.000634 | [0.9965, 0.9992] | [0.9963, 0.9992] | 0.0049 | 0.9902 | 1.0000 | 0.32% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.998834 | 1.000000 | 0.003221 | 0.000644 | [0.9975, 1.0002] | [0.9965, 0.9998] | - | 0.9854 | 1.0000 | 0.32% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 1.000000 | 1.000000 | 0.000000 | 0.000000 | [1.0000, 1.0000] | [1.0000, 1.0000] | - | 1.0000 | 1.0000 | 0.00% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 1.000000 | 1.000000 | 0.000000 | 0.000000 | [1.0000, 1.0000] | [1.0000, 1.0000] | - | 1.0000 | 1.0000 | 0.00% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.997275 | 1.000000 | 0.003994 | 0.000799 | [0.9956, 0.9989] | [0.9961, 0.9988] | 0.0049 | 0.9902 | 1.0000 | 0.40% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.997471 | 1.000000 | 0.005084 | 0.001017 | [0.9954, 0.9996] | [0.9938, 0.9982] | - | 0.9854 | 1.0000 | 0.51% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 1.000000 | 1.000000 | 0.000000 | 0.000000 | [1.0000, 1.0000] | [1.0000, 1.0000] | - | 1.0000 | 1.0000 | 0.00% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 1.000000 | 1.000000 | 0.000000 | 0.000000 | [1.0000, 1.0000] | [1.0000, 1.0000] | - | 1.0000 | 1.0000 | 0.00% |

#### Voting Power Utilization

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.060344 | 0.059430 | 0.005743 | 0.001149 | [0.0580, 0.0627] | [0.0600, 0.0642] | 0.0091 | 0.0524 | 0.0711 | 9.52% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.065327 | 0.065035 | 0.006573 | 0.001315 | [0.0626, 0.0680] | [0.0644, 0.0690] | 0.0083 | 0.0485 | 0.0783 | 10.06% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.076587 | 0.076910 | 0.008103 | 0.001621 | [0.0732, 0.0799] | [0.0747, 0.0809] | 0.0095 | 0.0616 | 0.0926 | 10.58% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.071305 | 0.072358 | 0.007578 | 0.001516 | [0.0682, 0.0744] | [0.0679, 0.0742] | 0.0083 | 0.0580 | 0.0874 | 10.63% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.060517 | 0.059808 | 0.007169 | 0.001434 | [0.0576, 0.0635] | [0.0584, 0.0646] | 0.0078 | 0.0481 | 0.0761 | 11.85% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.064418 | 0.064654 | 0.006640 | 0.001328 | [0.0617, 0.0672] | [0.0619, 0.0668] | 0.0102 | 0.0514 | 0.0784 | 10.31% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.078956 | 0.078720 | 0.009830 | 0.001966 | [0.0749, 0.0830] | [0.0750, 0.0831] | 0.0109 | 0.0556 | 0.0975 | 12.45% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.079290 | 0.076554 | 0.012328 | 0.002466 | [0.0742, 0.0844] | [0.0762, 0.0859] | 0.0148 | 0.0626 | 0.1095 | 15.55% |

#### Treasury Volatility

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.194714 | 0.195482 | 0.018256 | 0.003651 | [0.1872, 0.2023] | [0.1879, 0.2026] | 0.0277 | 0.1646 | 0.2252 | 9.38% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.189168 | 0.192743 | 0.019682 | 0.003936 | [0.1810, 0.1973] | [0.1790, 0.1944] | 0.0216 | 0.1450 | 0.2226 | 10.40% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.191122 | 0.203474 | 0.031979 | 0.006396 | [0.1779, 0.2043] | [0.1870, 0.2078] | 0.0345 | 0.1273 | 0.2312 | 16.73% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.183543 | 0.196409 | 0.033103 | 0.006621 | [0.1699, 0.1972] | [0.1694, 0.1931] | 0.0541 | 0.1140 | 0.2266 | 18.04% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.431345 | 0.459697 | 0.088933 | 0.017787 | [0.3946, 0.4681] | [0.4014, 0.4715] | 0.0794 | 0.1949 | 0.5595 | 20.62% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.490796 | 0.480862 | 0.105925 | 0.021185 | [0.4471, 0.5345] | [0.4368, 0.5158] | 0.1093 | 0.3133 | 0.7774 | 21.58% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.438491 | 0.442894 | 0.135904 | 0.027181 | [0.3824, 0.4946] | [0.4309, 0.5293] | 0.1360 | 0.1383 | 0.7253 | 30.99% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.433998 | 0.459926 | 0.103548 | 0.020710 | [0.3913, 0.4767] | [0.3862, 0.4691] | 0.1467 | 0.2193 | 0.5897 | 23.86% |

#### Treasury Growth Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | -0.714483 | -0.720350 | 0.020284 | 0.004057 | [-0.7229, -0.7061] | [-0.7259, -0.7088] | 0.0265 | -0.7604 | -0.6893 | 2.84% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | -0.712848 | -0.720366 | 0.015299 | 0.003060 | [-0.7192, -0.7065] | [-0.7146, -0.7030] | 0.0308 | -0.7316 | -0.6891 | 2.15% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | -0.714671 | -0.720339 | 0.018940 | 0.003788 | [-0.7225, -0.7069] | [-0.7248, -0.7102] | 0.0311 | -0.7598 | -0.6893 | 2.65% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | -0.713244 | -0.720347 | 0.015984 | 0.003197 | [-0.7198, -0.7066] | [-0.7219, -0.7093] | 0.0306 | -0.7368 | -0.6891 | 2.24% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | -0.333362 | -0.579131 | 0.492257 | 0.098451 | [-0.5366, -0.1302] | [-0.5351, -0.1640] | 0.8960 | -0.7935 | 0.6117 | 147.66% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | -0.396043 | -0.650034 | 0.467689 | 0.093538 | [-0.5891, -0.2030] | [-0.5371, -0.1568] | 0.8614 | -0.8131 | 0.4515 | 118.09% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | -0.194265 | -0.463526 | 0.659867 | 0.131973 | [-0.4666, 0.0781] | [-0.5743, -0.1362] | 0.9582 | -0.8152 | 1.3721 | 339.67% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | -0.256563 | -0.508277 | 0.605351 | 0.121070 | [-0.5064, -0.0067] | [-0.4494, 0.0262] | 0.7955 | -0.7963 | 1.2398 | 235.95% |

#### Staking Participation

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.122383 | 0.122976 | 0.004859 | 0.000972 | [0.1204, 0.1244] | [0.1208, 0.1244] | 0.0068 | 0.1139 | 0.1313 | 3.97% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.122545 | 0.121729 | 0.005981 | 0.001196 | [0.1201, 0.1250] | [0.1207, 0.1254] | 0.0092 | 0.1115 | 0.1368 | 4.88% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.124145 | 0.123473 | 0.006811 | 0.001362 | [0.1213, 0.1270] | [0.1223, 0.1271] | 0.0086 | 0.1138 | 0.1396 | 5.49% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.121634 | 0.120271 | 0.008266 | 0.001653 | [0.1182, 0.1250] | [0.1207, 0.1268] | 0.0101 | 0.1103 | 0.1392 | 6.80% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.121257 | 0.120545 | 0.005613 | 0.001123 | [0.1189, 0.1236] | [0.1202, 0.1251] | 0.0065 | 0.1139 | 0.1348 | 4.63% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.122759 | 0.122461 | 0.005789 | 0.001158 | [0.1204, 0.1251] | [0.1218, 0.1269] | 0.0052 | 0.1144 | 0.1403 | 4.72% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.123496 | 0.123240 | 0.005236 | 0.001047 | [0.1213, 0.1257] | [0.1218, 0.1256] | 0.0047 | 0.1154 | 0.1395 | 4.24% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.123630 | 0.121085 | 0.007744 | 0.001549 | [0.1204, 0.1268] | [0.1219, 0.1276] | 0.0104 | 0.1121 | 0.1438 | 6.26% |

#### Token Concentration Gini

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.551213 | 0.549624 | 0.013993 | 0.002799 | [0.5454, 0.5570] | [0.5445, 0.5546] | 0.0237 | 0.5281 | 0.5724 | 2.54% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.549860 | 0.549949 | 0.016779 | 0.003356 | [0.5429, 0.5568] | [0.5411, 0.5539] | 0.0253 | 0.5243 | 0.5816 | 3.05% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.547675 | 0.547209 | 0.016948 | 0.003390 | [0.5407, 0.5547] | [0.5393, 0.5522] | 0.0213 | 0.5145 | 0.5826 | 3.09% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.557101 | 0.561777 | 0.022566 | 0.004513 | [0.5478, 0.5664] | [0.5486, 0.5687] | 0.0311 | 0.5200 | 0.5878 | 4.05% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.552926 | 0.555851 | 0.017923 | 0.003585 | [0.5455, 0.5603] | [0.5409, 0.5564] | 0.0263 | 0.5145 | 0.5754 | 3.24% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.557449 | 0.554639 | 0.010364 | 0.002073 | [0.5532, 0.5617] | [0.5529, 0.5599] | 0.0151 | 0.5435 | 0.5859 | 1.86% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.547922 | 0.548291 | 0.014640 | 0.002928 | [0.5419, 0.5540] | [0.5395, 0.5525] | 0.0245 | 0.5242 | 0.5729 | 2.67% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.555999 | 0.557064 | 0.018562 | 0.003712 | [0.5483, 0.5637] | [0.5477, 0.5608] | 0.0242 | 0.5135 | 0.5892 | 3.34% |

#### Avg Member Wealth

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 117.696686 | 116.953508 | 4.634382 | 0.926876 | [115.7837, 119.6097] | [115.8832, 119.4278] | 6.5982 | 109.5608 | 126.2886 | 3.94% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 117.631277 | 118.151630 | 5.706561 | 1.141312 | [115.2757, 119.9868] | [115.6654, 119.3927] | 8.7187 | 105.1413 | 128.9837 | 4.85% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 116.177815 | 116.482794 | 6.191243 | 1.238249 | [113.6222, 118.7334] | [113.5169, 117.7201] | 8.0885 | 103.0121 | 126.3613 | 5.33% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 118.750789 | 119.584073 | 7.792303 | 1.558461 | [115.5343, 121.9673] | [115.6557, 122.7307] | 10.0477 | 103.3348 | 130.3669 | 6.56% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 118.848246 | 119.311493 | 5.330935 | 1.066187 | [116.6477, 121.0487] | [115.2715, 119.9337] | 6.4423 | 106.7240 | 126.2167 | 4.49% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 117.398134 | 117.445205 | 5.281050 | 1.056210 | [115.2182, 119.5780] | [113.5754, 118.5292] | 5.0942 | 102.5404 | 125.6788 | 4.50% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 116.654217 | 116.702675 | 4.761853 | 0.952371 | [114.6886, 118.6198] | [115.0018, 118.2493] | 4.4388 | 103.0729 | 124.6247 | 4.08% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 116.758474 | 118.779569 | 7.067094 | 1.413419 | [113.8413, 119.6756] | [113.1825, 117.9745] | 9.6592 | 100.0324 | 128.3323 | 6.05% |

#### Wealth Mobility

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.448787 | 0.450376 | 0.013993 | 0.002799 | [0.4430, 0.4546] | [0.4448, 0.4551] | 0.0237 | 0.4276 | 0.4719 | 3.12% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.450140 | 0.450051 | 0.016779 | 0.003356 | [0.4432, 0.4571] | [0.4458, 0.4587] | 0.0253 | 0.4184 | 0.4757 | 3.73% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.452325 | 0.452791 | 0.016948 | 0.003390 | [0.4453, 0.4593] | [0.4481, 0.4609] | 0.0213 | 0.4174 | 0.4855 | 3.75% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.442899 | 0.438223 | 0.022566 | 0.004513 | [0.4336, 0.4522] | [0.4321, 0.4510] | 0.0311 | 0.4122 | 0.4800 | 5.10% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.447074 | 0.444149 | 0.017923 | 0.003585 | [0.4397, 0.4545] | [0.4441, 0.4596] | 0.0263 | 0.4246 | 0.4855 | 4.01% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.442551 | 0.445361 | 0.010364 | 0.002073 | [0.4383, 0.4468] | [0.4402, 0.4473] | 0.0151 | 0.4141 | 0.4565 | 2.34% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.452078 | 0.451709 | 0.014640 | 0.002928 | [0.4460, 0.4581] | [0.4477, 0.4599] | 0.0245 | 0.4271 | 0.4758 | 3.24% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.444001 | 0.442936 | 0.018562 | 0.003712 | [0.4363, 0.4517] | [0.4389, 0.4524] | 0.0242 | 0.4108 | 0.4865 | 4.18% |

#### Whale Influence

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.357919 | 0.357226 | 0.030306 | 0.006061 | [0.3454, 0.3704] | [0.3398, 0.3644] | 0.0210 | 0.2783 | 0.4269 | 8.47% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.340700 | 0.336868 | 0.027517 | 0.005503 | [0.3293, 0.3521] | [0.3269, 0.3480] | 0.0219 | 0.2859 | 0.4100 | 8.08% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.498656 | 0.496884 | 0.038761 | 0.007752 | [0.4827, 0.5147] | [0.4748, 0.5056] | 0.0306 | 0.3851 | 0.5763 | 7.77% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.504944 | 0.505971 | 0.036659 | 0.007332 | [0.4898, 0.5201] | [0.4959, 0.5225] | 0.0670 | 0.4241 | 0.5641 | 7.26% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.347986 | 0.348104 | 0.027827 | 0.005565 | [0.3365, 0.3595] | [0.3367, 0.3622] | 0.0296 | 0.3059 | 0.4126 | 8.00% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.343436 | 0.347899 | 0.025988 | 0.005198 | [0.3327, 0.3542] | [0.3312, 0.3505] | 0.0426 | 0.3001 | 0.3918 | 7.57% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.493438 | 0.490873 | 0.022318 | 0.004464 | [0.4842, 0.5027] | [0.4849, 0.5039] | 0.0184 | 0.4573 | 0.5532 | 4.52% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.498498 | 0.504953 | 0.036503 | 0.007301 | [0.4834, 0.5136] | [0.4839, 0.5108] | 0.0353 | 0.4062 | 0.5601 | 7.32% |

#### Whale Proposal Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.092665 | 0.096330 | 0.017296 | 0.003459 | [0.0855, 0.0998] | [0.0834, 0.0966] | 0.0225 | 0.0601 | 0.1211 | 18.66% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.104017 | 0.101604 | 0.019483 | 0.003897 | [0.0960, 0.1121] | [0.0943, 0.1113] | 0.0199 | 0.0577 | 0.1393 | 18.73% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.095376 | 0.096774 | 0.026413 | 0.005283 | [0.0845, 0.1063] | [0.0848, 0.1035] | 0.0305 | 0.0400 | 0.1429 | 27.69% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.093916 | 0.095238 | 0.023810 | 0.004762 | [0.0841, 0.1037] | [0.0850, 0.1020] | 0.0302 | 0.0249 | 0.1378 | 25.35% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.101020 | 0.104167 | 0.021233 | 0.004247 | [0.0923, 0.1098] | [0.0913, 0.1058] | 0.0295 | 0.0722 | 0.1549 | 21.02% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.096433 | 0.098361 | 0.022727 | 0.004545 | [0.0871, 0.1058] | [0.0854, 0.1043] | 0.0244 | 0.0340 | 0.1302 | 23.57% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.093371 | 0.094527 | 0.025800 | 0.005160 | [0.0827, 0.1040] | [0.0866, 0.1055] | 0.0294 | 0.0280 | 0.1500 | 27.63% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.100555 | 0.094262 | 0.027961 | 0.005592 | [0.0890, 0.1121] | [0.0917, 0.1139] | 0.0346 | 0.0256 | 0.1609 | 27.81% |

#### Governance Capture Risk

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.464983 | 0.463820 | 0.017644 | 0.003529 | [0.4577, 0.4723] | [0.4588, 0.4698] | 0.0226 | 0.4153 | 0.4953 | 3.79% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.472459 | 0.472569 | 0.014247 | 0.002849 | [0.4666, 0.4783] | [0.4663, 0.4787] | 0.0150 | 0.4386 | 0.5041 | 3.02% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.341878 | 0.342616 | 0.015899 | 0.003180 | [0.3353, 0.3484] | [0.3341, 0.3469] | 0.0251 | 0.3150 | 0.3686 | 4.65% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.345319 | 0.342323 | 0.015254 | 0.003051 | [0.3390, 0.3516] | [0.3401, 0.3497] | 0.0179 | 0.3170 | 0.3842 | 4.42% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.469513 | 0.471094 | 0.016731 | 0.003346 | [0.4626, 0.4764] | [0.4621, 0.4770] | 0.0232 | 0.4336 | 0.4985 | 3.56% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.476152 | 0.476081 | 0.020544 | 0.004109 | [0.4677, 0.4846] | [0.4728, 0.4893] | 0.0163 | 0.4355 | 0.5351 | 4.31% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.339898 | 0.338100 | 0.021481 | 0.004296 | [0.3310, 0.3488] | [0.3323, 0.3489] | 0.0208 | 0.2966 | 0.3955 | 6.32% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.336236 | 0.334635 | 0.016461 | 0.003292 | [0.3294, 0.3430] | [0.3301, 0.3406] | 0.0235 | 0.3119 | 0.3898 | 4.90% |

#### Vote Buying Vulnerability

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 78.657910 | 76.782610 | 12.156446 | 2.431289 | [73.6400, 83.6758] | [73.5818, 82.6274] | 20.9048 | 55.8614 | 99.8489 | 15.45% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 78.133849 | 73.683833 | 15.701885 | 3.140377 | [71.6524, 84.6153] | [73.6281, 84.7599] | 19.8058 | 59.0946 | 112.3730 | 20.10% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 87.212447 | 88.207044 | 15.943052 | 3.188610 | [80.6315, 93.7934] | [84.2097, 95.0653] | 16.6343 | 59.2687 | 113.4136 | 18.28% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 85.054710 | 82.211553 | 20.046424 | 4.009285 | [76.7800, 93.3295] | [77.1563, 93.2598] | 30.0647 | 52.9846 | 123.0747 | 23.57% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 77.175478 | 78.548142 | 14.416046 | 2.883209 | [71.2248, 83.1261] | [71.5830, 84.9447] | 20.1741 | 47.9932 | 106.1070 | 18.68% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 76.082376 | 73.958699 | 12.706848 | 2.541370 | [70.8372, 81.3275] | [70.4451, 79.7199] | 13.8269 | 55.3621 | 99.7357 | 16.70% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 93.857011 | 89.206314 | 17.900510 | 3.580102 | [86.4680, 101.2460] | [89.1390, 104.9014] | 29.0912 | 61.0892 | 123.5020 | 19.07% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 87.926533 | 84.621730 | 18.007255 | 3.601451 | [80.4935, 95.3596] | [81.4940, 94.5499] | 20.1108 | 54.5649 | 127.3657 | 20.48% |

#### Single Entity Control

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.040376 | 0.040623 | 0.001659 | 0.000332 | [0.0397, 0.0411] | [0.0399, 0.0411] | 0.0021 | 0.0373 | 0.0435 | 4.11% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.040395 | 0.039987 | 0.001976 | 0.000395 | [0.0396, 0.0412] | [0.0397, 0.0413] | 0.0027 | 0.0369 | 0.0453 | 4.89% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.040952 | 0.040881 | 0.002196 | 0.000439 | [0.0400, 0.0419] | [0.0403, 0.0419] | 0.0029 | 0.0377 | 0.0461 | 5.36% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.040158 | 0.039779 | 0.002723 | 0.000545 | [0.0390, 0.0413] | [0.0389, 0.0410] | 0.0036 | 0.0365 | 0.0461 | 6.78% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.040018 | 0.039873 | 0.001844 | 0.000369 | [0.0393, 0.0408] | [0.0397, 0.0412] | 0.0022 | 0.0375 | 0.0442 | 4.61% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.040524 | 0.040215 | 0.001947 | 0.000389 | [0.0397, 0.0413] | [0.0402, 0.0418] | 0.0017 | 0.0375 | 0.0464 | 4.81% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.040775 | 0.040651 | 0.001767 | 0.000353 | [0.0400, 0.0415] | [0.0402, 0.0414] | 0.0019 | 0.0382 | 0.0462 | 4.33% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.040817 | 0.040090 | 0.002544 | 0.000509 | [0.0398, 0.0419] | [0.0402, 0.0422] | 0.0034 | 0.0371 | 0.0471 | 6.23% |

#### Collusion Threshold

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.116571 | 0.114286 | 0.020021 | 0.004004 | [0.1083, 0.1248] | [0.1099, 0.1251] | 0.0333 | 0.0952 | 0.1571 | 17.17% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.118667 | 0.114286 | 0.023244 | 0.004649 | [0.1091, 0.1283] | [0.1118, 0.1297] | 0.0333 | 0.0905 | 0.1667 | 19.59% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.123238 | 0.119048 | 0.024487 | 0.004897 | [0.1131, 0.1333] | [0.1160, 0.1337] | 0.0476 | 0.0905 | 0.1714 | 19.87% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.115619 | 0.100000 | 0.028917 | 0.005783 | [0.1037, 0.1276] | [0.1029, 0.1276] | 0.0381 | 0.0905 | 0.1714 | 25.01% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.114095 | 0.104762 | 0.024222 | 0.004844 | [0.1041, 0.1241] | [0.1107, 0.1314] | 0.0333 | 0.0905 | 0.1714 | 21.23% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.110857 | 0.109524 | 0.016411 | 0.003282 | [0.1041, 0.1176] | [0.1076, 0.1223] | 0.0238 | 0.0905 | 0.1571 | 14.80% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.120571 | 0.114286 | 0.020698 | 0.004140 | [0.1120, 0.1291] | [0.1150, 0.1307] | 0.0333 | 0.0952 | 0.1571 | 17.17% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.117524 | 0.109524 | 0.024231 | 0.004846 | [0.1075, 0.1275] | [0.1116, 0.1299] | 0.0476 | 0.0905 | 0.1667 | 20.62% |

#### Participation Trend

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.000014 | 0.000024 | 0.000079 | 0.000016 | [-0.0000, 0.0000] | [-0.0000, 0.0000] | 0.0001 | -0.0002 | 0.0002 | 558.17% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.000034 | 0.000036 | 0.000052 | 0.000010 | [0.0000, 0.0001] | [0.0000, 0.0001] | 0.0001 | -0.0001 | 0.0001 | 153.74% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | -0.000011 | -0.000006 | 0.000118 | 0.000024 | [-0.0001, 0.0000] | [-0.0000, 0.0001] | 0.0002 | -0.0002 | 0.0003 | 1112.67% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | -0.000013 | -0.000012 | 0.000117 | 0.000023 | [-0.0001, 0.0000] | [-0.0001, 0.0000] | 0.0002 | -0.0003 | 0.0002 | 910.68% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.000024 | 0.000030 | 0.000108 | 0.000022 | [-0.0000, 0.0001] | [-0.0000, 0.0001] | 0.0001 | -0.0003 | 0.0002 | 449.84% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.000003 | 0.000023 | 0.000098 | 0.000020 | [-0.0000, 0.0000] | [-0.0001, 0.0000] | 0.0001 | -0.0002 | 0.0001 | 3507.81% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.000011 | 0.000010 | 0.000110 | 0.000022 | [-0.0000, 0.0001] | [-0.0000, 0.0000] | 0.0001 | -0.0002 | 0.0002 | 987.21% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.000021 | 0.000030 | 0.000124 | 0.000025 | [-0.0000, 0.0001] | [-0.0000, 0.0001] | 0.0001 | -0.0002 | 0.0004 | 604.08% |

#### Treasury Trend

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | -1.082987 | -1.159795 | 0.272019 | 0.054404 | [-1.1953, -0.9707] | [-1.2156, -1.0331] | 0.4775 | -1.4677 | -0.4335 | 25.12% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | -0.983746 | -1.022422 | 0.230142 | 0.046028 | [-1.0787, -0.8887] | [-1.0475, -0.8662] | 0.3479 | -1.4785 | -0.5409 | 23.39% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | -0.961993 | -0.989016 | 0.343811 | 0.068762 | [-1.1039, -0.8201] | [-1.1276, -0.8627] | 0.5260 | -1.3454 | 0.0131 | 35.74% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | -0.838229 | -0.837621 | 0.332100 | 0.066420 | [-0.9753, -0.7011] | [-0.8931, -0.6611] | 0.4895 | -1.4328 | -0.2771 | 39.62% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 6.933573 | 3.371795 | 12.224735 | 2.444947 | [1.8875, 11.9797] | [1.7753, 10.3942] | 11.1024 | -14.4289 | 30.0190 | 176.31% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 3.882926 | 2.852135 | 14.049120 | 2.809824 | [-1.9163, 9.6821] | [-0.6621, 9.6704] | 12.8636 | -27.1656 | 27.6110 | 361.82% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 4.489305 | 3.663887 | 17.727103 | 3.545421 | [-2.8281, 11.8067] | [-6.5283, 6.7033] | 24.6113 | -36.3714 | 30.5960 | 394.87% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 6.484340 | 1.220226 | 14.905471 | 2.981094 | [0.3317, 12.6370] | [1.4438, 13.6692] | 20.8144 | -19.5715 | 30.9784 | 229.87% |

#### Member Growth Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Min | Max | CV |
|------|---|------|--------|-----|----|----|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |

#### Proposal Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 10.144000 | 10.150000 | 0.672421 | 0.134484 | [9.8664, 10.4216] | [9.8600, 10.4300] | 0.8500 | 9.0000 | 11.3000 | 6.63% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 10.502000 | 10.400000 | 0.699029 | 0.139806 | [10.2135, 10.7905] | [10.2220, 10.7520] | 0.6500 | 9.3000 | 12.2500 | 6.66% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 10.102000 | 10.150000 | 0.898550 | 0.179710 | [9.7311, 10.4729] | [9.7260, 10.4280] | 1.0000 | 8.2500 | 12.0000 | 8.89% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 10.288000 | 10.450000 | 0.775441 | 0.155088 | [9.9679, 10.6081] | [10.0600, 10.6300] | 1.3000 | 8.6500 | 11.3500 | 7.54% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 10.130000 | 10.000000 | 0.714872 | 0.142974 | [9.8349, 10.4251] | [9.8060, 10.3420] | 1.1500 | 8.7000 | 11.4500 | 7.06% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 10.216000 | 10.300000 | 0.587849 | 0.117570 | [9.9733, 10.4587] | [9.9120, 10.4580] | 0.8000 | 9.1500 | 11.6000 | 5.75% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 10.326000 | 10.200000 | 0.854781 | 0.170956 | [9.9732, 10.6788] | [10.0260, 10.6040] | 0.9000 | 8.6500 | 12.0500 | 8.28% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 10.248000 | 10.150000 | 0.877435 | 0.175487 | [9.8858, 10.6102] | [10.0340, 10.8120] | 1.4000 | 8.7000 | 12.2000 | 8.56% |

#### Governance Activity Index

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.005998 | 0.005846 | 0.000758 | 0.000152 | [0.0057, 0.0063] | [0.0059, 0.0064] | 0.0009 | 0.0047 | 0.0078 | 12.64% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.006724 | 0.006759 | 0.000831 | 0.000166 | [0.0064, 0.0071] | [0.0065, 0.0072] | 0.0010 | 0.0050 | 0.0083 | 12.37% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.007565 | 0.007631 | 0.001107 | 0.000221 | [0.0071, 0.0080] | [0.0072, 0.0082] | 0.0015 | 0.0049 | 0.0096 | 14.64% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.007192 | 0.007192 | 0.001068 | 0.000214 | [0.0068, 0.0076] | [0.0068, 0.0076] | 0.0015 | 0.0052 | 0.0098 | 14.86% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.005993 | 0.005906 | 0.000868 | 0.000174 | [0.0056, 0.0064] | [0.0057, 0.0064] | 0.0011 | 0.0045 | 0.0079 | 14.48% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.006444 | 0.006284 | 0.000816 | 0.000163 | [0.0061, 0.0068] | [0.0061, 0.0068] | 0.0011 | 0.0049 | 0.0081 | 12.67% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.007975 | 0.008148 | 0.001142 | 0.000228 | [0.0075, 0.0084] | [0.0075, 0.0084] | 0.0014 | 0.0051 | 0.0099 | 14.32% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.007950 | 0.007570 | 0.001548 | 0.000310 | [0.0073, 0.0086] | [0.0077, 0.0090] | 0.0017 | 0.0056 | 0.0130 | 19.48% |

#### Final Gini

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.551213 | 0.549624 | 0.013993 | 0.002799 | [0.5454, 0.5570] | [0.5445, 0.5546] | 0.0237 | 0.5281 | 0.5724 | 2.54% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.549860 | 0.549949 | 0.016779 | 0.003356 | [0.5429, 0.5568] | [0.5411, 0.5539] | 0.0253 | 0.5243 | 0.5816 | 3.05% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.547675 | 0.547209 | 0.016948 | 0.003390 | [0.5407, 0.5547] | [0.5393, 0.5522] | 0.0213 | 0.5145 | 0.5826 | 3.09% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.557101 | 0.561777 | 0.022566 | 0.004513 | [0.5478, 0.5664] | [0.5486, 0.5687] | 0.0311 | 0.5200 | 0.5878 | 4.05% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.552926 | 0.555851 | 0.017923 | 0.003585 | [0.5455, 0.5603] | [0.5409, 0.5564] | 0.0263 | 0.5145 | 0.5754 | 3.24% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.557449 | 0.554639 | 0.010364 | 0.002073 | [0.5532, 0.5617] | [0.5529, 0.5599] | 0.0151 | 0.5435 | 0.5859 | 1.86% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.547922 | 0.548291 | 0.014640 | 0.002928 | [0.5419, 0.5540] | [0.5395, 0.5525] | 0.0245 | 0.5242 | 0.5729 | 2.67% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.555999 | 0.557064 | 0.018562 | 0.003712 | [0.5483, 0.5637] | [0.5477, 0.5608] | 0.0242 | 0.5135 | 0.5892 | 3.34% |

#### Final Reputation Gini

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.975536 | 0.975546 | 0.001230 | 0.000246 | [0.9750, 0.9760] | [0.9749, 0.9758] | 0.0017 | 0.9739 | 0.9789 | 0.13% |
| treasury_stabilization_enabled=true_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.975065 | 0.974816 | 0.001481 | 0.000296 | [0.9745, 0.9757] | [0.9746, 0.9758] | 0.0014 | 0.9732 | 0.9799 | 0.15% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.975396 | 0.974863 | 0.003814 | 0.000763 | [0.9738, 0.9770] | [0.9742, 0.9775] | 0.0020 | 0.9715 | 0.9921 | 0.39% |
| treasury_stabilization_enabled=true_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.974958 | 0.974823 | 0.001430 | 0.000286 | [0.9744, 0.9755] | [0.9745, 0.9755] | 0.0012 | 0.9715 | 0.9783 | 0.15% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0 | 25 | 0.975332 | 0.974959 | 0.001335 | 0.000267 | [0.9748, 0.9759] | [0.9750, 0.9761] | 0.0018 | 0.9733 | 0.9783 | 0.14% |
| treasury_stabilization_enabled=false_participation_target_rate=0_proposal_bond_fraction=0.01 | 25 | 0.975012 | 0.974785 | 0.001279 | 0.000256 | [0.9745, 0.9755] | [0.9747, 0.9758] | 0.0016 | 0.9733 | 0.9785 | 0.13% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0 | 25 | 0.975169 | 0.974954 | 0.001510 | 0.000302 | [0.9745, 0.9758] | [0.9747, 0.9758] | 0.0018 | 0.9716 | 0.9788 | 0.15% |
| treasury_stabilization_enabled=false_participation_target_rate=0.2_proposal_bond_fraction=0.01 | 25 | 0.975532 | 0.975386 | 0.002116 | 0.000423 | [0.9747, 0.9764] | [0.9747, 0.9760] | 0.0020 | 0.9727 | 0.9836 | 0.22% |

---

*Report generated by DAO Simulator Research Quality Report Generator*
