"""Utility functions for statistical calculations."""

from __future__ import annotations

import numpy as np


def gini(values: list[float]) -> float:
    """Return the Gini coefficient of ``values`` using ``numpy`` for speed."""

    if not values:
        return 0.0
    arr = np.asarray([v for v in values if v >= 0], dtype=float)
    n = arr.size
    if n == 0:
        return 0.0
    arr.sort()
    total = arr.sum()
    if total == 0:
        return 0.0
    index = np.arange(1, n + 1)
    cum = np.dot(index, arr)
    return (2.0 * cum) / (n * total) - (n + 1) / n


def in_degree_centrality(members: list) -> dict[str, float]:
    """Compute in-degree centrality for ``members`` without ``networkx``."""

    n = len(members)
    if n <= 1:
        return {m.unique_id: 0.0 for m in members}

    counts = {m.unique_id: 0 for m in members}
    for m in members:
        rep = getattr(m, "representative", None)
        if rep is not None:
            counts[rep.unique_id] += 1

    scale = 1.0 / (n - 1)
    return {uid: count * scale for uid, count in counts.items()}

