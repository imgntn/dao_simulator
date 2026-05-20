# Calibration Validation CI Hooks

CI-agnostic shell wrappers around the calibration validation loop.
Wire each into your CI scheduler at the indicated cadence — the scripts
emit stable exit codes (0 pass, 1 regression, 2 config-drift, 3 infra)
that your CI can act on directly.

## Scripts

| Script | Cadence | Cost | What it does |
| ------ | ------- | ---- | ------------ |
| `validate-fast.sh` | nightly | minutes | 14-DAO fast suite (10 episodes × 720 steps each). Re-runs the calibration backtests and compares to `results/baselines/calibration-baseline.json`. |
| `validate-full.sh` | weekly | hours | Fast suite + headline experiment finding replay (exp 10, 11, 13–16). LLM-free, safe for remote CI runners. |
| `validate-llm.sh` | weekly (local) | hours, $$$ | Full suite + LLM-thinking-mode finding (exp 17). Requires Ollama on the host, so schedule it on the dev box via Windows Task Scheduler. |

## Environment variables

All scripts honor the same overrides:

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `VALIDATION_BASELINE` | `results/baselines/calibration-baseline.json` | Calibration baseline file. |
| `VALIDATION_EXP_BASELINE` | `results/baselines/experiment-baseline.json` | Experiment-finding baseline (`validate-full` / `validate-llm`). |
| `VALIDATION_OUT_DIR` | `results/validation` | Where reports land. |
| `VALIDATION_HISTORY` | `$VALIDATION_OUT_DIR/history.jsonl` | Append-only JSONL history. |
| `VALIDATION_NOTIFY` | unset | If set (any value), dispatches `scripts/notify-calibration-regression.ts` on non-zero exit. |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Used only by `validate-llm.sh`. |

## CI wiring (provider-agnostic)

In your CI configuration:

```
nightly job:
  run: bash ci/validate-fast.sh
  env:
    VALIDATION_NOTIFY: "1"
  artifact: results/validation/*.md
  on_failure: fail the job

weekly job:
  run: bash ci/validate-full.sh
  env:
    VALIDATION_NOTIFY: "1"
  artifact: results/validation/*.md
  on_failure: fail the job
```

`validate-llm.sh` should NOT run on remote CI — it depends on the local
Ollama instance.

## What "failure" means

| Exit code | Meaning | Recommended CI action |
| --------- | ------- | --------------------- |
| 0 | Pass — no regressions | green build |
| 1 | Regression OR finding inversion detected | red build, open issue, dispatch notification |
| 2 | `configHash` in baseline does not match current code — intentional baseline regen needed | red build, message says "run `scripts/accept-calibration-baseline.ts`" |
| 3 | Infrastructure failure (file missing, Ollama down, runner threw) | red build, but treat as build infra rather than regression |

## Local invocation

```
# Fast suite
npm run calibration-loop:fast

# Full suite
npm run calibration-loop:full

# LLM suite
npm run calibration-loop:llm

# Plot trend SVG
npm run calibration-loop:trend
```
