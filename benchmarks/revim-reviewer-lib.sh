#!/usr/bin/env bash
# Shared helpers for revim reviewer benchmarks.
# Source this file, then call setup_run and copy_revim.
# Exports: RUN_DIR, RUN_NUMBER, REVIM_TMP

REVIM_SOURCE="/home/gytis/ai/revim"

setup_run() {
  local task_dir=$1 case=$2 model_name=$3
  local run_base="$task_dir/iterations/$case"
  mkdir -p "$run_base"
  local last; last=$(ls "$run_base" 2>/dev/null | grep -oE '^[0-9]+' | sort -n | tail -1 || true)
  RUN_NUMBER=$(printf "%02d" $(( 10#${last:-0} + 1 )))
  RUN_DIR="$run_base/$RUN_NUMBER-$model_name"
  mkdir -p "$RUN_DIR"
}

copy_revim() {
  local checkout=$1 agent_file=$2
  REVIM_TMP="$RUN_DIR/revim"
  cp -r "$REVIM_SOURCE/." "$REVIM_TMP"
  git -C "$REVIM_TMP" checkout -f "$checkout" --quiet
  (cd "$REVIM_TMP" && node "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/dist/index.js" init)
  sed -i "s|^mode: subagent|mode: all|" "$REVIM_TMP/.opencode/agents/$agent_file"
  git -C "$REVIM_TMP" add .opencode
  git -C "$REVIM_TMP" commit --quiet -m "chore: kiss-spec init"
  echo "==> Checked out $checkout, ran kiss-spec init, set mode=all in $agent_file" >&2
}
