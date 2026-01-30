# DAO Simulation Research Quality Report

**Generated:** 2026-01-30
**Results Directory:** 06-treasury-resilience

---

## Executive Summary

**Experiment:** 06-treasury-resilience
**Total Runs:** 300
**Runs per Configuration:** 25
**Sweep Values:** treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1, treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2, treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1, treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2, treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1, treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2, treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1, treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2, treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1, treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2, treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1, treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2
**Statistical Power:** 44%
**Metrics Analyzed:** 7

### Overall Quality Assessment

❌ **Issues Detected** - 3 critical issue(s), 1 warning(s).

### Key Statistics

| Aspect | Value |
|--------|-------|
| Significant Effects | 4 of 7 metrics |
| Critical Issues | 3 |
| Warnings | 1 |
| Minimum Effect Detectable | d = 0.792 |

## Key Findings

1. **Treasury Volatility**: Significant effect (F=93.3, p<0.001). Ranges from 0.1738 (at Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2) to 0.5076 (at Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2).

2. **Final Treasury**: Significant effect (F=12.3, p<0.001). Ranges from 10030.1411 (at Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2) to 37253.6282 (at Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2).

3. **Treasury Growth Rate**: Significant effect (F=10.0, p<0.001). Ranges from -0.7416 (at Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2) to -0.2265 (at Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2).

4. **Treasury Trend**: Significant effect (F=3.0, p<0.001). Ranges from -2.3041 (at Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2) to 9.4785 (at Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2).

5. 3 metrics showed no significant variation across Sweep Value values.

## Methodology

### Experimental Design

- **Design Type:** Parameter sweep study
- **Independent Variable:** Sweep Value (12 levels: treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1, treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2, treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1, treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2, treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1, treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2, treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1, treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2, treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1, treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2, treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1, treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2)
- **Dependent Variables:** 7 governance metrics
- **Replication:** 25 simulation runs per configuration
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

### Basic Outcome

| Metric | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|------|------|------|------|-------------|--------|
| Proposal Pass Rate | 0.0841 | 0.0737 | 0.0773 | 0.0857 | 0.0862 | 0.0814 | 0.0928 | 0.0780 | 0.0860 | 0.0894 | 0.0784 | 0.0812 |  | -0.69 |
| Final Treasury | 10031 | 10030 | 11982 | 11880 | 13603 | 13392 | 22590 | 25683 | 25308 | 29479 | 31563 | 37254 | ✓ | -22.00 |
| Final Token Price | 3.6954 | 2.1471 | 2.8153 | 3.4119 | 2.7506 | 2.7256 | 2.6451 | 5.9902 | 2.8189 | 2.9876 | 11.5999 | 8.3296 |  | -0.68 |

### Governance Efficiency

| Metric | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|------|------|------|------|-------------|--------|
| Quorum Reach Rate | 0.3274 | 0.3135 | 0.3279 | 0.3276 | 0.3357 | 0.3315 | 0.3471 | 0.3467 | 0.3467 | 0.3288 | 0.3420 | 0.3434 |  | -0.91 |

### Economic Health

| Metric | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|------|------|------|------|-------------|--------|
| Treasury Volatility | 0.1779 | 0.1738 | 0.1884 | 0.1945 | 0.2350 | 0.2392 | 0.4675 | 0.5076 | 0.4702 | 0.4552 | 0.4864 | 0.4795 | ✓ | -6.03 |
| Treasury Growth Rate | -0.7396 | -0.7416 | -0.7141 | -0.7118 | -0.6935 | -0.6906 | -0.5337 | -0.4686 | -0.4751 | -0.3826 | -0.3566 | -0.2265 | ✓ | -2.64 |

### Temporal Dynamics

| Metric | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|------|------|------|------|-------------|--------|
| Treasury Trend | -0.7411 | -0.7113 | -1.0089 | -0.8898 | -1.6070 | -1.2161 | 1.7812 | -2.3041 | 1.0978 | 2.9026 | 4.8925 | 9.4785 | ✓ | 1.69 |

## Distribution Quality Analysis

This section identifies metrics with distribution characteristics that may affect statistical validity.

### High Variability Metrics (CV > 50%)

| Metric | Sweep Value | Mean | Std | CV | Issue |
|--------|-------------|------|-----|----|----|
| Treasury Growth Rate | treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -0.5337 | 0.2977 | 55.8% | 🟡 Warning |
| Treasury Growth Rate | treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -0.4686 | 0.3133 | 66.9% | 🟡 Warning |
| Treasury Growth Rate | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -0.4751 | 0.3343 | 70.4% | 🟡 Warning |
| Treasury Growth Rate | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -0.3826 | 0.4260 | 111.3% | 🔴 Critical |
| Treasury Growth Rate | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -0.3566 | 0.4555 | 127.7% | 🔴 Critical |
| Treasury Growth Rate | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -0.2265 | 0.5101 | 225.2% | 🔴 Critical |
| Final Treasury | treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 22589.9896 | 15029.6064 | 66.5% | 🟡 Warning |
| Final Treasury | treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 25682.8943 | 15337.6406 | 59.7% | 🟡 Warning |
| Final Treasury | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 25308.1244 | 16048.4778 | 63.4% | 🟡 Warning |
| Final Treasury | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 29478.7446 | 19763.2382 | 67.0% | 🟡 Warning |
| Final Treasury | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 31562.8253 | 22643.4967 | 71.7% | 🟡 Warning |
| Final Treasury | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 37253.6282 | 24440.5927 | 65.6% | 🟡 Warning |
| Treasury Trend | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -1.6070 | 0.8179 | 50.9% | 🟡 Warning |
| Treasury Trend | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -1.2161 | 0.9712 | 79.9% | 🟡 Warning |
| Treasury Trend | treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 1.7812 | 10.6220 | 596.3% | 🔴 Critical |
| Treasury Trend | treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -2.3041 | 16.3226 | 708.4% | 🔴 Critical |
| Treasury Trend | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 1.0978 | 11.2877 | 1028.2% | 🔴 Critical |
| Treasury Trend | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 2.9026 | 14.6589 | 505.0% | 🔴 Critical |
| Treasury Trend | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 4.8925 | 15.1811 | 310.3% | 🔴 Critical |
| Treasury Trend | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 9.4785 | 13.9427 | 147.1% | 🔴 Critical |
| Final Token Price | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 3.6954 | 4.7652 | 128.9% | 🔴 Critical |
| Final Token Price | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 2.1471 | 1.3357 | 62.2% | 🟡 Warning |
| Final Token Price | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 2.8153 | 3.2975 | 117.1% | 🔴 Critical |
| Final Token Price | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 3.4119 | 4.8003 | 140.7% | 🔴 Critical |
| Final Token Price | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 2.7506 | 2.5917 | 94.2% | 🟡 Warning |
| Final Token Price | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 2.7256 | 2.2152 | 81.3% | 🟡 Warning |
| Final Token Price | treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 2.6451 | 2.4318 | 91.9% | 🟡 Warning |
| Final Token Price | treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 5.9902 | 15.7669 | 263.2% | 🔴 Critical |
| Final Token Price | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 2.8189 | 2.8978 | 102.8% | 🔴 Critical |
| Final Token Price | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 2.9876 | 3.4244 | 114.6% | 🔴 Critical |
| Final Token Price | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 11.5999 | 43.0384 | 371.0% | 🔴 Critical |
| Final Token Price | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 8.3296 | 12.8445 | 154.2% | 🔴 Critical |

### Non-Symmetric Distributions

Metrics where mean and median diverge significantly, suggesting skewed distributions:

| Metric | Sweep Value | Mean | Median | Skew Indicator |
|--------|-------------|------|--------|----------------|
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -0.7396 | -0.7491 | Right-skewed (0.92) |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -0.7416 | -0.7494 | Right-skewed (0.61) |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -0.7141 | -0.7204 | Right-skewed (0.55) |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -0.7118 | -0.7203 | Right-skewed (0.53) |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 13602.6951 | 14030.5091 | Left-skewed (-0.51) |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 13392.0408 | 14029.7105 | Left-skewed (-0.56) |
| Final Treasury | treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 31562.8253 | 19268.8872 | Right-skewed (0.54) |

### Constant/Zero Metrics

Metrics with no variance (may indicate unimplemented features or degenerate cases):

| Metric | Value | Note |
|--------|-------|------|
| (none) | - | - |

## Treasury Distribution Deep Dive

The treasury shows high variability which warrants special attention.

### Treasury Statistics by Sweep Value

| Sweep Value | Mean | Median | Std | CV | Min | Max | 95% CI |
|--------|------|--------|-----|----|----|-----|--------|
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 10031 | 10030 | 4 | 0.0% | 10024 | 10040 | [10029, 10032] |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 10030 | 10030 | 2 | 0.0% | 10027 | 10036 | [10029, 10031] |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 11982 | 12030 | 125 | 1.0% | 11549 | 12039 | [11930, 12033] |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 11880 | 12030 | 451 | 3.8% | 10292 | 12043 | [11694, 12066] |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 13603 | 14031 | 839 | 6.2% | 11305 | 14041 | [13256, 13949] |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 13392 | 14030 | 1142 | 8.5% | 10407 | 14047 | [12920, 13864] |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 22590 | 18669 | 15030 | 66.5% | 9547 | 68119 | [16386, 28794] |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 25683 | 22124 | 15338 | 59.7% | 10216 | 66669 | [19352, 32014] |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 25308 | 21061 | 16048 | 63.4% | 9192 | 66000 | [18684, 31933] |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 29479 | 27190 | 19763 | 67.0% | 9151 | 67776 | [21321, 37637] |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 31563 | 19269 | 22643 | 71.7% | 9884 | 69210 | [22216, 40910] |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 37254 | 34361 | 24441 | 65.6% | 9206 | 97705 | [27165, 47342] |

### Treasury Distribution Analysis

### Related Treasury Metrics

| Metric | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | Sweep Value=treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 |
|--------|------|------|------|------|------|------|------|------|------|------|------|------|
| Treasury Volatility | 0.1779 | 0.1738 | 0.1884 | 0.1945 | 0.2350 | 0.2392 | 0.4675 | 0.5076 | 0.4702 | 0.4552 | 0.4864 | 0.4795 |
| Treasury Growth Rate | -0.7396 | -0.7416 | -0.7141 | -0.7118 | -0.6935 | -0.6906 | -0.5337 | -0.4686 | -0.4751 | -0.3826 | -0.3566 | -0.2265 |
| Treasury Trend | -0.74 | -0.71 | -1.01 | -0.89 | -1.61 | -1.22 | 1.78 | -2.30 | 1.10 | 2.90 | 4.89 | 9.48 |

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
| Treasury Volatility | 93.29 | (11, 288) | <0.001 | ✓ **Yes** |
| Final Treasury | 12.29 | (11, 288) | <0.001 | ✓ **Yes** |
| Treasury Growth Rate | 9.97 | (11, 288) | <0.001 | ✓ **Yes** |
| Treasury Trend | 3.03 | (11, 288) | <0.001 | ✓ **Yes** |
| Quorum Reach Rate | 1.66 | (11, 288) | 0.0811 | No |
| Proposal Pass Rate | 1.07 | (11, 288) | 0.3896 | No |
| Final Token Price | 1.06 | (11, 288) | 0.3929 | No |

### Pairwise Comparisons (Significant Metrics Only)

| Metric | Comparison | t-statistic | Cohen's d | Effect Size |
|--------|------------|-------------|-----------|-------------|
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -2.58 | -0.73 | medium |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -2.91 | -0.82 | large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -5.98 | -1.69 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -6.77 | -1.91 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -14.55 | -4.12 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -14.75 | -4.17 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -12.28 | -3.47 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -21.31 | -6.03 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -12.20 | -3.45 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -18.85 | -5.33 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -3.14 | -0.89 | large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -3.38 | -0.96 | large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -6.24 | -1.76 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -7.01 | -1.98 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -14.67 | -4.15 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -14.86 | -4.20 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -12.40 | -3.51 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -21.31 | -6.03 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -12.32 | -3.48 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -18.92 | -5.35 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -4.53 | -1.28 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -5.17 | -1.46 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -13.78 | -3.90 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -14.08 | -3.98 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -11.69 | -3.31 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -19.68 | -5.57 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -11.66 | -3.30 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -17.71 | -5.01 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -3.67 | -1.04 | large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -4.22 | -1.19 | large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -13.22 | -3.74 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -13.60 | -3.85 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -11.29 | -3.19 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -18.45 | -5.22 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -11.28 | -3.19 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -16.84 | -4.76 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -10.56 | -2.99 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -11.24 | -3.18 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -9.19 | -2.60 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -13.71 | -3.88 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -9.32 | -2.64 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -13.17 | -3.72 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -10.47 | -2.96 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -11.15 | -3.15 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -9.09 | -2.57 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -13.68 | -3.87 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -9.22 | -2.61 | very_large |
| Treasury Volatility | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -13.11 | -3.71 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -8.26 | -2.34 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -7.23 | -2.04 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -9.34 | -2.64 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -6.82 | -1.93 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -3.46 | -0.98 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -4.32 | -1.22 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -3.96 | -1.12 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -4.19 | -1.18 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -4.20 | -1.19 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -5.03 | -1.42 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -8.01 | -2.27 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -7.22 | -2.04 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -9.33 | -2.64 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -6.94 | -1.96 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -3.49 | -0.99 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -4.35 | -1.23 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -3.98 | -1.13 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -4.21 | -1.19 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -4.22 | -1.19 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -5.05 | -1.43 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -4.10 | -1.16 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -3.24 | -0.92 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -3.03 | -0.86 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -3.92 | -1.11 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -3.57 | -1.01 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -3.89 | -1.10 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -3.92 | -1.11 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -4.78 | -1.35 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -3.32 | -0.94 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -2.79 | -0.79 | medium |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -2.99 | -0.85 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -3.88 | -1.10 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -3.54 | -1.00 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -3.86 | -1.09 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -3.90 | -1.10 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -4.75 | -1.34 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -2.68 | -0.76 | medium |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -3.58 | -1.01 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -3.26 | -0.92 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -3.64 | -1.03 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -3.69 | -1.04 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -4.57 | -1.29 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -2.62 | -0.74 | medium |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -3.52 | -1.00 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -3.21 | -0.91 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -3.60 | -1.02 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -3.66 | -1.03 | large |
| Treasury Growth Rate | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -4.54 | -1.28 | very_large |
| Treasury Growth Rate | treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -2.60 | -0.74 | medium |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -77.73 | -21.98 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -20.51 | -5.80 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -21.29 | -6.02 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -14.71 | -4.16 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -4.18 | -1.18 | large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -5.10 | -1.44 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -4.76 | -1.35 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -4.92 | -1.39 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -4.75 | -1.34 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -5.57 | -1.58 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -77.78 | -22.00 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -20.52 | -5.80 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -21.30 | -6.02 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -14.71 | -4.16 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -4.18 | -1.18 | large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -5.10 | -1.44 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -4.76 | -1.35 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -4.92 | -1.39 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -4.75 | -1.34 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -5.57 | -1.58 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -9.56 | -2.70 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -6.14 | -1.74 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -3.53 | -1.00 | large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -4.47 | -1.26 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -4.15 | -1.17 | large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -4.43 | -1.25 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -4.32 | -1.22 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -5.17 | -1.46 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -9.05 | -2.56 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -6.16 | -1.74 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -3.56 | -1.01 | large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -4.50 | -1.27 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -4.18 | -1.18 | large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -4.45 | -1.26 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -4.35 | -1.23 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -5.19 | -1.47 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -2.99 | -0.84 | large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -3.93 | -1.11 | large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -3.64 | -1.03 | large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -4.01 | -1.14 | large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -3.96 | -1.12 | large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -4.84 | -1.37 | very_large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | -3.05 | -0.86 | large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | -4.00 | -1.13 | large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | -3.70 | -1.05 | large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | -4.06 | -1.15 | large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | -4.01 | -1.13 | large |
| Final Treasury | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -4.88 | -1.38 | very_large |
| Final Treasury | treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -2.56 | -0.72 | medium |
| Treasury Trend | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 5.57 | 1.57 | very_large |
| Treasury Trend | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 5.29 | 1.50 | very_large |
| Treasury Trend | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -3.66 | -1.04 | large |
| Treasury Trend | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 5.99 | 1.69 | very_large |
| Treasury Trend | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 5.46 | 1.54 | very_large |
| Treasury Trend | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 2.59 | 0.73 | medium |
| Treasury Trend | treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -3.65 | -1.03 | large |
| Treasury Trend | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 3.51 | 0.99 | large |
| Treasury Trend | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -3.76 | -1.06 | large |
| Treasury Trend | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 4.02 | 1.14 | large |
| Treasury Trend | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -3.72 | -1.05 | large |
| Treasury Trend | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -3.97 | -1.12 | large |
| Treasury Trend | treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -3.83 | -1.08 | large |
| Treasury Trend | treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 vs treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | -2.74 | -0.78 | medium |

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

- **Treasury Growth Rate**: Very high variability (CV=225.2%). Distribution may be non-normal or parameter has high stochasticity. Non-symmetric distribution at sweep=treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 (mean=-0.7396, median=-0.7491). Consider bootstrap CI. Very large effect size (d=-2.64). This metric is highly sensitive to the sweep parameter.
- **Treasury Trend**: Very high variability (CV=1028.2%). Distribution may be non-normal or parameter has high stochasticity. Very large effect size (d=1.69). This metric is highly sensitive to the sweep parameter.
- **Final Token Price**: Very high variability (CV=371.0%). Distribution may be non-normal or parameter has high stochasticity.

#### Warnings (Should Address)

- **Final Treasury**: High variability (CV=71.7%). Consider more runs or controlled conditions.

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

#### Treasury Volatility

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 25 | 0.177925 | 0.177350 | 0.005419 | 0.001084 | [0.1757, 0.1802] | [0.1761, 0.1797] | 0.0053 | 0.1654 | 0.1866 | 3.05% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 25 | 0.173800 | 0.178053 | 0.012482 | 0.002496 | [0.1686, 0.1790] | [0.1666, 0.1772] | 0.0192 | 0.1398 | 0.1868 | 7.18% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 25 | 0.188443 | 0.190596 | 0.019665 | 0.003933 | [0.1803, 0.1966] | [0.1818, 0.1973] | 0.0249 | 0.1441 | 0.2136 | 10.44% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 25 | 0.194539 | 0.204981 | 0.028028 | 0.005606 | [0.1830, 0.2061] | [0.1852, 0.2056] | 0.0454 | 0.1434 | 0.2268 | 14.41% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 25 | 0.235009 | 0.244777 | 0.047429 | 0.009486 | [0.2154, 0.2546] | [0.2242, 0.2600] | 0.0605 | 0.1428 | 0.3134 | 20.18% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 25 | 0.239241 | 0.257432 | 0.044990 | 0.008998 | [0.2207, 0.2578] | [0.2185, 0.2522] | 0.0634 | 0.1363 | 0.3170 | 18.81% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 25 | 0.467531 | 0.471168 | 0.099347 | 0.019869 | [0.4265, 0.5085] | [0.4438, 0.5210] | 0.1125 | 0.2505 | 0.7550 | 21.25% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 25 | 0.507641 | 0.504038 | 0.111634 | 0.022327 | [0.4616, 0.5537] | [0.4587, 0.5496] | 0.1356 | 0.2499 | 0.7639 | 21.99% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 25 | 0.470193 | 0.460128 | 0.118855 | 0.023771 | [0.4211, 0.5193] | [0.4368, 0.5289] | 0.1202 | 0.2709 | 0.8292 | 25.28% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 25 | 0.455236 | 0.466810 | 0.064852 | 0.012970 | [0.4285, 0.4820] | [0.4266, 0.4824] | 0.1013 | 0.3247 | 0.6179 | 14.25% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 25 | 0.486430 | 0.481210 | 0.126285 | 0.025257 | [0.4343, 0.5386] | [0.4421, 0.5590] | 0.0665 | 0.2080 | 0.8803 | 25.96% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 25 | 0.479530 | 0.486918 | 0.079816 | 0.015963 | [0.4466, 0.5125] | [0.4224, 0.5046] | 0.0752 | 0.2564 | 0.6346 | 16.64% |

#### Treasury Growth Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 25 | -0.739614 | -0.749146 | 0.010346 | 0.002069 | [-0.7439, -0.7353] | [-0.7429, -0.7339] | 0.0203 | -0.7494 | -0.7288 | 1.40% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 25 | -0.741589 | -0.749371 | 0.012755 | 0.002551 | [-0.7469, -0.7363] | [-0.7449, -0.7338] | 0.0278 | -0.7495 | -0.7215 | 1.72% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 25 | -0.714117 | -0.720371 | 0.011457 | 0.002291 | [-0.7188, -0.7094] | [-0.7189, -0.7108] | 0.0231 | -0.7316 | -0.6971 | 1.60% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 25 | -0.711810 | -0.720339 | 0.016210 | 0.003242 | [-0.7185, -0.7051] | [-0.7195, -0.7070] | 0.0309 | -0.7352 | -0.6892 | 2.28% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 25 | -0.693451 | -0.695152 | 0.022437 | 0.004487 | [-0.7027, -0.6842] | [-0.7034, -0.6864] | 0.0279 | -0.7545 | -0.6690 | 3.24% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 25 | -0.690579 | -0.694793 | 0.034446 | 0.006889 | [-0.7048, -0.6764] | [-0.7040, -0.6801] | 0.0379 | -0.7739 | -0.6613 | 4.99% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 25 | -0.533683 | -0.626827 | 0.297663 | 0.059533 | [-0.6566, -0.4108] | [-0.6431, -0.4577] | 0.3611 | -0.8022 | 0.3616 | 55.78% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 25 | -0.468590 | -0.557926 | 0.313321 | 0.062664 | [-0.5979, -0.3393] | [-0.6276, -0.3819] | 0.4242 | -0.7879 | 0.3324 | 66.86% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 25 | -0.475054 | -0.577248 | 0.334299 | 0.066860 | [-0.6130, -0.3371] | [-0.5855, -0.3503] | 0.3812 | -0.8163 | 0.4659 | 70.37% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 25 | -0.382647 | -0.412866 | 0.425960 | 0.085192 | [-0.5585, -0.2068] | [-0.5942, -0.3218] | 0.5948 | -0.8171 | 0.4144 | 111.32% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 25 | -0.356588 | -0.572040 | 0.455451 | 0.091090 | [-0.5446, -0.1686] | [-0.5189, -0.1239] | 0.7431 | -0.8024 | 0.3834 | 127.72% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 25 | -0.226483 | -0.313151 | 0.510082 | 0.102016 | [-0.4370, -0.0159] | [-0.3589, 0.0142] | 0.7845 | -0.7955 | 0.9530 | 225.22% |

#### Final Treasury

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 25 | 10030.864054 | 10030.210115 | 3.545076 | 0.709015 | [10029.4007, 10032.3274] | [10029.7046, 10032.6482] | 1.5945 | 10024.3621 | 10039.7114 | 0.04% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 25 | 10030.141056 | 10029.960199 | 1.974828 | 0.394966 | [10029.3259, 10030.9562] | [10029.4773, 10031.2943] | 1.4066 | 10026.6034 | 10035.7102 | 0.02% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 25 | 11981.710729 | 12029.804691 | 125.441516 | 25.088303 | [11929.9310, 12033.4904] | [11943.9770, 12029.3278] | 3.8973 | 11548.6612 | 12039.3069 | 1.05% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 25 | 11879.831654 | 12029.773894 | 450.772309 | 90.154462 | [11693.7620, 12065.9013] | [11683.3952, 12030.9476] | 2.6844 | 10291.9145 | 12043.0479 | 3.79% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 25 | 13602.695075 | 14030.509135 | 838.755162 | 167.751032 | [13256.4740, 13948.9162] | [12935.4174, 13696.0042] | 161.2986 | 11305.0922 | 14041.2726 | 6.17% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 25 | 13392.040777 | 14029.710540 | 1142.478523 | 228.495705 | [12920.4488, 13863.6327] | [12952.6423, 13786.0902] | 1429.3753 | 10407.2068 | 14047.3081 | 8.53% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 25 | 22589.989614 | 18668.986531 | 15029.606433 | 3005.921287 | [16386.0730, 28793.9062] | [16696.9344, 26062.6941] | 18654.3926 | 9547.4978 | 68118.5931 | 66.53% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 25 | 25682.894336 | 22123.779494 | 15337.640575 | 3067.528115 | [19351.8275, 32013.9612] | [18079.7948, 29880.5415] | 21224.1837 | 10216.0006 | 66669.3437 | 59.72% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 25 | 25308.124420 | 21060.604943 | 16048.477783 | 3209.695557 | [18683.6384, 31932.6105] | [20764.0308, 31766.8327] | 19533.1577 | 9191.8249 | 65999.8375 | 63.41% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 25 | 29478.744567 | 27189.975179 | 19763.238186 | 3952.647637 | [21320.8808, 37636.6083] | [19686.1877, 32548.1237] | 29756.5536 | 9150.9282 | 67776.4060 | 67.04% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 25 | 31562.825322 | 19268.887194 | 22643.496744 | 4528.699349 | [22216.0493, 40909.6014] | [23314.9110, 43343.0078] | 37176.2275 | 9883.7348 | 69210.2114 | 71.74% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 25 | 37253.628236 | 34361.470944 | 24440.592709 | 4888.118542 | [27165.0474, 47342.2091] | [30969.7323, 48150.4789] | 38688.6553 | 9205.8954 | 97705.2778 | 65.61% |

#### Treasury Trend

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 25 | -0.741053 | -0.741980 | 0.024219 | 0.004844 | [-0.7510, -0.7311] | [-0.7480, -0.7310] | 0.0241 | -0.7859 | -0.6930 | 3.27% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 25 | -0.711286 | -0.699867 | 0.066087 | 0.013217 | [-0.7386, -0.6840] | [-0.7305, -0.6731] | 0.0967 | -0.7859 | -0.5281 | 9.29% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 25 | -1.008941 | -1.051986 | 0.239422 | 0.047884 | [-1.1078, -0.9101] | [-1.1039, -0.9102] | 0.3598 | -1.4511 | -0.5630 | 23.73% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 25 | -0.889804 | -0.860443 | 0.356614 | 0.071323 | [-1.0370, -0.7426] | [-1.0692, -0.7773] | 0.3117 | -1.8417 | -0.0121 | 40.08% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 25 | -1.607048 | -1.506099 | 0.817883 | 0.163577 | [-1.9447, -1.2694] | [-1.9526, -1.4131] | 0.9987 | -3.6493 | -0.0347 | 50.89% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 25 | -1.216083 | -1.005534 | 0.971225 | 0.194245 | [-1.6170, -0.8152] | [-1.5821, -0.8188] | 1.4968 | -3.2548 | 0.3255 | 79.87% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 25 | 1.781188 | -0.044314 | 10.621975 | 2.124395 | [-2.6033, 6.1657] | [-4.1452, 3.0522] | 10.8635 | -21.3736 | 27.5372 | 596.34% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 25 | -2.304142 | -1.402681 | 16.322563 | 3.264513 | [-9.0418, 4.4335] | [-7.8660, 5.1148] | 16.9154 | -32.7150 | 29.6276 | 708.40% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 25 | 1.097801 | -0.926841 | 11.287698 | 2.257540 | [-3.5615, 5.7571] | [-3.0750, 5.1015] | 9.2333 | -26.3654 | 28.1353 | 1028.21% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 25 | 2.902633 | -0.039694 | 14.658923 | 2.931785 | [-3.1483, 8.9535] | [-5.9852, 3.9647] | 17.5497 | -31.8433 | 28.3270 | 505.02% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 25 | 4.892451 | 1.865624 | 15.181118 | 3.036224 | [-1.3740, 11.1589] | [0.1219, 12.1209] | 14.1376 | -21.7882 | 30.2103 | 310.30% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 25 | 9.478458 | 9.279290 | 13.942743 | 2.788549 | [3.7232, 15.2337] | [3.8277, 14.2798] | 26.5548 | -9.4839 | 30.6481 | 147.10% |

#### Final Token Price

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 25 | 3.695380 | 2.294561 | 4.765177 | 0.953035 | [1.7284, 5.6623] | [2.1494, 5.3626] | 2.1171 | 0.9982 | 20.5721 | 128.95% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 25 | 2.147098 | 1.551424 | 1.335664 | 0.267133 | [1.5958, 2.6984] | [1.5954, 2.5358] | 1.0550 | 1.0261 | 6.0643 | 62.21% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 25 | 2.815289 | 1.577946 | 3.297499 | 0.659500 | [1.4541, 4.1764] | [1.7277, 4.5819] | 1.1146 | 0.9347 | 15.8135 | 117.13% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 25 | 3.411873 | 1.448465 | 4.800350 | 0.960070 | [1.4304, 5.3934] | [2.0976, 6.2796] | 1.2597 | 0.9718 | 20.5812 | 140.70% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 25 | 2.750629 | 1.780282 | 2.591669 | 0.518334 | [1.6808, 3.8204] | [1.9484, 3.8921] | 1.0133 | 1.0308 | 12.0273 | 94.22% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 25 | 2.725560 | 1.995583 | 2.215190 | 0.443038 | [1.8112, 3.6399] | [1.8836, 3.7016] | 2.2079 | 0.9205 | 9.2021 | 81.27% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 25 | 2.645112 | 1.640441 | 2.431771 | 0.486354 | [1.6413, 3.6489] | [1.8848, 3.7544] | 1.4022 | 0.9575 | 10.6833 | 91.93% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 25 | 5.990177 | 1.893960 | 15.766907 | 3.153381 | [-0.5181, 12.4984] | [2.2815, 15.5261] | 1.8282 | 1.0682 | 80.3594 | 263.21% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 25 | 2.818928 | 1.585012 | 2.897836 | 0.579567 | [1.6228, 4.0151] | [1.8786, 3.8015] | 1.3043 | 0.9808 | 12.4684 | 102.80% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 25 | 2.987567 | 1.859723 | 3.424434 | 0.684887 | [1.5740, 4.4011] | [1.7546, 3.2308] | 1.3154 | 0.9196 | 17.3679 | 114.62% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 25 | 11.599851 | 2.320002 | 43.038363 | 8.607673 | [-6.1655, 29.3652] | [2.4016, 28.9868] | 1.4501 | 0.9900 | 217.7711 | 371.03% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 25 | 8.329551 | 2.686442 | 12.844503 | 2.568901 | [3.0276, 13.6315] | [4.3688, 14.6997] | 5.1321 | 1.0030 | 48.3514 | 154.20% |

#### Proposal Pass Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 25 | 0.084141 | 0.072072 | 0.030835 | 0.006167 | [0.0714, 0.0969] | [0.0748, 0.0980] | 0.0465 | 0.0372 | 0.1394 | 36.65% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 25 | 0.073710 | 0.069149 | 0.025464 | 0.005093 | [0.0632, 0.0842] | [0.0625, 0.0829] | 0.0483 | 0.0302 | 0.1100 | 34.55% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 25 | 0.077342 | 0.071429 | 0.026267 | 0.005253 | [0.0665, 0.0882] | [0.0692, 0.0868] | 0.0158 | 0.0377 | 0.1315 | 33.96% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 25 | 0.085692 | 0.078704 | 0.023621 | 0.004724 | [0.0759, 0.0954] | [0.0789, 0.0946] | 0.0403 | 0.0452 | 0.1281 | 27.57% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 25 | 0.086240 | 0.085308 | 0.028833 | 0.005767 | [0.0743, 0.0981] | [0.0784, 0.1026] | 0.0270 | 0.0269 | 0.1640 | 33.43% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 25 | 0.081382 | 0.074419 | 0.029941 | 0.005988 | [0.0690, 0.0937] | [0.0699, 0.0931] | 0.0362 | 0.0299 | 0.1412 | 36.79% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 25 | 0.092763 | 0.088372 | 0.029287 | 0.005857 | [0.0807, 0.1049] | [0.0826, 0.1049] | 0.0407 | 0.0355 | 0.1559 | 31.57% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 25 | 0.077966 | 0.075758 | 0.022914 | 0.004583 | [0.0685, 0.0874] | [0.0689, 0.0865] | 0.0280 | 0.0394 | 0.1283 | 29.39% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 25 | 0.086016 | 0.083333 | 0.024225 | 0.004845 | [0.0760, 0.0960] | [0.0741, 0.0931] | 0.0409 | 0.0474 | 0.1264 | 28.16% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 25 | 0.089364 | 0.087719 | 0.027997 | 0.005599 | [0.0778, 0.1009] | [0.0756, 0.1006] | 0.0393 | 0.0417 | 0.1455 | 31.33% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 25 | 0.078421 | 0.080925 | 0.024618 | 0.004924 | [0.0683, 0.0886] | [0.0657, 0.0881] | 0.0402 | 0.0383 | 0.1137 | 31.39% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 25 | 0.081216 | 0.087558 | 0.024934 | 0.004987 | [0.0709, 0.0915] | [0.0674, 0.0865] | 0.0331 | 0.0276 | 0.1357 | 30.70% |

#### Quorum Reach Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 25 | 0.327393 | 0.327189 | 0.039459 | 0.007892 | [0.3111, 0.3437] | [0.3169, 0.3447] | 0.0572 | 0.2487 | 0.4118 | 12.05% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 25 | 0.313459 | 0.318182 | 0.038311 | 0.007662 | [0.2976, 0.3293] | [0.3008, 0.3252] | 0.0476 | 0.2534 | 0.4141 | 12.22% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 25 | 0.327916 | 0.335000 | 0.038750 | 0.007750 | [0.3119, 0.3439] | [0.3046, 0.3382] | 0.0464 | 0.2571 | 0.4000 | 11.82% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 25 | 0.327595 | 0.309091 | 0.044120 | 0.008824 | [0.3094, 0.3458] | [0.3161, 0.3520] | 0.0645 | 0.2569 | 0.4179 | 13.47% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 25 | 0.335698 | 0.334842 | 0.039307 | 0.007861 | [0.3195, 0.3519] | [0.3246, 0.3538] | 0.0492 | 0.2316 | 0.4118 | 11.71% |
| treasury_stabilization_enabled=true_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 25 | 0.331530 | 0.333333 | 0.052333 | 0.010467 | [0.3099, 0.3531] | [0.3071, 0.3477] | 0.0570 | 0.2368 | 0.4396 | 15.79% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.1 | 25 | 0.347097 | 0.349282 | 0.037887 | 0.007577 | [0.3315, 0.3627] | [0.3267, 0.3588] | 0.0514 | 0.2759 | 0.4306 | 10.92% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0_treasury_max_spend_fraction=0.2 | 25 | 0.346660 | 0.346734 | 0.034261 | 0.006852 | [0.3325, 0.3608] | [0.3296, 0.3517] | 0.0349 | 0.2748 | 0.4450 | 9.88% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.1 | 25 | 0.346652 | 0.344340 | 0.046505 | 0.009301 | [0.3275, 0.3658] | [0.3252, 0.3591] | 0.0711 | 0.2674 | 0.4338 | 13.42% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.2_treasury_max_spend_fraction=0.2 | 25 | 0.328782 | 0.337662 | 0.036035 | 0.007207 | [0.3139, 0.3437] | [0.3090, 0.3399] | 0.0630 | 0.2640 | 0.3795 | 10.96% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.1 | 25 | 0.341982 | 0.339450 | 0.038033 | 0.007607 | [0.3263, 0.3577] | [0.3329, 0.3634] | 0.0577 | 0.2810 | 0.4038 | 11.12% |
| treasury_stabilization_enabled=false_treasury_buffer_fraction=0.4_treasury_max_spend_fraction=0.2 | 25 | 0.343412 | 0.339806 | 0.040564 | 0.008113 | [0.3267, 0.3602] | [0.3244, 0.3560] | 0.0519 | 0.2712 | 0.4265 | 11.81% |

---

*Report generated by DAO Simulator Research Quality Report Generator*
