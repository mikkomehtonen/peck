#!/usr/bin/env bash
# Usage: ./run.sh --benchmark DIR --case CASE --model NAME  (e.g. kimi-k2.6, deepseek-v4-pro:max)
# Cases (acceptance-reviewer): 009-1 pass, 010-1 pass
# Cases (code-reviewer):       013-1 fail, 012-1 fail, 010-1 fail, 010-2 pass
set -euo pipefail

BENCHMARKS_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$BENCHMARKS_DIR/revim-reviewer-lib.sh"

BENCHMARK=; CASE=; MODEL_ARG=
while [[ $# -gt 0 ]]; do
  case $1 in
    --benchmark) BENCHMARK=$2;  shift 2 ;;
    --case)      CASE=$2;       shift 2 ;;
    --model)     MODEL_ARG=$2;  shift 2 ;;
    *) echo "Usage: $(basename "$0") --benchmark DIR --case CASE --model NAME" >&2; exit 1 ;;
  esac
done

TASK_DIR="$BENCHMARKS_DIR/$BENCHMARK"
[[ -n "$BENCHMARK" && -n "$CASE" && -n "$MODEL_ARG" ]] || { echo "Error: --benchmark, --case and --model required" >&2; exit 1; }
[[ -d "$TASK_DIR" ]] || { echo "Error: not found: $TASK_DIR" >&2; exit 1; }

MODELS_FILE="$BENCHMARKS_DIR/models.json"
MODEL_ENTRY=$(jq -e --arg k "$MODEL_ARG" '.[$k]' "$MODELS_FILE" 2>/dev/null) \
  || { echo "Error: unknown model: $MODEL_ARG (see $MODELS_FILE)" >&2; exit 1; }

MODEL_ID=$(jq -r '.model' <<< "$MODEL_ENTRY")
MODEL_VARIANT=$(jq -r '.variant // ""' <<< "$MODEL_ENTRY")
MODEL_DIR_NAME="${MODEL_ARG//:/-}"

source "$TASK_DIR/config.sh"
case_config "$CASE"

setup_run "$TASK_DIR" "$CASE" "$MODEL_DIR_NAME"
echo "==> Run: $RUN_DIR"

copy_revim "$CHECKOUT" "$AGENT_FILE" "${PATCH_AGENT_MODEL:+$MODEL_ID}"
PRE_HEAD=$(git -C "$REVIM_TMP" rev-parse HEAD)

AGENT_ARG=(); [[ -n "${AGENT:-}" ]] && AGENT_ARG=(--agent "$AGENT")
VARIANT_ARG=(); [[ -n "$MODEL_VARIANT" ]] && VARIANT_ARG=(--variant "$MODEL_VARIANT")
echo "==> Running${AGENT:+ $AGENT}"
T0=$SECONDS
(cd "$REVIM_TMP" && opencode run "${AGENT_ARG[@]}" --model "$MODEL_ID" "${VARIANT_ARG[@]}" --dangerously-skip-permissions --title "$MODEL_DIR_NAME $CASE $RUN_NUMBER" "$INPUT") | tee "$RUN_DIR/agent-log.md" || true
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

STATS=$(get_session_stats "$REVIM_TMP")

cat > "$RUN_DIR/report.md" <<EOF
**Case:** $CASE
**Model:** $MODEL_DIR_NAME
**Run:** $RUN_NUMBER
**Expected:** $EXPECTED
**Verdict:** $VERDICT
**Duration:** ${DURATION}s
$STATS

## Reviewer Output

$COMMIT_MSG
EOF

echo "==> Report → $RUN_DIR/report.md"
