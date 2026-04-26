AGENT="code-reviewer"
AGENT_FILE="code-reviewer.md"

# Sets CHECKOUT, INPUT, EXPECTED for a given case
case_config() {
  case "$1" in
    013-1) CHECKOUT="7bdc742"; INPUT="83b65f5..7bdc742"; EXPECTED="fail" ;;
    012-1) CHECKOUT="85ae4ec"; INPUT="e21a746..85ae4ec"; EXPECTED="fail" ;;
    010-1) CHECKOUT="4efae1d"; INPUT="a11d469..4efae1d"; EXPECTED="fail" ;;
    010-2) CHECKOUT="ab5b088"; INPUT="a11d469..ab5b088"; EXPECTED="pass" ;;
    *) echo "Error: unknown case: $1" >&2; return 1 ;;
  esac
}
