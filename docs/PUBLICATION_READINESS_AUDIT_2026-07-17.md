# DAO Simulator Publication Readiness Audit

**Date:** 2026-07-17
**Repository state reviewed:** `5829bdbea511af349fef6aed168d03912ca9baf9`
**Overall assessment:** Strong simulation and visualization foundation; current evidence bundle is not publication-ready.

## Executive verdict

The repository contains a substantial multi-agent DAO simulator, a 14-DAO digital-twin/calibration system, a large experiment catalog, statistical reporting, a paper-generation pipeline, and a distinctive interactive visualization. The ordinary engineering baseline is healthy: TypeScript, lint, and 1,078 unit tests pass.

The publication pipeline should nevertheless be treated as blocked until the following are repaired:

1. Stored paper summaries, statistics, and manifests were overwritten with dummy one-run artifacts.
2. The main raw experiment runs predate material engine changes, including proposal-lifecycle, treasury, statistics, and governance fixes.
3. The validation suite currently fails three checks, and several passing checks are too weak, vacuous, or mislabeled.
4. Multiple headline metrics do not measure what their names or the paper claim they measure.
5. Experiment manifests are insufficient to prove provenance or reproduce a result.
6. The paper contains stale and contradictory run counts, time horizons, metric definitions, capabilities, and empirical claims.

Do not launch the full experiment suite yet. Fix the validity and provenance layer first, run small pilot gates, freeze a release candidate, and only then spend compute on the full regeneration.

## What is here

### Simulator

- TypeScript/Next.js application with the core engine in `lib/engine/simulation.ts`.
- Multiple governance mechanisms, proposal lifecycles, treasury dynamics, markets, forums, delegation, attacks, shocks, learning agents, and multi-DAO city simulations.
- Seeded pseudo-random execution and worker-based parallel experiment runs.
- Historical calibration profiles and digital twins for 14 DAOs.

### Research system

- 90 YAML experiment configurations across paper, validation, research, profiling, and counterfactual groups.
- A 19-config “full” paper profile whose current preflight estimates 19,670 runs. That estimate is not authoritative because city scenarios are undercounted.
- Raw results from the previous paper campaign: 22,209 run files in `results/paper`, approximately 98.6 MB.
- Much larger archived/historical result stores, including about 172,753 files in `results/archive`.
- Statistical summaries, pairwise tests, one-way ANOVA/Kruskal-Wallis selection, effect sizes, confidence intervals, bootstrap support, power estimates, reports, charts, and LaTeX generation.

### Interactive product

- Web Worker simulation execution with Zustand state management.
- A rich “Sanctum” visualization using SVG, Three.js, and Canvas fallback paths.
- Zoom/pan, agent inspection and follow mode, floor navigation, event feeds, delegation and heatmap views, alerts, comparison/branch/multirun/research tabs, resizable panels, performance controls, and a mobile-specific UI.

## Verification performed

| Check | Result | Notes |
|---|---:|---|
| `npm run typecheck` | Pass | No TypeScript errors |
| `npm run lint` | Pass | No lint errors |
| `npm test` | Pass | 65 files, 1,078 tests |
| Unit-test coverage | Mixed | About 61.6% line coverage overall; several agent, city, checkpoint, event, and API paths have little or no coverage |
| `npm run validate` | Fail | Proposal monotonicity, zero-voting boundary, and homogeneous-voting monotonicity fail |
| Calibration smoke | Pass | Aave 0.833 and Arbitrum 0.882, stable across two runs |
| Strict P1 paper preflight | Fail | Stored summaries report 1 run instead of required counts |
| Live browser visual review | Not available | No controllable browser session was exposed; visualization assessment is source- and test-based |

The first calibration-smoke command timed out at the command boundary but its child continued, so two smoke invocations overlapped. Both completed with identical DAO scores. The runner should handle process cancellation more cleanly.

## Critical evidence and correctness findings

### 1. Current paper metadata is corrupted

Tracked helper scripts `scripts/create-dummies.ps1` and `scripts/create-dummies2.ps1` replace experiment artifacts with:

- `summary.json` containing `totalRuns: 1`
- `stats.csv` containing `placeholder,0`
- `manifest.json` containing `dummyhash`

These dummy files are now present throughout `results/paper`. The genuine March raw run files and `metrics.csv` files mostly remain, but summaries, aggregated statistics, and manifests cannot be trusted. The paper metadata now says 17 experiments and 17 total runs, which is a direct downstream symptom.

The strict paper preflight catches the one-run summaries and correctly blocks generation. It does not detect every other provenance or semantic failure described below.

### 2. Existing runs do not represent the current engine

Most raw paper runs date from March 2026. Material engine and research changes landed afterward, including:

- LLM/simulation changes on April 7.
- Proposal lifecycle, treasury, statistics, and governance-invariant hardening on April 30.

Results based on the earlier simulator must not be presented as results of the current code. They may be preserved as a historical replication target.

### 3. Result directories can silently mix generations

`ResultsExporter` creates output directories and overwrites same-named summaries, but it does not clear old raw-run files. Changed run identifiers or changed sweep shapes therefore leave stale files beside new files. This has already happened in validation results: old and new reproducibility runs coexist in one directory.

Every campaign needs an immutable, unique run root. Resuming should require an exact strong manifest match; a fresh run must refuse a non-empty target unless an explicit archive/migrate action occurs.

### 4. Reproducibility manifests are too weak

Experiment manifests use a home-grown 32-bit string hash and a hardcoded simulator version of `0.2.0`, while `package.json` reports `0.1.0`. They do not record:

- Git commit and dirty state
- SHA-256 configuration hash
- lockfile/dependency hash
- input dataset and calibration-profile hashes
- OS/CPU details
- exact command and flags
- model/provider/version, prompt hash, and generation parameters for LLM experiments
- schema version
- code bundle or container identity

The paper appendix claims SHA-256 provenance but contains obvious placeholder hashes. The implementation and manuscript disagree.

### 5. Several metrics have construct-validity defects

High-priority examples:

- Average turnout uses the final current voting power as the denominator for historical proposals, rather than each proposal’s voting-power snapshot.
- Quorum reach similarly uses current supply/current governance thresholds instead of proposal-time snapshots.
- `delegate_concentration` is a top-decile voter share, not the delegation HHI described in the paper.
- `wealth_mobility` is implemented as `1 - current Gini`; it is not longitudinal mobility.
- Numeric aggregation does not consistently reject `NaN` and infinite values.

Before regeneration, create a metric registry with the construct, exact formula, unit, denominator, time basis, expected range, missing-data rule, and a golden fixture for every reported metric.

### 6. The validation suite overstates what it checks

Current failures are real signals:

- Proposal creation is not monotonic across member counts.
- “Zero voting” produces turnout above the configured threshold.
- Homogeneous-agent voting is not monotonic across activity settings.

Several passes are not strong evidence:

- Voting “monotonicity” checks only the first and last values even though intermediate values are visibly non-monotonic.
- Reproducibility currently passes on a configuration with zero proposals and zero turnout, so key outputs can agree vacuously.
- “Token conservation” checks only that treasury is non-negative; it does not reconcile token flows.
- A missing regression baseline is treated as a pass.
- Governance differentiation compares rounded pass rates without matched seeds or an inferential test.
- The calibration validator’s “full” experiment replay substitutes the midpoint of stored expected ranges for most experiments instead of rerunning or re-deriving them.

Validation names and success messages must state exactly what was established.

### 7. Statistical design needs to match the causal questions

Current sweep conditions generally receive disjoint seed sequences. Use common random numbers: run each condition on the same replicate seeds, then analyze paired contrasts. This will improve power and separate treatment effects from stochastic variation.

The existing statistical layer is useful but insufficient for the factorial catalog:

- Use factorial regression/ANOVA or hierarchical models for main effects and interactions.
- Predefine comparison families and multiple-comparison correction.
- Gate pairwise post-hoc tests behind the appropriate omnibus/model result.
- Report raw distributions, effect sizes, uncertainty, practical thresholds, and failed/missing runs.
- Add distributional diagnostics and robust/non-parametric fallbacks.
- Use sequential or pilot-based power calculations tied to the smallest effect of practical interest, not a generic medium effect.

### 8. Economic time and treasury assumptions need explicit ablation

The engine adds a hardcoded protocol yield of `0.0005` per step, described as approximately 18% annualized under a 360-step year. Paper experiments use varying horizons, often 2,000 steps, while manuscript text also references 720-step horizons. A “step” is not consistently defined.

This assumption can dominate treasury-resilience claims. Define the time unit and run treasury/yield ablations at zero, historically calibrated, and sensitivity bounds.

### 9. Parallel and city-mode determinism need stronger tests

- Add byte-level sequential-versus-worker equivalence tests.
- Add checkpoint/resume equivalence tests.
- Add full event-trace or canonical state-hash reproducibility, not only selected endpoint metrics.
- City simulations share a random stream across DAOs; test permutation invariance and, if necessary, derive independent RNG streams by DAO and subsystem.
- The paper preflight counts grid sweeps but does not count city `scenarios`, underestimating experiment 07 by a factor of five.

### 10. Calibration requires out-of-sample validation

The 14-DAO digital-twin layer is a major strength, but publication claims should distinguish:

- parameters fit from historical data,
- calibration/training intervals,
- held-out validation intervals or held-out DAOs,
- simulator outcomes,
- and external ground truth.

Freeze dated source snapshots with licenses and hashes. Report uncertainty and performance per DAO, not only a pooled score. The manuscript currently labels values “reasonable” even where simulator values fall outside its own empirical ranges.

#### Resolution update — 2026-07-18

Chronological train/holdout profiles are now separately hashed and bound to
the calibration configuration. A clean full run at
`c4344f749ce0fe8b4c7bc19b5c219cbb0b412f10` completed 14/14 DAOs with
30 episodes of 1,440 steps and a paired uncalibrated null. The mean held-out
composite score was 0.473; calibrated simulations beat persistence in 5/14
DAOs and the uncalibrated simulator in 8/14. Mean skill was -0.027 versus
persistence and +0.173 versus the uncalibrated null.

The result resolves the provenance and out-of-sample execution gap but does
not establish universal forecasting skill. Publication is therefore
permitted to proceed only under the narrower mechanistic/generative claim
defined in the research charter, with per-DAO uncertainty, null comparisons,
and negative cases shown.

## Manuscript assessment

The current manuscript is a useful scaffold, not a defensible submission draft.

Issues to reconcile after fresh results:

- Run counts and experiment counts are wrong.
- Experiment horizons and time units contradict configurations.
- Methodology tables contain run counts that disagree with both configs and later prose.
- Several headline percentages are not traceable to current artifacts.
- The results section predates much of the experiment campaign.
- The appendix asserts SHA-256 hashes that the runner does not produce.
- Limitations omit capabilities now present in the code and claim absence of features such as forum dynamics that now exist.
- The repository URL/open-source statement must match the actual release plan.

The strongest paper is likely narrower than the current “everything” manuscript. A focused contribution around calibrated multi-agent counterfactual governance evaluation, with a small number of pre-registered mechanism questions, will be easier to defend than dozens of loosely connected findings.

## Recommended experiment program

### Gate A — correctness and invariants

Run these before substantive experiments:

1. Nontrivial deterministic replay with canonical state/event hashes.
2. Sequential/parallel equivalence.
3. Checkpoint/resume equivalence.
4. Token-flow ledger reconciliation: initial supply + mint - burn = all balances and locked pools.
5. Proposal snapshot correctness for turnout, quorum, eligibility, and thresholds.
6. DAO ordering/permutation invariance in city mode.
7. Metric golden fixtures and finite-number enforcement.

### Gate B — calibration and realism

1. Dated train/validation split per DAO.
2. Held-out time-period evaluation.
3. Leave-one-DAO-out or held-out-DAO evaluation where feasible.
4. Posterior/predictive or bootstrap uncertainty around calibration scores.
5. Sensitivity to uncertain historical inputs.
6. Explicit comparison to simple null/baseline models.

### Gate C — mechanism studies

Use matched seed blocks and predeclared outcomes:

1. Governance mechanism comparison.
2. Capture-mitigation factorial study.
3. Quorum/participation response surfaces.
4. Proposal-pipeline intervention study.
5. Treasury resilience with yield and time-scale ablations.
6. Black-swan robustness.
7. Cross-DAO cooperation/city scenarios after order-invariance is established.

For each, name one primary estimand and a small set of secondary metrics. Treat the rest as exploratory.

### Gate D — model and agent ablations

1. Remove learning/adaptation.
2. Replace heterogeneous agents with homogeneous/null agents.
3. Remove forum/social influence.
4. Remove delegation.
5. Remove market-price feedback.
6. Compare LLM agents to deterministic and stochastic non-LLM controls at matched decision budgets.

LLM experiments need frozen model artifacts or exact model digests, prompt/template hashes, decoding parameters, response caches, failure rates, and cost/latency reporting.

### Gate E — robustness and replication

1. Repeat headline results across multiple calibrated DAOs.
2. Vary time horizons and burn-in periods.
3. Vary seed blocks beyond those used in development.
4. Report practical-equivalence intervals, not only significance.
5. Re-run a frozen release from a clean clone/container and compare artifact hashes.

## Visualization and interactive research layer

The Sanctum has a memorable visual identity and is well suited to explanation, exploration, and demos. It should not be the primary evidence surface.

Create two explicit product modes:

### Explore

- Keep the Sanctum’s spatial, narrative, and agent-level presentation.
- Reduce the default panel count through progressive disclosure.
- Give users a guided path: choose DAO/scenario, run, observe, inspect an event, compare a branch.
- Preserve advanced overlays behind an “analysis tools” drawer.
- Fix the widespread mojibake in Sanctum strings and generated reports.
- Add a real data-load error state; current fetch failures can leave the UI indefinitely “Awakening.”

### Evidence

Build a research workbench around immutable experiment artifacts:

- Condition/config comparison table
- Raw-dot/violin distributions with confidence intervals
- Paired-effect and forest plots
- Time-series bands and event annotations
- Factorial response surfaces
- Failed/missing-run accounting
- Validation and provenance badges
- Commit, config, data, dependency, and model hashes
- Metric definition tooltips linked to the metric registry
- Claim cards linking a paper sentence/table/figure to its exact analysis artifact
- Exportable analysis notebook/report bundle

A useful coordinated flow is:

`question → frozen design → validation status → condition distributions → paired effects → temporal/agent drill-down → manuscript claim`

The existing result-detail view already has summary statistics and charts, but it should expose effect sizes, corrected significance, power, raw distributions, failures, manifest identity, and caveats.

## Sequenced implementation plan

### Phase 0 — preserve and quarantine

- Archive the current result tree as a clearly labeled legacy campaign.
- Remove dummy-generation scripts from normal workflows.
- Mark all current paper claims and artifacts as stale.
- Create immutable campaign IDs and schemas.

### Phase 1 — repair the measurement foundation

- Fix turnout/quorum snapshot denominators.
- Rename or reimplement delegation concentration and wealth mobility.
- Add metric registry, finite-value checks, and golden tests.
- Add a token-flow ledger and genuine conservation checks.
- Repair validation logic and require nontrivial activity.

### Phase 2 — harden provenance and execution

- Replace weak hashes with SHA-256.
- Record Git/dirty/config/lock/data/model/environment provenance.
- Refuse mixed output directories.
- Make resume contingent on exact manifest identity.
- Correct city scenario run counts and failed-run status semantics.
- Add parallel, resume, and permutation invariance tests.
- Restore an automated CI gate or document an equivalent reproducible local gate.

### Phase 3 — pilot

- Freeze a release-candidate commit.
- Run 5–10 paired seeds per condition for P1.
- Examine failures, variances, runtime, metric distributions, and effect sizes.
- Revise sample sizes based on practical effect thresholds.

### Phase 4 — full campaign

- Run correctness gates.
- Run calibration/holdout gates.
- Run the narrowed paper suite into a new immutable campaign.
- Generate reports and paper figures only from validated manifests.
- Independently reproduce headline tables from raw artifacts.

### Phase 5 — manuscript and release

- Rewrite methods/results from the frozen analysis outputs.
- Reconcile every numeric claim through a claim-to-artifact registry.
- Publish code, configs, small derived datasets, and a durable artifact bundle as licensing permits.
- Produce a clean-clone reproduction guide and verify it.
- Upgrade the Evidence UI using the same immutable artifact format.

## Definition of publication-ready

The project is ready to submit when:

- All correctness and validation gates pass with meaningful, non-vacuous cases.
- All reported metrics have tested definitions and proposal-time denominators where applicable.
- Every run belongs to one immutable campaign and has strong provenance.
- There are no stale or mixed raw files.
- Calibration has a documented held-out evaluation.
- Statistical models match the experimental design.
- Every manuscript number resolves to a raw-data-derived artifact.
- A clean environment reproduces the headline tables and figures.
- The paper accurately states scope, limitations, data sources, software version, and release status.

## Immediate next milestone

The highest-leverage next milestone is **Publication Foundation v1**:

1. quarantine legacy/dummy artifacts,
2. repair four high-risk metrics,
3. strengthen six validation gates,
4. implement immutable SHA-256 manifests,
5. add deterministic/parallel/resume/city invariance tests,
6. run a small paired-seed P1 pilot,
7. generate one end-to-end claim-linked figure from raw runs.

Only after that milestone should the full 19-config paper profile be regenerated.
