#!/usr/bin/env bash
# Usage: ./run.sh --benchmark DIR --case CASE --model MODEL_CONFIG
# Cases (acceptance-reviewer): 009-1 pass, 010-1 pass
# Cases (code-reviewer):       013-1 fail, 012-1 fail, 010-1 fail, 010-2 pass
set -euo pipefail

BENCHMARKS_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$BENCHMARKS_DIR/revim-reviewer-lib.sh"

BENCHMARK=; CASE=; MODEL_CONFIG=
while [[ $# -gt 0 ]]; do
  case $1 in
    --benchmark) BENCHMARK=$2;    shift 2 ;;
    --case)      CASE=$2;         shift 2 ;;
    --model)     MODEL_CONFIG=$2; shift 2 ;;
    *) echo "Usage: $(basename "$0") --benchmark DIR --case CASE --model MODEL_CONFIG" >&2; exit 1 ;;
  esac
done

TASK_DIR="$BENCHMARKS_DIR/$BENCHMARK"
[[ -n "$BENCHMARK" && -n "$CASE" ]] || { echo "Error: --benchmark and --case required" >&2; exit 1; }
[[ -d "$TASK_DIR" ]]                || { echo "Error: not found: $TASK_DIR" >&2; exit 1; }
[[ -f "$MODEL_CONFIG" ]]            || { echo "Error: not found: $MODEL_CONFIG" >&2; exit 1; }

source "$TASK_DIR/config.sh"
case_config "$CASE"

MODEL_NAME="$(basename "$MODEL_CONFIG" .json)"
MODEL_ID="$(jq -r '.model' "$MODEL_CONFIG")"
setup_run "$TASK_DIR" "$CASE" "$MODEL_NAME"
echo "==> Run: $RUN_DIR"

copy_revim "$CHECKOUT" "$AGENT_FILE" "${PATCH_AGENT_MODEL:+$MODEL_ID}"
PRE_HEAD=$(git -C "$REVIM_TMP" rev-parse HEAD)

AGENT_ARG=(); [[ -n "${AGENT:-}" ]] && AGENT_ARG=(--agent "$AGENT")
echo "==> Running${AGENT:+ $AGENT}"
T0=$SECONDS
(cd "$REVIM_TMP" && opencode run "${AGENT_ARG[@]}" --model "$MODEL_ID" --dangerously-skip-permissions --title "$MODEL_NAME $CASE $RUN_NUMBER" "$INPUT") | tee "$RUN_DIR/agent-log.md" || true
DURATION=$(( SECONDS - T0 ))
echo "==> Done in ${DURATION}s"

COMMIT_MSG=$(git -C "$REVIM_TMP" log --format="%B" "$PRE_HEAD..HEAD" | head -50)
if declare -f compute_verdict > /dev/null; then
  VERDICT=$(compute_verdict "$REVIM_TMP" "$PRE_HEAD")
else
  VERDICT=$(git -C "$REVIM_TMP" log --format="%s" "$PRE_HEAD..HEAD" \
    | grep -oiE '\b(Pass|Fail|Block)\b' | head -1 \
    | sed 's/[Bb]lock/Fail/' || echo "no-commit")
fi
echo "==> Verdict: $VERDICT  (expected: $EXPECTED)"

cat > "$RUN_DIR/report.md" <<EOF
**Case:** $CASE
**Model:** $MODEL_NAME
**Run:** $RUN_NUMBER
**Expected:** $EXPECTED
**Verdict:** $VERDICT
**Duration:** ${DURATION}s

## Reviewer Output

$COMMIT_MSG
EOF

echo "==> Report → $RUN_DIR/report.md"
