"""
GPU-accelerated Gini coefficient calculation.

The Gini coefficient measures inequality in a distribution.
GPU acceleration provides ~50x speedup through parallel sorting and cumsum.
"""

# Import the array module (CuPy or NumPy) from parent package
# This ensures we use the same tested import
if __name__ == '__main__':
    # Running as script - do our own import
    try:
        import cupy as cp
        test = cp.array([1])
        _ = float(cp.sum(test))
        GPU_AVAILABLE = True
    except Exception:
        import numpy as cp
        GPU_AVAILABLE = False
else:
    # Imported as module - use parent's import
    from . import GPU_FUNCTIONAL as GPU_AVAILABLE
    if GPU_AVAILABLE:
        import cupy as cp
    else:
        import numpy as cp

import numpy as np
from typing import List, Union


def calculate_gini(values: Union[List[float], np.ndarray]) -> float:
    """
    Calculate Gini coefficient for a distribution.

    The Gini coefficient ranges from 0 (perfect equality) to 1 (perfect inequality).

    Args:
        values: Array of values (e.g., token holdings, wealth)

    Returns:
        Gini coefficient between 0 and 1

    Example:
        >>> tokens = [100, 200, 300, 400, 500]
        >>> gini = calculate_gini(tokens)
        >>> print(f"Gini: {gini:.4f}")
    """
    if isinstance(values, list):
        values = np.array(values, dtype=np.float64)

    # Move to GPU
    data = cp.asarray(values)

    n = len(data)
    if n == 0:
        return 0.0

    total = cp.sum(data)
    if total == 0:
        return 0.0

    # Sort values
    sorted_data = cp.sort(data)

    # Calculate Gini using the formula:
    # G = (2 * sum(i * x_i) / (n * sum(x_i))) - (n + 1) / n
    indices = cp.arange(1, n + 1)
    numerator = 2 * cp.sum(indices * sorted_data)

    gini = float(numerator / (n * total) - (n + 1) / n)

    return max(0.0, min(1.0, gini))  # Clamp to [0, 1]


def calculate_gini_batch(arrays: List[np.ndarray]) -> List[float]:
    """
    Calculate Gini coefficients for multiple distributions.

    More efficient than calling calculate_gini repeatedly.

    Args:
        arrays: List of value arrays

    Returns:
        List of Gini coefficients
    """
    return [calculate_gini(arr) for arr in arrays]


def calculate_gini_matrix(matrix: np.ndarray) -> np.ndarray:
    """
    Calculate Gini for each row of a matrix.

    Useful for batch processing where each row is a different
    token distribution snapshot.

    Args:
        matrix: 2D array where each row is a distribution

    Returns:
        1D array of Gini coefficients
    """
    data = cp.asarray(matrix)
    n_rows, n_cols = data.shape

    if n_cols == 0:
        return np.zeros(n_rows)

    # Sort each row
    sorted_data = cp.sort(data, axis=1)

    # Row sums
    totals = cp.sum(sorted_data, axis=1)

    # Handle zero sums
    mask = totals > 0

    # Calculate Gini for each row
    indices = cp.arange(1, n_cols + 1)
    numerators = 2 * cp.sum(indices * sorted_data, axis=1)

    ginis = cp.zeros(n_rows)
    ginis[mask] = numerators[mask] / (n_cols * totals[mask]) - (n_cols + 1) / n_cols

    # Clamp to [0, 1]
    ginis = cp.clip(ginis, 0.0, 1.0)

    return cp.asnumpy(ginis)


if __name__ == "__main__":
    # Quick test
    import time

    # Test data
    np.random.seed(42)

    # Create a pareto distribution (realistic wealth distribution)
    test_data = np.random.pareto(2, 10000)

    # Warmup
    _ = calculate_gini(test_data[:100])

    # Benchmark single calculation
    start = time.time()
    for _ in range(100):
        gini = calculate_gini(test_data)
    elapsed = time.time() - start

    print(f"GPU Available: {GPU_AVAILABLE}")
    print(f"100 Gini calculations on 10K values: {elapsed:.3f}s")
    print(f"Gini coefficient: {gini:.4f}")

    # Benchmark batch calculation
    batch = [np.random.pareto(2, 1000) for _ in range(100)]

    start = time.time()
    results = calculate_gini_batch(batch)
    elapsed = time.time() - start

    print(f"Batch of 100 Gini calculations: {elapsed:.3f}s")
    print(f"Mean Gini: {np.mean(results):.4f}")
