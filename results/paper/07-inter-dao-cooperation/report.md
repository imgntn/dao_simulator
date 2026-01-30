# DAO Simulation Research Quality Report

**Generated:** 2026-01-30
**Results Directory:** 07-inter-dao-cooperation

---

## Executive Summary

**Experiment:** 07-inter-dao-cooperation
**Total Runs:** 300
**Runs per Configuration:** 60
**Sweep Values:** homogeneous-governance, heterogeneous-governance, asymmetric-treasury, specialized-daos, isolated-daos
**Statistical Power:** 74%
**Metrics Analyzed:** 23

### Overall Quality Assessment

❌ **Issues Detected** - 3 critical issue(s), 8 warning(s).

### Key Statistics

| Aspect | Value |
|--------|-------|
| Significant Effects | 11 of 11 metrics |
| Critical Issues | 3 |
| Warnings | 8 |
| Minimum Effect Detectable | d = 0.511 |

## Key Findings

1. **ecosystem.Inter-DAO Voting Participation**: Significant effect (F=6076.1, p<0.001). Ranges from 0.0000 (at Sweep Value=isolated-daos) to 102.1982 (at Sweep Value=specialized-daos).

2. **ecosystem.Inter-DAO Proposal Count**: Significant effect (F=1075.4, p<0.001). Ranges from 0.0000 (at Sweep Value=isolated-daos) to 74.6167 (at Sweep Value=specialized-daos).

3. **ecosystem.Cross-DAO Approval Alignment**: Significant effect (F=915.4, p<0.001). Ranges from 0.0000 (at Sweep Value=isolated-daos) to 0.5527 (at Sweep Value=specialized-daos).

4. **ecosystem.Joint Venture Rate**: Significant effect (F=257.7, p<0.001). Ranges from 0.0000 (at Sweep Value=isolated-daos) to 0.2488 (at Sweep Value=heterogeneous-governance).

5. **ecosystem.Treaty Proposal Rate**: Significant effect (F=257.3, p<0.001). Ranges from 0.0000 (at Sweep Value=isolated-daos) to 0.2611 (at Sweep Value=asymmetric-treasury).

## Methodology

### Experimental Design

- **Design Type:** Parameter sweep study
- **Independent Variable:** Sweep Value (5 levels: homogeneous-governance, heterogeneous-governance, asymmetric-treasury, specialized-daos, isolated-daos)
- **Dependent Variables:** 23 governance metrics
- **Replication:** 60 simulation runs per configuration
- **Total Runs:** 300

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

### Other Metrics

| Metric | Sweep Value=homogeneous-governance | Sweep Value=heterogeneous-governance | Sweep Value=asymmetric-treasury | Sweep Value=specialized-daos | Sweep Value=isolated-daos | Significant | Effect |
|--------|------|------|------|------|------|-------------|--------|
| ecosystem.Inter-DAO Proposal Count | 51.0000 | 50.9000 | 49.1833 | 74.6167 | 0 | ✓ | 14.17 |
| ecosystem.Inter-DAO Proposal Success Rate | 0.2265 | 0.2367 | 0.2199 | 0.2324 | 0 | ✓ | 6.27 |
| ecosystem.Collaboration Proposal Rate | 0.2557 | 0.2616 | 0.2526 | 0.2465 | 0 | ✓ | 6.66 |
| ecosystem.Treaty Proposal Rate | 0.2540 | 0.2429 | 0.2611 | 0.2608 | 0 | ✓ | 6.94 |
| ecosystem.Resource Sharing Rate | 0.2440 | 0.2466 | 0.2478 | 0.2442 | 0 | ✓ | 7.08 |
| ecosystem.Joint Venture Rate | 0.2464 | 0.2488 | 0.2385 | 0.2485 | 0 | ✓ | 8.39 |
| ecosystem.Inter-DAO Voting Participation | 88.0548 | 90.9861 | 94.0801 | 102.1982 | 0 | ✓ | 44.58 |
| ecosystem.Cross-DAO Approval Alignment | 0.5499 | 0.5462 | 0.5459 | 0.5527 | 0 | ✓ | 13.27 |
| ecosystem.Total Shared Budget | 183091 | 182672 | 164410 | 249536 | 0 | ✓ | 3.99 |
| ecosystem.Resource Flow Volume | 36240 | 37140 | 32579 | 55998 | 0 | ✓ | 2.64 |
| ecosystem.Ecosystem Treasury Total | 26716 | 27304 | 25552 | 27769 | 35868 | ✓ | -2.15 |
| dao-1.Proposal Pass Rate | 0.0348 | 0.0457 | 0.0573 | 0.0334 | 0.0598 |  | - |
| dao-2.Proposal Pass Rate | 0.0505 | 0.0435 | 0.0402 | 0.0852 | 0.0449 |  | - |
| dao-3.Proposal Pass Rate | 0.0472 | 0.0477 | 0.0403 | 0.0352 | 0.0463 |  | - |
| dao-1.Voter Participation Rate | 0.1015 | 0.0904 | 0.1079 | 0.0957 | 0.1034 |  | - |
| dao-2.Voter Participation Rate | 0.0937 | 0.0933 | 0.0987 | 0.0982 | 0.0987 |  | - |
| dao-3.Voter Participation Rate | 0.0957 | 0.0884 | 0.0992 | 0.1176 | 0.1017 |  | - |
| dao-1.Final Treasury | 8439 | 9630 | 10755 | 9512 | 11984 |  | - |
| dao-2.Final Treasury | 8707 | 8115 | 8640 | 10270 | 11926 |  | - |
| dao-3.Final Treasury | 9570 | 9559 | 6157 | 7987 | 11958 |  | - |
| dao-1.Treasury Growth Rate | -0.1755 | -0.1665 | -0.7609 | -0.1663 | -0.1496 |  | - |
| dao-2.Treasury Growth Rate | -0.1736 | -0.1778 | -0.1751 | -0.4843 | -0.1499 |  | - |
| dao-3.Treasury Growth Rate | -0.1675 | -0.1671 | 0.6258 | -0.0584 | -0.1498 |  | - |

## Distribution Quality Analysis

This section identifies metrics with distribution characteristics that may affect statistical validity.

### High Variability Metrics (CV > 50%)

| Metric | Sweep Value | Mean | Std | CV | Issue |
|--------|-------------|------|-----|----|----|
| ecosystem.Resource Flow Volume | homogeneous-governance | 36239.8302 | 27019.9001 | 74.6% | 🟡 Warning |
| ecosystem.Resource Flow Volume | heterogeneous-governance | 37140.1901 | 20187.7086 | 54.4% | 🟡 Warning |
| ecosystem.Resource Flow Volume | asymmetric-treasury | 32579.3807 | 22380.9654 | 68.7% | 🟡 Warning |
| ecosystem.Resource Flow Volume | specialized-daos | 55997.5773 | 30020.2696 | 53.6% | 🟡 Warning |
| dao-1.Proposal Pass Rate | homogeneous-governance | 0.0348 | 0.0461 | 132.6% | 🔴 Critical |
| dao-1.Proposal Pass Rate | heterogeneous-governance | 0.0457 | 0.0541 | 118.4% | 🔴 Critical |
| dao-1.Proposal Pass Rate | asymmetric-treasury | 0.0573 | 0.0413 | 72.1% | 🟡 Warning |
| dao-1.Proposal Pass Rate | specialized-daos | 0.0334 | 0.0407 | 122.0% | 🔴 Critical |
| dao-1.Proposal Pass Rate | isolated-daos | 0.0598 | 0.0646 | 107.9% | 🔴 Critical |
| dao-2.Proposal Pass Rate | homogeneous-governance | 0.0505 | 0.0559 | 110.8% | 🔴 Critical |
| dao-2.Proposal Pass Rate | heterogeneous-governance | 0.0435 | 0.0459 | 105.6% | 🔴 Critical |
| dao-2.Proposal Pass Rate | asymmetric-treasury | 0.0402 | 0.0518 | 128.9% | 🔴 Critical |
| dao-2.Proposal Pass Rate | specialized-daos | 0.0852 | 0.0741 | 87.0% | 🟡 Warning |
| dao-2.Proposal Pass Rate | isolated-daos | 0.0449 | 0.0515 | 114.8% | 🔴 Critical |
| dao-3.Proposal Pass Rate | homogeneous-governance | 0.0472 | 0.0640 | 135.7% | 🔴 Critical |
| dao-3.Proposal Pass Rate | heterogeneous-governance | 0.0477 | 0.0610 | 127.8% | 🔴 Critical |
| dao-3.Proposal Pass Rate | asymmetric-treasury | 0.0403 | 0.0686 | 170.3% | 🔴 Critical |
| dao-3.Proposal Pass Rate | specialized-daos | 0.0352 | 0.0519 | 147.5% | 🔴 Critical |
| dao-3.Proposal Pass Rate | isolated-daos | 0.0463 | 0.0483 | 104.4% | 🔴 Critical |
| dao-3.Voter Participation Rate | asymmetric-treasury | 0.0992 | 0.0554 | 55.9% | 🟡 Warning |
| dao-1.Final Treasury | homogeneous-governance | 8439.3212 | 4986.1898 | 59.1% | 🟡 Warning |
| dao-2.Final Treasury | homogeneous-governance | 8706.8863 | 4719.1845 | 54.2% | 🟡 Warning |
| dao-2.Final Treasury | heterogeneous-governance | 8114.7390 | 5017.0234 | 61.8% | 🟡 Warning |
| dao-2.Final Treasury | asymmetric-treasury | 8639.5575 | 4746.1313 | 54.9% | 🟡 Warning |
| dao-3.Final Treasury | asymmetric-treasury | 6157.2494 | 5085.6095 | 82.6% | 🟡 Warning |
| dao-3.Final Treasury | specialized-daos | 7987.1594 | 5137.4256 | 64.3% | 🟡 Warning |
| dao-3.Treasury Growth Rate | specialized-daos | -0.0584 | 0.0432 | 74.0% | 🟡 Warning |

### Non-Symmetric Distributions

Metrics where mean and median diverge significantly, suggesting skewed distributions:

| Metric | Sweep Value | Mean | Median | Skew Indicator |
|--------|-------------|------|--------|----------------|
| ecosystem.Ecosystem Treasury Total | heterogeneous-governance | 27303.6251 | 23998.5151 | Right-skewed (0.55) |
| ecosystem.Ecosystem Treasury Total | specialized-daos | 27769.2110 | 23991.2557 | Right-skewed (0.58) |
| dao-1.Proposal Pass Rate | homogeneous-governance | 0.0348 | 0.0000 | Right-skewed (0.75) |
| dao-2.Proposal Pass Rate | asymmetric-treasury | 0.0402 | 0.0000 | Right-skewed (0.78) |
| dao-3.Proposal Pass Rate | homogeneous-governance | 0.0472 | 0.0000 | Right-skewed (0.74) |
| dao-3.Proposal Pass Rate | asymmetric-treasury | 0.0403 | 0.0000 | Right-skewed (0.59) |
| dao-3.Proposal Pass Rate | specialized-daos | 0.0352 | 0.0000 | Right-skewed (0.68) |
| dao-1.Final Treasury | heterogeneous-governance | 9630.0217 | 11961.4426 | Left-skewed (-0.56) |
| dao-1.Final Treasury | specialized-daos | 9512.4975 | 11965.0766 | Left-skewed (-0.56) |
| dao-1.Final Treasury | isolated-daos | 11984.4247 | 11995.8960 | Left-skewed (-0.63) |
| dao-3.Final Treasury | homogeneous-governance | 9569.6512 | 11950.8208 | Left-skewed (-0.57) |
| dao-3.Final Treasury | heterogeneous-governance | 9558.8644 | 11967.1013 | Left-skewed (-0.58) |
| dao-3.Final Treasury | asymmetric-treasury | 6157.2494 | 10000.0000 | Left-skewed (-0.76) |
| dao-1.Treasury Growth Rate | heterogeneous-governance | -0.1665 | -0.1503 | Left-skewed (-0.54) |
| dao-1.Treasury Growth Rate | specialized-daos | -0.1663 | -0.1489 | Left-skewed (-0.54) |
| dao-3.Treasury Growth Rate | homogeneous-governance | -0.1675 | -0.1512 | Left-skewed (-0.54) |
| dao-3.Treasury Growth Rate | heterogeneous-governance | -0.1671 | -0.1504 | Left-skewed (-0.54) |
| dao-3.Treasury Growth Rate | asymmetric-treasury | 0.6258 | 0.6815 | Left-skewed (-0.74) |

### Constant/Zero Metrics

Metrics with no variance (may indicate unimplemented features or degenerate cases):

| Metric | Value | Note |
|--------|-------|------|
| (none) | - | - |

## Statistical Significance Analysis

### ANOVA Results (Overall Effect of Sweep Value)

| Metric | F-Statistic | df | p-value | Significant |
|--------|-------------|-----|---------|-------------|
| ecosystem.Inter-DAO Voting Participation | 6076.15 | (4, 295) | <0.001 | ✓ **Yes** |
| ecosystem.Inter-DAO Proposal Count | 1075.40 | (4, 295) | <0.001 | ✓ **Yes** |
| ecosystem.Cross-DAO Approval Alignment | 915.40 | (4, 295) | <0.001 | ✓ **Yes** |
| ecosystem.Joint Venture Rate | 257.72 | (4, 295) | <0.001 | ✓ **Yes** |
| ecosystem.Treaty Proposal Rate | 257.28 | (4, 295) | <0.001 | ✓ **Yes** |
| ecosystem.Resource Sharing Rate | 249.41 | (4, 295) | <0.001 | ✓ **Yes** |
| ecosystem.Collaboration Proposal Rate | 221.69 | (4, 295) | <0.001 | ✓ **Yes** |
| ecosystem.Inter-DAO Proposal Success Rate | 198.56 | (4, 295) | <0.001 | ✓ **Yes** |
| ecosystem.Total Shared Budget | 94.21 | (4, 295) | <0.001 | ✓ **Yes** |
| ecosystem.Resource Flow Volume | 48.54 | (4, 295) | <0.001 | ✓ **Yes** |
| ecosystem.Ecosystem Treasury Total | 31.58 | (4, 295) | <0.001 | ✓ **Yes** |

### Pairwise Comparisons (Significant Metrics Only)

| Metric | Comparison | t-statistic | Cohen's d | Effect Size |
|--------|------------|-------------|-----------|-------------|
| ecosystem.Inter-DAO Proposal Count | homogeneous-governance vs specialized-daos | -17.74 | -3.24 | very_large |
| ecosystem.Inter-DAO Proposal Count | homogeneous-governance vs isolated-daos | 55.40 | 10.11 | very_large |
| ecosystem.Inter-DAO Proposal Count | heterogeneous-governance vs specialized-daos | -17.34 | -3.17 | very_large |
| ecosystem.Inter-DAO Proposal Count | heterogeneous-governance vs isolated-daos | 52.34 | 9.56 | very_large |
| ecosystem.Inter-DAO Proposal Count | asymmetric-treasury vs specialized-daos | -19.61 | -3.58 | very_large |
| ecosystem.Inter-DAO Proposal Count | asymmetric-treasury vs isolated-daos | 56.47 | 10.31 | very_large |
| ecosystem.Inter-DAO Proposal Count | specialized-daos vs isolated-daos | 77.61 | 14.17 | very_large |
| ecosystem.Inter-DAO Proposal Success Rate | homogeneous-governance vs isolated-daos | 29.40 | 5.37 | very_large |
| ecosystem.Inter-DAO Proposal Success Rate | heterogeneous-governance vs isolated-daos | 23.67 | 4.32 | very_large |
| ecosystem.Inter-DAO Proposal Success Rate | asymmetric-treasury vs isolated-daos | 28.47 | 5.20 | very_large |
| ecosystem.Inter-DAO Proposal Success Rate | specialized-daos vs isolated-daos | 34.32 | 6.27 | very_large |
| ecosystem.Collaboration Proposal Rate | homogeneous-governance vs isolated-daos | 28.51 | 5.21 | very_large |
| ecosystem.Collaboration Proposal Rate | heterogeneous-governance vs isolated-daos | 31.66 | 5.78 | very_large |
| ecosystem.Collaboration Proposal Rate | asymmetric-treasury vs isolated-daos | 25.58 | 4.67 | very_large |
| ecosystem.Collaboration Proposal Rate | specialized-daos vs isolated-daos | 36.45 | 6.66 | very_large |
| ecosystem.Treaty Proposal Rate | homogeneous-governance vs isolated-daos | 33.07 | 6.04 | very_large |
| ecosystem.Treaty Proposal Rate | heterogeneous-governance vs isolated-daos | 30.63 | 5.59 | very_large |
| ecosystem.Treaty Proposal Rate | asymmetric-treasury vs isolated-daos | 28.44 | 5.19 | very_large |
| ecosystem.Treaty Proposal Rate | specialized-daos vs isolated-daos | 38.02 | 6.94 | very_large |
| ecosystem.Resource Sharing Rate | homogeneous-governance vs isolated-daos | 27.54 | 5.03 | very_large |
| ecosystem.Resource Sharing Rate | heterogeneous-governance vs isolated-daos | 34.22 | 6.25 | very_large |
| ecosystem.Resource Sharing Rate | asymmetric-treasury vs isolated-daos | 29.22 | 5.33 | very_large |
| ecosystem.Resource Sharing Rate | specialized-daos vs isolated-daos | 38.80 | 7.08 | very_large |
| ecosystem.Joint Venture Rate | homogeneous-governance vs isolated-daos | 30.41 | 5.55 | very_large |
| ecosystem.Joint Venture Rate | heterogeneous-governance vs isolated-daos | 31.66 | 5.78 | very_large |
| ecosystem.Joint Venture Rate | asymmetric-treasury vs isolated-daos | 27.07 | 4.94 | very_large |
| ecosystem.Joint Venture Rate | specialized-daos vs isolated-daos | 45.95 | 8.39 | very_large |
| ecosystem.Inter-DAO Voting Participation | homogeneous-governance vs heterogeneous-governance | -5.42 | -0.99 | large |
| ecosystem.Inter-DAO Voting Participation | homogeneous-governance vs asymmetric-treasury | -9.81 | -1.79 | very_large |
| ecosystem.Inter-DAO Voting Participation | homogeneous-governance vs specialized-daos | -13.43 | -2.45 | very_large |
| ecosystem.Inter-DAO Voting Participation | homogeneous-governance vs isolated-daos | 224.40 | 40.97 | very_large |
| ecosystem.Inter-DAO Voting Participation | heterogeneous-governance vs asymmetric-treasury | -5.14 | -0.94 | large |
| ecosystem.Inter-DAO Voting Participation | heterogeneous-governance vs specialized-daos | -10.72 | -1.96 | very_large |
| ecosystem.Inter-DAO Voting Participation | heterogeneous-governance vs isolated-daos | 244.20 | 44.58 | very_large |
| ecosystem.Inter-DAO Voting Participation | asymmetric-treasury vs specialized-daos | -7.48 | -1.36 | very_large |
| ecosystem.Inter-DAO Voting Participation | asymmetric-treasury vs isolated-daos | 198.97 | 36.33 | very_large |
| ecosystem.Inter-DAO Voting Participation | specialized-daos vs isolated-daos | 104.55 | 19.09 | very_large |
| ecosystem.Cross-DAO Approval Alignment | homogeneous-governance vs isolated-daos | 60.27 | 11.00 | very_large |
| ecosystem.Cross-DAO Approval Alignment | heterogeneous-governance vs isolated-daos | 60.04 | 10.96 | very_large |
| ecosystem.Cross-DAO Approval Alignment | asymmetric-treasury vs isolated-daos | 53.25 | 9.72 | very_large |
| ecosystem.Cross-DAO Approval Alignment | specialized-daos vs isolated-daos | 72.69 | 13.27 | very_large |
| ecosystem.Total Shared Budget | homogeneous-governance vs specialized-daos | -4.29 | -0.78 | medium |
| ecosystem.Total Shared Budget | homogeneous-governance vs isolated-daos | 17.50 | 3.20 | very_large |
| ecosystem.Total Shared Budget | heterogeneous-governance vs specialized-daos | -4.12 | -0.75 | medium |
| ecosystem.Total Shared Budget | heterogeneous-governance vs isolated-daos | 15.82 | 2.89 | very_large |
| ecosystem.Total Shared Budget | asymmetric-treasury vs specialized-daos | -5.79 | -1.06 | large |
| ecosystem.Total Shared Budget | asymmetric-treasury vs isolated-daos | 17.74 | 3.24 | very_large |
| ecosystem.Total Shared Budget | specialized-daos vs isolated-daos | 21.85 | 3.99 | very_large |
| ecosystem.Resource Flow Volume | homogeneous-governance vs specialized-daos | -3.79 | -0.69 | medium |
| ecosystem.Resource Flow Volume | homogeneous-governance vs isolated-daos | 10.39 | 1.90 | very_large |
| ecosystem.Resource Flow Volume | heterogeneous-governance vs specialized-daos | -4.04 | -0.74 | medium |
| ecosystem.Resource Flow Volume | heterogeneous-governance vs isolated-daos | 14.25 | 2.60 | very_large |
| ecosystem.Resource Flow Volume | asymmetric-treasury vs specialized-daos | -4.84 | -0.88 | large |
| ecosystem.Resource Flow Volume | asymmetric-treasury vs isolated-daos | 11.28 | 2.06 | very_large |
| ecosystem.Resource Flow Volume | specialized-daos vs isolated-daos | 14.45 | 2.64 | very_large |
| ecosystem.Ecosystem Treasury Total | homogeneous-governance vs isolated-daos | -11.79 | -2.15 | very_large |
| ecosystem.Ecosystem Treasury Total | heterogeneous-governance vs isolated-daos | -10.96 | -2.00 | very_large |
| ecosystem.Ecosystem Treasury Total | asymmetric-treasury vs isolated-daos | -11.77 | -2.15 | very_large |
| ecosystem.Ecosystem Treasury Total | specialized-daos vs isolated-daos | -9.55 | -1.74 | very_large |

## Power Analysis

| Metric | Value |
|--------|-------|
| Current Runs per Config | 60 |
| Recommended Runs | 63 |
| Current Power | 73.8% |
| Minimum Detectable Effect | d = 0.5112 |

**Interpretation:**
⚠️ Consider increasing sample size to 63 runs per configuration for 80% power to detect medium effects (d = 0.5).

## Recommendations

### Data Quality Improvements

#### Critical (Must Address)

- **dao-1.Proposal Pass Rate**: Very high variability (CV=132.6%). Distribution may be non-normal or parameter has high stochasticity. Non-symmetric distribution at sweep=homogeneous-governance (mean=0.0348, median=0.0000). Consider bootstrap CI.
- **dao-2.Proposal Pass Rate**: Very high variability (CV=128.9%). Distribution may be non-normal or parameter has high stochasticity. Non-symmetric distribution at sweep=asymmetric-treasury (mean=0.0402, median=0.0000). Consider bootstrap CI.
- **dao-3.Proposal Pass Rate**: Very high variability (CV=170.3%). Distribution may be non-normal or parameter has high stochasticity. Non-symmetric distribution at sweep=homogeneous-governance (mean=0.0472, median=0.0000). Consider bootstrap CI.

#### Warnings (Should Address)

- **ecosystem.Resource Flow Volume**: High variability (CV=74.6%). Consider more runs or controlled conditions.
- **ecosystem.Ecosystem Treasury Total**: Non-symmetric distribution at sweep=heterogeneous-governance (mean=27303.6251, median=23998.5151). Consider bootstrap CI.
- **dao-3.Voter Participation Rate**: High variability (CV=55.9%). Consider more runs or controlled conditions.
- **dao-1.Final Treasury**: High variability (CV=59.1%). Consider more runs or controlled conditions.
- **dao-2.Final Treasury**: High variability (CV=61.8%). Consider more runs or controlled conditions.
- **dao-3.Final Treasury**: High variability (CV=82.6%). Consider more runs or controlled conditions.
- **dao-1.Treasury Growth Rate**: Non-symmetric distribution at sweep=heterogeneous-governance (mean=-0.1665, median=-0.1503). Consider bootstrap CI.
- **dao-3.Treasury Growth Rate**: High variability (CV=74.0%). Consider more runs or controlled conditions.

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

#### ecosystem.Inter-DAO Proposal Count

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| homogeneous-governance | 60 | 51.000000 | 51.000000 | 7.130740 | 0.920575 | [49.1579, 52.8421] | 7.2500 | 35.0000 | 67.0000 | 13.98% |
| heterogeneous-governance | 60 | 50.900000 | 51.000000 | 7.532303 | 0.972416 | [48.9542, 52.8458] | 9.0000 | 34.0000 | 71.0000 | 14.80% |
| asymmetric-treasury | 60 | 49.183333 | 49.000000 | 6.745976 | 0.870902 | [47.4407, 50.9260] | 10.0000 | 32.0000 | 65.0000 | 13.72% |
| specialized-daos | 60 | 74.616667 | 75.000000 | 7.447196 | 0.961429 | [72.6929, 76.5405] | 7.2500 | 53.0000 | 91.0000 | 9.98% |
| isolated-daos | 60 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | 0.0000 | 0.0000 | 0.00% |

#### ecosystem.Inter-DAO Proposal Success Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| homogeneous-governance | 60 | 0.226476 | 0.228070 | 0.059674 | 0.007704 | [0.2111, 0.2419] | 0.0734 | 0.1091 | 0.3810 | 26.35% |
| heterogeneous-governance | 60 | 0.236732 | 0.238017 | 0.077456 | 0.010000 | [0.2167, 0.2567] | 0.0740 | 0.0870 | 0.4419 | 32.72% |
| asymmetric-treasury | 60 | 0.219939 | 0.208818 | 0.059831 | 0.007724 | [0.2045, 0.2354] | 0.0771 | 0.0980 | 0.3953 | 27.20% |
| specialized-daos | 60 | 0.232421 | 0.226970 | 0.052458 | 0.006772 | [0.2189, 0.2460] | 0.0726 | 0.1408 | 0.3750 | 22.57% |
| isolated-daos | 60 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | 0.0000 | 0.0000 | 0.00% |

#### ecosystem.Collaboration Proposal Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| homogeneous-governance | 60 | 0.255685 | 0.252907 | 0.069456 | 0.008967 | [0.2377, 0.2736] | 0.0691 | 0.0952 | 0.4490 | 27.16% |
| heterogeneous-governance | 60 | 0.261638 | 0.258418 | 0.064005 | 0.008263 | [0.2451, 0.2782] | 0.0911 | 0.1333 | 0.4250 | 24.46% |
| asymmetric-treasury | 60 | 0.252599 | 0.250000 | 0.076496 | 0.009876 | [0.2328, 0.2724] | 0.0932 | 0.0943 | 0.4490 | 30.28% |
| specialized-daos | 60 | 0.246523 | 0.250000 | 0.052384 | 0.006763 | [0.2330, 0.2601] | 0.0636 | 0.1132 | 0.3676 | 21.25% |
| isolated-daos | 60 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | 0.0000 | 0.0000 | 0.00% |

#### ecosystem.Treaty Proposal Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| homogeneous-governance | 60 | 0.253950 | 0.250000 | 0.059484 | 0.007679 | [0.2386, 0.2693] | 0.0823 | 0.1224 | 0.3864 | 23.42% |
| heterogeneous-governance | 60 | 0.242894 | 0.245000 | 0.061434 | 0.007931 | [0.2270, 0.2588] | 0.0841 | 0.0847 | 0.3774 | 25.29% |
| asymmetric-treasury | 60 | 0.261109 | 0.244898 | 0.071105 | 0.009180 | [0.2427, 0.2795] | 0.0936 | 0.0889 | 0.4038 | 27.23% |
| specialized-daos | 60 | 0.260820 | 0.254574 | 0.053133 | 0.006859 | [0.2471, 0.2745] | 0.0655 | 0.1471 | 0.3836 | 20.37% |
| isolated-daos | 60 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | 0.0000 | 0.0000 | 0.00% |

#### ecosystem.Resource Sharing Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| homogeneous-governance | 60 | 0.244013 | 0.242322 | 0.068641 | 0.008862 | [0.2263, 0.2617] | 0.0904 | 0.1395 | 0.4333 | 28.13% |
| heterogeneous-governance | 60 | 0.246624 | 0.254033 | 0.055828 | 0.007207 | [0.2322, 0.2610] | 0.0781 | 0.1250 | 0.3864 | 22.64% |
| asymmetric-treasury | 60 | 0.247791 | 0.250000 | 0.065687 | 0.008480 | [0.2308, 0.2648] | 0.0762 | 0.0698 | 0.4510 | 26.51% |
| specialized-daos | 60 | 0.244156 | 0.239718 | 0.048746 | 0.006293 | [0.2316, 0.2567] | 0.0599 | 0.0946 | 0.3625 | 19.96% |
| isolated-daos | 60 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | 0.0000 | 0.0000 | 0.00% |

#### ecosystem.Joint Venture Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| homogeneous-governance | 60 | 0.246351 | 0.238209 | 0.062752 | 0.008101 | [0.2301, 0.2626] | - | 0.0924 | 0.0930 | 0.3710 | 25.47% |
| heterogeneous-governance | 60 | 0.248844 | 0.236826 | 0.060874 | 0.007859 | [0.2331, 0.2646] | [0.2326, 0.2651] | 0.0656 | 0.1373 | 0.4545 | 24.46% |
| asymmetric-treasury | 60 | 0.238501 | 0.233566 | 0.068257 | 0.008812 | [0.2209, 0.2561] | - | 0.1079 | 0.0816 | 0.4222 | 28.62% |
| specialized-daos | 60 | 0.248501 | 0.238139 | 0.041894 | 0.005408 | [0.2377, 0.2593] | - | 0.0483 | 0.1618 | 0.3448 | 16.86% |
| isolated-daos | 60 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | - | 0.0000 | 0.0000 | 0.00% |

#### ecosystem.Inter-DAO Voting Participation

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| homogeneous-governance | 60 | 88.054796 | 88.124414 | 3.039540 | 0.392403 | [87.2696, 88.8400] | 4.8445 | 81.4457 | 93.5301 | 3.45% |
| heterogeneous-governance | 60 | 90.986093 | 91.088322 | 2.886089 | 0.372592 | [90.2405, 91.7316] | 3.7469 | 83.3506 | 97.7565 | 3.17% |
| asymmetric-treasury | 60 | 94.080100 | 94.385064 | 3.662511 | 0.472828 | [93.1340, 95.0262] | 4.1224 | 85.7992 | 100.7768 | 3.89% |
| specialized-daos | 60 | 102.198223 | 104.082941 | 7.571745 | 0.977508 | [100.2422, 104.1542] | 12.3249 | 85.1435 | 115.8650 | 7.41% |
| isolated-daos | 60 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | 0.0000 | 0.0000 | 0.00% |

#### ecosystem.Cross-DAO Approval Alignment

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| homogeneous-governance | 60 | 0.549946 | 0.549095 | 0.070674 | 0.009124 | [0.5317, 0.5682] | 0.0898 | 0.3673 | 0.7083 | 12.85% |
| heterogeneous-governance | 60 | 0.546165 | 0.548095 | 0.070464 | 0.009097 | [0.5280, 0.5644] | 0.0891 | 0.3833 | 0.6977 | 12.90% |
| asymmetric-treasury | 60 | 0.545868 | 0.536472 | 0.079408 | 0.010252 | [0.5254, 0.5664] | 0.0929 | 0.3438 | 0.7317 | 14.55% |
| specialized-daos | 60 | 0.552658 | 0.558442 | 0.058888 | 0.007602 | [0.5374, 0.5679] | 0.0772 | 0.4143 | 0.6625 | 10.66% |
| isolated-daos | 60 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | 0.0000 | 0.0000 | 0.00% |

#### ecosystem.Total Shared Budget

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| homogeneous-governance | 60 | 183090.880250 | 169484.605286 | 81040.522614 | 10462.286482 | [162155.8934, 204025.8671] | - | 102314.7240 | 35906.6306 | 407678.5970 | 44.26% |
| heterogeneous-governance | 60 | 182672.131094 | 183921.811394 | 89423.222489 | 11544.488382 | [159571.6632, 205772.5990] | - | 115313.1625 | 0.0000 | 404807.4194 | 48.95% |
| asymmetric-treasury | 60 | 164410.434383 | 153866.523616 | 71791.984997 | 9268.305410 | [145864.5981, 182956.2707] | [148960.4256, 187061.7372] | 89572.9958 | 74005.5845 | 402200.1908 | 43.67% |
| specialized-daos | 60 | 249535.840730 | 239303.090363 | 88479.197763 | 11422.615314 | [226679.2403, 272392.4412] | - | 93458.4140 | 72116.1307 | 530095.6349 | 35.46% |
| isolated-daos | 60 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | - | 0.0000 | 0.0000 | 0.00% |

#### ecosystem.Resource Flow Volume

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| homogeneous-governance | 60 | 36239.830190 | 29306.287848 | 27019.900087 | 3488.254102 | [29259.8499, 43219.8105] | [29376.6326, 44776.6205] | 23722.9119 | 0.0000 | 158102.2585 | 74.56% |
| heterogeneous-governance | 60 | 37140.190130 | 35898.409581 | 20187.708604 | 2606.221974 | [31925.1520, 42355.2283] | - | 24974.8812 | 0.0000 | 83515.8027 | 54.36% |
| asymmetric-treasury | 60 | 32579.380708 | 30040.139306 | 22380.965385 | 2889.370207 | [26797.7643, 38360.9971] | - | 30615.3419 | 0.0000 | 97904.6608 | 68.70% |
| specialized-daos | 60 | 55997.577260 | 50280.384987 | 30020.269595 | 3875.600140 | [48242.5193, 63752.6352] | [50664.2822, 67237.2302] | 33442.8901 | 0.0000 | 170117.5312 | 53.61% |
| isolated-daos | 60 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | [0.0000, 0.0000] | - | - | 0.0000 | 0.0000 | 0.00% |

#### ecosystem.Ecosystem Treasury Total

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| homogeneous-governance | 60 | 26715.858696 | 23971.647679 | 6000.852752 | 774.706759 | [25165.6741, 28266.0433] | - | 11653.8168 | 11999.0651 | 35967.4620 | 22.46% |
| heterogeneous-governance | 60 | 27303.625091 | 23998.515147 | 6039.368603 | 779.679134 | [25743.4907, 28863.7594] | - | 11928.9515 | 11999.5964 | 35994.5827 | 22.12% |
| asymmetric-treasury | 60 | 25552.114022 | 23947.203977 | 6777.144502 | 874.925593 | [23801.3920, 27302.8361] | - | 10543.1094 | 11945.5167 | 35968.4971 | 26.52% |
| specialized-daos | 60 | 27769.210972 | 23991.255724 | 6558.639477 | 846.716716 | [26074.9347, 29463.4872] | - | 12005.1864 | 11986.8734 | 36013.8567 | 23.62% |
| isolated-daos | 60 | 35868.438522 | 35958.416796 | 395.686149 | 51.082862 | [35766.2220, 35970.6551] | [35732.2892, 35953.9964] | 51.1505 | 34015.3098 | 36013.9136 | 1.10% |

#### dao-1.Proposal Pass Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| homogeneous-governance | 60 | 0.034793 | 0.000000 | 0.046132 | 0.005956 | [0.0229, 0.0467] | [0.0247, 0.0483] | 0.0635 | 0.0000 | 0.1765 | 132.59% |
| heterogeneous-governance | 60 | 0.045740 | 0.025000 | 0.054148 | 0.006990 | [0.0318, 0.0597] | - | 0.0769 | 0.0000 | 0.2105 | 118.38% |
| asymmetric-treasury | 60 | 0.057253 | 0.057190 | 0.041282 | 0.005329 | [0.0466, 0.0679] | - | 0.0521 | 0.0000 | 0.1538 | 72.10% |
| specialized-daos | 60 | 0.033399 | 0.030777 | 0.040739 | 0.005259 | [0.0229, 0.0439] | [0.0247, 0.0486] | 0.0507 | 0.0000 | 0.1667 | 121.97% |
| isolated-daos | 60 | 0.059808 | 0.054094 | 0.064562 | 0.008335 | [0.0431, 0.0765] | [0.0501, 0.0868] | 0.0920 | 0.0000 | 0.2727 | 107.95% |

#### dao-2.Proposal Pass Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| homogeneous-governance | 60 | 0.050503 | 0.047619 | 0.055933 | 0.007221 | [0.0361, 0.0650] | [0.0378, 0.0651] | 0.0804 | 0.0000 | 0.2222 | 110.75% |
| heterogeneous-governance | 60 | 0.043458 | 0.047619 | 0.045887 | 0.005924 | [0.0316, 0.0553] | - | 0.0785 | 0.0000 | 0.1667 | 105.59% |
| asymmetric-treasury | 60 | 0.040170 | 0.000000 | 0.051761 | 0.006682 | [0.0268, 0.0535] | [0.0338, 0.0622] | 0.0667 | 0.0000 | 0.2000 | 128.86% |
| specialized-daos | 60 | 0.085213 | 0.058824 | 0.074142 | 0.009572 | [0.0661, 0.1044] | - | 0.0865 | 0.0000 | 0.2667 | 87.01% |
| isolated-daos | 60 | 0.044863 | 0.044466 | 0.051494 | 0.006648 | [0.0316, 0.0582] | - | 0.0714 | 0.0000 | 0.1875 | 114.78% |

#### dao-3.Proposal Pass Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| homogeneous-governance | 60 | 0.047171 | 0.000000 | 0.064029 | 0.008266 | [0.0306, 0.0637] | [0.0328, 0.0629] | 0.0804 | 0.0000 | 0.2500 | 135.74% |
| heterogeneous-governance | 60 | 0.047713 | 0.043478 | 0.060958 | 0.007870 | [0.0320, 0.0635] | [0.0317, 0.0583] | 0.0714 | 0.0000 | 0.3333 | 127.76% |
| asymmetric-treasury | 60 | 0.040300 | 0.000000 | 0.068644 | 0.008862 | [0.0226, 0.0580] | [0.0210, 0.0518] | 0.0833 | 0.0000 | 0.3333 | 170.33% |
| specialized-daos | 60 | 0.035183 | 0.000000 | 0.051906 | 0.006701 | [0.0218, 0.0486] | [0.0216, 0.0515] | 0.0625 | 0.0000 | 0.2222 | 147.53% |
| isolated-daos | 60 | 0.046287 | 0.055556 | 0.048323 | 0.006239 | [0.0338, 0.0588] | [0.0375, 0.0637] | 0.0667 | 0.0000 | 0.2500 | 104.40% |

#### dao-1.Voter Participation Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| homogeneous-governance | 60 | 0.101472 | 0.094747 | 0.038630 | 0.004987 | [0.0915, 0.1115] | 0.0458 | 0.0067 | 0.1861 | 38.07% |
| heterogeneous-governance | 60 | 0.090351 | 0.087335 | 0.034316 | 0.004430 | [0.0815, 0.0992] | 0.0503 | 0.0100 | 0.1683 | 37.98% |
| asymmetric-treasury | 60 | 0.107861 | 0.110251 | 0.031957 | 0.004126 | [0.0996, 0.1161] | 0.0257 | 0.0301 | 0.1980 | 29.63% |
| specialized-daos | 60 | 0.095720 | 0.089579 | 0.033768 | 0.004359 | [0.0870, 0.1044] | 0.0413 | 0.0275 | 0.1925 | 35.28% |
| isolated-daos | 60 | 0.103387 | 0.099264 | 0.035780 | 0.004619 | [0.0941, 0.1126] | 0.0375 | 0.0271 | 0.2169 | 34.61% |

#### dao-2.Voter Participation Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| homogeneous-governance | 60 | 0.093736 | 0.092032 | 0.035748 | 0.004615 | [0.0845, 0.1030] | 0.0563 | 0.0217 | 0.1775 | 38.14% |
| heterogeneous-governance | 60 | 0.093297 | 0.088534 | 0.034586 | 0.004465 | [0.0844, 0.1022] | 0.0539 | 0.0346 | 0.1845 | 37.07% |
| asymmetric-treasury | 60 | 0.098669 | 0.088876 | 0.039486 | 0.005098 | [0.0885, 0.1089] | 0.0616 | 0.0305 | 0.1946 | 40.02% |
| specialized-daos | 60 | 0.098206 | 0.099800 | 0.028319 | 0.003656 | [0.0909, 0.1055] | 0.0354 | 0.0301 | 0.1655 | 28.84% |
| isolated-daos | 60 | 0.098713 | 0.092599 | 0.037122 | 0.004792 | [0.0891, 0.1083] | 0.0519 | 0.0354 | 0.1909 | 37.61% |

#### dao-3.Voter Participation Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| homogeneous-governance | 60 | 0.095744 | 0.092400 | 0.041451 | 0.005351 | [0.0850, 0.1065] | - | 0.0541 | 0.0111 | 0.2062 | 43.29% |
| heterogeneous-governance | 60 | 0.088434 | 0.087418 | 0.035490 | 0.004582 | [0.0793, 0.0976] | - | 0.0482 | 0.0221 | 0.1919 | 40.13% |
| asymmetric-treasury | 60 | 0.099156 | 0.101315 | 0.055415 | 0.007154 | [0.0848, 0.1135] | - | 0.0791 | 0.0036 | 0.2158 | 55.89% |
| specialized-daos | 60 | 0.117604 | 0.112419 | 0.048674 | 0.006284 | [0.1050, 0.1302] | - | 0.0606 | 0.0156 | 0.2273 | 41.39% |
| isolated-daos | 60 | 0.101661 | 0.096386 | 0.040338 | 0.005208 | [0.0912, 0.1121] | [0.0889, 0.1052] | 0.0442 | 0.0220 | 0.2671 | 39.68% |

#### dao-1.Final Treasury

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| homogeneous-governance | 60 | 8439.321200 | 10206.428343 | 4986.189816 | 643.714337 | [7151.2518, 9727.3906] | [7425.7077, 9770.4099] | 4816.3815 | 0.0000 | 12046.1360 | 59.08% |
| heterogeneous-governance | 60 | 9630.021660 | 11961.442579 | 4168.131074 | 538.103408 | [8553.2792, 10706.7641] | [8301.3025, 10480.8880] | 1930.3988 | 0.0000 | 12046.1382 | 43.28% |
| asymmetric-treasury | 60 | 10755.307172 | 11989.917858 | 3623.235666 | 467.757713 | [9819.3262, 11691.2882] | [9784.3622, 11585.5989] | 36.3467 | 0.0000 | 12021.8553 | 33.69% |
| specialized-daos | 60 | 9512.497480 | 11965.076634 | 4364.903235 | 563.506585 | [8384.9234, 10640.0716] | [8590.4996, 10656.8157] | 1943.8763 | 0.0000 | 12013.8566 | 45.89% |
| isolated-daos | 60 | 11984.424659 | 11995.895977 | 18.179413 | 2.346952 | [11979.7284, 11989.1209] | - | 31.0452 | 11942.6282 | 12004.9686 | 0.15% |

#### dao-2.Final Treasury

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| homogeneous-governance | 60 | 8706.886341 | 10184.155725 | 4719.184509 | 609.244100 | [7487.7917, 9925.9810] | [7351.4770, 9861.9512] | 2887.7329 | 0.0000 | 12000.6974 | 54.20% |
| heterogeneous-governance | 60 | 8114.738987 | 10052.081617 | 5017.023415 | 647.694938 | [6818.7044, 9410.7736] | - | 11995.0915 | 0.0000 | 12011.0643 | 61.83% |
| asymmetric-treasury | 60 | 8639.557478 | 10178.367803 | 4746.131314 | 612.722918 | [7413.5018, 9865.6132] | [7450.2681, 9641.3991] | 2789.6882 | 0.0000 | 12030.7367 | 54.93% |
| specialized-daos | 60 | 10269.554105 | 11976.620511 | 3830.131201 | 494.467812 | [9280.1263, 11258.9819] | [9412.0454, 11235.3200] | 1794.2195 | 0.0000 | 12025.6197 | 37.30% |
| isolated-daos | 60 | 11925.774427 | 11989.882825 | 326.005574 | 42.087139 | [11841.5583, 12009.9906] | [11842.8143, 11986.0431] | 25.6887 | 10065.9971 | 12022.1816 | 2.73% |

#### dao-3.Final Treasury

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| homogeneous-governance | 60 | 9569.651156 | 11950.820780 | 4142.286133 | 534.766840 | [8499.5852, 10639.7171] | [8775.4782, 10751.3297] | 1934.2385 | 0.0000 | 12008.3210 | 43.29% |
| heterogeneous-governance | 60 | 9558.864444 | 11967.101322 | 4177.073931 | 539.257926 | [8479.8118, 10637.9171] | [9040.6852, 10859.0762] | 1998.3554 | 0.0000 | 12022.6389 | 43.70% |
| asymmetric-treasury | 60 | 6157.249372 | 9999.999999 | 5085.609493 | 656.549362 | [4843.4971, 7471.0016] | - | 10045.4775 | 0.0000 | 12000.0000 | 82.60% |
| specialized-daos | 60 | 7987.159387 | 10062.017742 | 5137.425647 | 663.238799 | [6660.0216, 9314.2972] | - | 11987.6764 | 0.0000 | 12000.0671 | 64.32% |
| isolated-daos | 60 | 11958.239437 | 11999.817375 | 235.559397 | 30.410587 | [11897.3880, 12019.0909] | [11839.8077, 11993.2775] | 26.4419 | 10171.4041 | 12032.3334 | 1.97% |

#### dao-1.Treasury Growth Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| homogeneous-governance | 60 | -0.175478 | -0.162450 | 0.036662 | 0.004733 | [-0.1849, -0.1660] | [-0.1835, -0.1656] | 0.0351 | -0.2396 | -0.1477 | 20.89% |
| heterogeneous-governance | 60 | -0.166540 | -0.150251 | 0.030427 | 0.003928 | [-0.1744, -0.1587] | [-0.1736, -0.1580] | 0.0144 | -0.2382 | -0.1473 | 18.27% |
| asymmetric-treasury | 60 | -0.760909 | -0.758387 | 0.007569 | 0.000977 | [-0.7629, -0.7590] | [-0.7629, -0.7591] | 0.0004 | -0.7836 | -0.7578 | 0.99% |
| specialized-daos | 60 | -0.166287 | -0.148931 | 0.032074 | 0.004141 | [-0.1746, -0.1580] | [-0.1748, -0.1582] | 0.0140 | -0.2373 | -0.1465 | 19.29% |
| isolated-daos | 60 | -0.149586 | -0.149606 | 0.000878 | 0.000113 | [-0.1498, -0.1494] | - | 0.0013 | -0.1517 | -0.1470 | 0.59% |

#### dao-2.Treasury Growth Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| homogeneous-governance | 60 | -0.173566 | -0.162061 | 0.034715 | 0.004482 | [-0.1825, -0.1646] | [-0.1841, -0.1658] | 0.0205 | -0.2384 | -0.1481 | 20.00% |
| heterogeneous-governance | 60 | -0.177848 | -0.162718 | 0.036728 | 0.004742 | [-0.1873, -0.1684] | - | 0.0855 | -0.2390 | -0.1478 | 20.65% |
| asymmetric-treasury | 60 | -0.175109 | -0.162628 | 0.034916 | 0.004508 | [-0.1841, -0.1661] | [-0.1846, -0.1681] | 0.0196 | -0.2400 | -0.1492 | 19.94% |
| specialized-daos | 60 | -0.484284 | -0.477028 | 0.017285 | 0.002231 | [-0.4887, -0.4798] | [-0.4879, -0.4792] | 0.0084 | -0.5318 | -0.4743 | 3.57% |
| isolated-daos | 60 | -0.149863 | -0.149476 | 0.002530 | 0.000327 | [-0.1505, -0.1492] | [-0.1504, -0.1493] | 0.0011 | -0.1644 | -0.1478 | 1.69% |

#### dao-3.Treasury Growth Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| homogeneous-governance | 60 | -0.167468 | -0.151213 | 0.030320 | 0.003914 | [-0.1753, -0.1596] | [-0.1726, -0.1590] | 0.0147 | -0.2382 | -0.1483 | 18.10% |
| heterogeneous-governance | 60 | -0.167130 | -0.150406 | 0.030743 | 0.003969 | [-0.1751, -0.1592] | [-0.1711, -0.1571] | 0.0152 | -0.2396 | -0.1474 | 18.39% |
| asymmetric-treasury | 60 | 0.625829 | 0.681502 | 0.075260 | 0.009716 | [0.6064, 0.6453] | - | 0.1486 | 0.5319 | 0.7138 | 12.03% |
| specialized-daos | 60 | -0.058395 | -0.040484 | 0.043209 | 0.005578 | [-0.0696, -0.0472] | - | 0.0990 | -0.1271 | -0.0234 | 73.99% |
| isolated-daos | 60 | -0.149769 | -0.149489 | 0.001968 | 0.000254 | [-0.1503, -0.1493] | [-0.1506, -0.1494] | 0.0010 | -0.1635 | -0.1478 | 1.31% |

---

*Report generated by DAO Simulator Research Quality Report Generator*
