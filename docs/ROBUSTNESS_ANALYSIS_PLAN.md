# Publication Robustness Analysis Plan

**Status:** Frozen before the publication robustness campaign.

The robustness studies are supporting exploratory analyses. They test whether
the interpretation of the four core mechanism experiments depends on major
modeling assumptions. They do not create additional confirmatory hypotheses
and cannot replace a failed core endpoint.

## Pilot evidence and design decision

The verified campaign `robustness-pilot-20260717-1726` contains 104 runs.
It was independently reanalyzed as
`robustness-pilot-independent-20260718`:

- Reanalysis identity:
  `3fa95fc725c819c5bf3507e379052195bfbc8d657895c4c00b4774a67ae0a9a7`
- Analysis SHA-256:
  `18ab1acc8a8a59859c27063d397cee81ac69165a18969b41a6f6d05be6255a01`
- Claims SHA-256:
  `7bfac6c87e43f9f763338de8d57c9e6cc6639f30fc1d1abc88fd6a301ab835a6`

With eight paired seeds, the forum contrast was within the declared
participation margin and the protocol-yield contrasts were statistically
detectable but far inside their practical margin. Horizon and learning
contrasts were too imprecise to establish importance or equivalence. The
original delegation endpoint was degenerate and is not reused. Subsequent
fixed-code stress pilots found no outcome-relevant multi-hop delegation chains;
that boundary remains an explicitly negative exploratory result.

The final design uses 100 paired seeds per condition. This matches the core
campaign's conservative replication depth and is larger than the approximate
pilot-based requirement for the horizon contrast. It also provides useful
precision for the noisier learning ablation without selecting a result after
the final runs.

One simulation step is one hour. Annual treasury yields are converted with
8,760 steps per 365-day year; the value is explicit in the frozen treasury and
robustness configurations rather than inherited from an implicit default.

## Frozen design

The schedule contains 100 unique seeds:
`930001 + 37 * i` for integer `i` from 0 through 99. Every condition within
every study uses the identical ordered schedule. These seeds are disjoint from
the pilot schedule. Configurations are generated into
`experiments/robustness-final/` by `npm run catalog:robustness`.

| Study | Conditions | Primary outcome | SOEI / equivalence margin | Planned runs |
|---|---:|---|---:|---:|
| Horizon sensitivity | 500, 1,000, 2,000 steps | Proposal completion rate | 0.05 absolute | 300 |
| Passive protocol yield | 0%, 2%, 5% annual | Treasury growth rate | 0.05 relative to the reference magnitude | 300 |
| Learning-agent ablation | Disabled, enabled with four within-run episodes | Governance activity index | 0.05 index units | 200 |
| Forum-layer ablation | Disabled, enabled | Voter participation rate | 0.05 absolute | 200 |
| Delegation-depth stress | Depth 1, depth 3, unlimited | Whale influence | 0.05 absolute vote-weight share | 300 |
| **Total** |  |  |  | **1,300** |

The delegation study uses a 100% delegation-specialist population and the
vote-history-based `whale_influence` metric. Final-state incoming-delegation
HHI remains a secondary diagnostic and must not be substituted for the primary
endpoint.

## Analysis

Each non-reference condition is compared with its study's declared reference
using a paired mean difference over identical seeds. Reports include the
number of complete pairs, missing pairs, excluded non-finite values, mean and
median differences, 95% parametric and paired-bootstrap intervals, paired
t-statistic, sign-flip p-value, Cohen's dz, and the practical-equivalence
interval. Holm correction is applied within each study's comparison family.

An effect is described as practically equivalent only when its full 95%
interval lies inside the frozen margin. It is practically important only when
its full interval lies outside the margin on one side. Every other result is
reported as inconclusive. Statistical significance without practical
importance is not described as substantively meaningful.

## Execution and reporting rules

1. Run these configurations only after the core non-LLM campaign verifies.
2. Bind the final campaign to the same validation and calibration reports used
   by the core campaign.
3. Require a clean release commit, fixed seeds, exact run accounting, zero
   unhandled failures, and verified artifact hashes.
4. Retain all negative, null, and degenerate secondary outcomes.
5. Analyze from immutable raw runs in a new derivation directory.
6. Copy the verified campaign to a second read-only location and reproduce the
   derived hashes in a fresh process.
7. Treat these studies as supporting exploratory evidence in the manuscript,
   figures, claim registry, UI, and archive metadata.
