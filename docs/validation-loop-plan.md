# Continuous Calibration Validation Loop — Implementation Plan

A continuously-running validation system that catches calibration drift the moment it happens.

## The problem

The project has climbed from 0.25 → 0.856 average calibration score across 14 DAOs, but every RNG-stream-shifting code change risks silently regressing one DAO while another is being optimized. Drift is currently detectable only when someone happens to look. The validation loop closes that gap.

## CI integration

This plan does **not** prescribe a specific CI provider. All automation is implemented as:

- `npm` scripts (`validate:fast`, `validate:full`, `validate:llm`, `validate:accept`)
- POSIX shell scripts in `ci/` (`ci/validate-fast.sh`, `ci/validate-full.sh`, `ci/validate-llm.sh`)
- Pure-Node entrypoints in `scripts/` (so the existing CI can invoke them however it wires jobs)

Hook the shell scripts into whatever CI runner you already have. Exit codes are stable: `0` = pass, `1` = regression detected, `2` = config-hash mismatch (intentional baseline change needed), `3` = infrastructure failure.

---

## Phase 1: Foundation (deterministic baselines)

1. **Audit RNG determinism.** Confirm `DAOSimulation.run()` is fully seedable end-to-end — including `ProposalCreator` probability gates, forum activity, oracle paths, and LLM cache lookups. Grep for `Math.random` outside seeded RNG and route any stragglers through the seed. Without this, every "regression" is noise.

2. **Pin a canonical seed set.** Add `lib/research/canonical-seeds.ts` exporting `CALIBRATION_SEEDS: number[]` (e.g. 10 seeds for the per-DAO suite, 30 for experiment replay). Never change these — they define the baseline.

3. **Lock baseline config.** Create `lib/research/baseline-config.ts` with frozen `BASELINE_CALIBRATION_CONFIG` (10 episodes, 720 steps, `learning_enabled: false`, `forum_enabled: true`, default oracle). Any future config knob defaults to baseline values unless overridden.

## Phase 2: Baseline storage

4. **Define baseline schema.** Create `results/baselines/calibration-baseline.json` with shape:
   ```
   { version, generatedAt, gitSha, perDao: { [daoId]: { score, propFreq, participation, passRate, priceRMSE, forumActivity, ci95: {...} } } }
   ```
   Seed v1 with current scores from memory (gitcoin=0.922 ... nouns=0.780).

5. **Define experiment-finding baseline.** Create `results/baselines/experiment-baseline.json` capturing the *headline finding* of each experiment as a structured assertion — not raw numbers — e.g.:
   ```
   { "exp-12": { finding: "small-llm-impoverished-decreases-quality", direction: "negative", magnitudeRange: [-9, -7] } }
   ```
   So a "finding inversion" can be machine-checked.

6. **Add baseline generation script.** `scripts/generate-baseline.ts` runs the full calibration suite with canonical seeds, writes `calibration-baseline.json`. Run once to lock v1, re-run only when intentionally accepting a new baseline.

## Phase 3: The validation runner

7. **Build `CalibrationValidator`.** New module `lib/research/calibration-validator.ts`:
   - `runFastSuite()` → 14 DAOs × 10 episodes × 720 steps, returns per-DAO scores + CIs
   - `runFullSuite()` → adds experiment replay (subset: exp 10, 11, 13–17 — skip the paused 12b)
   - Uses existing `BacktestRunner` + `ExperimentRunner` via `WorkerPool`/`fork-worker.ts`
   - Returns `ValidationResult { perDao, perExperiment, timing, gitSha, configHash }`

8. **Add config-hash check.** Hash `BASELINE_CALIBRATION_CONFIG` + canonical seeds + relevant settings on every run. If hash changed since baseline was generated, fail loud — forces an intentional baseline regeneration rather than silent drift.

9. **Wire CLI.** `scripts/run-validation.ts` with flags: `--fast` (DAO suite only, ~minutes), `--full` (+ experiments, ~hours), `--llm` (+ exp 17 thinking-mode, expensive), `--baseline-from <path>`, `--out <path>`.

## Phase 4: Diff + regression detection

10. **Build `ValidationDiffer`.** `lib/research/validation-differ.ts`:
    - Compares result vs baseline per DAO
    - Flags `score_drop` if `baseline.score - current.score > 0.02`
    - Flags `ci_violation` if current score outside baseline 95% CI
    - Flags `metric_regression` per sub-metric with metric-specific thresholds
    - Returns `DiffReport { regressions: [], improvements: [], flat: [] }`

11. **Build `FindingChecker`.** Re-derive each experiment's headline finding from current run, compare to baseline:
    - `direction` mismatch → critical alert
    - `magnitude` outside expected range → warning
    - Returns `FindingDiff[]`

12. **Tolerance tuning.** Document in code: per-DAO score threshold = 0.02, per-metric threshold derived from baseline CI width × 1.5. Thresholds live in `baseline-config.ts` so Nouns (high variance) can be loosened relative to Gitcoin (stable).

## Phase 5: Reporting

13. **Markdown report generator.** `lib/research/validation-report.ts` produces `results/validation/<timestamp>.md` with:
    - Summary table: DAO, baseline score, current score, delta, status
    - Findings table for experiments
    - Git SHA, config hash, runtime
    - Top-3 worst regressions called out

14. **JSON history append.** Same run appends to `results/validation/history.jsonl` (one line per run) for trend analysis. Never rotate.

15. **Trend chart script.** `scripts/plot-validation-trends.ts` reads `history.jsonl`, plots per-DAO score over time (PNG via existing chart infra). Surfaces slow drift across many runs.

## Phase 6: Automation (CI-agnostic)

16. **Local pre-push git hook (optional).** `.husky/pre-push` runs `validate:fast` only when relevant paths (`lib/agents/`, `lib/engine/`, `lib/digital-twins/`, `lib/utils/`) have changed. Irrelevant edits skip the cost.

17. **Nightly fast suite.** `ci/validate-fast.sh` wraps `npm run validate:fast`, uploads the report artifact path to stdout, exits with code 1 on regression. Wire to your CI's nightly cron.

18. **Weekly full suite.** `ci/validate-full.sh` wraps `npm run validate:full` (no LLM — too expensive). Wire to your CI's weekly cron.

19. **Local weekly LLM validation.** `ci/validate-llm.sh` is intended to run on the dev box (Ollama lives locally). Hook into Windows Task Scheduler or a local cron-like runner. Logs to the same `history.jsonl`.

## Phase 7: Alerting

20. **Regression report includes suspect commits.** Auto-fills `git log baseline.gitSha..HEAD --oneline` into the markdown report so the suspect commit range is one click away.

21. **Email notification.** A small Node notifier (`scripts/notify-regression.ts`) reuses existing email infra to send the report summary to the configured address on non-zero exit. CI calls it after `validate-*.sh` regardless of result, and the notifier decides whether to send.

22. **Quiet success.** Successful runs append to history without notification. Only regressions and findings inversions trigger alerts.

## Phase 8: Baseline lifecycle

23. **`accept-baseline` script.** `scripts/accept-baseline.ts` re-runs the suite, prompts confirmation per changed DAO, writes a new `calibration-baseline.json` with bumped version + dated changelog entry in `results/baselines/CHANGELOG.md`.

24. **Baseline change requires explicit commit marker.** Commit-msg hook checks for `BASELINE-CHANGE:` line whenever `results/baselines/*.json` is touched. Prevents accidental regeneration sweeps.

## Phase 9: Cost control

25. **Cache LLM responses across validation runs.** `LLMResponseCache` persists under `results/validation/llm-cache/`, keyed by canonical seed. Second LLM validation on unchanged code = near-zero LLM cost.

26. **Adaptive sampling.** If a DAO has scored ≥0.95 stable over the last 10 runs, drop fast-suite episodes from 10 to 5. If a DAO has high variance, bump to 15. Configured in `baseline-config.ts`.

27. **Worker pool tuning for CI.** `WorkerPool` size caps to 2 when `process.env.CI` is set, full parallelism locally.

## Phase 10: Validation of the validator

28. **Inject a known regression test.** `tests/validation-loop.test.ts` monkey-patches one agent to be obviously worse, runs the validator against a mini-baseline (2 DAOs, 2 episodes), asserts the differ catches it. Prevents the validator itself from silently breaking.

29. **Document in memory.** Once stable, memorize: baseline file is canonical, baseline changes need explicit acceptance, full suite is weekly not per-commit.

30. **First real run.** Generate v1 baseline from current scores, wire to nightly CI, let one cycle complete green before trusting it. Then deliberately break something small in a branch to confirm the alert fires.
