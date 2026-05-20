#!/usr/bin/env bash
# Nightly fast calibration validation.
# Wire into your CI's nightly cron and check the exit code.
#
# Exit codes (matches lib/research/baseline-config.ts):
#   0 — pass
#   1 — regression detected
#   2 — config-hash mismatch (intentional baseline regen needed)
#   3 — infrastructure failure
#
# Environment overrides:
#   VALIDATION_BASELINE — path to calibration-baseline.json
#   VALIDATION_OUT_DIR  — where reports land (default results/validation)
#   VALIDATION_HISTORY  — history.jsonl path

set -u

cd "$(dirname "$0")/.." || exit 3

BASELINE="${VALIDATION_BASELINE:-results/baselines/calibration-baseline.json}"
OUT_DIR="${VALIDATION_OUT_DIR:-results/validation}"
HISTORY="${VALIDATION_HISTORY:-$OUT_DIR/history.jsonl}"

mkdir -p "$OUT_DIR"

echo "[validate-fast] starting nightly fast suite"
npx tsx scripts/run-calibration-loop.ts \
  --fast \
  --baseline "$BASELINE" \
  --out "$OUT_DIR" \
  --history "$HISTORY"
EXIT=$?

echo "[validate-fast] exit=$EXIT"

if [ "$EXIT" -ne 0 ] && [ -n "${VALIDATION_NOTIFY:-}" ]; then
  echo "[validate-fast] dispatching notification"
  npx tsx scripts/notify-calibration-regression.ts \
    --history "$HISTORY" \
    --report-dir "$OUT_DIR" \
    --exit-code "$EXIT" || true
fi

exit $EXIT
