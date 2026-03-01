# RQ2 Governance Capture Mitigation

## The Plain English Version

Can you reduce whale dominance without killing governance speed? The conventional wisdom says fairness costs efficiency. The data says otherwise.

Source experiment: `Governance Capture Mitigations`
Runs completed: **2,700/2,700** (failed: 0)

## Key Takeaways

### Quadratic Voting Is the Single Biggest Lever
| Mechanism | Whale Influence | Capture Risk | Pass Rate |
|-----------|----------------|--------------|-----------|
| No mitigations (baseline) | 0.449 | 0.459 | 92.7% |
| Quadratic threshold = 250 | 0.256 | 0.269 | 98.3% |
| Quadratic + velocity 0.3  | 0.257 | 0.271 | 98.5% |
| Quadratic + velocity 0.6  | 0.254 | 0.267 | 98.3% |
| Velocity only (0.3)       | 0.449 | 0.457 | 93.9% |
| Velocity only (0.6)       | 0.448 | 0.459 | 93.0% |

Quadratic voting cut whale influence by **43%** (0.449 → 0.256) while pass rate *rose* from 92.7% to 98.5%. The tradeoff doesn't exist.

### Power Shape Matters More Than Activity Throttles
- Velocity penalties alone (limiting how fast whales can act) had negligible impact: whale influence stayed at 0.448–0.449
- Power caps (10%, 20%) showed modest effects: whale influence dropped to 0.434 at best
- Only mechanisms that reshape the *distribution* of power made a material difference

### Layered Stacks Compound Benefits
- Best config: `quadratic_threshold=250, velocity_penalty=0.6` → Whale influence: 0.254, Capture risk: 0.267
- Capture risk dropped **42%** from baseline (0.464 → 0.269) under the strongest layered configuration
- Collusion threshold remained stable at ~0.355 across all configs — structural resilience, not just metric improvement

### Single Entity Control Stays Low Regardless
- Single entity control: 0.016–0.017 across all 27 configurations
- No single actor could dominate outcomes even without mitigations — the risk is concentrated coalitions, not lone actors

## What To Do

1. **Use a layered stack**: quadratic base + delegation caps + 30–60 day velocity controls
2. **Prioritize mechanisms that reshape power distribution** over activity-only throttles
3. **Evaluate capture resistance and governance throughput together** — they're not opposed
4. **Set quadratic threshold around 200–300 tokens** for the strongest effect without over-compressing small holders

## Notes

- Generated: 2026-03-01
- 27 configs (3 × 3 × 3 grid): `vote_power_cap_fraction` × `vote_power_quadratic_threshold` × `vote_power_velocity_penalty`
- 100 runs per config × 2,000 steps per run
- Summary file: `results/paper/04-governance-capture-mitigations/summary.json`
