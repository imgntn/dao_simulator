# Confirmatory Pilot Decision Log

Status: frozen design decision before the final confirmatory campaign
Decision date: 2026-07-17

## Evidence used

The original developmental campaign `pilot-20260717-1548` completed all 648
planned simulations but failed while analyzing the original RQ3 endpoint.
The source campaign remains immutable and failed. Its unaffected RQ1, RQ2,
and RQ4 runs were reanalyzed through the independently verifiable derivation
`pilot-rq1-rq2-rq4-20260717`:

- Reanalysis identity:
  `ddbc4329a1c35dc680b15bf60f5b73a6b729a4f13621d1606fece64bf368e808`
- Source runs: 576
- Analysis SHA-256:
  `1d79b089ba4d8b97cd5e199d48043f689635bdb6a06c1d1d1b589161c1109c95`
- Claims SHA-256:
  `33d9f685dde8b7f4acf9bff8bcc29f25dfe2a3afaf759996c8248f440a55f4a1`

After terminal proposal timestamps were repaired, the RQ3 development
campaign `pilot-rq3-resolutionfix-20260717-1657` completed all 72 runs but
was correctly rejected because planning and indexing used different
condition-config representations. The raw simulations were rebound to the
archived task plan only in memory by the verifiable derivation
`rq3-resolutionfix-pilot-20260717`:

- Reanalysis identity:
  `b6ccbd533da7b0635b385a4b6b628d730fa23b6596738ba58eb7680f30a0a1d8`
- Source runs: 72
- Analysis SHA-256:
  `cd898a11875f050b62f945adcb0b52255b642d1595da11b74bff4f218c28d095`
- Claims SHA-256:
  `edc3137a628fe2674b30fe651117b011ffb1ebef5c8d7691f323e56448eed335`

The amended RQ2 and RQ4 endpoints were recomputed from metrics already
captured in the original raw runs. The derivation engine verified that the
amended configs do not change the base model, sweep, horizon, run count, or
seed schedule. The amended derivation is
`pilot-amended-rq2-rq4-20260717`:

- Reanalysis schema: 1.1.0
- Reanalysis identity:
  `63da18ad79ef971efb7b316f1d42a26ec368a3ad1fa7107411f4afd69f5dd622`
- Source runs: 504
- Analysis SHA-256:
  `9d9ac0c45fb012ff4206cb496ede258279eecdfff5862202914118fc5f8b5d52`
- Claims SHA-256:
  `faa906596627d8718ae50b7109f28f29b6efafd16662c797f184005eb8a1d2af`

These derivations are developmental design evidence. They cannot support
confirmatory findings.

## Endpoint decisions

### RQ1 quorum and participation

The proposal-completion endpoint was finite and non-degenerate. Condition
means ranged from 0.9569 to 0.9702. The primary endpoint and 0.05 absolute
SOEI are retained.

### RQ2 capture mitigation

The original `delegate_concentration` endpoint was exactly zero in all 216
runs. It measures incoming token-delegation HHI, while the experiment
intervenes on proposal-time vote-weight caps, quadratic attenuation, and
velocity penalties. It was therefore an invalid primary construct for this
experiment.

The primary endpoint is amended to `whale_influence`: the share of cast
proposal vote weight attributable to the top token-holding decile.
Condition means ranged from 0.2551 to 0.4588, with factorial
R-squared 0.868. The SOEI is 0.05 absolute vote-weight share.
`delegate_concentration` is removed from this experiment rather than
reinterpreted.

### RQ3 proposal pipeline

After terminal-time lifecycle repair, median decision time ranged from 32.5
to 70.5 steps, with 39 distinct values across 72 runs. Condition means
ranged from 43.8125 to 60.3125, proposal completion remained approximately
0.94–0.97, and abandonment remained zero. The median-decision-time endpoint
and 10% relative SOEI are retained.

### RQ4 treasury resilience

The original survival indicator was exactly one in all 288 runs and is
therefore unsuitable as a primary endpoint. The primary endpoint is amended
to `max_treasury_drawdown`. Run values ranged from 0.7690 to 0.8832 and
condition means from 0.7836 to 0.8507, with factorial R-squared 0.727. The
SOEI is 0.05 absolute drawdown fraction. Survival remains a secondary
descriptive diagnostic.

The pilot also exposed unaccounted black-swan treasury outflows. The
simulation now records those losses in an explicit external-custody boundary
account. A current-code 2,000-step reproduction with per-step economic
invariants produced a conservation error of
`2.473825588822365e-10` tokens.

## Replicate-count decision

Paired analytic and empirical-residual Monte Carlo calculations target at
least 80% power at two-sided alpha 0.05:

| Research question | Maximum pilot recommendation | Frozen final replicates per condition |
|---|---:|---:|
| RQ1 | 8 | 100 |
| RQ2 amended endpoint | 8 | 100 |
| RQ3 | 24 | 100 |
| RQ4 amended endpoint | 8 | 100 |

The final design retains 100 seeds per condition for every research question.
This is conservative relative to every pilot recommendation, keeps a common
replicate schedule across primary studies, and provides margin for
factorial-model diagnostics and robustness analyses. No final confirmatory
run existed when these decisions were made.

## Robustness-pilot amendment: delegation-depth endpoint

The first immutable robustness campaign
`robustness-pilot-20260717-1726` completed and verified all 104 planned runs.
Its delegation-depth primary endpoint, `delegate_concentration`, was exactly
zero at depths 0, 1, and 3. That endpoint is a final-state HHI of incoming
delegated token shares; the pilot therefore showed that it does not retain a
usable signal for this time-bounded delegation-resolution contrast.

The amended delegation-depth pilot uses `whale_influence`, the mean proposal
vote-weight share cast by top-decile token holders, as its primary endpoint.
This is the same non-degenerate capture endpoint selected for RQ2 and is
measured from proposal vote histories already produced by every run.
`delegate_concentration` remains a secondary diagnostic so the absence of
final-state delegation is reported rather than hidden. The declared smallest
effect of interest remains 0.05, now expressed as absolute vote-weight share.
The original campaign remains immutable and is not overwritten.

The amended endpoint initially remained bit-identical across depths. Code
review then found that recursive voting-power resolution counted transitive
token delegation but omitted transitive liquid-representative power. That
implementation defect was repaired and is covered by exact depth-1,
depth-2, and unlimited-chain tests.

Two fresh immutable campaigns were run after the repair. The default
Compound mix (`robustness-delegation-resolutionfix-pilot-20260717-1745`)
and a 100% delegation-specialist stress mix
(`robustness-delegation-stress-pilot-20260717-1748`) both completed and
verified 24 of 24 runs. Every captured outcome remained bit-identical across
depths for all eight paired seeds. The supported interpretation is narrow:
endogenous target selection in these scenarios produced no outcome-relevant
multi-hop chains for the depth limit to truncate. This is an exploratory
model-behavior boundary, not evidence that delegation depth is generally
irrelevant. The publication robustness appendix must state that boundary
and must not promote these contrasts to a confirmatory real-world claim.

## Calibration-semantics amendment and held-out decision (2026-07-18)

Before the post-fix publication holdout, code review found two
training-grounded semantic defects. Empirically observed zero proposal and
participation rates were forced above zero, and calibrated cluster
participation rates already containing historical fatigue were multiplied by
fatigue a second time. The fixes preserve exact observed zeros and use the
calibrated per-proposal participation probability directly. Unit tests freeze
both semantics. The decision preceded the post-fix full holdout; it was not
selected from its results.

The clean, provenance-bound run at commit
`c4344f749ce0fe8b4c7bc19b5c219cbb0b412f10` used 14 DAOs, 30 episodes,
1,440 steps, seed 42, a chronological 2023-2024 training / 2025 holdout
design, and a paired uncalibrated null. It completed all 840 trajectories
without an execution failure. Its artifact is
`results/calibration/runs/temporal-holdout-c4344f749-20260718/validation_summary.json`.
The summary JSON SHA-256 is
`7b25d4f1089a6aa6d886b2faa62f8e2bbdf0f19566854ba118728630148b57b0`;
the companion CSV SHA-256 is
`1e79c1699d9ee541b216add8ee46b144f4c69ba4902f6b0a813aa47dad5fa829`.

The mean held-out composite score increased from 0.423854 to 0.473168.
Curve increased from 0.414955 to 0.764395 and Maker/Sky from 0.421862 to
0.771963 because both now preserve their observed zero proposal cadence.
SushiSwap changed from 0.423818 to 0.414641; the remaining changes were zero
or below 0.000023. Calibrated simulations beat persistence for 5/14 DAOs and
the uncalibrated null for 8/14. Mean skill was -0.027276 versus persistence
and +0.173162 versus the uncalibrated null.

Decision: proceed with the frozen confirmatory mechanism campaign, but
restrict the empirical claim. Calibration is evidence of heterogeneous,
conditional generative fidelity, not universal predictive accuracy. The
manuscript must include the two null comparisons and negative DAO cases; it
may not use the legacy 0.850/0.856 headline.

## Freeze rule

The endpoints, SOEIs, model families, multiplicity correction, and replicate
counts above freeze when the final campaign manifest is created. Any later
change requires a new campaign identity and an appended, non-destructive
deviation record.
