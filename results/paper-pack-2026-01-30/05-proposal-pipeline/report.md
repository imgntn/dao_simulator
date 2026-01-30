# DAO Simulation Research Quality Report

**Generated:** 2026-01-30
**Results Directory:** 05-proposal-pipeline

---

## Executive Summary

**Experiment:** 05-proposal-pipeline
**Total Runs:** 270
**Runs per Configuration:** 30
**Sweep Values:** proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0, proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6, proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12, proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0, proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6, proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12, proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0, proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6, proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12
**Statistical Power:** 49%
**Metrics Analyzed:** 10

### Overall Quality Assessment

⚠️ **Acceptable with Caveats** - 2 warning(s) detected.

### Key Statistics

| Aspect | Value |
|--------|-------|
| Significant Effects | 6 of 10 metrics |
| Critical Issues | 0 |
| Warnings | 2 |
| Minimum Effect Detectable | d = 0.723 |

## Key Findings

1. **Quorum Reach Rate**: Significant effect (F=3728.9, p<0.001). Ranges from 0.2020 (at Sweep Value=proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0) to 0.9819 (at Sweep Value=proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0).

2. **Proposal Pass Rate**: Significant effect (F=1784.7, p<0.001). Ranges from 0.0071 (at Sweep Value=proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0) to 0.5255 (at Sweep Value=proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6).

3. **Proposal Rejection Rate**: Significant effect (F=1784.7, p<0.001). Ranges from 0.4745 (at Sweep Value=proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6) to 0.9929 (at Sweep Value=proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0).

4. **Governance Overhead**: Significant effect (F=844.2, p<0.001). Ranges from 16.5989 (at Sweep Value=proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0) to 40.0640 (at Sweep Value=proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6).

5. **Average Turnout**: Significant effect (F=511.7, p<0.001). Ranges from 0.0589 (at Sweep Value=proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0) to 0.1286 (at Sweep Value=proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0).

6. 4 metrics showed no significant variation across Sweep Value values.

## Methodology

### Experimental Design

- **Design Type:** Parameter sweep study
- **Independent Variable:** Sweep Value (9 levels: proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0, proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6, proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12, proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0, proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6, proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12, proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0, proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6, proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12)
- **Dependent Variables:** 10 governance metrics
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
2. **Fixed Parameters:** Only Sweep Value was varied; other parameters held constant
3. **Distribution Assumptions:** Some metrics violate normality assumptions
4. **Model Validity:** See code review for known simulation issues

## Metric Analysis by Category

### Basic Outcome

| Metric | Sweep Value=proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 | Sweep Value=proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 | Sweep Value=proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 | Sweep Value=proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | Sweep Value=proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | Sweep Value=proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | Sweep Value=proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | Sweep Value=proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | Sweep Value=proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|------|-------------|--------|
| Proposal Pass Rate | 0.5160 | 0.5255 | 0.5239 | 0.0199 | 0.0829 | 0.0512 | 0.0071 | 0.0967 | 0.0907 | ✓ | 19.03 |
| Average Turnout | 0.1286 | 0.1285 | 0.1269 | 0.0660 | 0.0733 | 0.0695 | 0.0589 | 0.0719 | 0.0712 | ✓ | 10.27 |
| Total Proposals | 198.2000 | 205.9667 | 205.3000 | 205.1000 | 201.5667 | 201.1333 | 207.8000 | 204.6667 | 203.6000 |  | -0.66 |

### Governance Efficiency

| Metric | Sweep Value=proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 | Sweep Value=proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 | Sweep Value=proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 | Sweep Value=proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | Sweep Value=proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | Sweep Value=proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | Sweep Value=proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | Sweep Value=proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | Sweep Value=proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|------|-------------|--------|
| Quorum Reach Rate | 0.9819 | 0.9760 | 0.9767 | 0.2529 | 0.3308 | 0.2962 | 0.2020 | 0.3254 | 0.3181 | ✓ | 38.09 |
| Avg Margin of Victory | 0.3101 | 0.3157 | 0.3214 | 0.5417 | 0.5226 | 0.5370 | 0.4087 | 0.4313 | 0.4243 | ✓ | -10.84 |
| Avg Time to Decision | 1030 | 1017 | 1023 | 1018 | 1011 | 1028 | 1027 | 1027 | 1027 |  | -0.43 |
| Proposal Abandonment Rate | 0.0208 | 0.0230 | 0.0209 | 0.0199 | 0.0239 | 0.0219 | 0.0228 | 0.0222 | 0.0245 |  | -0.46 |
| Proposal Rejection Rate | 0.4840 | 0.4745 | 0.4761 | 0.9801 | 0.9171 | 0.9488 | 0.9929 | 0.9033 | 0.9093 | ✓ | -19.03 |
| Governance Overhead | 39.8146 | 40.0640 | 39.9460 | 17.8366 | 20.2531 | 19.1539 | 16.5989 | 20.6104 | 20.4170 | ✓ | 13.78 |

### Temporal Dynamics

| Metric | Sweep Value=proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 | Sweep Value=proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 | Sweep Value=proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 | Sweep Value=proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | Sweep Value=proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | Sweep Value=proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | Sweep Value=proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | Sweep Value=proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | Sweep Value=proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | Significant | Effect |
|--------|------|------|------|------|------|------|------|------|------|-------------|--------|
| Proposal Rate | 9.9100 | 10.2983 | 10.2650 | 10.2550 | 10.0783 | 10.0567 | 10.3900 | 10.2333 | 10.1800 |  | -0.66 |

## Distribution Quality Analysis

This section identifies metrics with distribution characteristics that may affect statistical validity.

### High Variability Metrics (CV > 50%)

| Metric | Sweep Value | Mean | Std | CV | Issue |
|--------|-------------|------|-----|----|----|
| Proposal Pass Rate | proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 0.0071 | 0.0067 | 93.9% | 🟡 Warning |
| Proposal Abandonment Rate | proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 0.0222 | 0.0131 | 59.1% | 🟡 Warning |

### Non-Symmetric Distributions

Metrics where mean and median diverge significantly, suggesting skewed distributions:

| Metric | Sweep Value | Mean | Median | Skew Indicator |
|--------|-------------|------|--------|----------------|
| (none) | - | - | - | - |

### Constant/Zero Metrics

Metrics with no variance (may indicate unimplemented features or degenerate cases):

| Metric | Value | Note |
|--------|-------|------|
| (none) | - | - |

## Statistical Significance Analysis

### ANOVA Results (Overall Effect of Sweep Value)

| Metric | F-Statistic | df | p-value | Significant |
|--------|-------------|-----|---------|-------------|
| Quorum Reach Rate | 3728.90 | (8, 261) | <0.001 | ✓ **Yes** |
| Proposal Pass Rate | 1784.68 | (8, 261) | <0.001 | ✓ **Yes** |
| Proposal Rejection Rate | 1784.68 | (8, 261) | <0.001 | ✓ **Yes** |
| Governance Overhead | 844.16 | (8, 261) | <0.001 | ✓ **Yes** |
| Average Turnout | 511.71 | (8, 261) | <0.001 | ✓ **Yes** |
| Avg Margin of Victory | 335.20 | (8, 261) | <0.001 | ✓ **Yes** |
| Proposal Rate | 1.46 | (8, 261) | 0.1724 | No |
| Total Proposals | 1.46 | (8, 261) | 0.1724 | No |
| Avg Time to Decision | 0.74 | (8, 261) | 0.6579 | No |
| Proposal Abandonment Rate | 0.64 | (8, 261) | 0.7397 | No |

### Pairwise Comparisons (Significant Metrics Only)

| Metric | Comparison | t-statistic | Cohen's d | Effect Size |
|--------|------------|-------------|-----------|-------------|
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 70.56 | 18.22 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 49.89 | 12.88 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 59.41 | 15.34 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 73.70 | 19.03 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 43.32 | 11.19 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 51.83 | 13.38 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 63.95 | 16.51 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 47.06 | 12.15 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 55.03 | 14.21 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 66.51 | 17.17 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 41.50 | 10.72 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 48.49 | 12.52 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 67.40 | 17.40 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 48.74 | 12.59 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 57.45 | 14.83 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 70.22 | 18.13 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 42.69 | 11.02 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 50.42 | 13.02 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | -11.07 | -2.86 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | -7.34 | -1.89 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 5.83 | 1.50 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -10.79 | -2.79 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | -14.34 | -3.70 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 4.77 | 1.23 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 13.69 | 3.53 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 10.85 | 2.80 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -5.75 | -1.49 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | -6.56 | -1.69 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -12.80 | -3.30 | very_large |
| Proposal Pass Rate | proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | -17.56 | -4.53 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 103.77 | 26.79 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 83.80 | 21.64 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 104.64 | 27.02 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 147.52 | 38.09 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 74.28 | 19.18 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 101.55 | 26.22 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 102.86 | 26.56 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 82.99 | 21.43 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 103.66 | 26.76 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 146.22 | 37.76 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 73.58 | 19.00 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 100.57 | 25.97 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 102.31 | 26.42 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 82.66 | 21.34 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 103.01 | 26.60 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 144.74 | 37.37 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 73.37 | 18.94 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 99.94 | 25.81 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | -7.68 | -1.98 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | -4.68 | -1.21 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 6.07 | 1.57 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -6.60 | -1.71 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | -7.07 | -1.83 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 3.53 | 0.91 | large |
| Quorum Reach Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 14.28 | 3.69 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 11.78 | 3.04 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -2.74 | -0.71 | medium |
| Quorum Reach Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | -2.48 | -0.64 | medium |
| Quorum Reach Rate | proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -12.40 | -3.20 | very_large |
| Quorum Reach Rate | proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | -14.55 | -3.76 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | -70.56 | -18.22 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | -49.89 | -12.88 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | -59.41 | -15.34 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | -73.70 | -19.03 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -43.32 | -11.19 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | -51.83 | -13.38 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | -63.95 | -16.51 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | -47.06 | -12.15 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | -55.03 | -14.21 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | -66.51 | -17.17 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -41.50 | -10.72 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | -48.49 | -12.52 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | -67.40 | -17.40 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | -48.74 | -12.59 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | -57.45 | -14.83 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | -70.22 | -18.13 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -42.69 | -11.02 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | -50.42 | -13.02 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 11.07 | 2.86 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 7.34 | 1.89 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | -5.83 | -1.50 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 10.79 | 2.79 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 14.34 | 3.70 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | -4.77 | -1.23 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | -13.69 | -3.53 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | -10.85 | -2.80 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 5.75 | 1.49 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 6.56 | 1.69 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 12.80 | 3.30 | very_large |
| Proposal Rejection Rate | proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 17.56 | 4.53 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 42.41 | 10.95 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 45.86 | 11.84 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 43.65 | 11.27 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 52.02 | 13.43 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 45.81 | 11.83 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 45.13 | 11.65 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 43.36 | 11.20 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 47.20 | 12.19 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 44.76 | 11.56 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 53.35 | 13.78 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 47.18 | 12.18 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 46.45 | 11.99 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 42.37 | 10.94 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 45.69 | 11.80 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 43.56 | 11.25 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 51.81 | 13.38 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 45.63 | 11.78 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 44.98 | 11.61 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | -3.78 | -0.98 | large |
| Governance Overhead | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -4.37 | -1.13 | large |
| Governance Overhead | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | -4.02 | -1.04 | large |
| Governance Overhead | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 6.27 | 1.62 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 4.13 | 1.07 | large |
| Governance Overhead | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -2.43 | -0.63 | medium |
| Governance Overhead | proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -6.94 | -1.79 | very_large |
| Governance Overhead | proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | -6.52 | -1.68 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 33.46 | 8.64 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 32.46 | 8.38 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 37.29 | 9.63 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 39.77 | 10.27 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 33.56 | 8.67 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 33.71 | 8.70 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 32.71 | 8.44 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 31.60 | 8.16 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 36.17 | 9.34 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 38.79 | 10.01 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 32.65 | 8.43 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 32.81 | 8.47 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 31.30 | 8.08 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 30.02 | 7.75 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 34.32 | 8.86 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 37.12 | 9.58 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 31.04 | 8.01 | very_large |
| Average Turnout | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 31.22 | 8.06 | very_large |
| Average Turnout | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | -3.30 | -0.85 | large |
| Average Turnout | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 3.18 | 0.82 | large |
| Average Turnout | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -2.69 | -0.69 | medium |
| Average Turnout | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | -2.32 | -0.60 | medium |
| Average Turnout | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 6.84 | 1.77 | very_large |
| Average Turnout | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 5.25 | 1.36 | very_large |
| Average Turnout | proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -6.22 | -1.61 | very_large |
| Average Turnout | proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | -5.81 | -1.50 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | -37.43 | -9.66 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | -29.06 | -7.50 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | -41.85 | -10.81 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | -16.69 | -4.31 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -15.81 | -4.08 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | -15.59 | -4.03 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | -37.32 | -9.64 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | -28.73 | -7.42 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | -41.98 | -10.84 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | -16.11 | -4.16 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -15.29 | -3.95 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | -15.05 | -3.89 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | -33.03 | -8.53 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | -26.05 | -6.73 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | -36.14 | -9.33 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | -13.61 | -3.51 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -13.63 | -3.52 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | -13.30 | -3.43 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 18.45 | 4.76 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 12.69 | 3.28 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 13.96 | 3.61 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 13.90 | 3.59 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 9.58 | 2.47 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 10.61 | 2.74 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 19.55 | 5.05 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 12.93 | 3.34 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 14.34 | 3.70 | very_large |
| Avg Margin of Victory | proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 vs proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | -2.65 | -0.69 | medium |

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

#### Warnings (Should Address)

- **Proposal Pass Rate**: High variability (CV=93.9%). Consider more runs or controlled conditions.
- **Proposal Abandonment Rate**: High variability (CV=59.1%). Consider more runs or controlled conditions.

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
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 | 30 | 0.516018 | 0.522060 | 0.037222 | 0.006796 | [0.5021, 0.5299] | - | 0.0336 | 0.4277 | 0.6077 | 7.21% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 | 30 | 0.525453 | 0.522876 | 0.042154 | 0.007696 | [0.5097, 0.5412] | - | 0.0306 | 0.4352 | 0.6332 | 8.02% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 | 30 | 0.523894 | 0.517655 | 0.039746 | 0.007257 | [0.5091, 0.5387] | - | 0.0487 | 0.4483 | 0.6378 | 7.59% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 30 | 0.019863 | 0.019139 | 0.009903 | 0.001808 | [0.0162, 0.0236] | - | 0.0122 | 0.0000 | 0.0391 | 49.86% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 30 | 0.082949 | 0.083036 | 0.029586 | 0.005402 | [0.0719, 0.0940] | - | 0.0441 | 0.0407 | 0.1514 | 35.67% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 30 | 0.051246 | 0.046039 | 0.021228 | 0.003876 | [0.0433, 0.0592] | - | 0.0325 | 0.0237 | 0.1015 | 41.42% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 30 | 0.007143 | 0.005168 | 0.006706 | 0.001224 | [0.0046, 0.0096] | [0.0053, 0.0106] | 0.0052 | 0.0000 | 0.0229 | 93.88% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 30 | 0.096721 | 0.088372 | 0.037746 | 0.006892 | [0.0826, 0.1108] | - | 0.0545 | 0.0350 | 0.1685 | 39.03% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 30 | 0.090708 | 0.093605 | 0.025189 | 0.004599 | [0.0813, 0.1001] | - | 0.0258 | 0.0341 | 0.1336 | 27.77% |

#### Quorum Reach Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 | 30 | 0.981950 | 0.981015 | 0.010267 | 0.001875 | [0.9781, 0.9858] | - | 0.0155 | 0.9606 | 1.0000 | 1.05% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 | 30 | 0.976013 | 0.978016 | 0.010360 | 0.001892 | [0.9721, 0.9799] | - | 0.0157 | 0.9507 | 0.9904 | 1.06% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 | 30 | 0.976727 | 0.979540 | 0.011236 | 0.002051 | [0.9725, 0.9809] | [0.9741, 0.9830] | 0.0153 | 0.9447 | 0.9910 | 1.15% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 30 | 0.252892 | 0.249982 | 0.037086 | 0.006771 | [0.2390, 0.2667] | - | 0.0468 | 0.1774 | 0.3278 | 14.66% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 30 | 0.330768 | 0.323195 | 0.041303 | 0.007541 | [0.3153, 0.3462] | - | 0.0460 | 0.2642 | 0.4375 | 12.49% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 30 | 0.296153 | 0.292381 | 0.034398 | 0.006280 | [0.2833, 0.3090] | - | 0.0339 | 0.2174 | 0.3886 | 11.61% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 30 | 0.202005 | 0.201049 | 0.027078 | 0.004944 | [0.1919, 0.2121] | - | 0.0295 | 0.1415 | 0.2870 | 13.40% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 30 | 0.325379 | 0.323067 | 0.047309 | 0.008637 | [0.3077, 0.3430] | - | 0.0548 | 0.2589 | 0.4293 | 14.54% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 30 | 0.318126 | 0.317663 | 0.034300 | 0.006262 | [0.3053, 0.3309] | - | 0.0494 | 0.2500 | 0.3854 | 10.78% |

#### Avg Time to Decision

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 | 30 | 1029.766836 | 1038.938889 | 49.753392 | 9.083685 | [1011.1886, 1048.3451] | 74.7202 | 905.6763 | 1093.0207 | 4.83% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 | 30 | 1016.786903 | 1014.935313 | 40.377706 | 7.371927 | [1001.7096, 1031.8642] | 46.1479 | 939.5765 | 1101.2350 | 3.97% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 | 30 | 1023.335581 | 1022.814505 | 45.656916 | 8.335774 | [1006.2870, 1040.3842] | 70.4707 | 945.1591 | 1113.7477 | 4.46% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 30 | 1017.549527 | 1009.455741 | 44.409255 | 8.107984 | [1000.9668, 1034.1322] | 59.4556 | 925.1970 | 1096.2944 | 4.36% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 30 | 1011.261810 | 1012.403989 | 43.185635 | 7.884582 | [995.1360, 1027.3876] | 69.3941 | 934.3202 | 1101.9095 | 4.27% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 30 | 1028.438464 | 1024.967558 | 39.298734 | 7.174934 | [1013.7641, 1043.1129] | 46.5388 | 946.6754 | 1104.9865 | 3.82% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 30 | 1026.813097 | 1031.907135 | 27.397112 | 5.002005 | [1016.5828, 1037.0433] | 36.9431 | 951.5176 | 1080.8238 | 2.67% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 30 | 1027.269516 | 1024.791830 | 38.699291 | 7.065492 | [1012.8190, 1041.7201] | 50.9462 | 958.7906 | 1119.7834 | 3.77% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 30 | 1026.600035 | 1026.511285 | 33.848854 | 6.179927 | [1013.9607, 1039.2394] | 38.7773 | 973.4127 | 1095.4689 | 3.30% |

#### Proposal Abandonment Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 | 30 | 0.020810 | 0.018738 | 0.008993 | 0.001642 | [0.0175, 0.0242] | 0.0133 | 0.0050 | 0.0374 | 43.21% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 | 30 | 0.022985 | 0.023482 | 0.008219 | 0.001500 | [0.0199, 0.0261] | 0.0093 | 0.0051 | 0.0383 | 35.76% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 | 30 | 0.020902 | 0.016059 | 0.010181 | 0.001859 | [0.0171, 0.0247] | 0.0135 | 0.0000 | 0.0407 | 48.71% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 30 | 0.019858 | 0.016716 | 0.009149 | 0.001670 | [0.0164, 0.0233] | 0.0130 | 0.0049 | 0.0415 | 46.07% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 30 | 0.023868 | 0.022662 | 0.009350 | 0.001707 | [0.0204, 0.0274] | 0.0150 | 0.0048 | 0.0400 | 39.17% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 30 | 0.021888 | 0.019468 | 0.010470 | 0.001912 | [0.0180, 0.0258] | 0.0164 | 0.0000 | 0.0417 | 47.84% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 30 | 0.022771 | 0.022269 | 0.011065 | 0.002020 | [0.0186, 0.0269] | 0.0097 | 0.0000 | 0.0455 | 48.59% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 30 | 0.022223 | 0.019283 | 0.013133 | 0.002398 | [0.0173, 0.0271] | 0.0203 | 0.0044 | 0.0556 | 59.10% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 30 | 0.024478 | 0.023753 | 0.010966 | 0.002002 | [0.0204, 0.0286] | 0.0122 | 0.0000 | 0.0500 | 44.80% |

#### Proposal Rejection Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 | 30 | 0.483982 | 0.477940 | 0.037222 | 0.006796 | [0.4701, 0.4979] | - | 0.0336 | 0.3923 | 0.5723 | 7.69% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 | 30 | 0.474547 | 0.477124 | 0.042154 | 0.007696 | [0.4588, 0.4903] | - | 0.0306 | 0.3668 | 0.5648 | 8.88% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 | 30 | 0.476106 | 0.482345 | 0.039746 | 0.007257 | [0.4613, 0.4909] | - | 0.0487 | 0.3622 | 0.5517 | 8.35% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 30 | 0.980137 | 0.980861 | 0.009903 | 0.001808 | [0.9764, 0.9838] | - | 0.0122 | 0.9609 | 1.0000 | 1.01% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 30 | 0.917051 | 0.916964 | 0.029586 | 0.005402 | [0.9060, 0.9281] | - | 0.0441 | 0.8486 | 0.9593 | 3.23% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 30 | 0.948754 | 0.953961 | 0.021228 | 0.003876 | [0.9408, 0.9567] | - | 0.0325 | 0.8985 | 0.9763 | 2.24% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 30 | 0.992857 | 0.994832 | 0.006706 | 0.001224 | [0.9904, 0.9954] | [0.9896, 0.9947] | 0.0052 | 0.9771 | 1.0000 | 0.68% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 30 | 0.903279 | 0.911628 | 0.037746 | 0.006892 | [0.8892, 0.9174] | - | 0.0545 | 0.8315 | 0.9650 | 4.18% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 30 | 0.909292 | 0.906395 | 0.025189 | 0.004599 | [0.8999, 0.9187] | - | 0.0258 | 0.8664 | 0.9659 | 2.77% |

#### Governance Overhead

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 | 30 | 39.814592 | 39.938784 | 0.786532 | 0.143600 | [39.5209, 40.1083] | 0.7273 | 38.0103 | 41.1209 | 1.98% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 | 30 | 40.064000 | 40.207622 | 0.667557 | 0.121879 | [39.8147, 40.3133] | 1.1091 | 38.8750 | 41.2780 | 1.67% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 | 30 | 39.945984 | 40.019562 | 0.856335 | 0.156345 | [39.6262, 40.2657] | 1.1362 | 38.2489 | 41.9249 | 2.14% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 30 | 17.836559 | 17.583840 | 2.727105 | 0.497899 | [16.8182, 18.8549] | 3.5582 | 11.4402 | 22.7005 | 15.29% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 30 | 20.253063 | 19.832439 | 2.199977 | 0.401659 | [19.4316, 21.0745] | 2.5545 | 16.0538 | 24.8541 | 10.86% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 30 | 19.153916 | 19.339904 | 2.470256 | 0.451005 | [18.2315, 20.0763] | 2.5609 | 13.4255 | 25.4339 | 12.90% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 30 | 16.598934 | 16.461788 | 2.314629 | 0.422592 | [15.7346, 17.4632] | 2.3823 | 11.1624 | 24.0427 | 13.94% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 30 | 20.610369 | 20.323545 | 2.157467 | 0.393898 | [19.8048, 21.4160] | 2.7302 | 16.9337 | 25.6098 | 10.47% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 30 | 20.417007 | 20.198476 | 2.218698 | 0.405077 | [19.5885, 21.2455] | 2.8133 | 16.8263 | 27.0896 | 10.87% |

#### Average Turnout

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 | 30 | 0.128622 | 0.129022 | 0.004777 | 0.000872 | [0.1268, 0.1304] | - | 0.0063 | 0.1179 | 0.1418 | 3.71% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 | 30 | 0.128452 | 0.129412 | 0.005205 | 0.000950 | [0.1265, 0.1304] | - | 0.0058 | 0.1160 | 0.1363 | 4.05% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 | 30 | 0.126919 | 0.125521 | 0.005600 | 0.001022 | [0.1248, 0.1290] | - | 0.0064 | 0.1170 | 0.1409 | 4.41% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 30 | 0.066028 | 0.065635 | 0.009066 | 0.001655 | [0.0626, 0.0694] | - | 0.0130 | 0.0455 | 0.0826 | 13.73% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 30 | 0.073316 | 0.072493 | 0.008016 | 0.001464 | [0.0703, 0.0763] | - | 0.0059 | 0.0583 | 0.0928 | 10.93% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 30 | 0.069477 | 0.070888 | 0.007257 | 0.001325 | [0.0668, 0.0722] | - | 0.0089 | 0.0503 | 0.0847 | 10.45% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 30 | 0.058876 | 0.057596 | 0.008333 | 0.001521 | [0.0558, 0.0620] | [0.0563, 0.0635] | 0.0056 | 0.0401 | 0.0907 | 14.15% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 30 | 0.071939 | 0.070285 | 0.007922 | 0.001446 | [0.0690, 0.0749] | - | 0.0113 | 0.0596 | 0.0881 | 11.01% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 30 | 0.071153 | 0.069678 | 0.008023 | 0.001465 | [0.0682, 0.0741] | - | 0.0087 | 0.0569 | 0.0935 | 11.28% |

#### Avg Margin of Victory

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | Bootstrap 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|--------------|------|-----|-----|----|
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 | 30 | 0.310076 | 0.310829 | 0.017867 | 0.003262 | [0.3034, 0.3167] | - | 0.0221 | 0.2678 | 0.3511 | 5.76% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 | 30 | 0.315726 | 0.314070 | 0.016448 | 0.003003 | [0.3096, 0.3219] | - | 0.0204 | 0.2791 | 0.3511 | 5.21% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 | 30 | 0.321396 | 0.320207 | 0.022477 | 0.004104 | [0.3130, 0.3298] | - | 0.0256 | 0.2721 | 0.3866 | 6.99% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 30 | 0.541721 | 0.538083 | 0.028804 | 0.005259 | [0.5310, 0.5525] | - | 0.0370 | 0.4912 | 0.6304 | 5.32% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 30 | 0.522635 | 0.533071 | 0.035853 | 0.006546 | [0.5092, 0.5360] | [0.5132, 0.5348] | 0.0401 | 0.4266 | 0.5677 | 6.86% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 30 | 0.537030 | 0.537128 | 0.023730 | 0.004332 | [0.5282, 0.5459] | - | 0.0215 | 0.4856 | 0.5893 | 4.42% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 30 | 0.408705 | 0.408651 | 0.027000 | 0.004930 | [0.3986, 0.4188] | - | 0.0233 | 0.3490 | 0.4724 | 6.61% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 30 | 0.431294 | 0.430651 | 0.037997 | 0.006937 | [0.4171, 0.4455] | - | 0.0635 | 0.3708 | 0.4997 | 8.81% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 30 | 0.424305 | 0.421672 | 0.035932 | 0.006560 | [0.4109, 0.4377] | - | 0.0533 | 0.3569 | 0.5029 | 8.47% |

#### Proposal Rate

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 | 30 | 9.910000 | 10.000000 | 0.641173 | 0.117062 | [9.6706, 10.1494] | 0.6875 | 8.5000 | 11.2500 | 6.47% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 | 30 | 10.298333 | 10.400000 | 0.586704 | 0.107117 | [10.0793, 10.5174] | 0.8125 | 8.9500 | 11.2500 | 5.70% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 | 30 | 10.265000 | 10.200000 | 0.656946 | 0.119941 | [10.0197, 10.5103] | 1.0000 | 8.9500 | 11.6000 | 6.40% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 30 | 10.255000 | 10.350000 | 0.791153 | 0.144444 | [9.9596, 10.5504] | 1.0250 | 8.8500 | 11.9500 | 7.71% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 30 | 10.078333 | 10.125000 | 0.519894 | 0.094919 | [9.8842, 10.2725] | 0.7375 | 9.2000 | 11.3500 | 5.16% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 30 | 10.056667 | 9.950000 | 0.662900 | 0.121028 | [9.8091, 10.3042] | 0.9000 | 8.2000 | 11.3500 | 6.59% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 30 | 10.390000 | 10.275000 | 0.802088 | 0.146441 | [10.0905, 10.6895] | 0.9250 | 8.9000 | 12.8000 | 7.72% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 30 | 10.233333 | 10.225000 | 0.585063 | 0.106817 | [10.0149, 10.4518] | 0.9000 | 9.1500 | 11.4000 | 5.72% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 30 | 10.180000 | 10.050000 | 0.685767 | 0.125203 | [9.9239, 10.4361] | 0.8875 | 9.0000 | 11.7000 | 6.74% |

#### Total Proposals

| Sweep Value | n | Mean | Median | Std | SE | 95% CI | IQR | Min | Max | CV |
|------|---|------|--------|-----|----|----|------|-----|-----|----|
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=0 | 30 | 198.200000 | 200.000000 | 12.823470 | 2.341235 | [193.4116, 202.9884] | 13.7500 | 170.0000 | 225.0000 | 6.47% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=6 | 30 | 205.966667 | 208.000000 | 11.734075 | 2.142339 | [201.5851, 210.3482] | 16.2500 | 179.0000 | 225.0000 | 5.70% |
| proposal_temp_check_fraction=0_proposal_fast_track_min_steps=12 | 30 | 205.300000 | 204.000000 | 13.138913 | 2.398826 | [200.3938, 210.2062] | 20.0000 | 179.0000 | 232.0000 | 6.40% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=0 | 30 | 205.100000 | 207.000000 | 15.823052 | 2.888881 | [199.1916, 211.0084] | 20.5000 | 177.0000 | 239.0000 | 7.71% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=6 | 30 | 201.566667 | 202.500000 | 10.397889 | 1.898386 | [197.6840, 205.4493] | 14.7500 | 184.0000 | 227.0000 | 5.16% |
| proposal_temp_check_fraction=0.25_proposal_fast_track_min_steps=12 | 30 | 201.133333 | 199.000000 | 13.258006 | 2.420570 | [196.1827, 206.0840] | 18.0000 | 164.0000 | 227.0000 | 6.59% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=0 | 30 | 207.800000 | 205.500000 | 16.041756 | 2.928811 | [201.8099, 213.7901] | 18.5000 | 178.0000 | 256.0000 | 7.72% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=6 | 30 | 204.666667 | 204.500000 | 11.701262 | 2.136348 | [200.2973, 209.0360] | 18.0000 | 183.0000 | 228.0000 | 5.72% |
| proposal_temp_check_fraction=0.5_proposal_fast_track_min_steps=12 | 30 | 203.600000 | 201.000000 | 13.715332 | 2.504066 | [198.4786, 208.7214] | 17.7500 | 180.0000 | 234.0000 | 6.74% |

---

*Report generated by DAO Simulator Research Quality Report Generator*
