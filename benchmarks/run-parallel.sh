#!/usr/bin/env bash
# Usage: ./run-parallel.sh --benchmark DIR --case CASE [--runs N] --model MODEL ...
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
    *) echo "Usage: $(basename "$0") --benchmark DIR --case CASE [--runs N] --model MODEL ..." >&2; exit 1 ;;
  esac
done

TASK_DIR="$BENCHMARKS_DIR/$BENCHMARK"
[[ -n "$BENCHMARK" && -n "$CASE" ]] || { echo "Error: --benchmark and --case required" >&2; exit 1; }
[[ ${#MODELS[@]} -gt 0 ]]           || { echo "Error: at least one --model required" >&2; exit 1; }
[[ -d "$TASK_DIR" ]]                || { echo "Error: not found: $TASK_DIR" >&2; exit 1; }
for MODEL_CONFIG in "${MODELS[@]}"; do
  [[ -f "$MODEL_CONFIG" ]] || { echo "Error: not found: $MODEL_CONFIG" >&2; exit 1; }
done

PIDS=(); LOGS=()
for MODEL_CONFIG in "${MODELS[@]}"; do
  LOG=$(mktemp); LOGS+=("$LOG")
  (
    for (( i=1; i<=RUNS; i++ )); do
      "$BENCHMARKS_DIR/run.sh" --benchmark "$BENCHMARK" --case "$CASE" --model "$MODEL_CONFIG"
    done
  ) > "$LOG" 2>&1 &
  PIDS+=($!)
  echo "==> Spawned $(basename "$MODEL_CONFIG" .json) (pid $!)"
done

FAILED=0
for i in "${!PIDS[@]}"; do
  MODEL_NAME="$(basename "${MODELS[$i]}" .json)"
  if wait "${PIDS[$i]}"; then echo "==> Done: $MODEL_NAME"
  else echo "==> FAILED: $MODEL_NAME"; FAILED=1; fi
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
