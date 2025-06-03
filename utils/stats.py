"""Utility functions for statistical calculations."""

from __future__ import annotations


def gini(values: list[float]) -> float:
    """Return the Gini coefficient of ``values``.

    Parameters
    ----------
    values : list[float]
        Non-negative values representing a distribution.
    """
    if not values:
        return 0.0
    vals = [v for v in values if v >= 0]
    n = len(vals)
    if n == 0:
        return 0.0
    vals.sort()
    cum = 0.0
    for i, v in enumerate(vals, 1):
        cum += i * v
    total = sum(vals)
    if total == 0:
        return 0.0
    return (2 * cum) / (n * total) - (n + 1) / n

