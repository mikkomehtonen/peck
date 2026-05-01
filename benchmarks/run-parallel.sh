#!/usr/bin/env bash
# Usage: ./run-parallel.sh --benchmark DIR --case CASE [--runs N] --model NAME ...
#
# Runs N iterations per model sequentially; all models run in parallel.
set -euo pipefail

BENCHMARKS_DIR="$(cd "$(dirname "$0")" && pwd)"

BENCHMARK=; CASE=; RUNS=1; MODELS=()
while [[ $# -gt 0 ]]; do
  case $1 in
    --benchmark) BENCHMARK=$2;    shift 2 ;;
    --case)      CASE=$2;         shift 2 ;;
    --runs)      RUNS=$2;         shift 2 ;;
    --model)     MODELS+=("$2");  shift 2 ;;
    *) echo "Usage: $(basename "$0") --benchmark DIR --case CASE [--runs N] --model NAME ..." >&2; exit 1 ;;
  esac
done

TASK_DIR="$BENCHMARKS_DIR/$BENCHMARK"
[[ -n "$BENCHMARK" && -n "$CASE" ]] || { echo "Error: --benchmark and --case required" >&2; exit 1; }
[[ ${#MODELS[@]} -gt 0 ]]           || { echo "Error: at least one --model required" >&2; exit 1; }
[[ -d "$TASK_DIR" ]]                || { echo "Error: not found: $TASK_DIR" >&2; exit 1; }

PIDS=(); LOGS=()
for MODEL_ARG in "${MODELS[@]}"; do
  LOG=$(mktemp); LOGS+=("$LOG")
  (
    for (( i=1; i<=RUNS; i++ )); do
      "$BENCHMARKS_DIR/run.sh" --benchmark "$BENCHMARK" --case "$CASE" --model "$MODEL_ARG"
    done
  ) > "$LOG" 2>&1 &
  PIDS+=($!)
  echo "==> Spawned $MODEL_ARG (pid $!)"
done

FAILED=0
for i in "${!PIDS[@]}"; do
  if wait "${PIDS[$i]}"; then echo "==> Done: ${MODELS[$i]}"
  else echo "==> FAILED: ${MODELS[$i]}"; FAILED=1; fi
  cat "${LOGS[$i]}"; rm -f "${LOGS[$i]}"
done

echo ""
echo "=== Summary ==="
find "$TASK_DIR/iterations/$CASE" -name "report.md" | sort | while read -r r; do
  VERDICT=$(grep '^\*\*Verdict:' "$r" | head -1 | sed 's/\*\*Verdict:\*\* //')
  DIR=$(basename "$(dirname "$r")")
  printf "  %s — %s\n" "$DIR" "$VERDICT"
done

exit $FAILED
