"""Background layout worker for computing graph layouts off the main thread.

This module provides a simple thread-backed worker that computes spring
layouts for a graph and caches the resulting positions keyed by a
signature. The simulation can submit layout jobs and later retrieve cached
positions to include in the network_update payload.
"""
from __future__ import annotations

import hashlib
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Iterable, Tuple

import networkx as nx

_EXECUTOR = ThreadPoolExecutor(max_workers=1)
_CACHE: Dict[str, Dict[str, Tuple[float, float]]] = {}
_LOCK = threading.Lock()


def _compute_signature(nodes: Iterable[str], edges: Iterable[Tuple[str, str]]) -> str:
    m = hashlib.sha1()
    m.update(str(len(list(nodes))).encode())
    m.update(str(len(list(edges))).encode())
    # Include a short stable hash of node ids to detect topology changes.
    concat = ",".join(sorted(nodes))
    m.update(concat.encode())
    return m.hexdigest()[:16]


def submit_layout(nodes: Iterable[Dict], edges: Iterable[Dict]) -> str:
    """Submit a layout job for the given nodes/edges.

    Returns a signature string that can be used to query cached results.
    """
    node_ids = [n["id"] for n in nodes]
    edge_pairs = [(e["source"], e["target"]) for e in edges]
    sig = _compute_signature(node_ids, edge_pairs)

    with _LOCK:
        if sig in _CACHE:
            return sig

    def _job():
        try:
            G = nx.DiGraph()
            for nid in node_ids:
                G.add_node(nid)
            for s, t in edge_pairs:
                if s in G and t in G:
                    G.add_edge(s, t)
            pos = nx.spring_layout(G, seed=42)
            # Convert pos to simple mapping
            mapped = {nid: (float(x), float(y)) for nid, (x, y) in pos.items()}
            with _LOCK:
                _CACHE[sig] = mapped
        except Exception:
            # Fail silently; callers will fall back to a grid layout
            return

    _EXECUTOR.submit(_job)
    return sig


def get_cached_layout(signature: str) -> Dict[str, Tuple[float, float]] | None:
    with _LOCK:
        return _CACHE.get(signature)
