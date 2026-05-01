AGENT="code-reviewer"
AGENT_FILE="code-reviewer.md"

# Sets CHECKOUT, INPUT, EXPECTED for a given case
case_config() {
  case "$1" in
    013-1) CHECKOUT="89db87b"; INPUT="83b65f5..89db87b"; EXPECTED="fail" ;;
    013-2) CHECKOUT="3aa8339"; INPUT="83b65f5..3aa8339"; EXPECTED="pass" ;;
    010-1) CHECKOUT="5516297"; INPUT="8307388..5516297"; EXPECTED="fail" ;;
    010-2) CHECKOUT="6f6b8a8"; INPUT="8307388..6f6b8a8"; EXPECTED="pass" ;;
    *) echo "Error: unknown case: $1" >&2; return 1 ;;
  esac
}
