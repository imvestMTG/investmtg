#!/bin/bash
# ─────────────────────────────────────────────────────────────
# investMTG Smoke Test — Lightweight frontend + API validation
# No browser, no screenshots — just curl + DOM/JSON checks
# Run: bash tests/smoke-test.sh
# ─────────────────────────────────────────────────────────────

SITE="https://www.investmtg.com"
API="https://api.investmtg.com"
PASS=0
FAIL=0
WARN=0

green()  { printf "\033[32m✓ PASS\033[0m %s\n" "$1"; PASS=$((PASS + 1)); }
red()    { printf "\033[31m✗ FAIL\033[0m %s\n" "$1"; FAIL=$((FAIL + 1)); }
yellow() { printf "\033[33m⚠ WARN\033[0m %s\n" "$1"; WARN=$((WARN + 1)); }

# ── Helper: check HTTP status code ──
check_status() {
  local name="$1" url="$2" expected="${3:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 8 --max-time 15 "$url")
  if [ "$code" = "$expected" ]; then
    green "$name (HTTP $code)"
  else
    red "$name — expected $expected, got $code"
  fi
}

# ── Helper: check response body contains string ──
check_contains() {
  local name="$1" url="$2" needle="$3"
  local body
  body=$(curl -s --connect-timeout 8 --max-time 15 "$url")
  if echo "$body" | grep -qi "$needle"; then
    green "$name — contains '$needle'"
  else
    red "$name — missing '$needle'"
  fi
}

# ── Helper: check JSON field ──
check_json() {
  local name="$1" url="$2" field="$3" expected="$4"
  local val
  val=$(curl -s --connect-timeout 8 --max-time 15 "$url" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  keys='$field'.split('.')
  for k in keys: d=d[k] if isinstance(d,dict) else d[int(k)]
  print(d)
except: print('__MISSING__')
" 2>/dev/null)
  if [ "$val" = "$expected" ]; then
    green "$name — $field=$val"
  elif [ "$val" = "__MISSING__" ]; then
    red "$name — field '$field' not found"
  else
    red "$name — expected $field=$expected, got $val"
  fi
}

echo ""
echo "═══════════════════════════════════════════"
echo "  investMTG Smoke Test"
echo "  $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "═══════════════════════════════════════════"

# ─── 1. FRONTEND — Static Assets ───
echo ""
echo "── Frontend: Static Assets ──"
check_status "index.html" "$SITE/"
check_status "style.css" "$SITE/style.css"
check_status "base.css" "$SITE/base.css"
check_status "sw.js" "$SITE/sw.js"
check_status "manifest.json" "$SITE/manifest.json"

# ─── 2. FRONTEND — Critical JS Modules ───
echo ""
echo "── Frontend: JavaScript Modules ──"
check_status "App.js" "$SITE/app.js"
check_status "CheckoutView.js" "$SITE/components/CheckoutView.js"
check_status "HomeView.js" "$SITE/components/HomeView.js"
check_status "StoreView.js" "$SITE/components/StoreView.js"
check_status "helpers.js" "$SITE/utils/helpers.js"
check_status "config.js" "$SITE/utils/config.js"

# ─── 3. FRONTEND — DOM Content Checks ───
echo ""
echo "── Frontend: DOM Content ──"
check_contains "Page title" "$SITE/" "investMTG"
check_contains "React loaded" "$SITE/" "importmap"
check_contains "CSP header" "$SITE/" "Content-Security-Policy"
check_contains "PayPal CSP" "$SITE/" "paypal.com"
check_contains "SumUp CSP" "$SITE/" "sumup.com"
check_contains "SW registration" "$SITE/" "serviceWorker"

# ─── 4. FRONTEND — Component Content Checks ───
echo ""
echo "── Frontend: Component Integrity ──"
check_contains "CheckoutView: PayPal SDK" "$SITE/components/CheckoutView.js" "loadPayPalSDK"
check_contains "CheckoutView: PayPal method" "$SITE/components/CheckoutView.js" "paypal"
check_contains "CheckoutView: SumUp method" "$SITE/components/CheckoutView.js" "sumup"
check_contains "CheckoutView: Reserve method" "$SITE/components/CheckoutView.js" "reserve"
check_contains "CheckoutView: 3 payment methods" "$SITE/components/CheckoutView.js" "paymentMethod === 'paypal'"

# ─── 5. SERVICE WORKER — Cache Version ───
echo ""
echo "── Service Worker ──"
SW_VER=$(curl -s "$SITE/sw.js" | grep -o "investmtg-v[0-9]*")
if [ -n "$SW_VER" ]; then
  green "SW cache version: $SW_VER"
else
  red "SW cache version not found"
fi

# ─── 6. API — Health ───
echo ""
echo "── API: Health & Core Routes ──"
check_json "API health" "$API/api/health" "status" "ok"
check_json "API DB" "$API/api/health" "db" "connected"

# ─── 7. API — Search ───
check_status "Search route" "$API/api/search?q=lightning+bolt&page=1" 200

# ─── 8. API — Ticker ───
TICKER_COUNT=$(curl -s "$API/api/ticker" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 'not-list')" 2>/dev/null)
if [ "$TICKER_COUNT" != "not-list" ] && [ "$TICKER_COUNT" -gt 0 ] 2>/dev/null; then
  green "Ticker — $TICKER_COUNT items"
else
  yellow "Ticker — empty or unexpected format ($TICKER_COUNT)"
fi

# ─── 9. API — Auth ───
check_json "Auth (unauthenticated)" "$API/auth/me" "authenticated" "False"

# ─── 10. API — PayPal Routes ───
echo ""
echo "── API: PayPal Integration ──"
PP_CREATE=$(curl -s -X POST "$API/api/paypal/create-order" \
  -H "Content-Type: application/json" \
  -H "Origin: $SITE" \
  -d '{"order_id":"smoke-test","amount":1.00}')
PP_OK=$(echo "$PP_CREATE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ok',''))" 2>/dev/null)
PP_STATUS=$(echo "$PP_CREATE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null)
if [ "$PP_OK" = "True" ]; then
  green "PayPal create-order — ok=True, status=$PP_STATUS"
else
  red "PayPal create-order — response: $PP_CREATE"
fi

PP_CAPTURE=$(curl -s -X POST "$API/api/paypal/capture-order" \
  -H "Content-Type: application/json" \
  -H "Origin: $SITE" \
  -d '{}')
PP_ERR=$(echo "$PP_CAPTURE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''))" 2>/dev/null)
if [ "$PP_ERR" = "paypal_order_id required" ]; then
  green "PayPal capture-order — validates input correctly"
else
  red "PayPal capture-order — unexpected: $PP_CAPTURE"
fi

# ─── 11. API — SumUp Route ───
echo ""
echo "── API: SumUp Integration ──"
SU_CREATE=$(curl -s -X POST "$API/api/sumup/checkout" \
  -H "Content-Type: application/json" \
  -H "Origin: $SITE" \
  -d '{"amount":1.00,"order_id":"smoke-test"}')
SU_OK=$(echo "$SU_CREATE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ok',''))" 2>/dev/null)
if [ "$SU_OK" = "True" ]; then
  green "SumUp checkout — ok=True"
else
  red "SumUp checkout — response: $SU_CREATE"
fi

# ─── 12. API — Orders Validation ───
echo ""
echo "── API: Orders ──"
ORD_ERR=$(curl -s -X POST "$API/api/orders" \
  -H "Content-Type: application/json" \
  -H "Origin: $SITE" \
  -d '{}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''))" 2>/dev/null)
if [ "$ORD_ERR" = "items array required" ]; then
  green "Orders POST — validates input correctly"
else
  red "Orders POST — unexpected response"
fi

# ─── 13. CORS ───
echo ""
echo "── CORS Headers ──"
CORS=$(curl -s -I -X OPTIONS "$API/api/health" \
  -H "Origin: $SITE" \
  -H "Access-Control-Request-Method: GET" 2>/dev/null | grep -i "access-control-allow-origin")
if echo "$CORS" | grep -qi "investmtg.com\|\*"; then
  green "CORS — origin allowed"
else
  yellow "CORS — header not found or unexpected: $CORS"
fi

# ─── SUMMARY ───
echo ""
echo "═══════════════════════════════════════════"
TOTAL=$((PASS + FAIL + WARN))
printf "  Results: \033[32m%d passed\033[0m" "$PASS"
[ "$FAIL" -gt 0 ] && printf ", \033[31m%d failed\033[0m" "$FAIL"
[ "$WARN" -gt 0 ] && printf ", \033[33m%d warnings\033[0m" "$WARN"
printf " / %d total\n" "$TOTAL"
echo "═══════════════════════════════════════════"
echo ""

exit $FAIL
