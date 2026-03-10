#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  investMTG — Full QA Pipeline
#  Runs smoke-test.sh + debug-tool.sh with a built-in gap to
#  avoid Cloudflare rate limits. Single command, one clean report.
#
#  Usage:
#    bash tests/full-qa.sh              # run everything
#    bash tests/full-qa.sh --smoke-only # smoke test only
#    bash tests/full-qa.sh --debug-only # debug tool only
#    bash tests/full-qa.sh --quick      # smoke only, alias
# ═══════════════════════════════════════════════════════════════

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[1;34m'
BOLD='\033[1m'
NC='\033[0m'

MODE="${1:-full}"
GAP_SECONDS=35

echo ""
echo -e "${BOLD}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       investMTG — Full QA Pipeline                    ║${NC}"
echo -e "${BOLD}║       $(date -u '+%Y-%m-%d %H:%M') UTC                            ║${NC}"
echo -e "${BOLD}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

SMOKE_PASS=0
SMOKE_TOTAL=0
DEBUG_PASS=0
DEBUG_WARN=0
DEBUG_TOTAL=0
SMOKE_EXIT=0
DEBUG_EXIT=0

# ── Smoke Test ────────────────────────────────────────────────
run_smoke() {
  echo -e "${BLUE}━━━ Phase 1: Smoke Test ━━━${NC}"
  echo ""

  cd "$REPO_DIR"
  SMOKE_OUTPUT=$(bash tests/smoke-test.sh 2>&1) || true
  SMOKE_EXIT=$?
  echo "$SMOKE_OUTPUT"

  # Parse results
  SMOKE_LINE=$(echo "$SMOKE_OUTPUT" | grep -oP '\d+ passed' | head -1 || echo "0 passed")
  SMOKE_PASS=$(echo "$SMOKE_LINE" | grep -oP '^\d+' || echo "0")
  SMOKE_TOTAL_LINE=$(echo "$SMOKE_OUTPUT" | grep -oP '\d+ total' | head -1 || echo "0 total")
  SMOKE_TOTAL=$(echo "$SMOKE_TOTAL_LINE" | grep -oP '^\d+' || echo "0")

  echo ""
}

# ── Debug Tool ────────────────────────────────────────────────
run_debug() {
  echo -e "${BLUE}━━━ Phase 2: Debug Tool (Full Diagnostics) ━━━${NC}"
  echo ""

  cd "$REPO_DIR"
  DEBUG_OUTPUT=$(bash tests/debug-tool.sh 2>&1) || true
  DEBUG_EXIT=$?
  echo "$DEBUG_OUTPUT"

  # Parse results
  DEBUG_PASS=$(echo "$DEBUG_OUTPUT" | grep -oP 'Passed:\s+\d+' | grep -oP '\d+' || echo "0")
  DEBUG_WARN=$(echo "$DEBUG_OUTPUT" | grep -oP 'Warnings:\d+' | grep -oP '\d+' || echo "0")
  DEBUG_TOTAL=$(echo "$DEBUG_OUTPUT" | grep -oP 'Total:\s+\d+' | grep -oP '\d+' || echo "0")

  echo ""
}

# ── Rate Limit Gap ────────────────────────────────────────────
rate_limit_gap() {
  echo -e "${YELLOW}⏱  Waiting ${GAP_SECONDS}s to avoid Cloudflare rate limits...${NC}"
  sleep "$GAP_SECONDS"
  echo -e "${GREEN}✓${NC} Ready for next phase."
  echo ""
}

# ── Run based on mode ─────────────────────────────────────────
case "$MODE" in
  --smoke-only|--quick)
    run_smoke
    ;;
  --debug-only)
    run_debug
    ;;
  full|*)
    run_smoke
    rate_limit_gap
    run_debug
    ;;
esac

# ── Combined Report ───────────────────────────────────────────
echo -e "${BOLD}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  FULL QA RESULTS                                      ║${NC}"
echo -e "${BOLD}╠═══════════════════════════════════════════════════════╣${NC}"

if [ "$MODE" != "--debug-only" ]; then
  if [ "$SMOKE_PASS" = "$SMOKE_TOTAL" ] && [ "$SMOKE_TOTAL" != "0" ]; then
    echo -e "║  ${GREEN}Smoke Test:  $SMOKE_PASS / $SMOKE_TOTAL passed${NC}                          ║"
  else
    echo -e "║  ${RED}Smoke Test:  $SMOKE_PASS / $SMOKE_TOTAL passed — ISSUES FOUND${NC}           ║"
  fi
fi

if [ "$MODE" != "--smoke-only" ] && [ "$MODE" != "--quick" ]; then
  if [ "$DEBUG_WARN" = "0" ] && [ "$DEBUG_PASS" = "$DEBUG_TOTAL" ] && [ "$DEBUG_TOTAL" != "0" ]; then
    echo -e "║  ${GREEN}Debug Tool:  $DEBUG_PASS / $DEBUG_TOTAL passed${NC}                         ║"
  elif [ "$DEBUG_WARN" != "0" ]; then
    echo -e "║  ${YELLOW}Debug Tool:  $DEBUG_PASS / $DEBUG_TOTAL passed, $DEBUG_WARN warnings${NC}              ║"
  else
    echo -e "║  ${RED}Debug Tool:  $DEBUG_PASS / $DEBUG_TOTAL passed — ISSUES FOUND${NC}          ║"
  fi
fi

COMBINED_PASS=$((SMOKE_PASS + DEBUG_PASS))
COMBINED_TOTAL=$((SMOKE_TOTAL + DEBUG_TOTAL))

if [ "$MODE" = "full" ] || [ "$MODE" = "" ]; then
  echo -e "║                                                       ║"
  if [ "$COMBINED_PASS" = "$COMBINED_TOTAL" ] && [ "$DEBUG_WARN" = "0" ]; then
    echo -e "║  ${GREEN}${BOLD}Combined:    $COMBINED_PASS / $COMBINED_TOTAL — ALL CLEAR ✓${NC}                  ║"
  else
    echo -e "║  ${YELLOW}${BOLD}Combined:    $COMBINED_PASS / $COMBINED_TOTAL ($DEBUG_WARN warnings)${NC}                   ║"
  fi
fi

echo -e "${BOLD}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Exit with failure count
exit $((SMOKE_EXIT + DEBUG_EXIT))
