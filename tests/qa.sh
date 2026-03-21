#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  investMTG — Unified QA Script
#  Replaces: smoke-test.sh, debug-tool.sh, full-qa.sh
#
#  Usage:
#    bash tests/qa.sh                # standard pre-push checks (~45 checks)
#    bash tests/qa.sh --quick        # fast sanity only (~15 checks)
#    bash tests/qa.sh --full         # everything incl. perf + DNS (~65 checks)
#    bash tests/qa.sh --local        # local code checks only (no HTTP)
#    bash tests/qa.sh --live         # live site checks only (no local)
#    bash tests/qa.sh --deploy       # full close-out: push → wait → QA → cache purge
#
#  Requires: bash, curl, python3
# ═══════════════════════════════════════════════════════════════

set -o pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

SITE="https://www.investmtg.com"
API="https://api.investmtg.com"
MODE="${1:---standard}"
PASS=0; FAIL=0; WARN=0; SKIP=0
ERRORS=""

# Colors
R="\033[31m"; G="\033[32m"; Y="\033[33m"; B="\033[34m"; C="\033[36m"; M="\033[35m"; W="\033[0m"; BOLD="\033[1m"

pass()   { printf "${G}  ✓${W} %s\n" "$1"; PASS=$((PASS+1)); }
fail()   { printf "${R}  ✗${W} %s\n" "$1"; FAIL=$((FAIL+1)); ERRORS="${ERRORS}\n  • $1"; }
warn()   { printf "${Y}  ⚠${W} %s\n" "$1"; WARN=$((WARN+1)); }
skip()   { printf "${M}  ⊘${W} %s\n" "$1"; SKIP=$((SKIP+1)); }
info()   { printf "${C}  ℹ${W} %s\n" "$1"; }
header() { printf "\n${BOLD}${B}── %s ──${W}\n" "$1"; }

# ── Tier logic ──
is_quick()    { [ "$MODE" = "--quick" ]; }
is_standard() { [ "$MODE" = "--standard" ] || [ "$MODE" = "--full" ]; }
is_full()     { [ "$MODE" = "--full" ]; }
is_local()    { [ "$MODE" = "--local" ]; }
is_live()     { [ "$MODE" = "--live" ]; }
is_deploy()   { [ "$MODE" = "--deploy" ]; }
run_local()   { ! is_live; }
run_remote()  { ! is_local; }

# ── Cached fetches (fetch once, reuse) ──
INDEX_HTML=""
HEALTH_JSON=""
fetch_index() {
  [ -n "$INDEX_HTML" ] && return
  INDEX_HTML=$(curl -s --connect-timeout 8 --max-time 15 "$SITE/" 2>/dev/null)
  # Retry once if response is empty or suspiciously short (< 1KB)
  if [ ${#INDEX_HTML} -lt 1024 ]; then
    sleep 2
    INDEX_HTML=$(curl -s --connect-timeout 8 --max-time 15 "$SITE/" 2>/dev/null)
  fi
}
fetch_health() { [ -n "$HEALTH_JSON" ] && return; HEALTH_JSON=$(curl -s --connect-timeout 8 --max-time 15 "$API/api/health" 2>/dev/null); }

# ── Helpers ──
check_status() {
  local name="$1" url="$2" expected="${3:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 8 --max-time 15 "$url" 2>/dev/null)
  if [ "$code" = "$expected" ]; then pass "$name (HTTP $code)"
  else fail "$name — expected $expected, got $code"; fi
}

check_cached_contains() {
  local name="$1" body="$2" needle="$3"
  if echo "$body" | grep -qi "$needle"; then pass "$name"
  else fail "$name — missing '$needle'"; fi
}

json_field() {
  local json="$1" field="$2"
  echo "$json" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  keys='$field'.split('.')
  for k in keys: d=d[k] if isinstance(d,dict) else d[int(k)]
  print(d)
except: print('__MISSING__')
" 2>/dev/null
}

check_health_field() {
  local name="$1" field="$2" expected="$3"
  fetch_health
  local val
  val=$(json_field "$HEALTH_JSON" "$field")
  if [ "$val" = "$expected" ]; then pass "$name ($field=$val)"
  elif [ "$val" = "__MISSING__" ]; then fail "$name — field '$field' not found"
  else fail "$name — expected $field='$expected', got '$val'"; fi
}

time_url() {
  local name="$1" url="$2" warn_ms="${3:-2000}"
  local ms
  ms=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 8 --max-time 15 "$url" 2>/dev/null \
    | python3 -c "import sys; print(int(float(sys.stdin.read().strip())*1000))" 2>/dev/null)
  if [ -z "$ms" ]; then fail "$name — no response"
  elif [ "$ms" -lt "$warn_ms" ]; then pass "$name — ${ms}ms"
  else warn "$name — ${ms}ms (slow, threshold ${warn_ms}ms)"; fi
}

# ═══════════════════════════════════════════════════════════════
# DEPLOY MODE: push → wait for propagation → cache purge → standard QA
# ═══════════════════════════════════════════════════════════════
if is_deploy; then
  cd "$REPO_DIR"

  printf "\n${BOLD}${B}── Deploy: Git Status ──${W}\n"
  if ! git diff --quiet HEAD 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    printf "${R}  ✗${W} Uncommitted changes — commit first, then run --deploy\n"
    exit 1
  fi

  # Check if local is ahead of remote
  git fetch origin main --quiet 2>/dev/null || true
  LOCAL_SHA=$(git rev-parse HEAD 2>/dev/null)
  REMOTE_SHA=$(git rev-parse origin/main 2>/dev/null)
  if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
    printf "${Y}  …${W} Local ahead of remote — pushing...\n"
    git push origin main 2>&1
    if [ $? -ne 0 ]; then printf "${R}  ✗${W} Git push failed\n"; exit 1; fi
    printf "${G}  ✓${W} Pushed to origin/main\n"
  else
    printf "${G}  ✓${W} Already in sync with origin/main\n"
  fi

  # Wait for GitHub Pages propagation (poll SW version)
  printf "\n${BOLD}${B}── Deploy: Waiting for GitHub Pages ──${W}\n"
  LOCAL_VER=$(grep -o "investmtg-v[0-9]*" sw.js 2>/dev/null | head -1)
  printf "${C}  ℹ${W} Expecting: $LOCAL_VER\n"
  MAX_WAIT=90
  WAITED=0
  INTERVAL=10
  while [ $WAITED -lt $MAX_WAIT ]; do
    DEPLOYED_VER=$(curl -s "$SITE/sw.js?_=$(date +%s)" 2>/dev/null | grep -o "investmtg-v[0-9]*" | head -1)
    if [ "$DEPLOYED_VER" = "$LOCAL_VER" ]; then
      printf "${G}  ✓${W} Live: $DEPLOYED_VER (waited ${WAITED}s)\n"
      break
    fi
    printf "${Y}  …${W} Still $DEPLOYED_VER (${WAITED}s / ${MAX_WAIT}s)\n"
    sleep $INTERVAL
    WAITED=$((WAITED + INTERVAL))
  done
  if [ "$DEPLOYED_VER" != "$LOCAL_VER" ]; then
    printf "${Y}  ⚠${W} Timed out — deployed is $DEPLOYED_VER (expected $LOCAL_VER)\n"
  fi

  # Cloudflare cache purge
  printf "\n${BOLD}${B}── Deploy: Cache Purge ──${W}\n"
  CF_TOKEN="${CF_TOKEN:-${CLOUDFLARE_API_TOKEN:-}}"
  CF_ZONE="7906e5ca359b29ab374228024e70fffd"
  if [ -n "$CF_TOKEN" ]; then
    PURGE_OK=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE/purge_cache" \
      -H "Authorization: Bearer $CF_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"purge_everything":true}' 2>/dev/null \
      | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',''))" 2>/dev/null)
    if [ "$PURGE_OK" = "True" ]; then printf "${G}  ✓${W} Cache purged\n"
    else printf "${Y}  ⚠${W} Cache purge may have failed\n"; fi
    sleep 3
  else
    printf "${Y}  ⚠${W} CF_TOKEN not set — skipping cache purge\n"
    printf "${C}  ℹ${W} Export CF_TOKEN or CLOUDFLARE_API_TOKEN before running\n"
  fi

  # Switch to standard mode for the rest of the QA checks
  printf "\n${BOLD}${B}── Deploy: Running Standard QA ──${W}\n"
  MODE="--standard"
fi

echo ""
printf "${BOLD}╔═══════════════════════════════════════════════════╗${W}\n"
printf "${BOLD}║  investMTG QA  %-35s║${W}\n" "$(date -u '+%Y-%m-%d %H:%M UTC')"
printf "${BOLD}║  Mode: %-43s║${W}\n" "$MODE"
printf "${BOLD}╚═══════════════════════════════════════════════════╝${W}\n"

# ═══════════════════════════════════════════════════════════════
# LOCAL CODE CHECKS (no HTTP, fast)
# ═══════════════════════════════════════════════════════════════
if run_local; then
  cd "$REPO_DIR"

  if [ -d "components" ] && [ -d "utils" ]; then

    header "Code Style"
    LET_CONST=$(grep -rn '\blet \|\bconst ' --include='*.js' . 2>/dev/null \
      | grep -v vendor | grep -v worker | grep -v node_modules | grep -v tools/ | grep -v next-app/ \
      | grep -v '// ' | wc -l 2>/dev/null | tr -d '[:space:]')
    if [ "$LET_CONST" = "0" ]; then pass "No let/const violations"
    else
      fail "let/const violations: $LET_CONST"
      grep -rn '\blet \|\bconst ' --include='*.js' . 2>/dev/null \
        | grep -v vendor | grep -v worker | grep -v node_modules | grep -v tools/ | grep -v next-app/ \
        | grep -v '// ' | head -5
    fi

    ARROW=$(grep -rn '=>' --include='*.js' . 2>/dev/null \
      | grep -v vendor | grep -v worker | grep -v node_modules | grep -v tools/ | grep -v next-app/ \
      | wc -l 2>/dev/null | tr -d '[:space:]')
    if [ "$ARROW" = "0" ]; then pass "No arrow functions"
    else
      fail "Arrow function violations: $ARROW"
      grep -rn '=>' --include='*.js' . 2>/dev/null \
        | grep -v vendor | grep -v worker | grep -v node_modules | grep -v tools/ | grep -v next-app/ | head -5
    fi

    header "Secrets"
    SECRET_HITS=$(grep -rn 'API_KEY\|SECRET\|password' --include='*.js' . 2>/dev/null \
      | grep -v vendor | grep -v node_modules | grep -v worker/ \
      | grep -v 'SUMUP_PUBLIC_KEY' | grep -v 'PAYPAL_CLIENT_ID' | grep -v '//' \
      | grep -v 'Google password' | grep -v 'No account or password' \
      | wc -l 2>/dev/null | tr -d '[:space:]')
    if [ "$SECRET_HITS" = "0" ]; then pass "No secrets in frontend code"
    else
      fail "Potential secrets found ($SECRET_HITS matches)"
      grep -rn 'API_KEY\|SECRET\|password' --include='*.js' . 2>/dev/null \
        | grep -v vendor | grep -v node_modules | grep -v worker/ \
        | grep -v 'SUMUP_PUBLIC_KEY' | grep -v 'PAYPAL_CLIENT_ID' | grep -v '//' \
        | grep -v 'Google password' | grep -v 'No account or password' | head -5
    fi

    header "URL Centralization"
    STALE=$(grep -rn 'investmtg-proxy\.bloodshutdawn\.workers\.dev' --include='*.js' . 2>/dev/null \
      | grep -v vendor | grep -v worker | grep -v node_modules | wc -l | tr -d '[:space:]')
    HARDCODED=$(grep -rn 'api\.investmtg\.com' --include='*.js' . 2>/dev/null \
      | grep -v vendor | grep -v worker | grep -v node_modules \
      | grep -v config.js | grep -v PricingView | wc -l | tr -d '[:space:]')
    if [ "$STALE" = "0" ] && [ "$HARDCODED" = "0" ]; then pass "All backend URLs centralized"
    else
      [ "$STALE" != "0" ] && fail "Stale .workers.dev URLs: $STALE"
      [ "$HARDCODED" != "0" ] && fail "Hardcoded api.investmtg.com: $HARDCODED"
    fi

    # Standard+ only
    if is_standard || is_full; then
      header "Dual-Write Integrity"
      P_API=$(grep -rn 'addToPortfolioAPI\|removeFromPortfolioAPI' --include='*.js' . 2>/dev/null \
        | grep -v vendor | grep -v worker | grep -v node_modules \
        | grep -v 'import ' | grep -c '.' 2>/dev/null || echo "0")
      P_LOCAL=$(grep -rn 'storageSet.*portfolio\|storageGet.*portfolio' --include='*.js' . 2>/dev/null \
        | grep -v vendor | grep -v worker | grep -v node_modules \
        | grep -c '.' 2>/dev/null || echo "0")
      if [ "$P_API" -gt 0 ] && [ "$P_LOCAL" -gt 0 ]; then
        pass "Portfolio dual-write (API=$P_API, localStorage=$P_LOCAL)"
      else warn "Portfolio dual-write — API=$P_API, localStorage=$P_LOCAL (verify)"; fi
    fi

    header "SW Version"
    LOCAL_VER=$(grep -o "investmtg-v[0-9]*" sw.js 2>/dev/null)
    if [ -n "$LOCAL_VER" ]; then info "Local: $LOCAL_VER"
    else fail "SW version not found in sw.js"; fi

    # Check docs exist in modified files (only if there are uncommitted changes)
    if is_standard || is_full; then
      CHANGED=$(git diff --name-only HEAD 2>/dev/null || true)
      if [ -n "$CHANGED" ]; then
        header "Doc Checklist"
        HAS_CHANGES_MD=$(echo "$CHANGED" | grep -c 'CHANGES.md' || true)
        HAS_SOUL_MD=$(echo "$CHANGED" | grep -c 'SOUL.md' || true)
        HAS_BUILD_SPEC=$(echo "$CHANGED" | grep -c 'BUILD_SPEC.md' || true)
        HAS_SW=$(echo "$CHANGED" | grep -c 'sw.js' || true)
        HAS_WORKER_CHANGE=$(echo "$CHANGED" | grep -c 'worker/' || true)
        HAS_WORKER_README=$(echo "$CHANGED" | grep -c 'worker/README.md' || true)

        [ "$HAS_CHANGES_MD" -gt 0 ] && pass "CHANGES.md updated" || warn "CHANGES.md not in diff"
        [ "$HAS_BUILD_SPEC" -gt 0 ] && pass "BUILD_SPEC.md updated" || info "BUILD_SPEC.md not in diff (may be OK)"
        [ "$HAS_SW" -gt 0 ] && pass "sw.js in diff" || warn "sw.js not in diff — version bump needed?"
        if [ "$HAS_WORKER_CHANGE" -gt 0 ] && [ "$HAS_WORKER_README" = "0" ]; then
          warn "worker/ changed but worker/README.md not updated"
        fi
      fi
    fi

  else
    skip "Local checks — not in repo directory"
  fi
fi

# ═══════════════════════════════════════════════════════════════
# LIVE SITE CHECKS (HTTP)
# ═══════════════════════════════════════════════════════════════
if run_remote; then

  # ── Core health (all tiers) ──
  header "API Health"
  check_health_field "API status" "status" "ok"
  check_health_field "D1 database" "db" "connected"

  # Show storage stats
  fetch_health
  VERSION=$(json_field "$HEALTH_JSON" "version")
  LISTINGS=$(json_field "$HEALTH_JSON" "storage.listings")
  PRICES=$(json_field "$HEALTH_JSON" "storage.prices")
  info "Worker $VERSION | listings=$LISTINGS, prices=$PRICES"

  header "Frontend"
  check_status "index.html" "$SITE/"
  check_status "sw.js" "$SITE/sw.js"

  # Verify SW deployed version
  DEPLOYED_VER=$(curl -s "$SITE/sw.js" 2>/dev/null | grep -o "investmtg-v[0-9]*")
  if [ -n "$DEPLOYED_VER" ]; then pass "SW deployed: $DEPLOYED_VER"
  else fail "SW version not found on live site"; fi

  # Quick check: compare local vs deployed
  if [ -f "$REPO_DIR/sw.js" ]; then
    LOCAL_VER=$(grep -o "investmtg-v[0-9]*" "$REPO_DIR/sw.js" 2>/dev/null)
    if [ "$LOCAL_VER" = "$DEPLOYED_VER" ]; then pass "SW local=deployed ($LOCAL_VER)"
    else warn "SW mismatch — local=$LOCAL_VER, deployed=$DEPLOYED_VER"; fi
  fi

  # DOM checks (cached — one fetch)
  fetch_index
  check_cached_contains "Page title" "$INDEX_HTML" "investMTG"
  check_cached_contains "React import map" "$INDEX_HTML" "importmap"
  check_cached_contains "CSP present" "$INDEX_HTML" "Content-Security-Policy"
  check_cached_contains "SW registration" "$INDEX_HTML" "serviceWorker"

  if ! is_quick; then
    check_status "style.css" "$SITE/style.css"
    check_status "base.css" "$SITE/base.css"
    check_status "app.js" "$SITE/app.js"
    check_status "manifest.json" "$SITE/manifest.json"
  fi

  # ── API routes ──
  header "API Routes"
  check_status "Search" "$API/api/search?q=lightning+bolt&page=1"

  TICKER_COUNT=$(curl -s "$API/api/ticker" 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 'err')" 2>/dev/null)
  if [ "$TICKER_COUNT" != "err" ] && [ "$TICKER_COUNT" -gt 0 ] 2>/dev/null; then
    pass "Ticker — $TICKER_COUNT items"
  else warn "Ticker — unexpected: $TICKER_COUNT"; fi

  AUTH_VAL=$(curl -s --connect-timeout 8 --max-time 15 "$API/auth/me" 2>/dev/null \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('authenticated',''))" 2>/dev/null)
  if [ "$AUTH_VAL" = "False" ]; then pass "Auth (unauth) — authenticated=False"
  else fail "Auth — unexpected: $AUTH_VAL"; fi

  if ! is_quick; then
    for route in featured trending budget stores events; do
      check_status "/api/$route" "$API/api/$route"
    done

    # Proxy routes
    JT=$(curl -s -o /dev/null -w "%{http_code}" "$API/justtcg?path=/v1/cards&tcgplayerId=282800&condition=NM" -H "Authorization: Bearer investmtg-admin-2026" 2>/dev/null)
    if [ "$JT" = "200" ]; then pass "JustTCG proxy (HTTP $JT)"
    else fail "JustTCG proxy — HTTP $JT"; fi

    PROXY=$(curl -s -o /dev/null -w "%{http_code}" "$API/?target=https://api.scryfall.com/cards/random" -H "Origin: $SITE" 2>/dev/null)
    if [ "$PROXY" = "200" ]; then pass "CORS proxy (HTTP $PROXY)"
    else warn "CORS proxy — HTTP $PROXY"; fi
  fi

  # ── Payments ──
  if ! is_quick; then
    header "Payments"
    PP_RESP=$(curl -s -X POST "$API/api/paypal/create-order" \
      -H "Content-Type: application/json" -H "Origin: $SITE" \
      -d '{"order_id":"qa-test","amount":1.00}' 2>/dev/null)
    PP_OK=$(json_field "$PP_RESP" "ok")
    PP_STATUS=$(json_field "$PP_RESP" "status")
    if [ "$PP_OK" = "True" ]; then pass "PayPal create — status=$PP_STATUS"
    else fail "PayPal create — response: $PP_RESP"; fi

    CAP_ERR=$(curl -s -X POST "$API/api/paypal/capture-order" \
      -H "Content-Type: application/json" -H "Origin: $SITE" \
      -d '{}' 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null)
    if [ "$CAP_ERR" = "paypal_order_id required" ]; then pass "PayPal capture — validates input"
    else fail "PayPal capture — unexpected: $CAP_ERR"; fi

    SU_RESP=$(curl -s -X POST "$API/api/sumup/checkout" \
      -H "Content-Type: application/json" -H "Origin: $SITE" \
      -d "{\"amount\":1.00,\"order_id\":\"qa-$(date +%s)\"}" 2>/dev/null)
    SU_OK=$(json_field "$SU_RESP" "ok")
    if [ "$SU_OK" = "True" ]; then pass "SumUp checkout"
    else fail "SumUp checkout — $(json_field "$SU_RESP" "error")"; fi

    ORD_ERR=$(curl -s -X POST "$API/api/orders" \
      -H "Content-Type: application/json" -H "Origin: $SITE" \
      -d '{}' 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null)
    if [ "$ORD_ERR" = "items array required" ]; then pass "Orders POST — validates input"
    else fail "Orders POST — unexpected: $ORD_ERR"; fi
  fi

  # ── CSP audit (standard+) ──
  if ! is_quick; then
    header "CSP Audit"
    fetch_index
    CSP_CONNECT=$(echo "$INDEX_HTML" | grep -oP 'connect-src[^;]+' | head -1)
    if [ -z "$CSP_CONNECT" ]; then
      fail "CSP connect-src — not found in HTML (fetch may have failed)"
    else
      for domain in api.investmtg.com api.scryfall.com gateway.sumup.com api.sumup.com js.sumup.com api.justtcg.com api2.moxfield.com edhtop16.com topdeck.gg paypal.com paypalobjects.com sentry.io; do
        if echo "$CSP_CONNECT" | grep -q "$domain"; then pass "CSP connect-src: $domain"
        else fail "CSP connect-src MISSING: $domain"; fi
      done
    fi
  fi

  # ── CORS ──
  header "CORS"
  CORS_H=$(curl -s -I -X OPTIONS "$API/api/health" \
    -H "Origin: $SITE" -H "Access-Control-Request-Method: GET" 2>/dev/null \
    | grep -i "access-control-allow-origin")
  if echo "$CORS_H" | grep -qi "investmtg.com\|\*"; then pass "CORS — origin allowed"
  else warn "CORS — $CORS_H"; fi

  # ── JS modules (standard+) ──
  if is_standard || is_full; then
    header "JS Modules"
    for comp in CheckoutView HomeView StoreView SearchView CardDetailView CartView PortfolioView SellerDashboard MarketMoversView ShopView Header Footer Ticker; do
      check_status "$comp.js" "$SITE/components/${comp}.js"
    done
    for util in api auth config helpers sanitize storage; do
      check_status "utils/$util.js" "$SITE/utils/${util}.js"
    done
  fi

  # ── Full-only: DNS + Performance ──
  if is_full; then
    header "DNS"
    for host in www.investmtg.com api.investmtg.com investmtg.com; do
      DNS_IP=$(python3 -c "import socket; print(socket.gethostbyname('$host'))" 2>/dev/null)
      if [ -n "$DNS_IP" ]; then pass "$host → $DNS_IP"
      else fail "$host — DNS failed"; fi
    done

    TLS_VER=$(curl -sv -o /dev/null "$SITE/" 2>&1 | grep -oP 'SSL connection using \K[^ ]+' || true)
    [ -n "$TLS_VER" ] && pass "TLS: $TLS_VER" || warn "TLS version unknown"

    header "Performance"
    time_url "index.html" "$SITE/" 1500
    time_url "API health" "$API/api/health" 1000
    time_url "API search" "$API/api/search?q=sol+ring&page=1" 3000
    time_url "API ticker" "$API/api/ticker" 2000

    header "Asset Sizes"
    for asset in style.css app.js components/CheckoutView.js components/HomeView.js; do
      SIZE=$(curl -s -o /dev/null -w "%{size_download}" "$SITE/$asset" 2>/dev/null)
      SIZE_KB=$((SIZE / 1024))
      if [ "$SIZE_KB" -lt 300 ]; then pass "$asset — ${SIZE_KB}KB"
      else warn "$asset — ${SIZE_KB}KB (large)"; fi
    done
  fi
fi

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
echo ""
TOTAL=$((PASS + FAIL + WARN + SKIP))
printf "${BOLD}╔═══════════════════════════════════════════════════╗${W}\n"
printf "${BOLD}║  RESULTS  %-40s║${W}\n" "$MODE"
printf "${BOLD}╠═══════════════════════════════════════════════════╣${W}\n"
printf "║  ${G}Passed:  %-4d${W}                                      ║\n" "$PASS"
[ "$FAIL" -gt 0 ] && printf "║  ${R}Failed:  %-4d${W}                                      ║\n" "$FAIL"
[ "$WARN" -gt 0 ] && printf "║  ${Y}Warned:  %-4d${W}                                      ║\n" "$WARN"
printf "║  Total:   %-4d                                     ║\n" "$TOTAL"
printf "${BOLD}╚═══════════════════════════════════════════════════╝${W}\n"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  printf "${R}${BOLD}FAILURES:${W}\n"
  printf "$ERRORS\n"
fi

echo ""
exit $FAIL
