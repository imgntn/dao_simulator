# DAO Simulator GPU Acceleration Implementation Plan

## Overview

This document outlines a phased approach to accelerating the DAO simulator, starting with CPU optimizations and progressing to GPU acceleration for statistical analysis.

**Target Outcome**: 20-50x speedup for batch experiments (10K runs: 17 min → 30 sec)

---

## Phase 1: CPU Caching Optimizations (5-10x speedup)

### 1.1 Voting Power Caching

**Problem**: `DelegationResolver.resolveVotingPower()` recalculates the full delegation chain every call, even when delegations haven't changed.

**Location**: `lib/delegation/delegation-resolver.ts`

**Solution**: Add a caching layer with dirty tracking

```typescript
// Cache structure
interface VotingPowerCache {
  power: number;
  calculatedAtStep: number;
  delegationHash: string;  // Hash of delegation state
}

// Invalidation triggers:
// - delegate() called
// - undelegate() called
// - setRepresentative() called
// - Token balance changes
```

**Expected Speedup**: 3-5x on voting power calculations

### 1.2 Proposal Snapshot Optimization

**Problem**: `Proposal.takeVotingPowerSnapshot()` iterates all members and resolves voting power for each, even if a recent snapshot exists.

**Location**: `lib/data-structures/proposal.ts`

**Solution**: Reuse DAO-level voting power cache

```typescript
// Instead of:
for (const member of this.dao.members) {
  const power = DelegationResolver.resolveVotingPower(member);
}

// Use cached values:
for (const member of this.dao.members) {
  const power = this.dao.getCachedVotingPower(member);
}
```

**Expected Speedup**: 2-3x on proposal creation

### 1.3 Lazy Data Collection

**Problem**: `DataCollector.collect()` calculates Gini coefficients every step, requiring O(n log n) sorting.

**Location**: `lib/engine/data-collector.ts`

**Solution**: Calculate on-demand with caching

```typescript
// Cache Gini until token distribution changes
private giniCache: { step: number; value: number } | null = null;

getGini(currentStep: number): number {
  if (this.giniCache?.step === currentStep) {
    return this.giniCache.value;
  }
  // Calculate and cache
}
```

**Expected Speedup**: 1.5-2x on data collection

### 1.4 Memoized Delegation Chain Traversal

**Problem**: Delegation chains are traversed repeatedly for the same members within a single step.

**Location**: `lib/delegation/delegation-resolver.ts`

**Solution**: Per-step memoization that clears at step boundaries

```typescript
// Clear at start of each step
private stepMemo = new Map<string, number>();
private memoStep = -1;

resolveVotingPower(member, currentStep): number {
  if (currentStep !== this.memoStep) {
    this.stepMemo.clear();
    this.memoStep = currentStep;
  }

  if (this.stepMemo.has(member.uniqueId)) {
    return this.stepMemo.get(member.uniqueId);
  }
  // ... calculate and store
}
```

**Expected Speedup**: 2-3x on delegation-heavy simulations

---

## Phase 2: Python GPU Bridge for Statistics (50-100x for batch)

### 2.1 Architecture

```
┌─────────────────┐     JSON/Binary      ┌──────────────────┐
│  Node.js        │ ◄──────────────────► │  Python Process  │
│  (Simulation)   │    child_process     │  (CuPy/NumPy)    │
└─────────────────┘                      └──────────────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │  CUDA GPU        │
                                         │  (Statistics)    │
                                         └──────────────────┘
```

### 2.2 GPU-Accelerated Functions

| Function | Current Location | GPU Speedup |
|----------|-----------------|-------------|
| `bootstrapConfidenceInterval()` | statistics.ts | 100-200x |
| `calculateGini()` | data-collector.ts, fork-worker.ts | 50x |
| `welchTTest()` | statistics.ts | 40x |
| Batch sorting for rankings | data-collector.ts | 30x |

### 2.3 Python Module Structure

```
python/
├── gpu_stats/
│   ├── __init__.py
│   ├── bootstrap.py      # Bootstrap CI on GPU
│   ├── gini.py           # Gini coefficient on GPU
│   ├── statistical.py    # T-tests, ANOVA on GPU
│   └── server.py         # FastAPI/stdin interface
├── requirements.txt      # cupy-cuda12x, numpy, etc.
└── setup.py
```

### 2.4 Interface Design

**Option A: Subprocess with JSON** (simpler, slightly slower)
```typescript
// Node.js side
const result = await callPythonGPU('bootstrap', {
  values: metricValues,
  n_samples: 1000,
  confidence: 0.95
});
```

**Option B: Shared memory with MessagePack** (faster, more complex)
```typescript
// Use shared ArrayBuffer for large data transfers
const sharedBuffer = new SharedArrayBuffer(values.length * 8);
```

### 2.5 Fallback Strategy

```python
# gpu_stats/__init__.py
try:
    import cupy as cp
    GPU_AVAILABLE = True
except ImportError:
    import numpy as cp  # Fallback to CPU NumPy
    GPU_AVAILABLE = False
```

---

## Phase 3: Taichi Simulation Core (Future - 20-30x additional)

### 3.1 Target Components

- Voting power resolution (parallel graph traversal)
- Proposal vote aggregation
- Token distribution updates

### 3.2 Data Structure Transformation

Current (Array of Structs - AOS):
```typescript
members: DAOMember[]  // Each member is an object
```

GPU-friendly (Struct of Arrays - SOA):
```typescript
interface MembersGPU {
  tokens: Float32Array;
  reputation: Float32Array;
  stakedTokens: Float32Array;
  // ... flat arrays
}
```

### 3.3 Implementation Approach

```python
import taichi as ti

@ti.kernel
def update_voting_power(
    tokens: ti.types.ndarray(dtype=ti.f32),
    staked: ti.types.ndarray(dtype=ti.f32),
    delegation_targets: ti.types.ndarray(dtype=ti.i32),
    delegation_amounts: ti.types.ndarray(dtype=ti.f32),
    output: ti.types.ndarray(dtype=ti.f32)
):
    for i in range(tokens.shape[0]):
        power = tokens[i] + staked[i]
        # Add delegated power (iterative for chains)
        output[i] = power
```

---

## Implementation Timeline

### Week 1: Phase 1 - CPU Optimizations ✅ COMPLETED
- [x] Day 1-2: Implement voting power cache in DelegationResolver
- [x] Day 2-3: Add cache invalidation triggers in DAOMember
- [x] Day 3-4: Implement lazy Gini calculation in DataCollector
- [x] Day 4-5: Add per-step memoization for delegation traversal
- [x] Day 5: Testing and benchmarking (494/495 tests passing)

### Week 2-3: Phase 2 - Python GPU Bridge ✅ COMPLETED
- [x] Day 1: Set up Python package structure
- [x] Day 2-3: Implement CuPy bootstrap resampling (python/gpu_stats/bootstrap.py)
- [x] Day 3-4: Implement CuPy Gini calculation (python/gpu_stats/gini.py)
- [x] Day 4-5: Create Node.js ↔ Python interface (lib/research/gpu-stats-bridge.ts)
- [ ] Day 6-7: Integration with experiment runner
- [ ] Day 8-10: Testing, benchmarking, fallback handling

### Week 4+: Phase 3 - Taichi (Optional)
- Evaluate Phase 1+2 results
- Decide if additional speedup needed
- Implement if ROI justified

---

## Success Metrics

| Metric | Current | Phase 1 | Phase 2 | Target |
|--------|---------|---------|---------|--------|
| Single simulation | 100ms | 50-80ms | 50-80ms | <50ms |
| 10K batch runs | 17 min | 2-3 min | 2-3 min | <3 min |
| Statistical analysis | 5 min | 4 min | 5 sec | <10 sec |
| **Total 10K experiment** | **22 min** | **6-7 min** | **2-3 min** | **<3 min** |

---

## Files to Modify

### Phase 1
| File | Changes |
|------|---------|
| `lib/delegation/delegation-resolver.ts` | Add caching, memoization |
| `lib/agents/base.ts` | Add cache invalidation hooks |
| `lib/data-structures/dao.ts` | Add DAO-level voting power cache |
| `lib/engine/data-collector.ts` | Lazy Gini calculation |
| `lib/engine/simulation.ts` | Clear caches at step boundaries |

### Phase 2
| File | Changes |
|------|---------|
| `python/gpu_stats/*.py` | New GPU statistical functions |
| `lib/research/statistics.ts` | Add Python bridge calls |
| `lib/research/experiment-runner.ts` | Use GPU for batch analysis |
| `package.json` | Add Python subprocess scripts |

---

## Risk Mitigation

### Risk 1: Cache Invalidation Bugs
**Mitigation**: Add comprehensive tests comparing cached vs uncached results

### Risk 2: Python Process Overhead
**Mitigation**: Batch multiple operations, use binary serialization

### Risk 3: GPU Not Available
**Mitigation**: Automatic fallback to NumPy CPU implementation

### Risk 4: Numerical Precision
**Mitigation**: Use float64 for critical calculations, validate against CPU

---

## Next Steps

1. **Immediate**: Implement Phase 1 CPU optimizations
2. **After validation**: Set up Python GPU environment
3. **After Phase 2**: Benchmark and decide on Phase 3
