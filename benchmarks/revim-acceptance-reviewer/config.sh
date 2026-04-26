AGENT="acceptance-reviewer"
AGENT_FILE="acceptance-reviewer.md"

# Sets CHECKOUT, INPUT, EXPECTED for a given case
case_config() {
  case "$1" in
    009-1) CHECKOUT="0cbf185"; INPUT="stories/009-fix-cursor-undo-regressions/"; EXPECTED="pass" ;;
    010-1) CHECKOUT="fd641b7"; INPUT="stories/010-vim-search/";                 EXPECTED="pass" ;;
    *) echo "Error: unknown case: $1" >&2; return 1 ;;
  esac
}
