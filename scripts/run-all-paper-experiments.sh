#!/bin/bash
# Run all paper experiments with 1000 runs per config
# Updated 2026-02-12 for improved simulation

RUNS=1000
WORKERS=8

echo "=== Paper Experiments Suite ==="
echo "Runs per config: $RUNS"
echo "Workers: $WORKERS"
echo "Started: $(date)"
echo ""

experiments=(
  "00-academic-baseline"
  "00-realistic-baseline"
  "01-calibration-participation"
  "02-ablation-governance"
  "03-sensitivity-quorum"
  "04-governance-capture-mitigations"
  "05-proposal-pipeline"
  "06-treasury-resilience"
  "07-inter-dao-cooperation"
  "08-scale-sweep"
  "09-voting-mechanisms"
)

for exp in "${experiments[@]}"; do
  echo "=========================================="
  echo "Running: $exp"
  echo "Time: $(date)"
  echo "=========================================="
  npx tsx scripts/run-experiment.ts "experiments/paper/${exp}.yaml" --runs $RUNS -c $WORKERS
  echo ""
done

echo "=========================================="
echo "Running: 10-calibration-validation (via BacktestRunner)"
echo "Time: $(date)"
echo "=========================================="
npx tsx scripts/run-calibration-validation.ts
echo ""

echo "=== All experiments complete ==="
echo "Finished: $(date)"
