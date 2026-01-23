"""
GPU-accelerated statistical tests.

Includes Welch's t-test and batch statistical comparisons.
"""

try:
    import cupy as cp
    GPU_AVAILABLE = True
except ImportError:
    import numpy as cp
    GPU_AVAILABLE = False

import numpy as np
from typing import List, Tuple, Union
from scipy import stats as scipy_stats


def welch_t_test(
    group1: Union[List[float], np.ndarray],
    group2: Union[List[float], np.ndarray]
) -> Tuple[float, float]:
    """
    Perform Welch's t-test (unequal variance t-test).

    This is the recommended t-test when sample variances may differ.

    Args:
        group1: First sample
        group2: Second sample

    Returns:
        Tuple of (t_statistic, p_value)

    Example:
        >>> control = [85, 86, 88, 75, 78, 94, 98, 79, 71, 80]
        >>> treatment = [91, 92, 93, 85, 87, 94, 98, 93, 97, 94]
        >>> t_stat, p_val = welch_t_test(control, treatment)
        >>> print(f"t={t_stat:.3f}, p={p_val:.4f}")
    """
    if isinstance(group1, list):
        group1 = np.array(group1, dtype=np.float64)
    if isinstance(group2, list):
        group2 = np.array(group2, dtype=np.float64)

    # Use scipy for accurate t-test (GPU doesn't help much here
    # since the computation is simple)
    t_stat, p_value = scipy_stats.ttest_ind(group1, group2, equal_var=False)

    return (float(t_stat), float(p_value))


def batch_t_test(
    groups: List[Tuple[np.ndarray, np.ndarray]]
) -> List[Tuple[float, float]]:
    """
    Perform Welch's t-test for multiple pairs of groups.

    Args:
        groups: List of (group1, group2) pairs to compare

    Returns:
        List of (t_statistic, p_value) tuples
    """
    return [welch_t_test(g1, g2) for g1, g2 in groups]


def effect_size_cohens_d(
    group1: Union[List[float], np.ndarray],
    group2: Union[List[float], np.ndarray]
) -> float:
    """
    Calculate Cohen's d effect size.

    Interpretation:
    - |d| < 0.2: negligible
    - 0.2 <= |d| < 0.5: small
    - 0.5 <= |d| < 0.8: medium
    - |d| >= 0.8: large

    Args:
        group1: First sample
        group2: Second sample

    Returns:
        Cohen's d value
    """
    if isinstance(group1, list):
        group1 = np.array(group1, dtype=np.float64)
    if isinstance(group2, list):
        group2 = np.array(group2, dtype=np.float64)

    n1, n2 = len(group1), len(group2)
    mean1, mean2 = np.mean(group1), np.mean(group2)
    var1, var2 = np.var(group1, ddof=1), np.var(group2, ddof=1)

    # Pooled standard deviation
    pooled_std = np.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))

    if pooled_std == 0:
        return 0.0

    return float((mean1 - mean2) / pooled_std)


def compare_distributions(
    baseline: np.ndarray,
    treatment: np.ndarray
) -> dict:
    """
    Comprehensive comparison of two distributions.

    Args:
        baseline: Baseline/control measurements
        treatment: Treatment/experiment measurements

    Returns:
        Dictionary with:
        - t_stat: Welch's t-test statistic
        - p_value: Two-tailed p-value
        - cohens_d: Effect size
        - baseline_mean: Mean of baseline
        - treatment_mean: Mean of treatment
        - percent_change: Relative change as percentage
        - significant: Whether p < 0.05
    """
    t_stat, p_value = welch_t_test(baseline, treatment)
    cohens_d = effect_size_cohens_d(baseline, treatment)

    baseline_mean = float(np.mean(baseline))
    treatment_mean = float(np.mean(treatment))

    if baseline_mean != 0:
        percent_change = ((treatment_mean - baseline_mean) / baseline_mean) * 100
    else:
        percent_change = 0.0 if treatment_mean == 0 else float('inf')

    return {
        't_stat': t_stat,
        'p_value': p_value,
        'cohens_d': cohens_d,
        'baseline_mean': baseline_mean,
        'treatment_mean': treatment_mean,
        'percent_change': percent_change,
        'significant': p_value < 0.05,
    }


if __name__ == "__main__":
    # Quick test
    np.random.seed(42)

    # Generate test data with known difference
    control = np.random.normal(100, 15, 100)
    treatment = np.random.normal(110, 15, 100)  # 10% higher mean

    result = compare_distributions(control, treatment)

    print("Distribution Comparison:")
    print(f"  Baseline mean: {result['baseline_mean']:.2f}")
    print(f"  Treatment mean: {result['treatment_mean']:.2f}")
    print(f"  Percent change: {result['percent_change']:.1f}%")
    print(f"  t-statistic: {result['t_stat']:.3f}")
    print(f"  p-value: {result['p_value']:.4f}")
    print(f"  Cohen's d: {result['cohens_d']:.3f}")
    print(f"  Significant: {result['significant']}")
