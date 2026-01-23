#!/usr/bin/env python3
"""
GPU Stats Server for DAO Simulator.

Provides a simple JSON-based interface for Node.js to call GPU-accelerated
statistical functions via stdin/stdout.

Usage from Node.js:
    const result = await callPythonGPU('bootstrap', {
        values: [1.2, 2.3, 1.8, 2.1],
        n_samples: 1000,
        confidence: 0.95
    });
"""

import json
import sys
import traceback
import numpy as np
from typing import Any, Dict

from .bootstrap import bootstrap_confidence_interval, bootstrap_batch
from .gini import calculate_gini, calculate_gini_batch
from .statistical import welch_t_test, batch_t_test, compare_distributions
from . import GPU_AVAILABLE


def handle_request(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle a single request from Node.js.

    Request format:
    {
        "method": "bootstrap" | "gini" | "t_test" | "compare",
        "params": { ... method-specific parameters ... }
    }
    """
    method = request.get('method')
    params = request.get('params', {})

    if method == 'bootstrap':
        values = np.array(params.get('values', []), dtype=np.float64)
        n_samples = params.get('n_samples', 1000)
        confidence = params.get('confidence', 0.95)
        statistic = params.get('statistic', 'mean')

        estimate, lower, upper = bootstrap_confidence_interval(
            values, n_samples, confidence, statistic
        )
        return {
            'estimate': estimate,
            'lower': lower,
            'upper': upper,
        }

    elif method == 'bootstrap_batch':
        arrays = [np.array(arr, dtype=np.float64) for arr in params.get('arrays', [])]
        n_samples = params.get('n_samples', 1000)
        confidence = params.get('confidence', 0.95)
        statistic = params.get('statistic', 'mean')

        results = bootstrap_batch(arrays, n_samples, confidence, statistic)
        return {
            'results': [
                {'estimate': e, 'lower': l, 'upper': u}
                for e, l, u in results
            ]
        }

    elif method == 'gini':
        values = np.array(params.get('values', []), dtype=np.float64)
        gini = calculate_gini(values)
        return {'gini': gini}

    elif method == 'gini_batch':
        arrays = [np.array(arr, dtype=np.float64) for arr in params.get('arrays', [])]
        results = calculate_gini_batch(arrays)
        return {'results': results}

    elif method == 't_test':
        group1 = np.array(params.get('group1', []), dtype=np.float64)
        group2 = np.array(params.get('group2', []), dtype=np.float64)
        t_stat, p_value = welch_t_test(group1, group2)
        return {'t_stat': t_stat, 'p_value': p_value}

    elif method == 'compare':
        baseline = np.array(params.get('baseline', []), dtype=np.float64)
        treatment = np.array(params.get('treatment', []), dtype=np.float64)
        return compare_distributions(baseline, treatment)

    elif method == 'info':
        return {
            'gpu_available': GPU_AVAILABLE,
            'version': '1.0.0',
        }

    else:
        raise ValueError(f"Unknown method: {method}")


def main():
    """
    Main server loop.

    Reads JSON requests from stdin, processes them, and writes JSON responses
    to stdout. Each request/response is a single line.
    """
    # Disable output buffering
    sys.stdout.reconfigure(line_buffering=True)

    # Print startup info to stderr (not captured by Node.js JSON parsing)
    print(f"[gpu_stats server] GPU Available: {GPU_AVAILABLE}", file=sys.stderr)
    print("[gpu_stats server] Ready for requests", file=sys.stderr)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
            result = handle_request(request)
            response = {'success': True, 'data': result}
        except Exception as e:
            response = {
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc(),
            }

        # Write response as single line of JSON
        print(json.dumps(response), flush=True)


if __name__ == '__main__':
    main()
