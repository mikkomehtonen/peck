AGENT=""           # run default opencode agent; planner is invoked as a subagent
AGENT_FILE="planner.md"
PATCH_AGENT_MODEL=1  # patch planner.md to use the benchmark model

# Sets CHECKOUT, INPUT, EXPECTED for a given case
case_config() {
  case "$1" in
    010-1) CHECKOUT="8307388"; INPUT="Use the planner subagent to plan the vim search feature for revim: forward search with /, backward search with ?, next match n, previous match N. Answer any questions the planner asks. When planning is done, verify the story file is committed and the working tree is clean."; EXPECTED="pass" ;;
    *) echo "Error: unknown case: $1" >&2; return 1 ;;
  esac
}

# Pass if commits were made, a story file was created, and the tree is clean.
compute_verdict() {
  local revim_tmp=$1 pre_head=$2
  local new_commits story_file tree_clean
  new_commits=$(git -C "$revim_tmp" log --oneline "$pre_head..HEAD" | wc -l)
  [[ "$new_commits" -eq 0 ]] && { echo "no-commit"; return; }
  story_file=$(git -C "$revim_tmp" diff --name-only "$pre_head..HEAD" | grep 'stories/.*/story\.md' | head -1)
  tree_clean=$(git -C "$revim_tmp" status --porcelain | wc -l)
  [[ -n "$story_file" && "$tree_clean" -eq 0 ]] && echo "pass" || echo "fail"
}
