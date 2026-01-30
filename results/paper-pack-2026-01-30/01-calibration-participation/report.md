# DAO Simulation Research Quality Report

**Generated:** 2026-01-30
**Results Directory:** 01-calibration-participation

---

## Executive Summary

**Experiment:** 01-calibration-participation
**Total Runs:** 270
**Runs per Configuration:** 30
**Sweep Values:** voting_activity=0.15_participation_target_rate=0, voting_activity=0.15_participation_target_rate=0.15, voting_activity=0.15_participation_target_rate=0.25, voting_activity=0.25_participation_target_rate=0, voting_activity=0.25_participation_target_rate=0.15, voting_activity=0.25_participation_target_rate=0.25, voting_activity=0.35_participation_target_rate=0, voting_activity=0.35_participation_target_rate=0.15, voting_activity=0.35_participation_target_rate=0.25
**Statistical Power:** 49%
**Metrics Analyzed:** 38

### Overall Quality Assessment

❌ **Issues Detected** - 2 critical issue(s), 7 warning(s).

### Key Statistics

| Aspect | Value |
|--------|-------|
| Significant Effects | 24 of 38 metrics |
| Critical Issues | 2 |
| Warnings | 7 |
| Minimum Effect Detectable | d = 0.723 |

## Key Findings

1. **Voter Concentration Gini**: Significant effect (F=963.9, p<0.001). Ranges from 0.1619 (at Voting Activity=voting_activity=0.35_participation_target_rate=0.25) to 0.4749 (at Voting Activity=voting_activity=0.15_participation_target_rate=0).

2. **Governance Capture Risk**: Significant effect (F=552.4, p<0.001). Ranges from 0.3308 (at Voting Activity=voting_activity=0.35_participation_target_rate=0.25) to 0.5800 (at Voting Activity=voting_activity=0.15_participation_target_rate=0).

3. **Whale Influence**: Significant effect (F=391.5, p<0.001). Ranges from 0.2032 (at Voting Activity=voting_activity=0.15_participation_target_rate=0) to 0.5503 (at Voting Activity=voting_activity=0.35_participation_target_rate=0.15).

4. **Delegate Concentration**: Significant effect (F=340.5, p<0.001). Ranges from 0.3246 (at Voting Activity=voting_activity=0.35_participation_target_rate=0.25) to 0.5133 (at Voting Activity=voting_activity=0.15_participation_target_rate=0).

5. **Proposal Pass Rate**: Significant effect (F=219.6, p<0.001). Ranges from 0.0082 (at Voting Activity=voting_activity=0.15_participation_target_rate=0) to 0.1748 (at Voting Activity=voting_activity=0.35_participation_target_rate=0.25).

6. 14 metrics showed no significant variation across Voting Activity values.

## Methodology

### Experimental Design

- **Design Type:** Parameter sweep study
- **Independent Variable:** Voting Activity (9 levels: voting_activity=0.15_participation_target_rate=0, voting_activity=0.15_participation_target_rate=0.15, voting_activity=0.15_participation_target_rate=0.25, voting_activity=0.25_participation_target_rate=0, voting_activity=0.25_participation_target_rate=0.15, voting_activity=0.25_participation_target_rate=0.25, voting_activity=0.35_participation_target_rate=0, voting_activity=0.35_participation_target_rate=0.15, voting_activity=0.35_participation_target_rate=0.25)
- **Dependent Variables:** 38 governance metrics
- **Replication:** 30 simulation runs per configuration
- **Total Runs:** 270

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
2. **Fixed Parameters:** Only Voting Activity was varied; other parameters held constant
3. **Distribution Assumptions:** Some metrics violate normality assumptions
4. **Model Validity:** See code review for known simulation issues

## Metric Analysis by Category

### Basic Outcome

| Metric | Voting Activity=voting_activity=0.15_participation_target_rate=0 | Voting Activity=voting_activity=0.15_participation_target_rate=0.15 | Voting Activity=voting_activity=0.15_participation_target_rate=0.25 | Voting Activity=voting_activity=0.25_participation_target_rate=0 | Voting Activity=voting_activity=0.25_participation_target_rate=0.15 | Voting Activity=voting_activity=0.25_participation_target_rate=0.25 | Voting Activity=voting_activity=0.35_participation_target_rate=0 | Voting Activity=voting_activity=0.35_participation_target_rate=0.15 | Voting Activity=voting_activity=0.35_participation_target_rate=0.25 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|------|-------------|--------|
| Proposal Pass Rate | 0.0082 | 0.0184 | 0.0310 | 0.0100 | 0.0817 | 0.0846 | 0.0265 | 0.1618 | 0.1748 | ✓ | -6.72 |
| Average Turnout | 0.0498 | 0.0613 | 0.0658 | 0.0612 | 0.0719 | 0.0754 | 0.0656 | 0.0840 | 0.0902 | ✓ | -5.16 |
| Final Treasury | 11828 | 11732 | 11994 | 11724 | 11920 | 11846 | 11844 | 11943 | 11903 |  | -0.69 |
| Final Token Price | 2.5353 | 2.1541 | 3.0331 | 2.5348 | 2.6561 | 2.7402 | 3.2838 | 2.7272 | 3.4281 |  | -0.33 |
| Final Member Count | 210.0000 | 210.0000 | 210.0000 | 210.0000 | 210.0000 | 210.0000 | 210.0000 | 210.0000 | 210.0000 |  | - |
| Total Proposals | 199.2333 | 205.7667 | 202.6000 | 203.5667 | 205.1333 | 204.8667 | 204.1000 | 206.6000 | 200.5000 |  | -0.64 |

### Governance Efficiency

| Metric | Voting Activity=voting_activity=0.15_participation_target_rate=0 | Voting Activity=voting_activity=0.15_participation_target_rate=0.15 | Voting Activity=voting_activity=0.15_participation_target_rate=0.25 | Voting Activity=voting_activity=0.25_participation_target_rate=0 | Voting Activity=voting_activity=0.25_participation_target_rate=0.15 | Voting Activity=voting_activity=0.25_participation_target_rate=0.25 | Voting Activity=voting_activity=0.35_participation_target_rate=0 | Voting Activity=voting_activity=0.35_participation_target_rate=0.15 | Voting Activity=voting_activity=0.35_participation_target_rate=0.25 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|------|-------------|--------|
| Quorum Reach Rate | 0.3697 | 0.2875 | 0.3090 | 0.3106 | 0.3258 | 0.3412 | 0.2936 | 0.4023 | 0.4292 | ✓ | -3.03 |
| Avg Margin of Victory | 0.5600 | 0.5593 | 0.5568 | 0.4883 | 0.5294 | 0.5192 | 0.4753 | 0.4982 | 0.4787 | ✓ | 3.01 |
| Avg Time to Decision | 1017 | 1031 | 1031 | 1024 | 1023 | 1019 | 1021 | 1024 | 1037 |  | -0.44 |
| Proposal Abandonment Rate | 0.0193 | 0.0213 | 0.0222 | 0.0196 | 0.0229 | 0.0236 | 0.0231 | 0.0241 | 0.0164 |  | 0.93 |
| Proposal Rejection Rate | 0.9918 | 0.9816 | 0.9690 | 0.9900 | 0.9183 | 0.9154 | 0.9735 | 0.8382 | 0.8252 | ✓ | 6.72 |
| Governance Overhead | 15.6413 | 18.7186 | 18.6374 | 16.9953 | 19.6514 | 20.5877 | 18.4952 | 23.2828 | 24.5449 | ✓ | -4.22 |

### Participation Quality

| Metric | Voting Activity=voting_activity=0.15_participation_target_rate=0 | Voting Activity=voting_activity=0.15_participation_target_rate=0.15 | Voting Activity=voting_activity=0.15_participation_target_rate=0.25 | Voting Activity=voting_activity=0.25_participation_target_rate=0 | Voting Activity=voting_activity=0.25_participation_target_rate=0.15 | Voting Activity=voting_activity=0.25_participation_target_rate=0.25 | Voting Activity=voting_activity=0.35_participation_target_rate=0 | Voting Activity=voting_activity=0.35_participation_target_rate=0.15 | Voting Activity=voting_activity=0.35_participation_target_rate=0.25 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|------|-------------|--------|
| Unique Voter Count | 206.0000 | 206.0000 | 206.0000 | 206.0000 | 206.0000 | 206.0000 | 206.0000 | 206.0000 | 206.0000 |  | - |
| Voter Participation Rate | 0.0730 | 0.0872 | 0.0868 | 0.0793 | 0.0914 | 0.0957 | 0.0860 | 0.1082 | 0.1149 | ✓ | -4.34 |
| Voter Concentration Gini | 0.4749 | 0.3192 | 0.3217 | 0.3655 | 0.2402 | 0.2354 | 0.2899 | 0.1697 | 0.1619 | ✓ | 22.03 |
| Delegate Concentration | 0.5133 | 0.3608 | 0.3640 | 0.4023 | 0.3345 | 0.3296 | 0.3370 | 0.3281 | 0.3246 | ✓ | 12.59 |
| Avg Votes Per Proposal | 15.3370 | 18.3185 | 18.2264 | 16.6587 | 19.2029 | 20.1014 | 18.0637 | 22.7245 | 24.1365 | ✓ | -4.34 |
| Voter Retention Rate | 0.9908 | 0.9984 | 0.9992 | 0.9976 | 0.9997 | 1.0000 | 0.9994 | 1.0000 | 1.0000 | ✓ | -1.37 |
| Voting Power Utilization | 0.0498 | 0.0613 | 0.0658 | 0.0612 | 0.0719 | 0.0754 | 0.0656 | 0.0840 | 0.0902 | ✓ | -5.16 |

### Economic Health

| Metric | Voting Activity=voting_activity=0.15_participation_target_rate=0 | Voting Activity=voting_activity=0.15_participation_target_rate=0.15 | Voting Activity=voting_activity=0.15_participation_target_rate=0.25 | Voting Activity=voting_activity=0.25_participation_target_rate=0 | Voting Activity=voting_activity=0.25_participation_target_rate=0.15 | Voting Activity=voting_activity=0.25_participation_target_rate=0.25 | Voting Activity=voting_activity=0.35_participation_target_rate=0 | Voting Activity=voting_activity=0.35_participation_target_rate=0.15 | Voting Activity=voting_activity=0.35_participation_target_rate=0.25 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|------|-------------|--------|
| Treasury Volatility | 0.1898 | 0.1908 | 0.1910 | 0.1971 | 0.1921 | 0.1961 | 0.1853 | 0.1896 | 0.1958 |  | 0.54 |
| Treasury Growth Rate | -0.7147 | -0.7141 | -0.7089 | -0.7165 | -0.7118 | -0.7147 | -0.7136 | -0.7048 | -0.7111 |  | -0.61 |
| Staking Participation | 0.1089 | 0.1098 | 0.1184 | 0.1236 | 0.1226 | 0.1238 | 0.1208 | 0.1218 | 0.1227 | ✓ | -3.79 |
| Token Concentration Gini | 0.5849 | 0.5931 | 0.5659 | 0.5487 | 0.5531 | 0.5492 | 0.5586 | 0.5486 | 0.5398 | ✓ | 4.55 |
| Avg Member Wealth | 132.0970 | 130.9338 | 121.9944 | 116.6279 | 117.5725 | 116.4487 | 119.3781 | 118.3910 | 117.3796 | ✓ | 4.27 |
| Wealth Mobility | 0.4151 | 0.4069 | 0.4341 | 0.4513 | 0.4469 | 0.4508 | 0.4414 | 0.4514 | 0.4602 | ✓ | -4.55 |

### Attack Resistance

| Metric | Voting Activity=voting_activity=0.15_participation_target_rate=0 | Voting Activity=voting_activity=0.15_participation_target_rate=0.15 | Voting Activity=voting_activity=0.15_participation_target_rate=0.25 | Voting Activity=voting_activity=0.25_participation_target_rate=0 | Voting Activity=voting_activity=0.25_participation_target_rate=0.15 | Voting Activity=voting_activity=0.25_participation_target_rate=0.25 | Voting Activity=voting_activity=0.35_participation_target_rate=0 | Voting Activity=voting_activity=0.35_participation_target_rate=0.15 | Voting Activity=voting_activity=0.35_participation_target_rate=0.25 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|------|-------------|--------|
| Whale Influence | 0.2032 | 0.3791 | 0.3820 | 0.3510 | 0.5062 | 0.5010 | 0.4626 | 0.5503 | 0.5399 | ✓ | -12.05 |
| Whale Proposal Rate | 0.0984 | 0.1006 | 0.1005 | 0.0956 | 0.0973 | 0.0927 | 0.0986 | 0.0937 | 0.0927 |  | 0.42 |
| Governance Capture Risk | 0.5800 | 0.3929 | 0.3921 | 0.4691 | 0.3477 | 0.3460 | 0.3854 | 0.3354 | 0.3308 | ✓ | 13.05 |
| Vote Buying Vulnerability | 60.0929 | 89.0010 | 87.4698 | 77.6384 | 86.5474 | 89.6392 | 81.1943 | 88.0349 | 91.1567 | ✓ | -2.02 |
| Single Entity Control | 0.0360 | 0.0364 | 0.0392 | 0.0408 | 0.0404 | 0.0410 | 0.0398 | 0.0403 | 0.0405 | ✓ | -3.69 |
| Collusion Threshold | 0.0865 | 0.0857 | 0.1063 | 0.1213 | 0.1162 | 0.1216 | 0.1103 | 0.1183 | 0.1268 | ✓ | -2.67 |

### Temporal Dynamics

| Metric | Voting Activity=voting_activity=0.15_participation_target_rate=0 | Voting Activity=voting_activity=0.15_participation_target_rate=0.15 | Voting Activity=voting_activity=0.15_participation_target_rate=0.25 | Voting Activity=voting_activity=0.25_participation_target_rate=0 | Voting Activity=voting_activity=0.25_participation_target_rate=0.15 | Voting Activity=voting_activity=0.25_participation_target_rate=0.25 | Voting Activity=voting_activity=0.35_participation_target_rate=0 | Voting Activity=voting_activity=0.35_participation_target_rate=0.15 | Voting Activity=voting_activity=0.35_participation_target_rate=0.25 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|------|-------------|--------|
| Participation Trend | 1.20e-5 | 5.00e-6 | 1.20e-5 | 3.30e-5 | 4.10e-5 | 2.20e-5 | -1.50e-5 | -1.30e-5 | -4.80e-5 |  | 0.72 |
| Treasury Trend | -0.8656 | -0.9850 | -0.9432 | -1.0943 | -0.9543 | -0.9688 | -1.0063 | -0.8348 | -1.0356 | ✓ | -0.89 |
| Member Growth Rate | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |  | - |
| Proposal Rate | 9.9617 | 10.2883 | 10.1300 | 10.1783 | 10.2567 | 10.2433 | 10.2050 | 10.3300 | 10.0250 |  | -0.64 |
| Governance Activity Index | 0.0049 | 0.0062 | 0.0065 | 0.0061 | 0.0072 | 0.0075 | 0.0065 | 0.0085 | 0.0089 | ✓ | -4.60 |

### Final State

| Metric | Voting Activity=voting_activity=0.15_participation_target_rate=0 | Voting Activity=voting_activity=0.15_participation_target_rate=0.15 | Voting Activity=voting_activity=0.15_participation_target_rate=0.25 | Voting Activity=voting_activity=0.25_participation_target_rate=0 | Voting Activity=voting_activity=0.25_participation_target_rate=0.15 | Voting Activity=voting_activity=0.25_participation_target_rate=0.25 | Voting Activity=voting_activity=0.35_participation_target_rate=0 | Voting Activity=voting_activity=0.35_participation_target_rate=0.15 | Voting Activity=voting_activity=0.35_participation_target_rate=0.25 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|------|-------------|--------|
| Final Gini | 0.5516 | 0.5606 | 0.5550 | 0.5487 | 0.5531 | 0.5492 | 0.5586 | 0.5486 | 0.5398 | ✓ | -2.40 |
| Final Reputation Gini | 0.9752 | 0.9756 | 0.9749 | 0.9755 | 0.9761 | 0.9753 | 0.9759 | 0.9760 | 0.9755 |  | 0.52 |

## Distribution Quality Analysis

This section identifies metrics with distribution characteristics that may affect statistical validity.

### High Variability Metrics (CV > 50%)

| Metric | Sweep Value | Mean | Std | CV | Issue |
|--------|-------------|------|-----|----|----|
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0 | 0.0082 | 0.0054 | 65.9% | 🟡 Warning |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0.25 | 0.0310 | 0.0213 | 68.6% | 🟡 Warning |
| Proposal Pass Rate | voting_activity=0.25_participation_target_rate=0 | 0.0100 | 0.0065 | 65.0% | 🟡 Warning |
| Proposal Pass Rate | voting_activity=0.35_participation_target_rate=0 | 0.0265 | 0.0158 | 59.6% | 🟡 Warning |
| Final Token Price | voting_activity=0.15_participation_target_rate=0 | 2.5353 | 2.1084 | 83.2% | 🟡 Warning |
| Final Token Price | voting_activity=0.15_participation_target_rate=0.15 | 2.1541 | 1.6652 | 77.3% | 🟡 Warning |
| Final Token Price | voting_activity=0.15_participation_target_rate=0.25 | 3.0331 | 3.8651 | 127.4% | 🔴 Critical |
| Final Token Price | voting_activity=0.25_participation_target_rate=0 | 2.5348 | 2.4008 | 94.7% | 🟡 Warning |
| Final Token Price | voting_activity=0.25_participation_target_rate=0.15 | 2.6561 | 2.1033 | 79.2% | 🟡 Warning |
| Final Token Price | voting_activity=0.25_participation_target_rate=0.25 | 2.7402 | 1.9216 | 70.1% | 🟡 Warning |
| Final Token Price | voting_activity=0.35_participation_target_rate=0 | 3.2838 | 6.7029 | 204.1% | 🔴 Critical |
| Final Token Price | voting_activity=0.35_participation_target_rate=0.15 | 2.7272 | 2.2231 | 81.5% | 🟡 Warning |
| Final Token Price | voting_activity=0.35_participation_target_rate=0.25 | 3.4281 | 6.1696 | 180.0% | 🔴 Critical |
| Proposal Abandonment Rate | voting_activity=0.15_participation_target_rate=0 | 0.0193 | 0.0104 | 54.0% | 🟡 Warning |
| Proposal Abandonment Rate | voting_activity=0.15_participation_target_rate=0.25 | 0.0222 | 0.0118 | 53.2% | 🟡 Warning |
| Proposal Abandonment Rate | voting_activity=0.25_participation_target_rate=0 | 0.0196 | 0.0100 | 51.0% | 🟡 Warning |
| Participation Trend | voting_activity=0.15_participation_target_rate=0 | 0.0000 | 0.0001 | 533.7% | 🔴 Critical |
| Participation Trend | voting_activity=0.15_participation_target_rate=0.15 | 0.0000 | 0.0001 | 1966.4% | 🔴 Critical |
| Participation Trend | voting_activity=0.15_participation_target_rate=0.25 | 0.0000 | 0.0001 | 966.2% | 🔴 Critical |
| Participation Trend | voting_activity=0.25_participation_target_rate=0 | 0.0000 | 0.0001 | 209.0% | 🔴 Critical |
| Participation Trend | voting_activity=0.25_participation_target_rate=0.15 | 0.0000 | 0.0001 | 303.4% | 🔴 Critical |
| Participation Trend | voting_activity=0.25_participation_target_rate=0.25 | 0.0000 | 0.0001 | 641.0% | 🔴 Critical |
| Participation Trend | voting_activity=0.35_participation_target_rate=0 | -0.0000 | 0.0001 | 872.4% | 🔴 Critical |
| Participation Trend | voting_activity=0.35_participation_target_rate=0.15 | -0.0000 | 0.0001 | 806.1% | 🔴 Critical |
| Participation Trend | voting_activity=0.35_participation_target_rate=0.25 | -0.0000 | 0.0001 | 296.6% | 🔴 Critical |

### Non-Symmetric Distributions

Metrics where mean and median diverge significantly, suggesting skewed distributions:

| Metric | Sweep Value | Mean | Median | Skew Indicator |
|--------|-------------|------|--------|----------------|
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0 | 0.0082 | 0.0053 | Right-skewed (0.53) |
| Final Treasury | voting_activity=0.15_participation_target_rate=0.15 | 11732.1589 | 12029.1180 | Left-skewed (-0.58) |
| Final Treasury | voting_activity=0.25_participation_target_rate=0 | 11724.3498 | 12029.2101 | Left-skewed (-0.54) |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0 | 0.9918 | 0.9947 | Left-skewed (-0.53) |
| Voter Retention Rate | voting_activity=0.25_participation_target_rate=0 | 0.9976 | 1.0000 | Left-skewed (-0.58) |
| Treasury Growth Rate | voting_activity=0.15_participation_target_rate=0.25 | -0.7089 | -0.7203 | Right-skewed (0.70) |
| Treasury Growth Rate | voting_activity=0.25_participation_target_rate=0.15 | -0.7118 | -0.7204 | Right-skewed (0.56) |
| Treasury Growth Rate | voting_activity=0.35_participation_target_rate=0.15 | -0.7048 | -0.6895 | Left-skewed (-0.80) |
| Treasury Growth Rate | voting_activity=0.35_participation_target_rate=0.25 | -0.7111 | -0.7204 | Right-skewed (0.53) |

### Constant/Zero Metrics

Metrics with no variance (may indicate unimplemented features or degenerate cases):

| Metric | Value | Note |
|--------|-------|------|
| Final Member Count | 210.0000 | Deterministic value |
| Unique Voter Count | 206.0000 | Deterministic value |
| Member Growth Rate | 0 | Always zero - may be unimplemented |

## Treasury Distribution Deep Dive

The treasury shows high variability which warrants special attention.

### Treasury Statistics by Voting Activity

| Voting Activity | Mean | Median | Std | CV | Min | Max | 95% CI |
|--------|------|--------|-----|----|----|-----|--------|
| voting_activity=0.15_participation_target_rate=0 | 11828 | 12028 | 427 | 3.6% | 10607 | 12042 | [11669, 11988] |
| voting_activity=0.15_participation_target_rate=0.15 | 11732 | 12029 | 508 | 4.3% | 10353 | 12034 | [11543, 11922] |
| voting_activity=0.15_participation_target_rate=0.25 | 11994 | 12031 | 167 | 1.4% | 11151 | 12042 | [11931, 12056] |
| voting_activity=0.25_participation_target_rate=0 | 11724 | 12029 | 565 | 4.8% | 10310 | 12037 | [11513, 11935] |
| voting_activity=0.25_participation_target_rate=0.15 | 11920 | 12030 | 334 | 2.8% | 10726 | 12040 | [11795, 12044] |
| voting_activity=0.25_participation_target_rate=0.25 | 11846 | 12030 | 475 | 4.0% | 10540 | 12043 | [11669, 12023] |
| voting_activity=0.35_participation_target_rate=0 | 11844 | 12030 | 380 | 3.2% | 10734 | 12045 | [11702, 11986] |
| voting_activity=0.35_participation_target_rate=0.15 | 11943 | 12030 | 306 | 2.6% | 10506 | 12042 | [11829, 12057] |
| voting_activity=0.35_participation_target_rate=0.25 | 11903 | 12029 | 334 | 2.8% | 10522 | 12045 | [11779, 12028] |

### Treasury Distribution Analysis

### Related Treasury Metrics

| Metric | Voting Activity=voting_activity=0.15_participation_target_rate=0 | Voting Activity=voting_activity=0.15_participation_target_rate=0.15 | Voting Activity=voting_activity=0.15_participation_target_rate=0.25 | Voting Activity=voting_activity=0.25_participation_target_rate=0 | Voting Activity=voting_activity=0.25_participation_target_rate=0.15 | Voting Activity=voting_activity=0.25_participation_target_rate=0.25 | Voting Activity=voting_activity=0.35_participation_target_rate=0 | Voting Activity=voting_activity=0.35_participation_target_rate=0.15 | Voting Activity=voting_activity=0.35_participation_target_rate=0.25 |
|--------|------|------|------|------|------|------|------|------|------|
| Treasury Volatility | 0.1898 | 0.1908 | 0.1910 | 0.1971 | 0.1921 | 0.1961 | 0.1853 | 0.1896 | 0.1958 |
| Treasury Growth Rate | -0.7147 | -0.7141 | -0.7089 | -0.7165 | -0.7118 | -0.7147 | -0.7136 | -0.7048 | -0.7111 |
| Treasury Trend | -0.87 | -0.98 | -0.94 | -1.09 | -0.95 | -0.97 | -1.01 | -0.83 | -1.04 |

### Potential Causes of Treasury Variability

1. **Proposal Pass Rate Effect**: At low quorum, ~9% of proposals pass. Each passed proposal may have significant treasury impact.

2. **Compounding Effects**: Treasury changes compound over simulation steps, amplifying initial differences.

3. **Staking Interest Bug** (from code review): Interest may compound per-step rather than per-year, causing exponential growth in some runs.

4. **Initial Conditions**: Small variations in early proposal outcomes cascade into large final differences.

### Recommendations

- Treasury variability is within acceptable bounds
- Standard parametric tests should be valid

## Statistical Significance Analysis

### ANOVA Results (Overall Effect of Voting Activity)

| Metric | F-Statistic | df | p-value | Significant |
|--------|-------------|-----|---------|-------------|
| Voter Concentration Gini | 963.89 | (8, 261) | <0.001 | ✓ **Yes** |
| Governance Capture Risk | 552.36 | (8, 261) | <0.001 | ✓ **Yes** |
| Whale Influence | 391.52 | (8, 261) | <0.001 | ✓ **Yes** |
| Delegate Concentration | 340.53 | (8, 261) | <0.001 | ✓ **Yes** |
| Proposal Pass Rate | 219.59 | (8, 261) | <0.001 | ✓ **Yes** |
| Proposal Rejection Rate | 219.59 | (8, 261) | <0.001 | ✓ **Yes** |
| Average Turnout | 72.96 | (8, 261) | <0.001 | ✓ **Yes** |
| Voting Power Utilization | 72.96 | (8, 261) | <0.001 | ✓ **Yes** |
| Governance Activity Index | 53.67 | (8, 261) | <0.001 | ✓ **Yes** |
| Voter Participation Rate | 51.56 | (8, 261) | <0.001 | ✓ **Yes** |
| Avg Votes Per Proposal | 51.56 | (8, 261) | <0.001 | ✓ **Yes** |
| Governance Overhead | 50.95 | (8, 261) | <0.001 | ✓ **Yes** |
| Token Concentration Gini | 39.11 | (8, 261) | <0.001 | ✓ **Yes** |
| Wealth Mobility | 39.11 | (8, 261) | <0.001 | ✓ **Yes** |
| Quorum Reach Rate | 38.71 | (8, 261) | <0.001 | ✓ **Yes** |
| Avg Member Wealth | 37.67 | (8, 261) | <0.001 | ✓ **Yes** |
| Avg Margin of Victory | 36.60 | (8, 261) | <0.001 | ✓ **Yes** |
| Staking Participation | 30.95 | (8, 261) | <0.001 | ✓ **Yes** |
| Single Entity Control | 29.87 | (8, 261) | <0.001 | ✓ **Yes** |
| Collusion Threshold | 16.83 | (8, 261) | <0.001 | ✓ **Yes** |
| Voter Retention Rate | 16.24 | (8, 261) | <0.001 | ✓ **Yes** |
| Vote Buying Vulnerability | 10.51 | (8, 261) | <0.001 | ✓ **Yes** |
| Final Gini | 5.53 | (8, 261) | <0.001 | ✓ **Yes** |
| Treasury Trend | 2.30 | (8, 261) | 0.0211 | ✓ **Yes** |
| Proposal Abandonment Rate | 1.93 | (8, 261) | 0.0557 | No |
| Participation Trend | 1.75 | (8, 261) | 0.0868 | No |
| Final Treasury | 1.52 | (8, 261) | 0.1502 | No |
| Treasury Growth Rate | 1.23 | (8, 261) | 0.2802 | No |
| Total Proposals | 1.03 | (8, 261) | 0.4162 | No |
| Proposal Rate | 1.03 | (8, 261) | 0.4162 | No |
| Avg Time to Decision | 0.80 | (8, 261) | 0.6051 | No |
| Treasury Volatility | 0.75 | (8, 261) | 0.6464 | No |
| Final Reputation Gini | 0.61 | (8, 261) | 0.7725 | No |
| Whale Proposal Rate | 0.57 | (8, 261) | 0.8058 | No |
| Final Token Price | 0.35 | (8, 261) | 0.9474 | No |
| Final Member Count | 0.00 | (8, 261) | 1.0000 | No |
| Unique Voter Count | 0.00 | (8, 261) | 1.0000 | No |
| Member Growth Rate | 0.00 | (8, 261) | 1.0000 | No |

### Pairwise Comparisons (Significant Metrics Only)

| Metric | Comparison | t-statistic | Cohen's d | Effect Size |
|--------|------------|-------------|-----------|-------------|
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | -5.56 | -1.43 | very_large |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | -5.69 | -1.47 | very_large |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -16.31 | -4.21 | very_large |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -14.71 | -3.80 | very_large |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -6.01 | -1.55 | very_large |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -20.31 | -5.25 | very_large |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -26.02 | -6.72 | very_large |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.15_participation_target_rate=0.25 | -3.02 | -0.78 | medium |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | 4.32 | 1.12 | large |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | -13.58 | -3.51 | very_large |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | -12.43 | -3.21 | very_large |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | -2.48 | -0.64 | medium |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -18.74 | -4.84 | very_large |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -24.02 | -6.20 | very_large |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0 | 5.18 | 1.34 | very_large |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.15 | -8.63 | -2.23 | very_large |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | -8.35 | -2.16 | very_large |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -15.48 | -4.00 | very_large |
| Proposal Pass Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -19.36 | -5.00 | very_large |
| Proposal Pass Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -15.75 | -4.07 | very_large |
| Proposal Pass Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -14.25 | -3.68 | very_large |
| Proposal Pass Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -5.30 | -1.37 | very_large |
| Proposal Pass Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -20.00 | -5.17 | very_large |
| Proposal Pass Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -25.61 | -6.61 | very_large |
| Proposal Pass Rate | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | 10.50 | 2.71 | very_large |
| Proposal Pass Rate | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -9.21 | -2.38 | very_large |
| Proposal Pass Rate | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -12.08 | -3.12 | very_large |
| Proposal Pass Rate | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | 9.92 | 2.56 | very_large |
| Proposal Pass Rate | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -8.51 | -2.20 | very_large |
| Proposal Pass Rate | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -11.10 | -2.87 | very_large |
| Proposal Pass Rate | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -16.85 | -4.35 | very_large |
| Proposal Pass Rate | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -21.34 | -5.51 | very_large |
| Average Turnout | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | -8.96 | -2.31 | very_large |
| Average Turnout | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | -8.96 | -2.31 | very_large |
| Average Turnout | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | -8.53 | -2.20 | very_large |
| Average Turnout | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -12.71 | -3.28 | very_large |
| Average Turnout | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -15.69 | -4.05 | very_large |
| Average Turnout | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -11.02 | -2.85 | very_large |
| Average Turnout | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -16.50 | -4.26 | very_large |
| Average Turnout | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -20.00 | -5.16 | very_large |
| Average Turnout | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | -5.59 | -1.44 | very_large |
| Average Turnout | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | -7.84 | -2.03 | very_large |
| Average Turnout | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | -2.67 | -0.69 | medium |
| Average Turnout | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -10.28 | -2.66 | very_large |
| Average Turnout | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -13.40 | -3.46 | very_large |
| Average Turnout | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.15 | -2.68 | -0.69 | medium |
| Average Turnout | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | -4.39 | -1.13 | large |
| Average Turnout | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -7.18 | -1.85 | very_large |
| Average Turnout | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -9.79 | -2.53 | very_large |
| Average Turnout | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -5.53 | -1.43 | very_large |
| Average Turnout | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -7.73 | -2.00 | very_large |
| Average Turnout | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -2.66 | -0.69 | medium |
| Average Turnout | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -10.18 | -2.63 | very_large |
| Average Turnout | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -13.24 | -3.42 | very_large |
| Average Turnout | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | 3.13 | 0.81 | large |
| Average Turnout | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -4.84 | -1.25 | very_large |
| Average Turnout | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -7.45 | -1.92 | very_large |
| Average Turnout | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | 5.12 | 1.32 | very_large |
| Average Turnout | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -3.53 | -0.91 | large |
| Average Turnout | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -6.21 | -1.60 | very_large |
| Average Turnout | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -7.99 | -2.06 | very_large |
| Average Turnout | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -10.91 | -2.82 | very_large |
| Quorum Reach Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | 9.28 | 2.40 | very_large |
| Quorum Reach Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | 5.51 | 1.42 | very_large |
| Quorum Reach Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | 7.14 | 1.84 | very_large |
| Quorum Reach Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | 4.35 | 1.12 | large |
| Quorum Reach Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | 2.95 | 0.76 | medium |
| Quorum Reach Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | 9.49 | 2.45 | very_large |
| Quorum Reach Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -2.59 | -0.67 | medium |
| Quorum Reach Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -4.98 | -1.29 | very_large |
| Quorum Reach Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | -2.70 | -0.70 | medium |
| Quorum Reach Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | -3.71 | -0.96 | large |
| Quorum Reach Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | -5.43 | -1.40 | very_large |
| Quorum Reach Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -8.99 | -2.32 | very_large |
| Quorum Reach Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -11.66 | -3.01 | very_large |
| Quorum Reach Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | -2.72 | -0.70 | medium |
| Quorum Reach Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -6.49 | -1.68 | very_large |
| Quorum Reach Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -8.70 | -2.25 | very_large |
| Quorum Reach Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -3.27 | -0.84 | large |
| Quorum Reach Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -7.41 | -1.91 | very_large |
| Quorum Reach Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -10.11 | -2.61 | very_large |
| Quorum Reach Rate | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | 3.35 | 0.86 | large |
| Quorum Reach Rate | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -5.60 | -1.45 | very_large |
| Quorum Reach Rate | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -7.91 | -2.04 | very_large |
| Quorum Reach Rate | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | 5.21 | 1.34 | very_large |
| Quorum Reach Rate | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -4.58 | -1.18 | large |
| Quorum Reach Rate | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -6.91 | -1.78 | very_large |
| Quorum Reach Rate | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -8.90 | -2.30 | very_large |
| Quorum Reach Rate | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -11.74 | -3.03 | very_large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | 8.64 | 2.23 | very_large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | 3.98 | 1.03 | large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | 5.55 | 1.43 | very_large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | 10.99 | 2.84 | very_large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | 7.90 | 2.04 | very_large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 9.72 | 2.51 | very_large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | 9.04 | 2.34 | very_large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | 4.15 | 1.07 | large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | 5.86 | 1.51 | very_large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | 11.64 | 3.01 | very_large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | 8.32 | 2.15 | very_large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | 10.18 | 2.63 | very_large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0 | 7.46 | 1.93 | very_large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.15 | 3.17 | 0.82 | large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | 4.51 | 1.17 | large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | 9.43 | 2.43 | very_large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | 6.70 | 1.73 | very_large |
| Avg Margin of Victory | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | 8.46 | 2.18 | very_large |
| Avg Margin of Victory | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -4.78 | -1.23 | very_large |
| Avg Margin of Victory | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -3.72 | -0.96 | large |
| Avg Margin of Victory | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | 6.74 | 1.74 | very_large |
| Avg Margin of Victory | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | 3.83 | 0.99 | large |
| Avg Margin of Victory | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | 5.85 | 1.51 | very_large |
| Avg Margin of Victory | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | 5.69 | 1.47 | very_large |
| Avg Margin of Victory | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | 2.68 | 0.69 | medium |
| Avg Margin of Victory | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | 4.84 | 1.25 | very_large |
| Avg Margin of Victory | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -2.81 | -0.73 | medium |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | 5.56 | 1.43 | very_large |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | 5.69 | 1.47 | very_large |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | 16.31 | 4.21 | very_large |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | 14.71 | 3.80 | very_large |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | 6.01 | 1.55 | very_large |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | 20.31 | 5.25 | very_large |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 26.02 | 6.72 | very_large |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.15_participation_target_rate=0.25 | 3.02 | 0.78 | medium |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | -4.32 | -1.12 | large |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | 13.58 | 3.51 | very_large |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | 12.43 | 3.21 | very_large |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | 2.48 | 0.64 | medium |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | 18.74 | 4.84 | very_large |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | 24.02 | 6.20 | very_large |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0 | -5.18 | -1.34 | very_large |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.15 | 8.63 | 2.23 | very_large |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | 8.35 | 2.16 | very_large |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | 15.48 | 4.00 | very_large |
| Proposal Rejection Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | 19.36 | 5.00 | very_large |
| Proposal Rejection Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | 15.75 | 4.07 | very_large |
| Proposal Rejection Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | 14.25 | 3.68 | very_large |
| Proposal Rejection Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | 5.30 | 1.37 | very_large |
| Proposal Rejection Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | 20.00 | 5.17 | very_large |
| Proposal Rejection Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 25.61 | 6.61 | very_large |
| Proposal Rejection Rate | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | -10.50 | -2.71 | very_large |
| Proposal Rejection Rate | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | 9.21 | 2.38 | very_large |
| Proposal Rejection Rate | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | 12.08 | 3.12 | very_large |
| Proposal Rejection Rate | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | -9.92 | -2.56 | very_large |
| Proposal Rejection Rate | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | 8.51 | 2.20 | very_large |
| Proposal Rejection Rate | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | 11.10 | 2.87 | very_large |
| Proposal Rejection Rate | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | 16.85 | 4.35 | very_large |
| Proposal Rejection Rate | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 21.34 | 5.51 | very_large |
| Governance Overhead | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | -7.00 | -1.81 | very_large |
| Governance Overhead | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | -6.13 | -1.58 | very_large |
| Governance Overhead | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | -3.48 | -0.90 | large |
| Governance Overhead | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -8.14 | -2.10 | very_large |
| Governance Overhead | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -10.13 | -2.62 | very_large |
| Governance Overhead | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -6.78 | -1.75 | very_large |
| Governance Overhead | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -13.96 | -3.60 | very_large |
| Governance Overhead | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -16.36 | -4.22 | very_large |
| Governance Overhead | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | 3.63 | 0.94 | large |
| Governance Overhead | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | -3.34 | -0.86 | large |
| Governance Overhead | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -7.46 | -1.93 | very_large |
| Governance Overhead | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -9.57 | -2.47 | very_large |
| Governance Overhead | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0 | 3.15 | 0.81 | large |
| Governance Overhead | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | -3.26 | -0.84 | large |
| Governance Overhead | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -7.17 | -1.85 | very_large |
| Governance Overhead | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -9.16 | -2.37 | very_large |
| Governance Overhead | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -5.06 | -1.31 | very_large |
| Governance Overhead | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -6.90 | -1.78 | very_large |
| Governance Overhead | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -3.28 | -0.85 | large |
| Governance Overhead | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -10.91 | -2.82 | very_large |
| Governance Overhead | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -13.17 | -3.40 | very_large |
| Governance Overhead | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -5.58 | -1.44 | very_large |
| Governance Overhead | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -7.55 | -1.95 | very_large |
| Governance Overhead | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | 3.84 | 0.99 | large |
| Governance Overhead | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -4.16 | -1.07 | large |
| Governance Overhead | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -6.14 | -1.58 | very_large |
| Governance Overhead | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -8.00 | -2.07 | very_large |
| Governance Overhead | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -10.16 | -2.62 | very_large |
| Voter Participation Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | -7.00 | -1.81 | very_large |
| Voter Participation Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | -6.03 | -1.56 | very_large |
| Voter Participation Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | -3.53 | -0.91 | large |
| Voter Participation Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -7.99 | -2.06 | very_large |
| Voter Participation Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -10.08 | -2.60 | very_large |
| Voter Participation Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -6.77 | -1.75 | very_large |
| Voter Participation Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -13.74 | -3.55 | very_large |
| Voter Participation Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -16.81 | -4.34 | very_large |
| Voter Participation Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | 3.60 | 0.93 | large |
| Voter Participation Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | -3.28 | -0.85 | large |
| Voter Participation Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -7.33 | -1.89 | very_large |
| Voter Participation Rate | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -9.88 | -2.55 | very_large |
| Voter Participation Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0 | 3.07 | 0.79 | medium |
| Voter Participation Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | -3.20 | -0.83 | large |
| Voter Participation Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -7.03 | -1.81 | very_large |
| Voter Participation Rate | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -9.41 | -2.43 | very_large |
| Voter Participation Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -4.94 | -1.28 | very_large |
| Voter Participation Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -6.82 | -1.76 | very_large |
| Voter Participation Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -3.19 | -0.82 | large |
| Voter Participation Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -10.72 | -2.77 | very_large |
| Voter Participation Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -13.54 | -3.49 | very_large |
| Voter Participation Rate | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -5.47 | -1.41 | very_large |
| Voter Participation Rate | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -7.81 | -2.02 | very_large |
| Voter Participation Rate | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | 3.87 | 1.00 | large |
| Voter Participation Rate | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -4.13 | -1.07 | large |
| Voter Participation Rate | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -6.47 | -1.67 | very_large |
| Voter Participation Rate | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -7.96 | -2.06 | very_large |
| Voter Participation Rate | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -10.61 | -2.74 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | 35.05 | 9.05 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | 29.64 | 7.65 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | 28.66 | 7.40 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | 50.95 | 13.16 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | 56.91 | 14.69 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | 49.53 | 12.79 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | 66.80 | 17.25 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 85.31 | 22.03 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | -10.94 | -2.83 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | 15.93 | 4.11 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | 18.23 | 4.71 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | 7.04 | 1.82 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | 30.35 | 7.84 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | 38.32 | 9.89 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0 | -8.78 | -2.27 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.15 | 14.51 | 3.75 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | 16.29 | 4.21 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | 6.46 | 1.67 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | 27.20 | 7.02 | very_large |
| Voter Concentration Gini | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | 32.75 | 8.45 | very_large |
| Voter Concentration Gini | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | 28.44 | 7.34 | very_large |
| Voter Concentration Gini | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | 32.61 | 8.42 | very_large |
| Voter Concentration Gini | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | 21.69 | 5.60 | very_large |
| Voter Concentration Gini | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | 44.83 | 11.57 | very_large |
| Voter Concentration Gini | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 59.60 | 15.39 | very_large |
| Voter Concentration Gini | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | -11.45 | -2.96 | very_large |
| Voter Concentration Gini | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | 13.89 | 3.59 | very_large |
| Voter Concentration Gini | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | 18.29 | 4.72 | very_large |
| Voter Concentration Gini | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | -13.91 | -3.59 | very_large |
| Voter Concentration Gini | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | 13.94 | 3.60 | very_large |
| Voter Concentration Gini | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | 19.11 | 4.93 | very_large |
| Voter Concentration Gini | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | 27.95 | 7.22 | very_large |
| Voter Concentration Gini | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 38.45 | 9.93 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | 39.81 | 10.28 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | 34.28 | 8.85 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | 26.72 | 6.90 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | 35.32 | 9.12 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | 39.75 | 10.26 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | 48.77 | 12.59 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | 40.32 | 10.41 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 40.44 | 10.44 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | -10.48 | -2.71 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | 5.36 | 1.38 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | 7.01 | 1.81 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | 7.01 | 1.81 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | 7.40 | 1.91 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | 8.04 | 2.08 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0 | -8.57 | -2.21 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.15 | 5.55 | 1.43 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | 7.02 | 1.81 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | 6.79 | 1.75 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | 7.36 | 1.90 | very_large |
| Delegate Concentration | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | 7.96 | 2.05 | very_large |
| Delegate Concentration | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | 13.14 | 3.39 | very_large |
| Delegate Concentration | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | 15.38 | 3.97 | very_large |
| Delegate Concentration | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | 17.41 | 4.49 | very_large |
| Delegate Concentration | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | 15.79 | 4.08 | very_large |
| Delegate Concentration | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 16.27 | 4.20 | very_large |
| Delegate Concentration | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 2.87 | 0.74 | medium |
| Avg Votes Per Proposal | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | -7.00 | -1.81 | very_large |
| Avg Votes Per Proposal | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | -6.03 | -1.56 | very_large |
| Avg Votes Per Proposal | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | -3.53 | -0.91 | large |
| Avg Votes Per Proposal | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -7.99 | -2.06 | very_large |
| Avg Votes Per Proposal | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -10.08 | -2.60 | very_large |
| Avg Votes Per Proposal | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -6.77 | -1.75 | very_large |
| Avg Votes Per Proposal | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -13.74 | -3.55 | very_large |
| Avg Votes Per Proposal | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -16.81 | -4.34 | very_large |
| Avg Votes Per Proposal | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | 3.60 | 0.93 | large |
| Avg Votes Per Proposal | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | -3.28 | -0.85 | large |
| Avg Votes Per Proposal | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -7.33 | -1.89 | very_large |
| Avg Votes Per Proposal | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -9.88 | -2.55 | very_large |
| Avg Votes Per Proposal | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0 | 3.07 | 0.79 | medium |
| Avg Votes Per Proposal | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | -3.20 | -0.83 | large |
| Avg Votes Per Proposal | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -7.03 | -1.81 | very_large |
| Avg Votes Per Proposal | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -9.41 | -2.43 | very_large |
| Avg Votes Per Proposal | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -4.94 | -1.28 | very_large |
| Avg Votes Per Proposal | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -6.82 | -1.76 | very_large |
| Avg Votes Per Proposal | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -3.19 | -0.82 | large |
| Avg Votes Per Proposal | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -10.72 | -2.77 | very_large |
| Avg Votes Per Proposal | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -13.54 | -3.49 | very_large |
| Avg Votes Per Proposal | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -5.47 | -1.41 | very_large |
| Avg Votes Per Proposal | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -7.81 | -2.02 | very_large |
| Avg Votes Per Proposal | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | 3.87 | 1.00 | large |
| Avg Votes Per Proposal | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -4.13 | -1.07 | large |
| Avg Votes Per Proposal | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -6.47 | -1.67 | very_large |
| Avg Votes Per Proposal | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -7.96 | -2.06 | very_large |
| Avg Votes Per Proposal | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -10.61 | -2.74 | very_large |
| Voter Retention Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | -3.89 | -1.01 | large |
| Voter Retention Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | -4.63 | -1.20 | large |
| Voter Retention Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | -3.56 | -0.92 | large |
| Voter Retention Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -5.08 | -1.31 | very_large |
| Voter Retention Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -5.31 | -1.37 | very_large |
| Voter Retention Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -4.86 | -1.26 | very_large |
| Voter Retention Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -5.31 | -1.37 | very_large |
| Voter Retention Rate | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -5.31 | -1.37 | very_large |
| Voter Retention Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -2.65 | -0.68 | medium |
| Voter Retention Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -3.18 | -0.82 | large |
| Voter Retention Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -3.18 | -0.82 | large |
| Voter Retention Rate | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -3.18 | -0.82 | large |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | -8.96 | -2.31 | very_large |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | -8.96 | -2.31 | very_large |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | -8.53 | -2.20 | very_large |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -12.71 | -3.28 | very_large |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -15.69 | -4.05 | very_large |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -11.02 | -2.85 | very_large |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -16.50 | -4.26 | very_large |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -20.00 | -5.16 | very_large |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | -5.59 | -1.44 | very_large |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | -7.84 | -2.03 | very_large |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | -2.67 | -0.69 | medium |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -10.28 | -2.66 | very_large |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -13.40 | -3.46 | very_large |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.15 | -2.68 | -0.69 | medium |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | -4.39 | -1.13 | large |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -7.18 | -1.85 | very_large |
| Voting Power Utilization | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -9.79 | -2.53 | very_large |
| Voting Power Utilization | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -5.53 | -1.43 | very_large |
| Voting Power Utilization | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -7.73 | -2.00 | very_large |
| Voting Power Utilization | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -2.66 | -0.69 | medium |
| Voting Power Utilization | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -10.18 | -2.63 | very_large |
| Voting Power Utilization | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -13.24 | -3.42 | very_large |
| Voting Power Utilization | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | 3.13 | 0.81 | large |
| Voting Power Utilization | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -4.84 | -1.25 | very_large |
| Voting Power Utilization | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -7.45 | -1.92 | very_large |
| Voting Power Utilization | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | 5.12 | 1.32 | very_large |
| Voting Power Utilization | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -3.53 | -0.91 | large |
| Voting Power Utilization | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -6.21 | -1.60 | very_large |
| Voting Power Utilization | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -7.99 | -2.06 | very_large |
| Voting Power Utilization | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -10.91 | -2.82 | very_large |
| Staking Participation | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | -9.02 | -2.33 | very_large |
| Staking Participation | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | -6.59 | -1.70 | very_large |
| Staking Participation | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | -12.82 | -3.31 | very_large |
| Staking Participation | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -11.94 | -3.08 | very_large |
| Staking Participation | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -12.92 | -3.33 | very_large |
| Staking Participation | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -9.96 | -2.57 | very_large |
| Staking Participation | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -10.90 | -2.81 | very_large |
| Staking Participation | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -14.68 | -3.79 | very_large |
| Staking Participation | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.15_participation_target_rate=0.25 | -5.92 | -1.53 | very_large |
| Staking Participation | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | -11.97 | -3.09 | very_large |
| Staking Participation | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | -11.09 | -2.86 | very_large |
| Staking Participation | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | -12.07 | -3.12 | very_large |
| Staking Participation | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | -9.14 | -2.36 | very_large |
| Staking Participation | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -10.08 | -2.60 | very_large |
| Staking Participation | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -13.64 | -3.52 | very_large |
| Staking Participation | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0 | -2.84 | -0.73 | medium |
| Staking Participation | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | -2.93 | -0.76 | medium |
| Staking Participation | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -2.52 | -0.65 | medium |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | -9.32 | -2.41 | very_large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | 4.31 | 1.11 | large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | 14.00 | 3.61 | very_large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | 10.08 | 2.60 | very_large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | 11.69 | 3.02 | very_large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | 8.19 | 2.11 | very_large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | 10.90 | 2.81 | very_large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 15.03 | 3.88 | very_large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.15_participation_target_rate=0.25 | 6.15 | 1.59 | very_large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | 16.96 | 4.38 | very_large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | 12.59 | 3.25 | very_large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | 14.26 | 3.68 | very_large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | 10.67 | 2.76 | very_large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | 13.27 | 3.43 | very_large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | 17.61 | 4.55 | very_large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0 | 3.41 | 0.88 | large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.15 | 2.39 | 0.62 | medium |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | 3.15 | 0.81 | large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | 3.17 | 0.82 | large |
| Token Concentration Gini | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | 4.96 | 1.28 | very_large |
| Token Concentration Gini | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -2.46 | -0.64 | medium |
| Token Concentration Gini | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | 3.11 | 0.80 | large |
| Token Concentration Gini | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 4.37 | 1.13 | large |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | 9.03 | 2.33 | very_large |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | 6.90 | 1.78 | very_large |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | 14.52 | 3.75 | very_large |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | 13.70 | 3.54 | very_large |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | 14.81 | 3.82 | very_large |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | 10.94 | 2.82 | very_large |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | 12.40 | 3.20 | very_large |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 16.54 | 4.27 | very_large |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.15_participation_target_rate=0.25 | 6.10 | 1.57 | very_large |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | 13.40 | 3.46 | very_large |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | 12.59 | 3.25 | very_large |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | 13.69 | 3.53 | very_large |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | 9.92 | 2.56 | very_large |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | 11.33 | 2.93 | very_large |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | 15.20 | 3.92 | very_large |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0 | 2.97 | 0.77 | medium |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.15 | 2.45 | 0.63 | medium |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | 3.08 | 0.79 | medium |
| Avg Member Wealth | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | 2.70 | 0.70 | medium |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | 9.32 | 2.41 | very_large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | -4.31 | -1.11 | large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | -14.00 | -3.61 | very_large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -10.08 | -2.60 | very_large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -11.69 | -3.02 | very_large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -8.19 | -2.11 | very_large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -10.90 | -2.81 | very_large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -15.03 | -3.88 | very_large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.15_participation_target_rate=0.25 | -6.15 | -1.59 | very_large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | -16.96 | -4.38 | very_large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | -12.59 | -3.25 | very_large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | -14.26 | -3.68 | very_large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | -10.67 | -2.76 | very_large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -13.27 | -3.43 | very_large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -17.61 | -4.55 | very_large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0 | -3.41 | -0.88 | large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.15 | -2.39 | -0.62 | medium |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | -3.15 | -0.81 | large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -3.17 | -0.82 | large |
| Wealth Mobility | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -4.96 | -1.28 | very_large |
| Wealth Mobility | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | 2.46 | 0.64 | medium |
| Wealth Mobility | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -3.11 | -0.80 | large |
| Wealth Mobility | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -4.37 | -1.13 | large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | -28.83 | -7.44 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | -28.27 | -7.30 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | -22.61 | -5.84 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -44.95 | -11.61 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -46.66 | -12.05 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -31.35 | -8.09 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -42.98 | -11.10 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -36.06 | -9.31 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | 4.39 | 1.13 | large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | -19.26 | -4.97 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | -19.56 | -5.05 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | -10.23 | -2.64 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -21.51 | -5.55 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -17.41 | -4.50 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0 | 4.70 | 1.21 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.15 | -18.23 | -4.71 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | -18.43 | -4.76 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | -9.67 | -2.50 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -20.68 | -5.34 | very_large |
| Whale Influence | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -16.81 | -4.34 | very_large |
| Whale Influence | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -22.15 | -5.72 | very_large |
| Whale Influence | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -22.51 | -5.81 | very_large |
| Whale Influence | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -13.14 | -3.39 | very_large |
| Whale Influence | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -24.01 | -6.20 | very_large |
| Whale Influence | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -19.82 | -5.12 | very_large |
| Whale Influence | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | 5.04 | 1.30 | very_large |
| Whale Influence | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -5.21 | -1.35 | very_large |
| Whale Influence | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -3.48 | -0.90 | large |
| Whale Influence | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | 4.59 | 1.18 | large |
| Whale Influence | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -6.02 | -1.56 | very_large |
| Whale Influence | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -4.12 | -1.06 | large |
| Whale Influence | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -9.02 | -2.33 | very_large |
| Whale Influence | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -7.16 | -1.85 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | 42.76 | 11.04 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | 41.54 | 10.73 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | 22.91 | 5.92 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | 44.98 | 11.61 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | 49.92 | 12.89 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | 43.24 | 11.17 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | 47.97 | 12.39 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 50.53 | 13.05 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | -16.70 | -4.31 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | 9.22 | 2.38 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | 10.66 | 2.75 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | 11.88 | 3.07 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | 13.33 | 3.44 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0 | -16.36 | -4.22 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.15 | 8.83 | 2.28 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | 10.16 | 2.62 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | 11.42 | 2.95 | very_large |
| Governance Capture Risk | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | 12.79 | 3.30 | very_large |
| Governance Capture Risk | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | 22.80 | 5.89 | very_large |
| Governance Capture Risk | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | 25.31 | 6.54 | very_large |
| Governance Capture Risk | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | 17.87 | 4.61 | very_large |
| Governance Capture Risk | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | 25.41 | 6.56 | very_large |
| Governance Capture Risk | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 27.12 | 7.00 | very_large |
| Governance Capture Risk | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | -7.51 | -1.94 | very_large |
| Governance Capture Risk | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | 3.13 | 0.81 | large |
| Governance Capture Risk | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | -8.71 | -2.25 | very_large |
| Governance Capture Risk | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | 3.07 | 0.79 | medium |
| Governance Capture Risk | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | 10.09 | 2.61 | very_large |
| Governance Capture Risk | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 11.43 | 2.95 | very_large |
| Vote Buying Vulnerability | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | -7.00 | -1.81 | very_large |
| Vote Buying Vulnerability | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | -6.54 | -1.69 | very_large |
| Vote Buying Vulnerability | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | -5.22 | -1.35 | very_large |
| Vote Buying Vulnerability | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -6.26 | -1.62 | very_large |
| Vote Buying Vulnerability | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -7.35 | -1.90 | very_large |
| Vote Buying Vulnerability | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -5.92 | -1.53 | very_large |
| Vote Buying Vulnerability | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -7.53 | -1.94 | very_large |
| Vote Buying Vulnerability | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -7.81 | -2.02 | very_large |
| Vote Buying Vulnerability | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | 2.78 | 0.72 | medium |
| Vote Buying Vulnerability | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -3.02 | -0.78 | medium |
| Vote Buying Vulnerability | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -2.84 | -0.73 | medium |
| Vote Buying Vulnerability | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -3.44 | -0.89 | large |
| Vote Buying Vulnerability | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -2.43 | -0.63 | medium |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | -8.05 | -2.08 | very_large |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | -6.58 | -1.70 | very_large |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | -12.46 | -3.22 | very_large |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -11.55 | -2.98 | very_large |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -12.70 | -3.28 | very_large |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -9.81 | -2.53 | very_large |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -10.72 | -2.77 | very_large |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -14.28 | -3.69 | very_large |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.15_participation_target_rate=0.25 | -5.92 | -1.53 | very_large |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | -11.63 | -3.00 | very_large |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | -10.72 | -2.77 | very_large |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | -11.89 | -3.07 | very_large |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | -8.99 | -2.32 | very_large |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -9.92 | -2.56 | very_large |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -13.26 | -3.42 | very_large |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0 | -2.70 | -0.70 | medium |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | -2.96 | -0.77 | medium |
| Single Entity Control | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -2.42 | -0.62 | medium |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | -4.50 | -1.16 | large |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | -8.88 | -2.29 | very_large |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -7.13 | -1.84 | very_large |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -8.25 | -2.13 | very_large |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -6.11 | -1.58 | very_large |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -7.09 | -1.83 | very_large |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -10.12 | -2.61 | very_large |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.15_participation_target_rate=0.25 | -4.69 | -1.21 | very_large |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | -9.12 | -2.35 | very_large |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | -7.34 | -1.90 | very_large |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | -8.46 | -2.18 | very_large |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | -6.34 | -1.64 | very_large |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -7.29 | -1.88 | very_large |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -10.35 | -2.67 | very_large |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0 | -2.54 | -0.66 | medium |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | -2.49 | -0.64 | medium |
| Collusion Threshold | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -3.45 | -0.89 | large |
| Collusion Threshold | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -2.97 | -0.77 | medium |
| Treasury Trend | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | 3.12 | 0.80 | large |
| Treasury Trend | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -3.44 | -0.89 | large |
| Treasury Trend | voting_activity=0.35_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | 2.56 | 0.66 | medium |
| Governance Activity Index | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | -8.67 | -2.24 | very_large |
| Governance Activity Index | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.25 | -8.00 | -2.07 | very_large |
| Governance Activity Index | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0 | -7.22 | -1.86 | very_large |
| Governance Activity Index | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -11.89 | -3.07 | very_large |
| Governance Activity Index | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -14.85 | -3.83 | very_large |
| Governance Activity Index | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -9.70 | -2.50 | very_large |
| Governance Activity Index | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -14.12 | -3.65 | very_large |
| Governance Activity Index | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -17.80 | -4.60 | very_large |
| Governance Activity Index | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.15 | -4.77 | -1.23 | very_large |
| Governance Activity Index | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | -6.77 | -1.75 | very_large |
| Governance Activity Index | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -8.51 | -2.20 | very_large |
| Governance Activity Index | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -11.18 | -2.89 | very_large |
| Governance Activity Index | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.15 | -2.63 | -0.68 | medium |
| Governance Activity Index | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.25_participation_target_rate=0.25 | -4.09 | -1.06 | large |
| Governance Activity Index | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -6.40 | -1.65 | very_large |
| Governance Activity Index | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -8.40 | -2.17 | very_large |
| Governance Activity Index | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.15 | -4.65 | -1.20 | very_large |
| Governance Activity Index | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.25_participation_target_rate=0.25 | -6.45 | -1.67 | very_large |
| Governance Activity Index | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -8.30 | -2.14 | very_large |
| Governance Activity Index | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -10.74 | -2.77 | very_large |
| Governance Activity Index | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0 | 2.83 | 0.73 | medium |
| Governance Activity Index | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | -4.28 | -1.10 | large |
| Governance Activity Index | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | -6.16 | -1.59 | very_large |
| Governance Activity Index | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0 | 4.52 | 1.17 | large |
| Governance Activity Index | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.15 | -3.31 | -0.85 | large |
| Governance Activity Index | voting_activity=0.25_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | -5.20 | -1.34 | very_large |
| Governance Activity Index | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.15 | -6.81 | -1.76 | very_large |
| Governance Activity Index | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | -9.11 | -2.35 | very_large |
| Final Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.15_participation_target_rate=0.15 | -9.29 | -2.40 | very_large |
| Final Gini | voting_activity=0.15_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 3.93 | 1.02 | large |
| Final Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0 | 4.50 | 1.16 | large |
| Final Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.25_participation_target_rate=0.25 | 3.66 | 0.95 | large |
| Final Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.15 | 3.55 | 0.92 | large |
| Final Gini | voting_activity=0.15_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | 6.83 | 1.76 | very_large |
| Final Gini | voting_activity=0.15_participation_target_rate=0.25 vs voting_activity=0.35_participation_target_rate=0.25 | 3.84 | 0.99 | large |
| Final Gini | voting_activity=0.25_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0 | -2.46 | -0.64 | medium |
| Final Gini | voting_activity=0.25_participation_target_rate=0.15 vs voting_activity=0.35_participation_target_rate=0.25 | 3.11 | 0.80 | large |
| Final Gini | voting_activity=0.35_participation_target_rate=0 vs voting_activity=0.35_participation_target_rate=0.25 | 4.37 | 1.13 | large |

## Power Analysis

| Metric | Value |
|--------|-------|
| Current Runs per Config | 30 |
| Recommended Runs | 63 |
| Current Power | 49.2% |
| Minimum Detectable Effect | d = 0.7230 |

**Interpretation:**
⚠️ Consider increasing sample size to 63 runs per configuration for 80% power to detect medium effects (d = 0.5).

## Recommendations

### Data Quality Improvements

#### Critical (Must Address)

- **Final Token Price**: Very high variability (CV=204.1%). Distribution may be non-normal or parameter has high stochasticity.
- **Participation Trend**: Very high variability (CV=1966.4%). Distribution may be non-normal or parameter has high stochasticity.

#### Warnings (Should Address)

- **Proposal Pass Rate**: High variability (CV=68.6%). Consider more runs or controlled conditions.
- **Final Treasury**: Non-symmetric distribution at sweep=voting_activity=0.15_participation_target_rate=0.15 (mean=11732.1589, median=12029.1180). Consider bootstrap CI.
- **Proposal Abandonment Rate**: High variability (CV=54.0%). Consider more runs or controlled conditions.
- **Proposal Rejection Rate**: Non-symmetric distribution at sweep=voting_activity=0.15_participation_target_rate=0 (mean=0.9918, median=0.9947). Consider bootstrap CI.
- **Voter Retention Rate**: Non-symmetric distribution at sweep=voting_activity=0.25_participation_target_rate=0 (mean=0.9976, median=1.0000). Consider bootstrap CI.
- **Treasury Growth Rate**: Non-symmetric distribution at sweep=voting_activity=0.15_participation_target_rate=0.25 (mean=-0.7089, median=-0.7203). Consider bootstrap CI.
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

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.008200 | 0.005334 | 0.005400 | 0.000986 | [0.0062, 0.0102] | 0.0087 | 0.0000 | 0.0168 | 65.85% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.018387 | 0.017691 | 0.008468 | 0.001546 | [0.0152, 0.0215] | 0.0091 | 0.0000 | 0.0359 | 46.06% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.031046 | 0.024468 | 0.021301 | 0.003889 | [0.0231, 0.0390] | 0.0254 | 0.0000 | 0.0743 | 68.61% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.009977 | 0.010006 | 0.006481 | 0.001183 | [0.0076, 0.0124] | 0.0089 | 0.0000 | 0.0273 | 64.96% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.081726 | 0.075698 | 0.024101 | 0.004400 | [0.0727, 0.0907] | 0.0339 | 0.0388 | 0.1237 | 29.49% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.084618 | 0.083117 | 0.027940 | 0.005101 | [0.0742, 0.0951] | 0.0231 | 0.0352 | 0.1543 | 33.02% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.026487 | 0.020307 | 0.015778 | 0.002881 | [0.0206, 0.0324] | 0.0213 | 0.0049 | 0.0677 | 59.57% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.161839 | 0.166093 | 0.041072 | 0.007499 | [0.1465, 0.1772] | 0.0458 | 0.0667 | 0.2452 | 25.38% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.174821 | 0.177090 | 0.034654 | 0.006327 | [0.1619, 0.1878] | 0.0356 | 0.0894 | 0.2356 | 19.82% |

#### Average Turnout

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.049803 | 0.049382 | 0.004032 | 0.000736 | [0.0483, 0.0513] | - | 0.0062 | 0.0416 | 0.0566 | 8.10% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.061308 | 0.059363 | 0.005765 | 0.001053 | [0.0592, 0.0635] | [0.0600, 0.0641] | 0.0064 | 0.0514 | 0.0783 | 9.40% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.065813 | 0.064561 | 0.008920 | 0.001629 | [0.0625, 0.0691] | - | 0.0116 | 0.0489 | 0.0865 | 13.55% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.061212 | 0.062335 | 0.006118 | 0.001117 | [0.0589, 0.0635] | - | 0.0072 | 0.0429 | 0.0706 | 10.00% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.071887 | 0.072482 | 0.008624 | 0.001575 | [0.0687, 0.0751] | - | 0.0124 | 0.0561 | 0.0876 | 12.00% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.075402 | 0.075572 | 0.007977 | 0.001456 | [0.0724, 0.0784] | - | 0.0078 | 0.0587 | 0.0948 | 10.58% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.065636 | 0.065536 | 0.006757 | 0.001234 | [0.0631, 0.0682] | - | 0.0078 | 0.0550 | 0.0775 | 10.30% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.083962 | 0.081902 | 0.010600 | 0.001935 | [0.0800, 0.0879] | - | 0.0188 | 0.0655 | 0.1020 | 12.62% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.090163 | 0.090618 | 0.010294 | 0.001879 | [0.0863, 0.0940] | - | 0.0167 | 0.0688 | 0.1065 | 11.42% |

#### Final Treasury

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 11828.195603 | 12028.223609 | 426.743479 | 77.912343 | [11668.8470, 11987.5442] | [11707.6410, 11965.7283] | 55.4141 | 10606.8716 | 12041.9469 | 3.61% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 11732.158944 | 12029.117952 | 507.847740 | 92.719888 | [11542.5255, 11921.7924] | [11587.3900, 11933.7208] | 435.5956 | 10352.7849 | 12033.7732 | 4.33% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 11993.525631 | 12030.904532 | 167.023553 | 30.494189 | [11931.1580, 12055.8932] | [11915.7450, 12033.3234] | 6.1183 | 11150.9082 | 12041.8550 | 1.39% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 11724.349765 | 12029.210148 | 565.389792 | 103.225581 | [11513.2297, 11935.4698] | [11624.4503, 11974.1585] | 419.3859 | 10310.2405 | 12036.7650 | 4.82% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 11919.649195 | 12029.710398 | 333.622059 | 60.910776 | [11795.0727, 12044.2257] | [11775.7385, 12004.2839] | 2.6430 | 10725.7868 | 12040.2101 | 2.80% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 11846.251416 | 12030.398116 | 474.569199 | 86.644085 | [11669.0444, 12023.4585] | [11660.6242, 11991.2558] | 2.2483 | 10540.1410 | 12042.5598 | 4.01% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 11843.936960 | 12029.710928 | 379.688617 | 69.321340 | [11702.1589, 11985.7150] | [11668.4754, 11950.0415] | 115.6699 | 10733.8627 | 12044.9603 | 3.21% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 11942.925029 | 12030.072095 | 305.739296 | 55.820103 | [11828.7601, 12057.0900] | [11795.8384, 12014.3959] | 6.1582 | 10506.3376 | 12041.7287 | 2.56% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 11903.393801 | 12029.001373 | 333.653793 | 60.916570 | [11778.8054, 12027.9822] | [11774.1757, 12019.9711] | 2.7506 | 10521.6086 | 12045.2996 | 2.80% |

#### Final Token Price

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 2.535260 | 1.676526 | 2.108404 | 0.384940 | [1.7480, 3.3226] | [1.7066, 3.2742] | 1.7409 | 0.9503 | 10.8754 | 83.16% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 2.154054 | 1.590560 | 1.665222 | 0.304027 | [1.5322, 2.7759] | [1.6340, 2.7910] | 1.1516 | 0.9852 | 8.2278 | 77.31% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 3.033070 | 1.690779 | 3.865118 | 0.705671 | [1.5898, 4.4763] | [1.8476, 4.7893] | 1.5823 | 1.0057 | 20.5993 | 127.43% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 2.534837 | 1.616237 | 2.400778 | 0.438320 | [1.6384, 3.4313] | [1.7800, 3.6367] | 1.5114 | 0.9320 | 11.6359 | 94.71% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 2.656071 | 1.901198 | 2.103309 | 0.384010 | [1.8707, 3.4415] | [1.8872, 2.9738] | 1.5210 | 1.0336 | 9.8273 | 79.19% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 2.740203 | 1.999022 | 1.921566 | 0.350828 | [2.0227, 3.4577] | [2.3176, 3.6203] | 1.7641 | 0.9716 | 8.7809 | 70.13% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 3.283838 | 1.805804 | 6.702914 | 1.223779 | [0.7809, 5.7867] | [1.6051, 3.3355] | 1.0131 | 0.9703 | 38.0864 | 204.12% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 2.727230 | 2.005747 | 2.223106 | 0.405882 | [1.8971, 3.5574] | [2.0548, 3.4656] | 1.2887 | 1.0332 | 9.6777 | 81.52% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 3.428086 | 1.705250 | 6.169557 | 1.126402 | [1.1243, 5.7318] | [2.1611, 7.8196] | 1.2795 | 1.0039 | 34.9392 | 179.97% |

#### Final Member Count

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Min | Max | CV |
|------|---|------|--------|-----|----|----|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 210.000000 | 210.000000 | 0.000000 | 0.000000 | [210.0000, 210.0000] | 210.0000 | 210.0000 | 0.00% |

#### Total Proposals

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 199.233333 | 198.500000 | 10.314648 | 1.883188 | [195.3818, 203.0849] | - | 9.5000 | 173.0000 | 223.0000 | 5.18% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 205.766667 | 206.000000 | 12.431005 | 2.269581 | [201.1249, 210.4085] | - | 12.2500 | 175.0000 | 230.0000 | 6.04% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 202.600000 | 204.500000 | 13.887727 | 2.535540 | [197.4142, 207.7858] | - | 17.2500 | 179.0000 | 244.0000 | 6.85% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 203.566667 | 205.500000 | 14.094957 | 2.573375 | [198.3035, 208.8298] | - | 22.5000 | 180.0000 | 226.0000 | 6.92% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 205.133333 | 202.000000 | 13.805879 | 2.520597 | [199.9781, 210.2885] | - | 20.2500 | 184.0000 | 244.0000 | 6.73% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 204.866667 | 205.000000 | 14.894418 | 2.719336 | [199.3050, 210.4283] | - | 15.7500 | 165.0000 | 233.0000 | 7.27% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 204.100000 | 202.000000 | 13.223151 | 2.414206 | [199.1624, 209.0376] | - | 11.7500 | 177.0000 | 234.0000 | 6.48% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 206.600000 | 205.500000 | 12.535742 | 2.288703 | [201.9191, 211.2809] | [200.7000, 211.5333] | 14.0000 | 188.0000 | 249.0000 | 6.07% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 200.500000 | 197.000000 | 12.928850 | 2.360474 | [195.6723, 205.3277] | - | 17.2500 | 179.0000 | 231.0000 | 6.45% |

#### Quorum Reach Rate

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.369703 | 0.368423 | 0.033199 | 0.006061 | [0.3573, 0.3821] | 0.0458 | 0.3032 | 0.4236 | 8.98% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.287482 | 0.278529 | 0.035374 | 0.006458 | [0.2743, 0.3007] | 0.0464 | 0.2440 | 0.3687 | 12.30% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.309008 | 0.301511 | 0.050433 | 0.009208 | [0.2902, 0.3278] | 0.0693 | 0.2195 | 0.4238 | 16.32% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.310582 | 0.312494 | 0.030861 | 0.005634 | [0.2991, 0.3221] | 0.0394 | 0.2366 | 0.3584 | 9.94% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.325810 | 0.329414 | 0.044130 | 0.008057 | [0.3093, 0.3423] | 0.0702 | 0.2587 | 0.4029 | 13.54% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.341243 | 0.336457 | 0.041044 | 0.007494 | [0.3259, 0.3566] | 0.0531 | 0.2537 | 0.4259 | 12.03% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.293629 | 0.294664 | 0.028721 | 0.005244 | [0.2829, 0.3044] | 0.0410 | 0.2353 | 0.3522 | 9.78% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.402267 | 0.403386 | 0.060369 | 0.011022 | [0.3797, 0.4248] | 0.0639 | 0.2677 | 0.5072 | 15.01% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.429207 | 0.433427 | 0.056368 | 0.010291 | [0.4082, 0.4503] | 0.0766 | 0.3039 | 0.5179 | 13.13% |

#### Avg Margin of Victory

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.560036 | 0.557056 | 0.028525 | 0.005208 | [0.5494, 0.5707] | 0.0295 | 0.5070 | 0.6347 | 5.09% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.559290 | 0.557327 | 0.024350 | 0.004446 | [0.5502, 0.5684] | 0.0291 | 0.5039 | 0.5949 | 4.35% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.556800 | 0.552514 | 0.035663 | 0.006511 | [0.5435, 0.5701] | 0.0514 | 0.4944 | 0.6371 | 6.40% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.488318 | 0.482531 | 0.035417 | 0.006466 | [0.4751, 0.5015] | 0.0438 | 0.4331 | 0.5814 | 7.25% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.529395 | 0.527991 | 0.031042 | 0.005667 | [0.5178, 0.5410] | 0.0492 | 0.4707 | 0.5841 | 5.86% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.519172 | 0.523663 | 0.028527 | 0.005208 | [0.5085, 0.5298] | 0.0342 | 0.4671 | 0.5937 | 5.49% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.475311 | 0.481753 | 0.031123 | 0.005682 | [0.4637, 0.4869] | 0.0339 | 0.4078 | 0.5365 | 6.55% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.498233 | 0.497653 | 0.031970 | 0.005837 | [0.4863, 0.5102] | 0.0469 | 0.4439 | 0.5714 | 6.42% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.478696 | 0.487793 | 0.035877 | 0.006550 | [0.4653, 0.4921] | 0.0482 | 0.4053 | 0.5504 | 7.49% |

#### Avg Time to Decision

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 1017.402632 | 1005.641085 | 43.552808 | 7.951618 | [1001.1397, 1033.6655] | 51.8180 | 934.6316 | 1109.9409 | 4.28% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 1031.169682 | 1031.052234 | 47.879572 | 8.741574 | [1013.2912, 1049.0482] | 68.3516 | 920.1875 | 1120.3454 | 4.64% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 1030.784666 | 1035.555759 | 35.502242 | 6.481793 | [1017.5279, 1044.0414] | 35.6958 | 934.3268 | 1090.1204 | 3.44% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 1023.796604 | 1026.506086 | 39.270817 | 7.169838 | [1009.1326, 1038.4606] | 52.1965 | 907.9305 | 1091.6473 | 3.84% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 1023.019893 | 1024.869821 | 30.641928 | 5.594425 | [1011.5780, 1034.4618] | 41.8224 | 972.5412 | 1078.4979 | 3.00% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 1018.840278 | 1016.530612 | 41.635542 | 7.601575 | [1003.2933, 1034.3872] | 46.0477 | 928.1570 | 1116.6872 | 4.09% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 1020.614565 | 1015.740552 | 39.576003 | 7.225557 | [1005.8366, 1035.3925] | 70.3979 | 959.5377 | 1095.9110 | 3.88% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 1023.888248 | 1024.101316 | 26.822212 | 4.897043 | [1013.8727, 1033.9038] | 34.8790 | 978.8247 | 1090.6798 | 2.62% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 1036.637877 | 1040.603080 | 44.049761 | 8.042349 | [1020.1894, 1053.0863] | 57.8289 | 954.4503 | 1125.8305 | 4.25% |

#### Proposal Abandonment Rate

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.019252 | 0.017069 | 0.010390 | 0.001897 | [0.0154, 0.0231] | 0.0133 | 0.0051 | 0.0500 | 53.97% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.021262 | 0.019516 | 0.009347 | 0.001707 | [0.0178, 0.0248] | 0.0109 | 0.0048 | 0.0413 | 43.96% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.022227 | 0.019655 | 0.011817 | 0.002157 | [0.0178, 0.0266] | 0.0212 | 0.0041 | 0.0423 | 53.16% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.019633 | 0.018265 | 0.010011 | 0.001828 | [0.0159, 0.0234] | 0.0100 | 0.0000 | 0.0505 | 50.99% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.022904 | 0.022059 | 0.009874 | 0.001803 | [0.0192, 0.0266] | 0.0140 | 0.0096 | 0.0432 | 43.11% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.023573 | 0.022412 | 0.009785 | 0.001786 | [0.0199, 0.0272] | 0.0110 | 0.0049 | 0.0469 | 41.51% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.023077 | 0.022080 | 0.010876 | 0.001986 | [0.0190, 0.0271] | 0.0131 | 0.0048 | 0.0573 | 47.13% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.024100 | 0.023474 | 0.009413 | 0.001719 | [0.0206, 0.0276] | 0.0150 | 0.0046 | 0.0417 | 39.06% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.016383 | 0.015632 | 0.007104 | 0.001297 | [0.0137, 0.0190] | 0.0113 | 0.0045 | 0.0305 | 43.36% |

#### Proposal Rejection Rate

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.991800 | 0.994666 | 0.005400 | 0.000986 | [0.9898, 0.9938] | 0.0087 | 0.9832 | 1.0000 | 0.54% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.981613 | 0.982309 | 0.008468 | 0.001546 | [0.9785, 0.9848] | 0.0091 | 0.9641 | 1.0000 | 0.86% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.968954 | 0.975532 | 0.021301 | 0.003889 | [0.9610, 0.9769] | 0.0254 | 0.9257 | 1.0000 | 2.20% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.990023 | 0.989994 | 0.006481 | 0.001183 | [0.9876, 0.9924] | 0.0089 | 0.9727 | 1.0000 | 0.65% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.918274 | 0.924302 | 0.024101 | 0.004400 | [0.9093, 0.9273] | 0.0339 | 0.8763 | 0.9612 | 2.62% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.915382 | 0.916883 | 0.027940 | 0.005101 | [0.9049, 0.9258] | 0.0231 | 0.8457 | 0.9648 | 3.05% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.973513 | 0.979693 | 0.015778 | 0.002881 | [0.9676, 0.9794] | 0.0213 | 0.9323 | 0.9951 | 1.62% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.838161 | 0.833907 | 0.041072 | 0.007499 | [0.8228, 0.8535] | 0.0458 | 0.7548 | 0.9333 | 4.90% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.825179 | 0.822910 | 0.034654 | 0.006327 | [0.8122, 0.8381] | 0.0356 | 0.7644 | 0.9106 | 4.20% |

#### Governance Overhead

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 15.641272 | 15.460392 | 1.334909 | 0.243720 | [15.1428, 16.1397] | - | 1.9941 | 12.9898 | 17.9196 | 8.53% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 18.718561 | 18.170663 | 2.003614 | 0.365808 | [17.9704, 19.4667] | [18.2797, 19.8214] | 2.1699 | 15.1893 | 24.4154 | 10.70% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 18.637398 | 18.367050 | 2.318646 | 0.423325 | [17.7716, 19.5032] | - | 2.0696 | 14.5701 | 25.2029 | 12.44% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 16.995283 | 16.962576 | 1.661035 | 0.303262 | [16.3750, 17.6155] | - | 1.8043 | 12.7182 | 19.5638 | 9.77% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 19.651388 | 19.724416 | 2.346509 | 0.428412 | [18.7752, 20.5276] | - | 3.0445 | 14.5585 | 23.3934 | 11.94% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 20.587711 | 20.658762 | 2.316673 | 0.422965 | [19.7227, 21.4528] | - | 3.1762 | 16.0000 | 26.0762 | 11.25% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 18.495171 | 18.805849 | 1.878564 | 0.342977 | [17.7937, 19.1966] | - | 2.4135 | 14.1940 | 21.4756 | 10.16% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 23.282816 | 23.399643 | 2.684445 | 0.490110 | [22.2804, 24.2852] | - | 4.3421 | 18.5897 | 27.5652 | 11.53% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 24.544857 | 24.367661 | 2.664771 | 0.486518 | [23.5498, 25.5399] | - | 3.9763 | 19.9901 | 28.6042 | 10.86% |

#### Unique Voter Count

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Min | Max | CV |
|------|---|------|--------|-----|----|----|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 206.000000 | 206.000000 | 0.000000 | 0.000000 | [206.0000, 206.0000] | 206.0000 | 206.0000 | 0.00% |

#### Voter Participation Rate

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.073033 | 0.072613 | 0.006083 | 0.001111 | [0.0708, 0.0753] | - | 0.0090 | 0.0610 | 0.0824 | 8.33% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.087231 | 0.084371 | 0.009291 | 0.001696 | [0.0838, 0.0907] | [0.0851, 0.0923] | 0.0095 | 0.0710 | 0.1145 | 10.65% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.086792 | 0.086412 | 0.010920 | 0.001994 | [0.0827, 0.0909] | - | 0.0111 | 0.0666 | 0.1183 | 12.58% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.079327 | 0.079474 | 0.007632 | 0.001393 | [0.0765, 0.0822] | - | 0.0083 | 0.0589 | 0.0910 | 9.62% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.091443 | 0.091602 | 0.011050 | 0.002018 | [0.0873, 0.0956] | - | 0.0138 | 0.0682 | 0.1092 | 12.08% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.095721 | 0.096285 | 0.010720 | 0.001957 | [0.0917, 0.0997] | - | 0.0144 | 0.0728 | 0.1207 | 11.20% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.086017 | 0.087839 | 0.008568 | 0.001564 | [0.0828, 0.0892] | - | 0.0101 | 0.0673 | 0.1000 | 9.96% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.108212 | 0.108583 | 0.012635 | 0.002307 | [0.1035, 0.1129] | - | 0.0202 | 0.0863 | 0.1271 | 11.68% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.114936 | 0.113922 | 0.012222 | 0.002231 | [0.1104, 0.1195] | - | 0.0176 | 0.0938 | 0.1334 | 10.63% |

#### Voter Concentration Gini

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.474853 | 0.472837 | 0.015651 | 0.002858 | [0.4690, 0.4807] | 0.0191 | 0.4457 | 0.5108 | 3.30% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.319176 | 0.316300 | 0.018622 | 0.003400 | [0.3122, 0.3261] | 0.0235 | 0.2775 | 0.3656 | 5.83% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.321715 | 0.320433 | 0.023581 | 0.004305 | [0.3129, 0.3305] | 0.0208 | 0.2788 | 0.3801 | 7.33% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.365536 | 0.365707 | 0.013839 | 0.002527 | [0.3604, 0.3707] | 0.0147 | 0.3351 | 0.4080 | 3.79% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.240174 | 0.236340 | 0.019784 | 0.003612 | [0.2328, 0.2476] | 0.0253 | 0.2089 | 0.2999 | 8.24% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.235432 | 0.236676 | 0.016911 | 0.003087 | [0.2291, 0.2417] | 0.0186 | 0.2049 | 0.2772 | 7.18% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.289860 | 0.288471 | 0.013175 | 0.002405 | [0.2849, 0.2948] | 0.0153 | 0.2645 | 0.3193 | 4.55% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.169711 | 0.168693 | 0.019518 | 0.003563 | [0.1624, 0.1770] | 0.0256 | 0.1267 | 0.2181 | 11.50% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.161860 | 0.162207 | 0.012605 | 0.002301 | [0.1572, 0.1666] | 0.0188 | 0.1407 | 0.1869 | 7.79% |

#### Delegate Concentration

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.513279 | 0.509208 | 0.015605 | 0.002849 | [0.5075, 0.5191] | - | 0.0198 | 0.4842 | 0.5509 | 3.04% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.360789 | 0.359753 | 0.014024 | 0.002561 | [0.3556, 0.3660] | - | 0.0169 | 0.3319 | 0.3986 | 3.89% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.364018 | 0.361994 | 0.018037 | 0.003293 | [0.3573, 0.3708] | - | 0.0188 | 0.3297 | 0.4159 | 4.95% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.402307 | 0.401217 | 0.016547 | 0.003021 | [0.3961, 0.4085] | [0.3963, 0.4103] | 0.0133 | 0.3774 | 0.4613 | 4.11% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.334490 | 0.327969 | 0.022916 | 0.004184 | [0.3259, 0.3430] | [0.3214, 0.3357] | 0.0307 | 0.3067 | 0.3969 | 6.85% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.329582 | 0.327247 | 0.019931 | 0.003639 | [0.3221, 0.3370] | - | 0.0293 | 0.2967 | 0.3671 | 6.05% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.337021 | 0.336437 | 0.012176 | 0.002223 | [0.3325, 0.3416] | - | 0.0125 | 0.3066 | 0.3588 | 3.61% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.328069 | 0.324126 | 0.019734 | 0.003603 | [0.3207, 0.3354] | - | 0.0310 | 0.2991 | 0.3660 | 6.02% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.324645 | 0.320633 | 0.020232 | 0.003694 | [0.3171, 0.3322] | - | 0.0173 | 0.2873 | 0.3746 | 6.23% |

#### Avg Votes Per Proposal

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 15.337021 | 15.248796 | 1.277441 | 0.233228 | [14.8600, 15.8140] | - | 1.8861 | 12.8050 | 17.3107 | 8.33% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 18.318541 | 17.717824 | 1.951084 | 0.356218 | [17.5900, 19.0471] | [17.8791, 19.3111] | 2.0000 | 14.9000 | 24.0455 | 10.65% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 18.226376 | 18.146561 | 2.293125 | 0.418666 | [17.3701, 19.0826] | - | 2.3397 | 13.9821 | 24.8429 | 12.58% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 16.658702 | 16.689578 | 1.602698 | 0.292611 | [16.0602, 17.2572] | - | 1.7478 | 12.3763 | 19.1055 | 9.62% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 19.202926 | 19.236420 | 2.320564 | 0.423675 | [18.3364, 20.0694] | - | 2.8919 | 14.3298 | 22.9235 | 12.08% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 20.101383 | 20.219851 | 2.251271 | 0.411024 | [19.2607, 20.9420] | - | 3.0169 | 15.2941 | 25.3519 | 11.20% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 18.063661 | 18.446220 | 1.799284 | 0.328503 | [17.3918, 18.7355] | - | 2.1206 | 14.1238 | 21.0087 | 9.96% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 22.724499 | 22.802402 | 2.653314 | 0.484427 | [21.7337, 23.7153] | - | 4.2470 | 18.1250 | 26.6947 | 11.68% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 24.136469 | 23.923606 | 2.566655 | 0.468605 | [23.1781, 25.0949] | - | 3.6890 | 19.6990 | 28.0204 | 10.63% |

#### Voter Retention Rate

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.990843 | 0.995062 | 0.009439 | 0.001723 | [0.9873, 0.9944] | [0.9858, 0.9936] | 0.0134 | 0.9659 | 1.0000 | 0.95% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.998381 | 1.000000 | 0.004827 | 0.000881 | [0.9966, 1.0002] | [0.9956, 0.9997] | - | 0.9757 | 1.0000 | 0.48% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.999191 | 1.000000 | 0.002874 | 0.000525 | [0.9981, 1.0003] | [0.9974, 1.0000] | - | 0.9854 | 1.0000 | 0.29% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.997563 | 1.000000 | 0.004193 | 0.000766 | [0.9960, 0.9991] | [0.9963, 0.9990] | 0.0049 | 0.9854 | 1.0000 | 0.42% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.999676 | 1.000000 | 0.001232 | 0.000225 | [0.9992, 1.0001] | [0.9990, 1.0000] | - | 0.9951 | 1.0000 | 0.12% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 1.000000 | 1.000000 | 0.000000 | 0.000000 | [1.0000, 1.0000] | - | - | 1.0000 | 1.0000 | 0.00% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.999353 | 1.000000 | 0.001678 | 0.000306 | [0.9987, 1.0000] | [0.9987, 0.9998] | - | 0.9951 | 1.0000 | 0.17% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 1.000000 | 1.000000 | 0.000000 | 0.000000 | [1.0000, 1.0000] | - | - | 1.0000 | 1.0000 | 0.00% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 1.000000 | 1.000000 | 0.000000 | 0.000000 | [1.0000, 1.0000] | - | - | 1.0000 | 1.0000 | 0.00% |

#### Voting Power Utilization

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.049803 | 0.049382 | 0.004032 | 0.000736 | [0.0483, 0.0513] | - | 0.0062 | 0.0416 | 0.0566 | 8.10% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.061308 | 0.059363 | 0.005765 | 0.001053 | [0.0592, 0.0635] | [0.0600, 0.0641] | 0.0064 | 0.0514 | 0.0783 | 9.40% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.065813 | 0.064561 | 0.008920 | 0.001629 | [0.0625, 0.0691] | - | 0.0116 | 0.0489 | 0.0865 | 13.55% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.061212 | 0.062335 | 0.006118 | 0.001117 | [0.0589, 0.0635] | - | 0.0072 | 0.0429 | 0.0706 | 10.00% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.071887 | 0.072482 | 0.008624 | 0.001575 | [0.0687, 0.0751] | - | 0.0124 | 0.0561 | 0.0876 | 12.00% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.075402 | 0.075572 | 0.007977 | 0.001456 | [0.0724, 0.0784] | - | 0.0078 | 0.0587 | 0.0948 | 10.58% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.065636 | 0.065536 | 0.006757 | 0.001234 | [0.0631, 0.0682] | - | 0.0078 | 0.0550 | 0.0775 | 10.30% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.083962 | 0.081902 | 0.010600 | 0.001935 | [0.0800, 0.0879] | - | 0.0188 | 0.0655 | 0.1020 | 12.62% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.090163 | 0.090618 | 0.010294 | 0.001879 | [0.0863, 0.0940] | - | 0.0167 | 0.0688 | 0.1065 | 11.42% |

#### Treasury Volatility

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.189758 | 0.189398 | 0.021908 | 0.004000 | [0.1816, 0.1979] | - | 0.0296 | 0.1404 | 0.2277 | 11.55% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.190805 | 0.192678 | 0.025969 | 0.004741 | [0.1811, 0.2005] | - | 0.0359 | 0.1326 | 0.2273 | 13.61% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.191017 | 0.198290 | 0.025531 | 0.004661 | [0.1815, 0.2006] | - | 0.0418 | 0.1429 | 0.2227 | 13.37% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.197129 | 0.200560 | 0.020282 | 0.003703 | [0.1896, 0.2047] | [0.1886, 0.2026] | 0.0251 | 0.1355 | 0.2252 | 10.29% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.192108 | 0.196758 | 0.021599 | 0.003943 | [0.1840, 0.2002] | - | 0.0305 | 0.1319 | 0.2198 | 11.24% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.196067 | 0.211211 | 0.030729 | 0.005610 | [0.1846, 0.2075] | [0.1923, 0.2114] | 0.0338 | 0.1310 | 0.2290 | 15.67% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.185284 | 0.182976 | 0.023625 | 0.004313 | [0.1765, 0.1941] | - | 0.0338 | 0.1209 | 0.2225 | 12.75% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.189643 | 0.195957 | 0.023105 | 0.004218 | [0.1810, 0.1983] | - | 0.0404 | 0.1470 | 0.2202 | 12.18% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.195785 | 0.200966 | 0.021430 | 0.003913 | [0.1878, 0.2038] | [0.1864, 0.2030] | 0.0123 | 0.1259 | 0.2177 | 10.95% |

#### Treasury Growth Rate

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | -0.714746 | -0.720393 | 0.020186 | 0.003685 | [-0.7223, -0.7072] | 0.0308 | -0.7535 | -0.6891 | 2.82% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | -0.714140 | -0.720400 | 0.020538 | 0.003750 | [-0.7218, -0.7065] | 0.0332 | -0.7545 | -0.6892 | 2.88% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | -0.708857 | -0.720251 | 0.016232 | 0.002963 | [-0.7149, -0.7028] | 0.0311 | -0.7408 | -0.6890 | 2.29% |
| voting_activity=0.25_participation_target_rate=0 | 30 | -0.716485 | -0.720394 | 0.019054 | 0.003479 | [-0.7236, -0.7094] | 0.0132 | -0.7604 | -0.6893 | 2.66% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | -0.711781 | -0.720357 | 0.015354 | 0.002803 | [-0.7175, -0.7060] | 0.0309 | -0.7394 | -0.6891 | 2.16% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | -0.714653 | -0.720370 | 0.015570 | 0.002843 | [-0.7205, -0.7088] | 0.0003 | -0.7549 | -0.6891 | 2.18% |
| voting_activity=0.35_participation_target_rate=0 | 30 | -0.713646 | -0.720365 | 0.015236 | 0.002782 | [-0.7193, -0.7080] | 0.0216 | -0.7363 | -0.6891 | 2.14% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | -0.704823 | -0.689454 | 0.019226 | 0.003510 | [-0.7120, -0.6976] | 0.0311 | -0.7558 | -0.6892 | 2.73% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | -0.711065 | -0.720394 | 0.017488 | 0.003193 | [-0.7176, -0.7045] | 0.0311 | -0.7385 | -0.6889 | 2.46% |

#### Staking Participation

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.108879 | 0.108861 | 0.000364 | 0.000066 | [0.1087, 0.1090] | - | 0.0003 | 0.1081 | 0.1096 | 0.33% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.109847 | 0.109871 | 0.000462 | 0.000084 | [0.1097, 0.1100] | - | 0.0006 | 0.1088 | 0.1108 | 0.42% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.118395 | 0.118382 | 0.007895 | 0.001441 | [0.1154, 0.1213] | - | 0.0157 | 0.1092 | 0.1332 | 6.67% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.123622 | 0.123537 | 0.006286 | 0.001148 | [0.1213, 0.1260] | - | 0.0071 | 0.1131 | 0.1396 | 5.09% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.122627 | 0.121146 | 0.006295 | 0.001149 | [0.1203, 0.1250] | [0.1215, 0.1258] | 0.0066 | 0.1129 | 0.1397 | 5.13% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.123811 | 0.122870 | 0.006322 | 0.001154 | [0.1215, 0.1262] | - | 0.0074 | 0.1140 | 0.1395 | 5.11% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.120815 | 0.120535 | 0.006557 | 0.001197 | [0.1184, 0.1233] | - | 0.0087 | 0.1105 | 0.1378 | 5.43% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.121801 | 0.120990 | 0.006482 | 0.001183 | [0.1194, 0.1242] | [0.1182, 0.1223] | 0.0064 | 0.1127 | 0.1380 | 5.32% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.122735 | 0.122701 | 0.005156 | 0.000941 | [0.1208, 0.1247] | - | 0.0039 | 0.1129 | 0.1375 | 4.20% |

#### Token Concentration Gini

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.584860 | 0.584436 | 0.003011 | 0.000550 | [0.5837, 0.5860] | 0.0033 | 0.5759 | 0.5899 | 0.51% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.593129 | 0.592429 | 0.003814 | 0.000696 | [0.5917, 0.5946] | 0.0056 | 0.5842 | 0.6011 | 0.64% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.565894 | 0.567049 | 0.023934 | 0.004370 | [0.5570, 0.5748] | 0.0481 | 0.5234 | 0.5978 | 4.23% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.548681 | 0.545549 | 0.013834 | 0.002526 | [0.5435, 0.5538] | 0.0148 | 0.5281 | 0.5778 | 2.52% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.553058 | 0.552301 | 0.017008 | 0.003105 | [0.5467, 0.5594] | 0.0182 | 0.5237 | 0.5903 | 3.08% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.549220 | 0.546060 | 0.016428 | 0.002999 | [0.5431, 0.5554] | 0.0230 | 0.5143 | 0.5812 | 2.99% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.558631 | 0.558936 | 0.017288 | 0.003156 | [0.5522, 0.5651] | 0.0255 | 0.5291 | 0.5879 | 3.09% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.548576 | 0.548719 | 0.017989 | 0.003284 | [0.5419, 0.5553] | 0.0261 | 0.5071 | 0.5798 | 3.28% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.539754 | 0.538491 | 0.016162 | 0.002951 | [0.5337, 0.5458] | 0.0210 | 0.5078 | 0.5786 | 2.99% |

#### Avg Member Wealth

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 132.097000 | 132.117614 | 0.440903 | 0.080498 | [131.9324, 132.2616] | 0.3192 | 131.2563 | 133.0165 | 0.33% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 130.933795 | 130.902479 | 0.550798 | 0.100561 | [130.7281, 131.1395] | 0.7121 | 129.8186 | 132.1444 | 0.42% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 121.994374 | 121.491902 | 8.008116 | 1.462075 | [119.0041, 124.9847] | 16.3526 | 107.9480 | 131.6682 | 6.56% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 116.627886 | 116.421945 | 5.819860 | 1.062556 | [114.4547, 118.8011] | 6.8513 | 103.0253 | 127.1757 | 4.99% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 117.572494 | 118.719706 | 5.788857 | 1.056896 | [115.4109, 119.7341] | 6.4285 | 102.9482 | 127.3647 | 4.92% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 116.448668 | 117.054409 | 5.771101 | 1.053654 | [114.2937, 118.6036] | 7.0123 | 103.0967 | 126.1233 | 4.96% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 119.378092 | 119.321982 | 6.355332 | 1.160320 | [117.0050, 121.7512] | 8.7453 | 104.3393 | 130.1520 | 5.32% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 118.390959 | 118.874416 | 6.036705 | 1.102147 | [116.1368, 120.6451] | 6.2746 | 104.2164 | 127.6016 | 5.10% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 117.379600 | 117.215678 | 4.852738 | 0.885985 | [115.5676, 119.1916] | 3.7654 | 104.6264 | 127.3883 | 4.13% |

#### Wealth Mobility

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.415140 | 0.415564 | 0.003011 | 0.000550 | [0.4140, 0.4163] | 0.0033 | 0.4101 | 0.4241 | 0.73% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.406871 | 0.407571 | 0.003814 | 0.000696 | [0.4054, 0.4083] | 0.0056 | 0.3989 | 0.4158 | 0.94% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.434106 | 0.432951 | 0.023934 | 0.004370 | [0.4252, 0.4430] | 0.0481 | 0.4022 | 0.4766 | 5.51% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.451319 | 0.454451 | 0.013834 | 0.002526 | [0.4462, 0.4565] | 0.0148 | 0.4222 | 0.4719 | 3.07% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.446942 | 0.447699 | 0.017008 | 0.003105 | [0.4406, 0.4533] | 0.0182 | 0.4097 | 0.4763 | 3.81% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.450780 | 0.453940 | 0.016428 | 0.002999 | [0.4446, 0.4569] | 0.0230 | 0.4188 | 0.4857 | 3.64% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.441369 | 0.441064 | 0.017288 | 0.003156 | [0.4349, 0.4478] | 0.0255 | 0.4121 | 0.4709 | 3.92% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.451424 | 0.451281 | 0.017989 | 0.003284 | [0.4447, 0.4581] | 0.0261 | 0.4202 | 0.4929 | 3.98% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.460246 | 0.461509 | 0.016162 | 0.002951 | [0.4542, 0.4663] | 0.0210 | 0.4214 | 0.4922 | 3.51% |

#### Whale Influence

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.203225 | 0.205323 | 0.024203 | 0.004419 | [0.1942, 0.2123] | 0.0327 | 0.1491 | 0.2562 | 11.91% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.379065 | 0.377920 | 0.023033 | 0.004205 | [0.3705, 0.3877] | 0.0240 | 0.3238 | 0.4343 | 6.08% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.382048 | 0.381925 | 0.024784 | 0.004525 | [0.3728, 0.3913] | 0.0283 | 0.3237 | 0.4293 | 6.49% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.350995 | 0.352100 | 0.026385 | 0.004817 | [0.3411, 0.3608] | 0.0234 | 0.2783 | 0.4051 | 7.52% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.506219 | 0.509198 | 0.027875 | 0.005089 | [0.4958, 0.5166] | 0.0344 | 0.4439 | 0.5651 | 5.51% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.501042 | 0.506545 | 0.025231 | 0.004607 | [0.4916, 0.5105] | 0.0273 | 0.4486 | 0.5536 | 5.04% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.462603 | 0.465596 | 0.038318 | 0.006996 | [0.4483, 0.4769] | 0.0436 | 0.3864 | 0.5497 | 8.28% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.550310 | 0.545912 | 0.037028 | 0.006760 | [0.5365, 0.5641] | 0.0423 | 0.4861 | 0.6216 | 6.73% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.539887 | 0.535117 | 0.045048 | 0.008225 | [0.5231, 0.5567] | 0.0760 | 0.4584 | 0.6162 | 8.34% |

#### Whale Proposal Rate

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.098399 | 0.104262 | 0.017937 | 0.003275 | [0.0917, 0.1051] | 0.0237 | 0.0553 | 0.1298 | 18.23% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.100554 | 0.103940 | 0.019047 | 0.003477 | [0.0934, 0.1077] | 0.0239 | 0.0622 | 0.1346 | 18.94% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.100535 | 0.099592 | 0.021686 | 0.003959 | [0.0924, 0.1086] | 0.0261 | 0.0462 | 0.1313 | 21.57% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.095578 | 0.096838 | 0.023549 | 0.004299 | [0.0868, 0.1044] | 0.0301 | 0.0321 | 0.1463 | 24.64% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.097344 | 0.102240 | 0.024557 | 0.004483 | [0.0882, 0.1065] | 0.0238 | 0.0297 | 0.1361 | 25.23% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.092671 | 0.094448 | 0.024241 | 0.004426 | [0.0836, 0.1017] | 0.0248 | 0.0402 | 0.1505 | 26.16% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.098582 | 0.101702 | 0.026301 | 0.004802 | [0.0888, 0.1084] | 0.0416 | 0.0508 | 0.1435 | 26.68% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.093673 | 0.094747 | 0.028101 | 0.005130 | [0.0832, 0.1042] | 0.0348 | 0.0251 | 0.1422 | 30.00% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.092697 | 0.093593 | 0.018386 | 0.003357 | [0.0858, 0.0996] | 0.0196 | 0.0476 | 0.1231 | 19.83% |

#### Governance Capture Risk

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.579982 | 0.579364 | 0.018074 | 0.003300 | [0.5732, 0.5867] | - | 0.0272 | 0.5426 | 0.6257 | 3.12% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.392868 | 0.390675 | 0.015738 | 0.002873 | [0.3870, 0.3987] | - | 0.0221 | 0.3644 | 0.4215 | 4.01% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.392131 | 0.393900 | 0.016933 | 0.003091 | [0.3858, 0.3985] | - | 0.0243 | 0.3634 | 0.4343 | 4.32% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.469050 | 0.465470 | 0.019408 | 0.003543 | [0.4618, 0.4763] | [0.4647, 0.4799] | 0.0180 | 0.4335 | 0.5376 | 4.14% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.347692 | 0.340301 | 0.021755 | 0.003972 | [0.3396, 0.3558] | [0.3360, 0.3496] | 0.0298 | 0.3157 | 0.4000 | 6.26% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.345970 | 0.344637 | 0.018239 | 0.003330 | [0.3392, 0.3528] | - | 0.0171 | 0.3088 | 0.3923 | 5.27% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.385367 | 0.385037 | 0.016762 | 0.003060 | [0.3791, 0.3916] | - | 0.0188 | 0.3522 | 0.4262 | 4.35% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.335440 | 0.329649 | 0.021285 | 0.003886 | [0.3275, 0.3434] | - | 0.0304 | 0.3058 | 0.3751 | 6.35% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.330791 | 0.327023 | 0.020073 | 0.003665 | [0.3233, 0.3383] | - | 0.0270 | 0.3004 | 0.3760 | 6.07% |

#### Vote Buying Vulnerability

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 60.092935 | 62.101827 | 13.230093 | 2.415474 | [55.1527, 65.0331] | 17.3587 | 30.2892 | 101.4322 | 22.02% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 89.001022 | 84.612194 | 18.340647 | 3.348529 | [82.1525, 95.8495] | 22.0451 | 62.2526 | 130.3780 | 20.61% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 87.469784 | 91.681312 | 18.743358 | 3.422053 | [80.4709, 94.4687] | 19.8731 | 40.0957 | 127.5548 | 21.43% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 77.638371 | 77.164615 | 12.820200 | 2.340638 | [72.8512, 82.4255] | 20.9226 | 55.7994 | 100.3707 | 16.51% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 86.547378 | 88.200800 | 18.985241 | 3.466215 | [79.4582, 93.6366] | 22.2321 | 49.9188 | 131.9603 | 21.94% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 89.639175 | 85.113513 | 17.582256 | 3.210066 | [83.0739, 96.2045] | 27.1752 | 52.4394 | 124.0362 | 19.61% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 81.194287 | 80.977264 | 14.370369 | 2.623658 | [75.8283, 86.5603] | 19.8552 | 46.2545 | 107.3829 | 17.70% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 88.034876 | 87.740724 | 15.437201 | 2.818434 | [82.2705, 93.7992] | 19.2273 | 57.9623 | 125.9109 | 17.54% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 91.156740 | 88.299674 | 17.291026 | 3.156895 | [84.7002, 97.6133] | 28.4978 | 57.2603 | 135.3526 | 18.97% |

#### Single Entity Control

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.036049 | 0.036043 | 0.000120 | 0.000022 | [0.0360, 0.0361] | - | 0.0001 | 0.0358 | 0.0363 | 0.33% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.036357 | 0.036377 | 0.000172 | 0.000031 | [0.0363, 0.0364] | - | 0.0002 | 0.0359 | 0.0367 | 0.47% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.039158 | 0.039195 | 0.002586 | 0.000472 | [0.0382, 0.0401] | - | 0.0052 | 0.0362 | 0.0439 | 6.61% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.040793 | 0.040760 | 0.002082 | 0.000380 | [0.0400, 0.0416] | - | 0.0024 | 0.0373 | 0.0458 | 5.10% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.040438 | 0.040058 | 0.002078 | 0.000379 | [0.0397, 0.0412] | - | 0.0023 | 0.0370 | 0.0458 | 5.14% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.040967 | 0.040572 | 0.002117 | 0.000386 | [0.0402, 0.0418] | - | 0.0025 | 0.0374 | 0.0462 | 5.17% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.039838 | 0.039816 | 0.002112 | 0.000386 | [0.0390, 0.0406] | - | 0.0030 | 0.0362 | 0.0452 | 5.30% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.040260 | 0.040059 | 0.002148 | 0.000392 | [0.0395, 0.0411] | [0.0391, 0.0404] | 0.0021 | 0.0373 | 0.0457 | 5.34% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.040528 | 0.040537 | 0.001714 | 0.000313 | [0.0399, 0.0412] | - | 0.0015 | 0.0370 | 0.0455 | 4.23% |

#### Collusion Threshold

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.086508 | 0.085714 | 0.001805 | 0.000330 | [0.0858, 0.0872] | [0.0859, 0.0871] | - | 0.0857 | 0.0905 | 2.09% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.085714 | 0.085714 | 0.000000 | 0.000000 | [0.0857, 0.0857] | - | - | 0.0857 | 0.0857 | 0.00% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.106349 | 0.095238 | 0.024098 | 0.004400 | [0.0974, 0.1153] | - | 0.0464 | 0.0857 | 0.1619 | 22.66% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.121270 | 0.123810 | 0.021359 | 0.003900 | [0.1133, 0.1292] | - | 0.0262 | 0.0905 | 0.1667 | 17.61% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.116190 | 0.111905 | 0.022738 | 0.004151 | [0.1077, 0.1247] | - | 0.0333 | 0.0905 | 0.1619 | 19.57% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.121587 | 0.119048 | 0.023219 | 0.004239 | [0.1129, 0.1303] | - | 0.0369 | 0.0905 | 0.1714 | 19.10% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.110317 | 0.102381 | 0.021262 | 0.003882 | [0.1024, 0.1183] | - | 0.0274 | 0.0905 | 0.1619 | 19.27% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.118254 | 0.114286 | 0.024444 | 0.004463 | [0.1091, 0.1274] | - | 0.0369 | 0.0905 | 0.1762 | 20.67% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.126825 | 0.128571 | 0.021749 | 0.003971 | [0.1187, 0.1349] | - | 0.0310 | 0.0905 | 0.1714 | 17.15% |

#### Participation Trend

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.000012 | 0.000006 | 0.000065 | 0.000012 | [-0.0000, 0.0000] | 0.0001 | -0.0001 | 0.0001 | 533.67% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.000005 | 0.000021 | 0.000102 | 0.000019 | [-0.0000, 0.0000] | 0.0001 | -0.0003 | 0.0002 | 1966.41% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.000012 | -0.000002 | 0.000111 | 0.000020 | [-0.0000, 0.0001] | 0.0001 | -0.0002 | 0.0003 | 966.19% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.000033 | 0.000041 | 0.000070 | 0.000013 | [0.0000, 0.0001] | 0.0001 | -0.0001 | 0.0002 | 209.01% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.000041 | 0.000040 | 0.000124 | 0.000023 | [-0.0000, 0.0001] | 0.0002 | -0.0002 | 0.0003 | 303.45% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.000022 | -0.000002 | 0.000140 | 0.000026 | [-0.0000, 0.0001] | 0.0002 | -0.0002 | 0.0003 | 641.04% |
| voting_activity=0.35_participation_target_rate=0 | 30 | -0.000015 | 0.000027 | 0.000135 | 0.000025 | [-0.0001, 0.0000] | 0.0002 | -0.0003 | 0.0002 | 872.35% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | -0.000013 | -0.000005 | 0.000105 | 0.000019 | [-0.0001, 0.0000] | 0.0002 | -0.0003 | 0.0002 | 806.08% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | -0.000048 | -0.000053 | 0.000144 | 0.000026 | [-0.0001, 0.0000] | 0.0002 | -0.0003 | 0.0002 | 296.56% |

#### Treasury Trend

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | -0.865566 | -0.885891 | 0.288407 | 0.052656 | [-0.9733, -0.7579] | 0.3828 | -1.3609 | 0.0176 | 33.32% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | -0.984961 | -0.970734 | 0.316944 | 0.057866 | [-1.1033, -0.8666] | 0.4075 | -1.9842 | -0.5120 | 32.18% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | -0.943243 | -0.962358 | 0.262029 | 0.047840 | [-1.0411, -0.8454] | 0.3660 | -1.5764 | -0.5200 | 27.78% |
| voting_activity=0.25_participation_target_rate=0 | 30 | -1.094311 | -1.107508 | 0.279868 | 0.051097 | [-1.1988, -0.9898] | 0.3088 | -1.6534 | -0.2806 | 25.57% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | -0.954259 | -0.958006 | 0.216062 | 0.039447 | [-1.0349, -0.8736] | 0.2969 | -1.3312 | -0.5491 | 22.64% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | -0.968770 | -1.045708 | 0.320658 | 0.058544 | [-1.0885, -0.8490] | 0.3736 | -1.6871 | -0.3675 | 33.10% |
| voting_activity=0.35_participation_target_rate=0 | 30 | -1.006317 | -0.993422 | 0.292141 | 0.053337 | [-1.1154, -0.8972] | 0.3684 | -1.6500 | -0.3997 | 29.03% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | -0.834780 | -0.840215 | 0.303659 | 0.055440 | [-0.9482, -0.7214] | 0.3463 | -1.3869 | -0.1988 | 36.38% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | -1.035598 | -1.127723 | 0.304805 | 0.055650 | [-1.1494, -0.9218] | 0.4297 | -1.3785 | -0.3073 | 29.43% |

#### Member Growth Rate

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Min | Max | CV |
|------|---|------|--------|-----|----|----|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | 0.0000 | 0.0000 | 0.00% |

#### Proposal Rate

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 9.961667 | 9.925000 | 0.515732 | 0.094159 | [9.7691, 10.1542] | - | 0.4750 | 8.6500 | 11.1500 | 5.18% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 10.288333 | 10.300000 | 0.621550 | 0.113479 | [10.0562, 10.5204] | - | 0.6125 | 8.7500 | 11.5000 | 6.04% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 10.130000 | 10.225000 | 0.694386 | 0.126777 | [9.8707, 10.3893] | - | 0.8625 | 8.9500 | 12.2000 | 6.85% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 10.178333 | 10.275000 | 0.704748 | 0.128669 | [9.9152, 10.4415] | - | 1.1250 | 9.0000 | 11.3000 | 6.92% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 10.256667 | 10.100000 | 0.690294 | 0.126030 | [9.9989, 10.5144] | - | 1.0125 | 9.2000 | 12.2000 | 6.73% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 10.243333 | 10.250000 | 0.744721 | 0.135967 | [9.9652, 10.5214] | - | 0.7875 | 8.2500 | 11.6500 | 7.27% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 10.205000 | 10.100000 | 0.661158 | 0.120710 | [9.9581, 10.4519] | - | 0.5875 | 8.8500 | 11.7000 | 6.48% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 10.330000 | 10.275000 | 0.626787 | 0.114435 | [10.0960, 10.5640] | [10.0333, 10.5517] | 0.7000 | 9.4000 | 12.4500 | 6.07% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 10.025000 | 9.850000 | 0.646443 | 0.118024 | [9.7836, 10.2664] | - | 0.8625 | 8.9500 | 11.5500 | 6.45% |

#### Governance Activity Index

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.004866 | 0.004957 | 0.000470 | 0.000086 | [0.0047, 0.0050] | 0.0007 | 0.0040 | 0.0057 | 9.66% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.006173 | 0.006185 | 0.000679 | 0.000124 | [0.0059, 0.0064] | 0.0012 | 0.0051 | 0.0076 | 11.00% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.006523 | 0.006475 | 0.001033 | 0.000189 | [0.0061, 0.0069] | 0.0010 | 0.0045 | 0.0090 | 15.83% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.006120 | 0.006148 | 0.000828 | 0.000151 | [0.0058, 0.0064] | 0.0010 | 0.0039 | 0.0078 | 13.52% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.007202 | 0.007224 | 0.000968 | 0.000177 | [0.0068, 0.0076] | 0.0014 | 0.0054 | 0.0089 | 13.44% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.007529 | 0.007684 | 0.000862 | 0.000157 | [0.0072, 0.0079] | 0.0011 | 0.0057 | 0.0100 | 11.45% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.006545 | 0.006489 | 0.000823 | 0.000150 | [0.0062, 0.0069] | 0.0009 | 0.0051 | 0.0087 | 12.58% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.008482 | 0.008199 | 0.001322 | 0.000241 | [0.0080, 0.0090] | 0.0022 | 0.0063 | 0.0118 | 15.58% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.008889 | 0.008858 | 0.001145 | 0.000209 | [0.0085, 0.0093] | 0.0016 | 0.0062 | 0.0115 | 12.88% |

#### Final Gini

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.551593 | 0.551129 | 0.003268 | 0.000597 | [0.5504, 0.5528] | 0.0036 | 0.5418 | 0.5570 | 0.59% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.560551 | 0.559785 | 0.004146 | 0.000757 | [0.5590, 0.5621] | 0.0062 | 0.5509 | 0.5693 | 0.74% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.555033 | 0.558506 | 0.014612 | 0.002668 | [0.5496, 0.5605] | 0.0223 | 0.5234 | 0.5821 | 2.63% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.548681 | 0.545549 | 0.013834 | 0.002526 | [0.5435, 0.5538] | 0.0148 | 0.5281 | 0.5778 | 2.52% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.553058 | 0.552301 | 0.017008 | 0.003105 | [0.5467, 0.5594] | 0.0182 | 0.5237 | 0.5903 | 3.08% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.549220 | 0.546060 | 0.016428 | 0.002999 | [0.5431, 0.5554] | 0.0230 | 0.5143 | 0.5812 | 2.99% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.558631 | 0.558936 | 0.017288 | 0.003156 | [0.5522, 0.5651] | 0.0255 | 0.5291 | 0.5879 | 3.09% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.548576 | 0.548719 | 0.017989 | 0.003284 | [0.5419, 0.5553] | 0.0261 | 0.5071 | 0.5798 | 3.28% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.539754 | 0.538491 | 0.016162 | 0.002951 | [0.5337, 0.5458] | 0.0210 | 0.5078 | 0.5786 | 2.99% |

#### Final Reputation Gini

| Voting Activity | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| voting_activity=0.15_participation_target_rate=0 | 30 | 0.975233 | 0.975328 | 0.001194 | 0.000218 | [0.9748, 0.9757] | - | 0.0016 | 0.9732 | 0.9778 | 0.12% |
| voting_activity=0.15_participation_target_rate=0.15 | 30 | 0.975581 | 0.975216 | 0.001476 | 0.000270 | [0.9750, 0.9761] | - | 0.0022 | 0.9737 | 0.9794 | 0.15% |
| voting_activity=0.15_participation_target_rate=0.25 | 30 | 0.974921 | 0.975102 | 0.001010 | 0.000184 | [0.9745, 0.9753] | - | 0.0014 | 0.9727 | 0.9766 | 0.10% |
| voting_activity=0.25_participation_target_rate=0 | 30 | 0.975476 | 0.975604 | 0.001697 | 0.000310 | [0.9748, 0.9761] | - | 0.0020 | 0.9716 | 0.9798 | 0.17% |
| voting_activity=0.25_participation_target_rate=0.15 | 30 | 0.976150 | 0.975324 | 0.004017 | 0.000733 | [0.9747, 0.9777] | [0.9751, 0.9775] | 0.0019 | 0.9729 | 0.9952 | 0.41% |
| voting_activity=0.25_participation_target_rate=0.25 | 30 | 0.975296 | 0.974834 | 0.003307 | 0.000604 | [0.9741, 0.9765] | [0.9747, 0.9772] | 0.0022 | 0.9715 | 0.9909 | 0.34% |
| voting_activity=0.35_participation_target_rate=0 | 30 | 0.975930 | 0.975244 | 0.003788 | 0.000692 | [0.9745, 0.9773] | [0.9750, 0.9779] | 0.0016 | 0.9735 | 0.9951 | 0.39% |
| voting_activity=0.35_participation_target_rate=0.15 | 30 | 0.975962 | 0.975071 | 0.004058 | 0.000741 | [0.9744, 0.9775] | [0.9748, 0.9764] | 0.0016 | 0.9731 | 0.9952 | 0.42% |
| voting_activity=0.35_participation_target_rate=0.25 | 30 | 0.975506 | 0.975234 | 0.001951 | 0.000356 | [0.9748, 0.9762] | [0.9744, 0.9758] | 0.0021 | 0.9728 | 0.9834 | 0.20% |

---

*Report generated by DAO Simulator Research Quality Report Generator*
