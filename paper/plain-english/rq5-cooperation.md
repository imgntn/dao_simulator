# RQ5 Inter-DAO Cooperation

## The Plain English Version

Why does specialization beat scale in cross-DAO partnerships? Generic connections produce half the activity and lower treasury outcomes than role-based partnerships.

Source experiment: `Inter-DAO Cooperation`
Runs completed: **500/500** (failed: 0)

## Key Takeaways

### Specialized Partnerships Dominate
| Topology | Inter-DAO Proposals | Success Rate | Ecosystem Treasury | Alignment |
|----------|--------------------|--------------|--------------------|-----------|
| Specialized DAOs    | 75.8 | 23.4% | $26,107 | 0.542 |
| Homogeneous Gov     | 50.3 | 23.0% | $24,071 | 0.557 |
| Asymmetric Treasury | 49.8 | 22.7% | $24,948 | 0.554 |
| Heterogeneous Gov   | 48.9 | 21.4% | $24,408 | 0.534 |
| Isolated (no links) | 0.0  | 0.0%  | $35,780 | 0.000 |

Specialized partnerships generated **50% more inter-DAO proposals** (75.8 vs 50.3) and **8% higher ecosystem treasury** ($26,107 vs $24,071) than homogeneous connections.

### 21–23% Success Is the Current Ceiling
- Best topology (specialized): 23.4% inter-DAO proposal success rate
- Generic topologies clustered at 21–23% regardless of governance alignment or treasury balance
- Isolation produces 0% cooperation (by definition) but the *highest* raw ecosystem treasury ($35,780) — cooperation has a cost

### Cooperation Has a Treasury Cost
- Isolated DAOs preserved the most treasury ($35,780) because no resources flow outward
- All cooperating topologies ended with $24K–$26K — cooperation consumes ~30% of potential treasury
- The return on cooperation: more proposals, more resource flow, but lower absolute reserves

### Moderate Alignment Is the Norm
- Cross-DAO approval alignment: 0.53–0.56 across cooperating topologies
- Full alignment (1.0) between autonomous organizations is unrealistic
- Homogeneous governance produced the highest alignment (0.557), but only marginally better than others

### Resource Flow Tracks Specialization
- Specialized DAOs generated the highest resource flow volume ($53,547 vs $31,158 average)
- More proposals = more inter-DAO resource exchange
- Resource flow is the economic mechanism through which cooperation creates value

## What To Do

1. **Define fairness explicitly before launch**: cost split, value split, and dispute path
2. **Use coordinator/hub patterns** for multi-party collaborations where negotiation overhead is high
3. **Build overlap and trust** through recurring joint work and shared participant channels
4. **Design for disagreement** — don't assume alignment will be high between autonomous organizations

## Notes

- Generated: 2026-03-01
- 5 scenarios: homogeneous-governance, heterogeneous-governance, asymmetric-treasury, specialized-daos, isolated-daos
- 100 runs per scenario × 500 steps per run (3 DAOs per scenario)
- Summary file: `results/paper/07-inter-dao-cooperation/summary.json`
