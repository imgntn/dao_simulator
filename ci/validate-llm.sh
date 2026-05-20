#!/usr/bin/env bash
# Local weekly LLM validation.
# Runs the full suite with --llm (re-verifies exp-17 Gemma 4 E4B finding).
# Must run on a host with Ollama present and the model already pulled.
#
# Schedule via Windows Task Scheduler / cron on the dev box, NOT on remote CI.
#
# Exit codes: 0 pass, 1 regression, 2 config-drift, 3 infra.

set -u

cd "$(dirname "$0")/.." || exit 3

BASELINE="${VALIDATION_BASELINE:-results/baselines/calibration-baseline.json}"
EXP_BASELINE="${VALIDATION_EXP_BASELINE:-results/baselines/experiment-baseline.json}"
OUT_DIR="${VALIDATION_OUT_DIR:-results/validation}"
HISTORY="${VALIDATION_HISTORY:-$OUT_DIR/history.jsonl}"
OLLAMA_URL="${OLLAMA_BASE_URL:-http://localhost:11434}"

mkdir -p "$OUT_DIR"

if ! curl -sf "$OLLAMA_URL/api/tags" > /dev/null 2>&1; then
  echo "[validate-llm] Ollama not reachable at $OLLAMA_URL — aborting" >&2
  exit 3
fi

echo "[validate-llm] starting LLM-inclusive validation"
npx tsx scripts/run-calibration-loop.ts \
  --llm \
  --baseline "$BASELINE" \
  --experiment-baseline "$EXP_BASELINE" \
  --out "$OUT_DIR" \
  --history "$HISTORY"
EXIT=$?

echo "[validate-llm] exit=$EXIT"

if [ "$EXIT" -ne 0 ] && [ -n "${VALIDATION_NOTIFY:-}" ]; then
  npx tsx scripts/notify-calibration-regression.ts \
    --history "$HISTORY" \
    --report-dir "$OUT_DIR" \
    --exit-code "$EXIT" || true
fi

exit $EXIT
