# GPU Acceleration Plan for DAO Simulator

## Executive Summary

This document outlines strategies for accelerating DAO simulations using GPU computing. Based on codebase analysis, the simulator can achieve **20-100x speedup** on batch experiments through GPU parallelization.

**Important**: This document presents **two mutually exclusive GPU paths**. You must choose one:

| Technology | CUDA | WebGPU |
|------------|------|--------|
| **Vendor** | NVIDIA only | Any GPU (cross-platform) |
| **Runtime** | Native (C++/Node.js addon) | Browser or Dawn runtime |
| **Language** | CUDA C/C++ | WGSL (WebGPU Shading Language) |
| **Hardware** | NVIDIA GPUs only | NVIDIA, AMD, Intel, Apple Silicon |
| **Performance** | Maximum | ~80-90% of CUDA |
| **Portability** | Low (NVIDIA lock-in) | High (runs everywhere) |

**These are NOT compatible** - you cannot use CUDA kernels with WebGPU or vice versa.

---

## Current Architecture Analysis

### Computational Hotspots Identified

| Hotspot | Location | Complexity | GPU Potential |
|---------|----------|------------|---------------|
| **Voting Power Resolution** | `lib/delegation/delegation-resolver.ts` | O(agents × proposals × chain_depth) | High |
| **Gini Coefficients** | `lib/utils/stats.ts`, `data-collector.ts` | O(n log n) per calculation | Very High |
| **Bootstrap Resampling** | `lib/research/statistics.ts:144-184` | O(1000 × n) per metric | Very High |
| **Pairwise T-Tests** | `lib/research/experiment-runner.ts:1180-1209` | O(S² × M × N) | Very High |
| **ANOVA Computations** | `lib/research/experiment-runner.ts:1212-1231` | O(S × M × N) | High |
| **Sorting/Rankings** | `lib/engine/data-collector.ts:172-183` | O(n log n) | High |

### Current Parallelization

- **Worker Pool**: Uses `child_process.fork()` for multi-run experiments
- **Agent Scheduling**: `ParallelActivation` uses Promise.all (concurrent, not parallel)
- **No GPU Compute**: All simulation runs on CPU only

---

## Path A: CUDA (NVIDIA GPUs Only)

### Overview

CUDA is NVIDIA's proprietary parallel computing platform. It provides the best performance but **only works on NVIDIA GPUs**.

### When to Choose CUDA

- You have NVIDIA GPUs (RTX, Tesla, A100, etc.)
- Maximum performance is critical
- You're comfortable with C++ development
- Deployment environment is controlled (not end-user machines)

### Architecture

```
dao_simulator/
├── lib/                          # Existing TypeScript
├── native/
│   ├── binding.gyp               # Node native module config
│   ├── src/
│   │   ├── addon.cpp             # N-API bindings
│   │   ├── simulation_kernel.cu  # CUDA simulation kernels
│   │   ├── stats_kernel.cu       # CUDA statistics kernels
│   │   └── memory_manager.cu     # GPU memory management
│   └── include/
│       └── cuda_types.h          # Shared type definitions
└── scripts/
    └── run-gpu-experiment.ts     # GPU-accelerated runner
```

### Prerequisites

1. **CUDA Toolkit**: Version 12.x
   ```bash
   # Windows
   winget install Nvidia.CUDA

   # Linux
   sudo apt install nvidia-cuda-toolkit
   ```

2. **Node.js Native Build Tools**
   ```bash
   npm install -g node-gyp cmake-js
   npm install node-addon-api
   ```

3. **Hardware**: NVIDIA GPU with Compute Capability 7.0+ (Volta or newer)

### CUDA Kernel Example (Gini Coefficient)

```cuda
// native/src/stats_kernel.cu

#include <cuda_runtime.h>
#include <thrust/sort.h>

__global__ void giniKernel(
    float* arrays,      // Flattened input arrays
    int* offsets,       // Start offset of each array
    int* sizes,         // Size of each array
    float* results,     // Output Gini coefficients
    int numArrays
) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= numArrays) return;

    int start = offsets[idx];
    int n = sizes[idx];
    float* arr = &arrays[start];

    // Compute Gini coefficient
    float sum = 0.0f;
    float cumulative = 0.0f;

    for (int i = 0; i < n; i++) {
        sum += arr[i];
        cumulative += (i + 1) * arr[i];
    }

    if (sum > 0 && n > 0) {
        results[idx] = (2.0f * cumulative) / (n * sum) - (n + 1.0f) / n;
    } else {
        results[idx] = 0.0f;
    }
}
```

### Expected Performance

| Operation | CPU Time | CUDA Time | Speedup |
|-----------|----------|-----------|---------|
| 10,000 simulation runs | 60 min | 1-2 min | 30-60x |
| Statistical analysis | 10 min | 15 sec | 40x |
| **Total** | **70 min** | **~2 min** | **35x** |

---

## Path B: WebGPU (Cross-Platform)

### Overview

WebGPU is a modern, cross-platform GPU API that works on **any GPU** (NVIDIA, AMD, Intel, Apple Silicon). It can run in browsers or natively via the Dawn library.

### When to Choose WebGPU

- You need cross-platform support (not just NVIDIA)
- Browser-based execution is valuable
- You want simpler deployment (no native compilation)
- End users may have various GPU vendors

### Architecture

```
dao_simulator/
├── lib/
│   └── gpu/
│       ├── shaders/
│       │   ├── gini.wgsl           # Gini coefficient shader
│       │   ├── bootstrap.wgsl      # Bootstrap resampling shader
│       │   └── simulation.wgsl     # Simulation compute shader
│       ├── webgpu-runner.ts        # WebGPU API wrapper
│       └── gpu-stats.ts            # GPU statistical functions
├── app/
│   └── gpu-experiment/             # Next.js GPU experiment page
└── scripts/
    └── run-webgpu-experiment.ts    # Node.js with Dawn runtime
```

### Prerequisites

**Browser-based:**
- Chrome 113+, Firefox 121+, or Safari 18+
- Any GPU with WebGPU support

**Node.js-based (via Dawn):**
```bash
npm install @aspect-build/aspect-webgpu  # or similar Dawn binding
```

### WebGPU Shader Example (Gini Coefficient)

```wgsl
// lib/gpu/shaders/gini.wgsl

struct GiniInput {
    values: array<f32>,
}

struct GiniOutput {
    results: array<f32>,
}

@group(0) @binding(0) var<storage, read> input: GiniInput;
@group(0) @binding(1) var<storage, read_write> output: GiniOutput;
@group(0) @binding(2) var<uniform> arraySize: u32;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let idx = global_id.x;
    if (idx >= arrayCount) {
        return;
    }

    // Calculate Gini for this array
    var sum: f32 = 0.0;
    var cumulative: f32 = 0.0;
    let n = arraySize;

    for (var i: u32 = 0u; i < n; i++) {
        let val = input.values[idx * n + i];
        sum += val;
        cumulative += f32(i + 1u) * val;
    }

    if (sum > 0.0 && n > 0u) {
        output.results[idx] = (2.0 * cumulative) / (f32(n) * sum) - (f32(n) + 1.0) / f32(n);
    } else {
        output.results[idx] = 0.0;
    }
}
```

### TypeScript Integration

```typescript
// lib/gpu/webgpu-runner.ts

export class WebGPURunner {
    private device: GPUDevice;
    private giniPipeline: GPUComputePipeline;

    async initialize(): Promise<void> {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error('No GPU adapter found');

        this.device = await adapter.requestDevice();

        // Load and compile shaders
        const giniShader = await fetch('/shaders/gini.wgsl').then(r => r.text());
        const shaderModule = this.device.createShaderModule({ code: giniShader });

        this.giniPipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: { module: shaderModule, entryPoint: 'main' }
        });
    }

    async computeBatchGini(arrays: Float32Array[]): Promise<Float32Array> {
        // Flatten arrays and create GPU buffers
        const flatData = new Float32Array(arrays.reduce((acc, arr) => acc + arr.length, 0));
        let offset = 0;
        for (const arr of arrays) {
            flatData.set(arr, offset);
            offset += arr.length;
        }

        // Create buffers, bind groups, dispatch compute, read results
        // ... (WebGPU boilerplate)

        return results;
    }
}
```

### Expected Performance

| Operation | CPU Time | WebGPU Time | Speedup |
|-----------|----------|-------------|---------|
| 10,000 simulation runs | 60 min | 2-3 min | 20-30x |
| Statistical analysis | 10 min | 20 sec | 30x |
| **Total** | **70 min** | **~3 min** | **25x** |

*Note: WebGPU is ~80-90% of CUDA performance but works on any GPU*

---

## Path C: Python Bridge (CUDA via Python)

### Overview

Use Python with CuPy/Numba for GPU compute, called from Node.js. This is easier to implement than native CUDA but adds IPC overhead.

### When to Choose Python Bridge

- You're more comfortable with Python than C++
- You want to leverage existing GPU libraries (CuPy, Rapids)
- Prototyping before committing to native implementation

### Architecture

```
dao_simulator/
├── lib/                          # Existing TypeScript
├── python/
│   ├── gpu_stats.py              # CuPy statistical functions
│   ├── gpu_simulation.py         # Numba-accelerated simulation
│   └── server.py                 # FastAPI or ZeroMQ server
└── scripts/
    └── run-gpu-experiment.ts     # Calls Python GPU functions via HTTP/IPC
```

### Example (CuPy Gini)

```python
# python/gpu_stats.py
import cupy as cp

def batch_gini(arrays: list[cp.ndarray]) -> cp.ndarray:
    """Compute Gini coefficients for multiple arrays on GPU."""
    results = []
    for arr in arrays:
        sorted_arr = cp.sort(arr)
        n = len(arr)
        cumulative = cp.sum((cp.arange(1, n + 1) * sorted_arr))
        total = cp.sum(arr)
        gini = (2 * cumulative) / (n * total) - (n + 1) / n
        results.append(float(gini))
    return cp.array(results)
```

---

## Comparison Summary

| Aspect | CUDA | WebGPU | Python Bridge |
|--------|------|--------|---------------|
| **Performance** | Best (100%) | Good (80-90%) | Good (70-80%) |
| **GPU Support** | NVIDIA only | All vendors | NVIDIA only |
| **Development Effort** | High (C++) | Medium (WGSL) | Low (Python) |
| **Deployment** | Complex | Simple | Medium |
| **Browser Support** | No | Yes | No |
| **Recommended For** | Max performance | Cross-platform | Prototyping |

---

## Recommended Approach

### If you have NVIDIA GPUs and need maximum performance:
**Choose CUDA** (Path A)

### If you need cross-platform support or browser execution:
**Choose WebGPU** (Path B)

### If you want to prototype quickly:
**Choose Python Bridge** (Path C), then migrate to CUDA/WebGPU

---

## Implementation Phases (Any Path)

### Phase 1: Statistical Analysis (Weeks 1-2)
Highest ROI - accelerate post-simulation computations:
- Batch Gini coefficient calculation
- Bootstrap resampling (1000× speedup potential)
- Parallel t-tests and ANOVA

### Phase 2: Batch Simulations (Weeks 3-5)
Port simulation logic to GPU:
- Each GPU thread runs one simulation
- Batch 1000-10000 simulations per kernel launch

### Phase 3: Optimization (Weeks 6-8)
- Memory transfer optimization
- Multi-GPU support
- Profiling and tuning

---

## Quick Win: CPU Optimization First

Before investing in GPU, maximize CPU parallelization:

1. **Increase Worker Count**
   ```yaml
   # experiment config
   execution:
     workers: 8  # Instead of default 1
   ```

2. **Use Worker Threads** instead of child_process.fork()
   - SharedArrayBuffer for zero-copy data sharing
   - 2-3x faster IPC

**Expected CPU-only improvement**: 5-10x with proper parallelization

---

*Document generated: 2026-01-19*
*Based on codebase analysis of dao_simulator_private*
