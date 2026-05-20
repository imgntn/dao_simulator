#!/usr/bin/env bash
# Weekly full calibration validation (includes experiment finding replay).
# Wire into your CI's weekly cron. Expected runtime: hours.
#
# Exit codes match lib/research/baseline-config.ts:
#   0 — pass, 1 — regression, 2 — config-drift, 3 — infra.

set -u

cd "$(dirname "$0")/.." || exit 3

BASELINE="${VALIDATION_BASELINE:-results/baselines/calibration-baseline.json}"
EXP_BASELINE="${VALIDATION_EXP_BASELINE:-results/baselines/experiment-baseline.json}"
OUT_DIR="${VALIDATION_OUT_DIR:-results/validation}"
HISTORY="${VALIDATION_HISTORY:-$OUT_DIR/history.jsonl}"

mkdir -p "$OUT_DIR"

echo "[validate-full] starting weekly full suite"
npx tsx scripts/run-calibration-loop.ts \
  --full \
  --baseline "$BASELINE" \
  --experiment-baseline "$EXP_BASELINE" \
  --out "$OUT_DIR" \
  --history "$HISTORY"
EXIT=$?

echo "[validate-full] exit=$EXIT"

if [ "$EXIT" -ne 0 ] && [ -n "${VALIDATION_NOTIFY:-}" ]; then
  echo "[validate-full] dispatching notification"
  npx tsx scripts/notify-calibration-regression.ts \
    --history "$HISTORY" \
    --report-dir "$OUT_DIR" \
    --exit-code "$EXIT" || true
fi

exit $EXIT
