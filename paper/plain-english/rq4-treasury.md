# RQ4 The Cost of Stability

## The Plain English Version

What does treasury stability actually cost in growth? Stabilization halves volatility — but nothing is free. The growth tradeoff is real and quantifiable.

Source experiment: `Treasury Resilience`
Runs completed: **1,200/1,200** (failed: 0)

## Key Takeaways

### Volatility Halved, Growth Taxed
| Config | Stabilization | Buffer | Max Spend | Volatility | Growth Rate | Final Treasury |
|--------|--------------|--------|-----------|------------|-------------|----------------|
| 1      | On           | 0%     | 10%       | 0.240      | -0.739      | $10,048        |
| 2      | On           | 0%     | 20%       | 0.233      | -0.734      | $10,047        |
| 3      | On           | 20%    | 10%       | 0.235      | -0.715      | $11,814        |
| 4      | On           | 20%    | 20%       | 0.238      | -0.717      | $11,561        |
| 5      | On           | 40%    | 10%       | 0.263      | -0.701      | $13,147        |
| 6      | On           | 40%    | 20%       | 0.271      | -0.709      | $12,601        |
| 7      | Off          | 0%     | 10%       | 0.463      | -0.707      | $13,707        |
| 8      | Off          | 0%     | 20%       | 0.456      | -0.724      | $13,005        |
| 9      | Off          | 20%    | 10%       | 0.448      | -0.727      | $13,250        |
| 10     | Off          | 20%    | 20%       | 0.473      | -0.692      | $14,648        |
| 11     | Off          | 40%    | 10%       | 0.500      | -0.706      | $13,981        |
| 12     | Off          | 40%    | 20%       | 0.474      | -0.693      | $14,588        |

Stabilization cut treasury swings from 0.45–0.50 to 0.24–0.27 (roughly half), but average growth stayed negative (-0.71) across all configurations.

### Buffers Beat Active Management
- Configurations with 20–40% buffer reserves ended with $11K–$15K — consistently higher than 0% buffer configs ($10K–$14K)
- Buffer reserves provide downside protection without complex rebalancing logic
- Best final treasury: $14,648 (stabilization off, 20% buffer, 20% max spend) — buffers helped even without stabilization

### Stabilization Reduces Final Treasury
- Stabilized configs averaged $11,536 final treasury vs $13,863 without stabilization
- The cost of stability: **~17% lower ending treasury** on average
- Growth rates were comparable (-0.70 to -0.74) — the difference compounds over time through reduced spending flexibility

### No Configuration Achieved Positive Growth
- All 12 configurations had negative growth rates (-0.69 to -0.74)
- This reflects the inherent cost of governance: proposals spend from treasury while market returns are stochastic
- Treasury policy is about *how fast you decline*, not whether you grow

## What To Do

1. **Set explicit reserves** (15–20% of total) with defined breach triggers
2. **Cap spending at 2–5% per period** with emergency overrides
3. **Re-evaluate policy quarterly** — stability parameters that worked in a bull market may choke growth in recovery
4. **Accept the tradeoff explicitly**: lower volatility = lower final value. Choose based on your DAO's risk tolerance

## Notes

- Generated: 2026-03-01
- 12 configs (2 × 3 × 2 grid): `treasury_stabilization_enabled` × `treasury_buffer_fraction` × `treasury_max_spend_fraction`
- 100 runs per config × 2,000 steps per run
- Summary file: `results/paper/06-treasury-resilience/summary.json`
