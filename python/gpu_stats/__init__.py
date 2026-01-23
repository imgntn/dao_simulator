"""
GPU-accelerated statistical functions for DAO Simulator experiments.

Provides 50-100x speedup for bootstrap resampling and statistical analysis
by leveraging CuPy for GPU computation, with automatic fallback to NumPy.
"""

import os

# Allow forcing NumPy even if CuPy is available (for testing or compatibility)
FORCE_CPU = os.environ.get('GPU_STATS_FORCE_CPU', '').lower() in ('1', 'true', 'yes')

GPU_AVAILABLE = False
GPU_FUNCTIONAL = False

if not FORCE_CPU:
    try:
        import cupy as cp
        # Test if CuPy actually works (CUDA drivers, etc.)
        try:
            test = cp.array([1, 2, 3])
            _ = float(cp.sum(test))
            GPU_AVAILABLE = True
            GPU_FUNCTIONAL = True
            print("[gpu_stats] CuPy loaded and functional - GPU acceleration enabled")
        except Exception as e:
            # CuPy installed but CUDA not working
            import numpy as cp
            GPU_AVAILABLE = True  # CuPy is available but not functional
            GPU_FUNCTIONAL = False
            print(f"[gpu_stats] CuPy installed but CUDA not functional: {e}")
            print("[gpu_stats] Falling back to NumPy CPU")
    except ImportError:
        import numpy as cp
        GPU_AVAILABLE = False
        GPU_FUNCTIONAL = False
        print("[gpu_stats] CuPy not available - using NumPy CPU fallback")
else:
    import numpy as cp
    print("[gpu_stats] Forced CPU mode - using NumPy")

from .bootstrap import bootstrap_confidence_interval
from .gini import calculate_gini, calculate_gini_batch
from .statistical import welch_t_test, batch_t_test

__all__ = [
    'GPU_AVAILABLE',
    'GPU_FUNCTIONAL',
    'bootstrap_confidence_interval',
    'calculate_gini',
    'calculate_gini_batch',
    'welch_t_test',
    'batch_t_test',
]
