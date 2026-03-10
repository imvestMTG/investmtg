#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# investMTG Debug Tool — Full-Stack Diagnostic Suite
# ═══════════════════════════════════════════════════════════════════
#
# Usage:
#   bash tests/debug-tool.sh              # Full diagnostic (all sections)
#   bash tests/debug-tool.sh frontend     # Frontend only
#   bash tests/debug-tool.sh api          # API routes only
#   bash tests/debug-tool.sh db           # Database health only
#   bash tests/debug-tool.sh payments     # PayPal + SumUp only
#   bash tests/debug-tool.sh security     # CSP + secrets + CORS only
#   bash tests/debug-tool.sh dns          # DNS records only
#   bash tests/debug-tool.sh perf         # Performance timing only
#   bash tests/debug-tool.sh code         # Code style audit only
#
# Requirements: bash, curl, python3 (no other dependencies)
# ═══════════════════════════════════════════════════════════════════

set -o pipefail

SITE="https://www.investmtg.com"
API="https://api.investmtg.com"
SECTION="${1:-all}"  # default: run everything
PASS=0; FAIL=0; WARN=0; SKIP=0
ERRORS=""  # accumulate error details

# ── Colors ──
R="\033[31m"; G="\033[32m"; Y="\033[33m"; B="\033[34m"; C="\033[36m"; M="\033[35m"; W="\033[0m"; BOLD="\033[1m"

pass()  { printf "${G}  ✓ PASS${W}  %s\n" "$1"; PASS=$((PASS+1)); }
fail()  { printf "${R}  ✗ FAIL${W}  %s\n" "$1"; FAIL=$((FAIL+1)); ERRORS="${ERRORS}\n  • $1"; }
warn()  { printf "${Y}  ⚠ WARN${W}  %s\n" "$1"; WARN=$((WARN+1)); }
skip()  { printf "${M}  ⊘ SKIP${W}  %s\n" "$1"; SKIP=$((SKIP+1)); }
info()  { printf "${C}  ℹ INFO${W}  %s\n" "$1"; }
header(){ printf "\n${BOLD}${B}━━━ %s ━━━${W}\n" "$1"; }

# ── Helper: HTTP status ──
check_status() {
  local name="$1" url="$2" expected="${3:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 8 --max-time 15 "$url" 2>/dev/null)
  if [ "$code" = "$expected" ]; then pass "$name (HTTP $code)"
  else fail "$name — expected HTTP $expected, got $code"; fi
}

# ── Helper: body contains ──
check_contains() {
  local name="$1" url="$2" needle="$3"
  local body
  body=$(curl -s --connect-timeout 8 --max-time 15 "$url" 2>/dev/null)
  if echo "$body" | grep -qi "$needle"; then pass "$name"
  else fail "$name — missing '$needle'"; fi
}

# ── Helper: JSON field check ──
check_json() {
  local name="$1" url="$2" field="$3" expected="$4" method="${5:-GET}" postdata="${6:-}"
  local val
  if [ "$method" = "POST" ]; then
    val=$(curl -s -X POST --connect-timeout 8 --max-time 15 \
      -H "Content-Type: application/json" -H "Origin: $SITE" \
      -d "$postdata" "$url" 2>/dev/null | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  keys='$field'.split('.')
  for k in keys: d=d[k] if isinstance(d,dict) else d[int(k)]
  print(d)
except: print('__MISSING__')
" 2>/dev/null)
  else
    val=$(curl -s --connect-timeout 8 --max-time 15 -H "Origin: $SITE" "$url" 2>/dev/null | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  keys='$field'.split('.')
  for k in keys: d=d[k] if isinstance(d,dict) else d[int(k)]
  print(d)
except: print('__MISSING__')
" 2>/dev/null)
  fi
  if [ "$val" = "$expected" ]; then pass "$name ($field=$val)"
  elif [ "$val" = "__MISSING__" ]; then fail "$name — field '$field' not found"
  else fail "$name — expected $field='$expected', got '$val'"; fi
}

# ── Helper: timing ──
time_url() {
  local name="$1" url="$2" warn_ms="${3:-2000}"
  local ms
  ms=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 8 --max-time 15 "$url" 2>/dev/null | python3 -c "import sys; print(int(float(sys.stdin.read().strip())*1000))" 2>/dev/null)
  if [ -z "$ms" ] || [ "$ms" = "" ]; then
    fail "$name — no response"
  elif [ "$ms" -lt "$warn_ms" ]; then
    pass "$name — ${ms}ms"
  else
    warn "$name — ${ms}ms (slow, threshold ${warn_ms}ms)"
  fi
}

should_run() {
  [ "$SECTION" = "all" ] || [ "$SECTION" = "$1" ]
}

# ═══════════════════════════════════════════════════════════════
echo ""
printf "${BOLD}╔═══════════════════════════════════════════════════════╗${W}\n"
printf "${BOLD}║       investMTG Debug Tool — Full Diagnostics        ║${W}\n"
printf "${BOLD}║       $(date -u '+%Y-%m-%d %H:%M UTC')                            ║${W}\n"
printf "${BOLD}╚═══════════════════════════════════════════════════════╝${W}\n"
[ "$SECTION" != "all" ] && info "Running section: $SECTION"

# ═══════════════════════════════════════════════════════════════
# 1. FRONTEND ASSETS
# ═══════════════════════════════════════════════════════════════
if should_run "frontend"; then
  header "1. FRONTEND — Static Assets"
  check_status "index.html" "$SITE/"
  check_status "style.css" "$SITE/style.css"
  check_status "base.css" "$SITE/base.css"
  check_status "sw.js" "$SITE/sw.js"
  check_status "manifest.json" "$SITE/manifest.json"

  header "2. FRONTEND — JavaScript Modules"
  check_status "app.js" "$SITE/app.js"
  for comp in CheckoutView HomeView StoreView SearchView CardDetailView CartView PortfolioView SellerDashboard MarketMoversView Header Footer Ticker Chatbot; do
    check_status "$comp.js" "$SITE/components/${comp}.js"
  done
  for util in api auth config helpers sanitize storage group-by-seller justtcg-api edhtop16-api topdeck-api moxfield-api; do
    check_status "utils/$util.js" "$SITE/utils/${util}.js"
  done

  header "3. FRONTEND — DOM Integrity"
  check_contains "Page title" "$SITE/" "<title>investMTG"
  check_contains "React import map" "$SITE/" "importmap"
  check_contains "CSP meta tag" "$SITE/" "Content-Security-Policy"
  check_contains "Service worker reg" "$SITE/" "serviceWorker"
  check_contains "Theme default dark" "$SITE/" 'data-theme=\"dark\"'
  check_contains "Perplexity attribution" "$SITE/" "Perplexity Computer"

  header "4. FRONTEND — Payment Integration Code"
  check_contains "PayPal SDK loader" "$SITE/components/CheckoutView.js" "loadPayPalSDK"
  check_contains "PayPal payment method" "$SITE/components/CheckoutView.js" "paymentMethod === 'paypal'"
  check_contains "SumUp SDK loader" "$SITE/components/CheckoutView.js" "loadSumUpSDK"
  check_contains "SumUp payment method" "$SITE/components/CheckoutView.js" "paymentMethod === 'sumup'"
  check_contains "Reserve payment method" "$SITE/components/CheckoutView.js" "paymentMethod === 'reserve'"
  check_contains "PayPal client ID" "$SITE/components/CheckoutView.js" "PAYPAL_CLIENT_ID"

  header "5. FRONTEND — Service Worker"
  SW_VER=$(curl -s "$SITE/sw.js" 2>/dev/null | grep -o "investmtg-v[0-9]*")
  if [ -n "$SW_VER" ]; then pass "SW deployed: $SW_VER"
  else fail "SW cache version not found"; fi

  # Check local vs deployed if local file exists
  if [ -f "sw.js" ]; then
    LOCAL_VER=$(grep -o "investmtg-v[0-9]*" sw.js)
    if [ "$LOCAL_VER" = "$SW_VER" ]; then pass "SW versions match (local=$LOCAL_VER, deployed=$SW_VER)"
    else warn "SW version mismatch — local=$LOCAL_VER, deployed=$SW_VER"; fi
  fi
fi

# ═══════════════════════════════════════════════════════════════
# 2. API HEALTH & ROUTES
# ═══════════════════════════════════════════════════════════════
if should_run "api"; then
  header "6. API — Health & Database"
  check_json "API status" "$API/api/health" "status" "ok"
  check_json "D1 database" "$API/api/health" "db" "connected"

  # Get storage stats
  HEALTH=$(curl -s "$API/api/health" 2>/dev/null)
  LISTINGS=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('storage',{}).get('listings',0))" 2>/dev/null)
  PRICES=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('storage',{}).get('prices',0))" 2>/dev/null)
  PORTFOLIOS=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('storage',{}).get('portfolios',0))" 2>/dev/null)
  VERSION=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('version','?'))" 2>/dev/null)
  info "Worker version: $VERSION | listings=$LISTINGS, prices=$PRICES, portfolios=$PORTFOLIOS"

  header "7. API — Data Routes"
  check_status "Search" "$API/api/search?q=lightning+bolt&page=1"

  TICKER_COUNT=$(curl -s "$API/api/ticker" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 'err')" 2>/dev/null)
  if [ "$TICKER_COUNT" != "err" ] && [ "$TICKER_COUNT" -gt 0 ] 2>/dev/null; then
    pass "Ticker — $TICKER_COUNT items"
  else warn "Ticker — unexpected: $TICKER_COUNT"; fi

  for route in featured trending budget; do
    check_status "/api/$route" "$API/api/$route"
  done
  check_status "/api/stores" "$API/api/stores"
  check_status "/api/events" "$API/api/events"

  header "8. API — Auth"
  check_json "Auth (unauth)" "$API/auth/me" "authenticated" "False"

  header "9. API — Proxy Routes"
  # JustTCG proxy
  JT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/justtcg?path=/v1/cards&tcgplayerId=282800&condition=NM" 2>/dev/null)
  if [ "$JT_STATUS" = "200" ]; then pass "JustTCG proxy (HTTP $JT_STATUS)"
  else warn "JustTCG proxy — HTTP $JT_STATUS (may be rate-limited)"; fi

  # Generic CORS proxy
  PROXY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/?target=https://api.scryfall.com/cards/random" -H "Origin: $SITE" 2>/dev/null)
  if [ "$PROXY_STATUS" = "200" ]; then pass "CORS proxy (HTTP $PROXY_STATUS)"
  else warn "CORS proxy — HTTP $PROXY_STATUS"; fi

  header "10. API — Order Validation"
  check_json "Orders POST validation" "$API/api/orders" "error" "items array required" "POST" '{}'
fi

# ═══════════════════════════════════════════════════════════════
# 3. PAYMENT INTEGRATIONS
# ═══════════════════════════════════════════════════════════════
if should_run "payments"; then
  header "11. PAYMENTS — PayPal"
  PP_RESP=$(curl -s -X POST "$API/api/paypal/create-order" \
    -H "Content-Type: application/json" -H "Origin: $SITE" \
    -d '{"order_id":"debug-test","amount":1.00}' 2>/dev/null)
  PP_OK=$(echo "$PP_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ok',''))" 2>/dev/null)
  PP_ID=$(echo "$PP_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
  PP_STATUS=$(echo "$PP_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
  PP_ERR=$(echo "$PP_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null)
  if [ "$PP_OK" = "True" ]; then
    pass "PayPal create-order — ID=$PP_ID, status=$PP_STATUS"
  elif [ -n "$PP_ERR" ] && echo "$PP_ERR" | grep -qi "not configured"; then
    fail "PayPal NOT CONFIGURED — secrets missing (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)"
  else
    fail "PayPal create-order — response: $PP_RESP"
  fi

  check_json "PayPal capture validation" "$API/api/paypal/capture-order" "error" "paypal_order_id required" "POST" '{}'

  header "12. PAYMENTS — SumUp"
  SU_REF="debug-$(date +%s)"
  SU_RESP=$(curl -s -X POST "$API/api/sumup/checkout" \
    -H "Content-Type: application/json" -H "Origin: $SITE" \
    -d "{\"amount\":1.00,\"order_id\":\"$SU_REF\"}" 2>/dev/null)
  SU_OK=$(echo "$SU_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ok',''))" 2>/dev/null)
  SU_ID=$(echo "$SU_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('checkout_id',''))" 2>/dev/null)
  SU_ERR=$(echo "$SU_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null)
  if [ "$SU_OK" = "True" ]; then
    pass "SumUp checkout — ID=$SU_ID"
  else
    fail "SumUp checkout — error: $SU_ERR | response: $SU_RESP"
  fi
fi

# ═══════════════════════════════════════════════════════════════
# 4. SECURITY — CSP, SECRETS, CORS
# ═══════════════════════════════════════════════════════════════
if should_run "security"; then
  header "13. SECURITY — CSP Audit"
  CSP=$(curl -s "$SITE/" 2>/dev/null | grep -o 'content="[^"]*Content-Security-Policy[^"]*"' | head -1)
  if [ -z "$CSP" ]; then
    CSP=$(curl -s "$SITE/" 2>/dev/null | grep -o "connect-src[^;]*" | head -1)
  fi

  INDEX_HTML=$(curl -s --connect-timeout 8 --max-time 15 "$SITE/" 2>/dev/null)
  for domain in api.investmtg.com api.scryfall.com gateway.sumup.com api.sumup.com js.sumup.com api.justtcg.com api2.moxfield.com edhtop16.com topdeck.gg; do
    if echo "$INDEX_HTML" | grep -q "$domain"; then
      pass "CSP includes $domain"
    else
      fail "CSP MISSING $domain"
    fi
  done

  # PayPal CSP entries
  for domain in paypal.com paypalobjects.com; do
    if echo "$INDEX_HTML" | grep -q "$domain"; then
      pass "CSP includes $domain"
    else
      fail "CSP MISSING $domain (PayPal integration will fail)"
    fi
  done

  header "14. SECURITY — CORS"
  CORS_HEADER=$(curl -s -I -X OPTIONS "$API/api/health" \
    -H "Origin: $SITE" \
    -H "Access-Control-Request-Method: GET" 2>/dev/null | grep -i "access-control-allow-origin")
  if echo "$CORS_HEADER" | grep -qi "investmtg.com\|\*"; then
    pass "CORS — $SITE allowed"
  else
    warn "CORS — header: $CORS_HEADER"
  fi

  header "15. SECURITY — Secret Scan (local files)"
  if [ -d "components" ] && [ -d "utils" ]; then
    SECRET_HITS=$(grep -rn 'API_KEY\|SECRET\|password' --include='*.js' . 2>/dev/null \
      | grep -v vendor | grep -v node_modules | grep -v worker/ \
      | grep -v 'SUMUP_PUBLIC_KEY' | grep -v '//' \
      | grep -v 'Google password' | grep -v 'PAYPAL_CLIENT_ID' \
      | grep -v 'No account or password' \
      | wc -l 2>/dev/null)
    SECRET_HITS=$(echo "$SECRET_HITS" | tr -d '[:space:]')
    if [ "$SECRET_HITS" = "0" ]; then
      pass "No secrets in frontend code"
    else
      fail "Potential secrets found ($SECRET_HITS matches)"
      grep -rn 'API_KEY\|SECRET\|password' --include='*.js' . 2>/dev/null \
        | grep -v vendor | grep -v node_modules | grep -v worker/ \
        | grep -v 'SUMUP_PUBLIC_KEY' | grep -v '//' \
        | grep -v 'Google password' | grep -v 'PAYPAL_CLIENT_ID' \
        | grep -v 'No account or password'
    fi
  else
    skip "Secret scan — not in repo directory"
  fi
fi

# ═══════════════════════════════════════════════════════════════
# 5. DNS
# ═══════════════════════════════════════════════════════════════
if should_run "dns"; then
  header "16. DNS — Resolution"
  HAS_DIG=$(command -v dig 2>/dev/null)
  HAS_NSLOOKUP=$(command -v nslookup 2>/dev/null)
  for host in www.investmtg.com api.investmtg.com investmtg.com; do
    DNS_IP=""
    if [ -n "$HAS_DIG" ]; then
      DNS_IP=$(dig +short "$host" 2>/dev/null | head -1)
    elif [ -n "$HAS_NSLOOKUP" ]; then
      DNS_IP=$(nslookup "$host" 2>/dev/null | awk '/^Address: / { print $2 }' | head -1)
    else
      # Fallback: use python3 for DNS resolution
      DNS_IP=$(python3 -c "import socket; print(socket.gethostbyname('$host'))" 2>/dev/null)
    fi
    if [ -n "$DNS_IP" ]; then
      pass "$host → $DNS_IP"
    else
      fail "$host — DNS resolution failed"
    fi
  done

  header "17. DNS — TLS"
  TLS_VER=$(curl -s -o /dev/null -w "%{ssl_version}" "$SITE/" 2>/dev/null)
  if [ -n "$TLS_VER" ]; then
    pass "TLS version: $TLS_VER"
  else
    warn "Could not determine TLS version"
  fi

  # Check HTTPS redirect
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L "http://www.investmtg.com" 2>/dev/null)
  if [ "$HTTP_CODE" = "200" ]; then
    pass "HTTP→HTTPS redirect works"
  else
    warn "HTTP→HTTPS — final HTTP $HTTP_CODE"
  fi
fi

# ═══════════════════════════════════════════════════════════════
# 6. DATABASE HEALTH (via API)
# ═══════════════════════════════════════════════════════════════
if should_run "db"; then
  header "18. DATABASE — Health via API"
  check_json "D1 connected" "$API/api/health" "db" "connected"

  # Get table counts via health endpoint
  HEALTH=$(curl -s "$API/api/health" 2>/dev/null)
  for metric in listings prices portfolios; do
    VAL=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('storage',{}).get('$metric','?'))" 2>/dev/null)
    info "D1 $metric: $VAL rows"
  done

  header "19. DATABASE — Data Integrity"
  # Verify stores exist
  STORE_COUNT=$(curl -s "$API/api/stores" -H "Origin: $SITE" 2>/dev/null | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  stores = d.get('stores', d) if isinstance(d, dict) else d
  print(len(stores) if isinstance(stores, list) else '?')
except: print('err')
" 2>/dev/null)
  if [ "$STORE_COUNT" != "err" ] && [ "$STORE_COUNT" -gt 0 ] 2>/dev/null; then
    pass "Stores table — $STORE_COUNT records"
  else
    warn "Stores — count=$STORE_COUNT"
  fi

  # Verify events exist
  EVENT_COUNT=$(curl -s "$API/api/events" -H "Origin: $SITE" 2>/dev/null | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  events = d.get('events', d) if isinstance(d, dict) else d
  print(len(events) if isinstance(events, list) else '?')
except: print('err')
" 2>/dev/null)
  if [ "$EVENT_COUNT" != "err" ] && [ "$EVENT_COUNT" -gt 0 ] 2>/dev/null; then
    pass "Events table — $EVENT_COUNT records"
  else
    info "Events — count=$EVENT_COUNT (may be empty)"
  fi
fi

# ═══════════════════════════════════════════════════════════════
# 7. PERFORMANCE
# ═══════════════════════════════════════════════════════════════
if should_run "perf"; then
  header "20. PERFORMANCE — Response Times"
  time_url "index.html" "$SITE/" 1500
  time_url "style.css" "$SITE/style.css" 1000
  time_url "app.js" "$SITE/app.js" 1000
  time_url "API health" "$API/api/health" 1000
  time_url "API search" "$API/api/search?q=sol+ring&page=1" 3000
  time_url "API ticker" "$API/api/ticker" 2000
  time_url "API featured" "$API/api/featured" 2000

  header "21. PERFORMANCE — Asset Sizes"
  for asset in style.css base.css app.js components/CheckoutView.js components/HomeView.js; do
    SIZE=$(curl -s -o /dev/null -w "%{size_download}" "$SITE/$asset" 2>/dev/null)
    SIZE_KB=$((SIZE / 1024))
    if [ "$SIZE_KB" -lt 300 ]; then
      pass "$asset — ${SIZE_KB}KB"
    else
      warn "$asset — ${SIZE_KB}KB (large)"
    fi
  done
fi

# ═══════════════════════════════════════════════════════════════
# 8. CODE STYLE AUDIT (local files only)
# ═══════════════════════════════════════════════════════════════
if should_run "code"; then
  header "22. CODE STYLE — var-only / no arrows (local)"
  if [ -d "components" ] && [ -d "utils" ]; then
    LET_CONST=$(grep -rn '\blet \|\bconst ' --include='*.js' . 2>/dev/null \
      | grep -v vendor | grep -v worker | grep -v node_modules \
      | grep -v '// ' | wc -l 2>/dev/null)
    LET_CONST=$(echo "$LET_CONST" | tr -d '[:space:]')
    if [ "$LET_CONST" = "0" ]; then
      pass "No let/const violations"
    else
      fail "let/const violations: $LET_CONST"
      grep -rn '\blet \|\bconst ' --include='*.js' . 2>/dev/null \
        | grep -v vendor | grep -v worker | grep -v node_modules \
        | grep -v '// ' | head -10
    fi

    ARROW=$(grep -rn '=>' --include='*.js' . 2>/dev/null \
      | grep -v vendor | grep -v worker | grep -v node_modules \
      | wc -l 2>/dev/null)
    ARROW=$(echo "$ARROW" | tr -d '[:space:]')
    if [ "$ARROW" = "0" ]; then
      pass "No arrow function violations"
    else
      fail "Arrow function violations: $ARROW"
      grep -rn '=>' --include='*.js' . 2>/dev/null \
        | grep -v vendor | grep -v worker | grep -v node_modules \
        | head -10
    fi

    header "23. CODE STYLE — URL Centralization"
    STALE_URLS=$(grep -rn 'investmtg-proxy\.bloodshutdawn\.workers\.dev' --include='*.js' . 2>/dev/null \
      | grep -v vendor | grep -v worker | grep -v node_modules \
      | wc -l 2>/dev/null)
    STALE_URLS=$(echo "$STALE_URLS" | tr -d '[:space:]')
    HARDCODED_API=$(grep -rn 'api\.investmtg\.com' --include='*.js' . 2>/dev/null \
      | grep -v vendor | grep -v worker | grep -v node_modules \
      | grep -v config.js | grep -v PricingView \
      | wc -l 2>/dev/null)
    HARDCODED_API=$(echo "$HARDCODED_API" | tr -d '[:space:]')
    if [ "$STALE_URLS" = "0" ] && [ "$HARDCODED_API" = "0" ]; then
      pass "All backend URLs centralized in config.js"
    else
      [ "$STALE_URLS" != "0" ] && fail "Stale .workers.dev URLs: $STALE_URLS"
      [ "$HARDCODED_API" != "0" ] && fail "Hardcoded api.investmtg.com outside config.js: $HARDCODED_API"
    fi

    header "24. CODE STYLE — Dual Write Integrity"
    PORTFOLIO_API=$(grep -rn 'addToPortfolioAPI\|removeFromPortfolioAPI' --include='*.js' . 2>/dev/null \
      | grep -v vendor | grep -v worker | grep -v node_modules \
      | grep -v 'import ' | grep -c '.' 2>/dev/null || echo "0")
    PORTFOLIO_LOCAL=$(grep -rn "storageSet.*portfolio\|storageGet.*portfolio" --include='*.js' . 2>/dev/null \
      | grep -v vendor | grep -v worker | grep -v node_modules \
      | grep -c '.' 2>/dev/null || echo "0")
    if [ "$PORTFOLIO_API" -gt 0 ] && [ "$PORTFOLIO_LOCAL" -gt 0 ]; then
      pass "Portfolio dual-write detected (API=$PORTFOLIO_API, localStorage=$PORTFOLIO_LOCAL)"
    else
      warn "Portfolio dual-write — API calls=$PORTFOLIO_API, localStorage=$PORTFOLIO_LOCAL (verify manually)"
    fi
  else
    skip "Code style audit — not in repo directory (run from investmtg root)"
  fi
fi

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
echo ""
TOTAL=$((PASS + FAIL + WARN + SKIP))
printf "${BOLD}╔═══════════════════════════════════════════════════════╗${W}\n"
printf "${BOLD}║  RESULTS                                              ║${W}\n"
printf "${BOLD}╠═══════════════════════════════════════════════════════╣${W}\n"
printf "║  ${G}Passed:  %-4d${W}                                         ║\n" "$PASS"
[ "$FAIL" -gt 0 ] && printf "║  ${R}Failed:  %-4d${W}                                         ║\n" "$FAIL"
[ "$WARN" -gt 0 ] && printf "║  ${Y}Warnings:%-4d${W}                                         ║\n" "$WARN"
[ "$SKIP" -gt 0 ] && printf "║  ${M}Skipped: %-4d${W}                                         ║\n" "$SKIP"
printf "║  Total:   %-4d                                        ║\n" "$TOTAL"
printf "${BOLD}╚═══════════════════════════════════════════════════════╝${W}\n"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  printf "${R}${BOLD}FAILURES:${W}\n"
  printf "$ERRORS\n"
fi

echo ""
exit $FAIL
