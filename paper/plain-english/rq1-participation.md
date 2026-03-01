# RQ1 Quorum Design & Governance Cliffs

## The Plain English Version

Where are the hidden cliffs in quorum design — and how do you set thresholds from data instead of gut feel?

Source experiments: `Calibration - Participation Dynamics` + `Sensitivity - Quorum Threshold` + `Scale Sweep`
Runs completed: **2,300 total** (900 + 900 + 500, failed: 0)

## Key Takeaways

### The Cliff Is Real and It's Steep
| Quorum | Quorum Reach Rate | Pass Rate (if reached) |
|--------|-------------------|----------------------|
| 1%     | 99.9%             | 98.5%                |
| 5%     | 99.9%             | 98.2%                |
| 10%    | 97.9%             | 97.7%                |
| 15%    | 70.8%             | 97.7%                |
| 20%    | 25.4%             | 98.2%                |
| 25%    | 3.4%              | 97.9%                |
| 30%    | 0.3%              | 97.7%                |
| 40%    | 0.0%              | 98.2%                |

The drop from 10% to 20% quorum is catastrophic: quorum reach falls from 98% to 25%. Pass rate among proposals that *do* reach quorum stays at 97–98% throughout — voters agree, they just don't show up.

### Turnout Is Stable but Low
- Baseline turnout: ~22.6% across all quorum settings
- Turnout doesn't respond to quorum changes — it's a function of member behavior, not threshold design
- Voter retention rate: 91.8% on average — voters who participate tend to keep participating

### Bigger DAOs, Lower Turnout
- 50 members: ~26% participation
- 500 members: ~22% participation
- Pass rate actually *rose* with scale — fewer but more engaged voters

### Participation Levers Have Limits
- Boosting `voting_activity` from 0.15 to 0.35 raised turnout from ~16% to ~24%
- Adding a participation target (incentive floor) had diminishing returns above 15%
- Best config: `voting_activity=0.35, participation_target_rate=0.15` → 23.7% turnout, 99.9% quorum reach

## What To Do

1. **Set quorum from observed turnout data** — a practical rule: ~80% of natural turnout
2. **Start low (4–5%) and adjust upward** — it's easier to raise than recover from failure
3. **Use delegation to boost effective participation** before raising thresholds
4. **Don't expect quorum to fix apathy** — turnout is a behavioral constant, not a tunable parameter

## Notes

- Generated: 2026-03-01
- Quorum sensitivity: 9 quorum levels × 100 runs × 2,000 steps (Experiment 03)
- Participation dynamics: 9 configs × 100 runs × 2,000 steps (Experiment 01)
- Scale sweep: 5 sizes × 100 runs × 2,000 steps (Experiment 08)
- Summary files: `results/paper/03-sensitivity-quorum/summary.json`, `results/paper/01-calibration-participation/summary.json`
