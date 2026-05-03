AGENT="code-reviewer"
AGENT_FILE="code-reviewer.md"

# Sets CHECKOUT, INPUT, EXPECTED for a given case
case_config() {
  case "$1" in
    013-2) CHECKOUT="3aa8339"; INPUT="83b65f5..3aa8339"; EXPECTED="fail" ;;
    010-2) CHECKOUT="6f6b8a8"; INPUT="8307388..6f6b8a8"; EXPECTED="fail" ;;
    *) echo "Error: unknown case: $1" >&2; return 1 ;;
  esac
}
