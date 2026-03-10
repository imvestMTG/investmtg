#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  investMTG — AI Code Review (OpenAI GPT-4o Second Opinion)
#  Sends the current git diff to GPT for review before pushing.
#
#  Usage:
#    bash tests/code-review.sh              # review staged changes
#    bash tests/code-review.sh --all        # review all uncommitted changes
#    bash tests/code-review.sh --last       # review last commit
#    bash tests/code-review.sh FILE.js      # review a specific file
#
#  Requires: OPENAI_API_KEY environment variable
#  (or the Perplexity Computer OpenAI connector handles it)
# ═══════════════════════════════════════════════════════════════

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[1;34m'
NC='\033[0m'

MODE="${1:-staged}"

cd "$REPO_DIR"

echo ""
echo -e "${BOLD}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       investMTG — AI Code Review                      ║${NC}"
echo -e "${BOLD}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Get the diff based on mode
case "$MODE" in
  --all)
    echo -e "${BLUE}Reviewing:${NC} All uncommitted changes"
    DIFF=$(git diff HEAD -- . ':!vendor' ':!worker/node_modules' 2>/dev/null || git diff -- . ':!vendor' ':!worker/node_modules')
    ;;
  --last)
    echo -e "${BLUE}Reviewing:${NC} Last commit"
    DIFF=$(git diff HEAD~1..HEAD -- . ':!vendor' ':!worker/node_modules')
    ;;
  --staged|staged)
    echo -e "${BLUE}Reviewing:${NC} Staged changes"
    DIFF=$(git diff --cached -- . ':!vendor' ':!worker/node_modules')
    if [ -z "$DIFF" ]; then
      echo -e "${YELLOW}No staged changes. Falling back to all uncommitted changes.${NC}"
      DIFF=$(git diff HEAD -- . ':!vendor' ':!worker/node_modules' 2>/dev/null || git diff -- . ':!vendor' ':!worker/node_modules')
    fi
    ;;
  *)
    # Specific file
    if [ -f "$MODE" ]; then
      echo -e "${BLUE}Reviewing:${NC} $MODE"
      DIFF=$(git diff HEAD -- "$MODE" 2>/dev/null || cat "$MODE")
    else
      echo "File not found: $MODE"
      exit 1
    fi
    ;;
esac

if [ -z "$DIFF" ]; then
  echo -e "${GREEN}No changes to review.${NC}"
  exit 0
fi

# Count lines
LINES=$(echo "$DIFF" | wc -l)
echo -e "${BLUE}Diff size:${NC} $LINES lines"

# Truncate if too large (GPT context limits)
if [ "$LINES" -gt 800 ]; then
  echo -e "${YELLOW}Diff is large ($LINES lines). Truncating to 800 lines for review.${NC}"
  DIFF=$(echo "$DIFF" | head -800)
fi

# Save diff for the Perplexity Computer OpenAI connector
DIFF_FILE="/tmp/investmtg-review-diff.txt"
echo "$DIFF" > "$DIFF_FILE"

echo ""
echo -e "${BLUE}Diff saved to:${NC} $DIFF_FILE"
echo -e "${YELLOW}Use the Perplexity Computer OpenAI connector to send this for review.${NC}"
echo ""

# Print the review prompt for reference
cat << 'PROMPT'
═══ REVIEW PROMPT ═══
You are reviewing code for investMTG, a Magic: The Gathering marketplace.

Project rules:
- var only (no let/const), function keyword only (no arrows)
- React.createElement (no JSX), var h = React.createElement
- No raw localStorage (use utils/storage.js wrappers)
- All backend URLs via PROXY_BASE from config.js
- No API keys in frontend code
- All external domains must be in CSP connect-src

Review this diff for:
1. Rule violations (var-only, no arrows, no raw localStorage)
2. Security issues (exposed secrets, missing CSP entries)
3. Logic bugs or race conditions
4. Missing error handling
5. Performance concerns
6. Any code that could break the site silently

Be concise. Flag only real issues, not style preferences.
═════════════════════
PROMPT

echo ""
echo -e "${GREEN}Done.${NC} Diff is ready for AI review."
