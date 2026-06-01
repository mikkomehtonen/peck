#!/usr/bin/env bash
# Shared helpers for revim reviewer benchmarks.
# Source this file, then call setup_run and copy_revim.
# Exports: RUN_DIR, RUN_NUMBER, REVIM_TMP

REVIM_SOURCE="/home/gytis/ai/revim"

setup_run() {
  local task_dir=$1 case=$2 model_name=$3
  local run_base="$task_dir/iterations/$case"
  mkdir -p "$run_base"
  local lock="$run_base/.lock"
  touch "$lock"
  local lock_fd
  exec {lock_fd}<>"$lock"
  flock -x "$lock_fd"
  local last; last=$(ls "$run_base" 2>/dev/null | grep -oE '^[0-9]+' | sort -n | tail -1 || true)
  RUN_NUMBER=$(printf "%02d" $(( 10#${last:-0} + 1 )))
  RUN_DIR="$run_base/$RUN_NUMBER-$model_name"
  mkdir -p "$RUN_DIR"
  flock -u "$lock_fd"
  exec {lock_fd}>&-
}

# copy_revim CHECKOUT AGENT_FILE [MODEL_ID]
# If MODEL_ID is given, the agent file's model line is patched to that value.
copy_revim() {
  local checkout=$1 agent_file=$2 model_id=${3:-}
  REVIM_TMP="$RUN_DIR/revim"
  cp -r "$REVIM_SOURCE/." "$REVIM_TMP"
  git -C "$REVIM_TMP" checkout master --quiet 2>/dev/null || true
  git -C "$REVIM_TMP" reset --hard "$checkout" --quiet
  (cd "$REVIM_TMP" && bun "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/dist/index.js" init)
  sed -i "s|^mode: subagent|mode: all|" "$REVIM_TMP/.opencode/agents/$agent_file"
  sed -i "/^  on_complete:/d; /^options:$/d" "$REVIM_TMP/.opencode/agents/$agent_file"
  [[ -n "$model_id" ]] && sed -i "s|^model:.*|model: $model_id|" "$REVIM_TMP/.opencode/agents/$agent_file"
  git -C "$REVIM_TMP" add .opencode
  git -C "$REVIM_TMP" commit --quiet -m "chore: peck init"
  echo "==> Checked out $checkout, ran peck init, agent=$agent_file${model_id:+, model=$model_id}" >&2
}

# get_session_stats DIR
# Looks up the opencode session for the given directory and prints a markdown stats block.
get_session_stats() {
  local dir=$1
  local session_id
  sleep 10
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    session_id=$(cd "$dir" && opencode session list --format json 2>/dev/null \
      | jq -r --arg dir "$dir" '.[] | select(.directory == $dir) | .id' \
      | head -1)
    [[ -n "$session_id" ]] && break
    sleep 5
  done
  [[ -z "$session_id" ]] && { echo "(session not found)"; return; }
  local tmp; tmp=$(mktemp)
  opencode export "$session_id" 2>/dev/null > "$tmp"
  jq -r '
    [.messages[].info | select(.role == "assistant")] as $msgs |
    "**Cost:** $\(($msgs | map(.cost) | add) | . * 1000000 | round | . / 1000000)\n**Peak context:** \($msgs | max_by(.tokens.total) | .tokens.total) tokens\n**Total tokens:** \($msgs | map(.tokens.total) | add) (input: \($msgs | map(.tokens.input) | add), output: \($msgs | map(.tokens.output) | add), cache_read: \($msgs | map(.tokens.cache.read) | add))"
  ' "$tmp"
  rm -f "$tmp"
}
