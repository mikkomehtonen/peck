AGENT="code-reviewer"
AGENT_FILE="code-reviewer.md"

# Sets CHECKOUT, INPUT, EXPECTED for a given case
case_config() {
  case "$1" in
    007-1) CHECKOUT="ff329f2"; INPUT="9d864e2..ff329f2"; EXPECTED="fail" ;;
    007-2) CHECKOUT="b99b16b"; INPUT="9d864e2..b99b16b"; EXPECTED="pass" ;;
    006-1) CHECKOUT="aa5bf90"; INPUT="43f2f67..aa5bf90"; EXPECTED="fail" ;;
    006-2) CHECKOUT="fed99a1"; INPUT="43f2f67..fed99a1"; EXPECTED="pass" ;;
    *) echo "Error: unknown case: $1" >&2; return 1 ;;
  esac
}
