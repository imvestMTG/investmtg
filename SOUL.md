# SOUL.md — The Fair Play Economy

## About

investMTG is a Guam-first Magic: The Gathering marketplace and pricing experience built to reduce information gaps for island players.

The modern direction is straightforward:
- real reference pricing
- local seller trust
- cleaner buying and selling flows
- Guam-only fulfillment framing

If we cannot support a claim with real data, we do not present it as fact.

## Vision

To become the most trusted place for Guam players to check card value, compare local opportunities, and list cards with confidence.

## Mission

Build a cleaner, more honest local MTG experience for Guam players using transparent pricing, simpler workflows, and product decisions that favor trust over noise.

## Brand

**Name:** investMTG  
**Tagline:** Real cards. Real data. Fair play.

### Brand voice
- direct
- calm
- local-first
- transparent
- confident without hype

## Product principles

### 1. Guam-first by design
- marketplace language is for Guam only
- pickup and island delivery come before any broader commerce framing
- seller flows should make meetup zones, response expectations, and local delivery rules explicit

### 2. Paper cards only
- All cards on the site are physical paper versions — no MTGO or digital-only printings
- Every Scryfall query must include `-is:digital` or filter `card.digital === false`
- Prices shown are paper market prices (`prices.usd`), never digital (`prices.tix`)

### 3. No fake market signals
- no fabricated trend data
- no fake price history
- no fake seller activity
- no invented liquidity signals

### 4. Reference pricing must stay clear
- Scryfall is the primary reference layer for card data, images, and live prices
- external market reference links may point to TCGplayer when available through Scryfall purchase URIs
- Cardmarket is not part of the modern Guam-first buyer flow

### 5. Pricing transparency is non-negotiable
- Every price displayed on the site must be traceable to a named, verifiable data source
- The Pricing & Data Sources page (`#pricing`) explains every data pipeline, update frequency, and limitation in plain language
- Inline attribution appears alongside prices on card detail, market movers, and listing forms so users never have to guess where a number came from
- If a data source is unavailable, we show nothing rather than fabricating a fallback
- Suggested prices are never binding — sellers always set their own asking price

### 6. Trust beats clutter
- every main screen should have a clear primary action
- feedback must be explicit, especially on seller actions
- local trade expectations should be visible, not implied

### 7. Ship code and docs together
A release is not complete until the docs and release notes are updated in the same session.

Required updates after release-impacting work:
- `README.md`
- `BUILD_SPEC.md`
- `CHANGES.md`
- `SOUL.md`
- `worker/README.md` when worker behavior changes
- a security check for secrets and sensitive credentials

### 8. QA before every push
No code reaches `main` without passing QA. Every push must include verification, not just implementation.

**Unified QA script** — one command, tiered by depth:
- `bash tests/qa.sh` — standard pre-push (~45 checks). Code style, secrets, URLs, CSP audit, all API routes, payments, CORS, JS modules, dual-write, doc checklist.
- `bash tests/qa.sh --quick` — fast sanity (~18 checks). Core health, frontend, code style, secrets.
- `bash tests/qa.sh --full` — everything (~65 checks). Adds DNS, TLS, performance timing, asset sizes.
- `bash tests/qa.sh --local` — local code checks only (no HTTP).
- `bash tests/qa.sh --live` — live site checks only (no local).

The script caches HTTP responses (index.html fetched once, health fetched once) to minimize redundant calls.

**Manual checks** (when the script can't cover it):
1. **Auth flow** — After auth changes, verify: `signIn()` → Google consent → callback → token → `checkAuth()` → Header shows user.
2. **Visual verification** — User screenshots the live site after push. Do not use browser_task for this.
3. **Console errors** — Zero errors is the standard. CSP violations, failed fetches, module import errors.

### 9. Security posture
Security is not optional. Every session must verify these constraints.

**Secrets and credentials:**
- No API keys, tokens, client secrets, or passwords in frontend code. Ever.
- All secret-backed API calls route through the Cloudflare Worker. The worker injects secrets server-side.
- `SumUp public key` is the only exception — it is designed by SumUp to be client-side.
- After every commit, run `grep -rn 'API_KEY\|SECRET\|password\|token.*=.*["'\']' --include='*.js' . | grep -v vendor | grep -v node_modules | grep -v worker/` and verify zero matches leak real values.
- *Why this exists: early builds had JustTCG and TopDeck API keys exposed in client-side JS. They were moved behind the worker proxy, but the pattern must never recur.*

**Content Security Policy (CSP):**
- The CSP in `index.html` is a security boundary. It controls what the browser is allowed to connect to, load scripts from, embed frames from, and display images from.
- Any change to backend URLs, third-party integrations, or external services must include a corresponding CSP update.
- The CSP is the first thing to check when any `fetch()` call fails silently.
- *Why this exists: the v18→v19 CSP mismatch was invisible in the network tab, returned no error message, and took multiple sessions and a diagnostic page to identify. A 30-second grep would have caught it.*

**OAuth and authentication:**
- OAuth client ID and client secret are stored as Cloudflare Worker secrets, never in frontend code.
- The `OAUTH_REDIRECT_URI` is hardcoded in the worker (not derived from `url.origin`) to prevent redirect attacks and ensure the Google consent screen shows `investmtg.com`.
- Auth tokens are stored in localStorage via `storageSetRaw()` (not cookies — cross-site cookies are blocked by modern browsers).
- The `/auth/me` endpoint is the single source of truth for "is this user authenticated." If it fails, the user is not signed in. Period.
- *Why this exists: the original OAuth implementation used `url.origin` to build the redirect URI, which resolved to the `.workers.dev` domain and made Google show "bloodshutdawn.workers.dev" on the consent screen.*

**Data integrity:**
- `storageGet()` / `storageSet()` from `utils/storage.js` is the only way to read/write localStorage. Direct `localStorage.getItem()` is banned. The wrapper prevents `JSON.parse` crashes from corrupted values.
- *Why this exists: v8 — a `JSON.parse(undefined)` crash caused a blank screen that was hard to reproduce because it only happened with corrupted localStorage data.*

### 10. QC audit triggers
A targeted codebase audit must happen when any of these conditions are true:

1. **Domain or URL migration** — When any backend URL changes (e.g., `.workers.dev` to custom domain), audit every file that references the old URL. Check CSP, check config imports, check hardcoded strings.
2. **New third-party integration** — When adding a new external API or SDK, verify: CSP allows it, the URL is centralized in config, the API key (if any) is server-side only.
3. **Auth flow changes** — When anything in the sign-in/sign-out path changes, verify the full loop end-to-end. Auth bugs are invisible and cascade.
4. **3+ rapid releases** — When shipping 3 or more versions in a single session, pause and run the pre-push QA checklist against the cumulative diff, not just the last commit. Fast iteration accumulates silent drift.
5. **User-reported "it doesn't work"** — Before debugging application logic, check CSP, check network tab, check console. The browser may be blocking things before the code even runs.

The audit scope: CSP alignment, URL centralization, auth flow trace, error handling (silent catches), dead code (unused exports/files), and doc accuracy.

## Architecture principles

### Front end
The production front end is the root-level SPA: vanilla JavaScript with React 18.3.1 loaded via import maps from self-hosted vendor bundles. There is no build step — the repository root is deployed directly to GitHub Pages.

Coding rules (must be followed in all root-level JS files):
- `var h = React.createElement;` — no JSX, no Babel transform
- `var ref = React.useState()` with `ref[0]` / `ref[1]` — no array destructuring
- `var` only — no `let` or `const`
- `function` keyword only — no arrow functions inside component bodies
- Native ES modules via `<script type="module">` and import maps
- React 18.3.1 and ReactDOM 18.3.1 self-hosted in `vendor/`

Key characteristics:
- hash-based routing
- static-hosting friendly (no server-side rendering)
- all API data flows through the Worker v3 backend at `api.investmtg.com`
- Google OAuth 2.0 for persistent user accounts (sellers and buyers); OAuth redirect uses the custom domain so Google consent screen shows `investmtg.com`
- `frontend-v2/` was removed in v20 (dead code cleanup — it was an abandoned TypeScript/Vite rewrite)

### Worker
The Cloudflare Worker (v3) is the secure backend at `api.investmtg.com` (custom domain) with the legacy `.workers.dev` URL still active. It serves as the gateway for protected or proxied API access, and carries the D1 + KV-backed server-side architecture plus Google OAuth authentication.

## Data sources

| Data | Source | Notes |
|------|--------|-------|
| Card search and reference prices | [Scryfall API](https://scryfall.com/docs/api) | Primary reference layer |
| External market reference links | [TCGplayer](https://www.tcgplayer.com) | Only when surfaced by Scryfall purchase URIs |
| Condition pricing | [JustTCG](https://justtcg.com) | Worker-backed integration |
| Tournament and meta data | [TopDeck.gg](https://topdeck.gg), [EDH Top 16](https://edhtop16.com) | Worker-backed integrations |
| Decklist imports | [Moxfield](https://moxfield.com) | Integrated as needed |
| Graded/slab pricing & set movers | [EchoMTG](https://www.echomtg.com) | Worker-backed proxy, API key server-side |
| Order confirmation emails | [Resend](https://resend.com) | Transactional email via Worker, API key server-side |
| Proxy / gateway | Cloudflare Worker | Secret-backed API routing |
| User accounts | Google OAuth 2.0 | Authentication via Google sign-in, accounts stored in D1 |
| Server-side persistence | Cloudflare D1 | Users, auth sessions, listings, sellers, stores, events, cart, portfolio, orders, order counters |
| Edge cache | Cloudflare KV | Cached market and discovery responses |

## What we do not do

- show Cardmarket as part of the modern Guam-first buyer flow
- rely on fake listing activity to make the market look alive
- imply global-shipping capability in a Guam-only product mode
- treat dead code as acceptable — unused components and abandoned directories are removed proactively

## Release discipline

Before any go-live push:
1. Run the **pre-push QA checklist** (Rule 7) — CSP alignment, URL centralization, visual verification, console error check
2. Run the **security checks** (Rule 8) — no secrets in frontend code, CSP current, OAuth config intact
3. Verify the root SPA loads correctly (no build step required)
4. Test on mobile Safari and Chrome to verify no blank screen
5. Verify no secrets were committed (`git diff --staged` before push)
6. Verify the Pages workflow still publishes the root directory directly
7. Verify worker docs and bindings still match the deployed backend
8. Update the required docs in the same session (Rule 6)
9. If this is the 3rd+ release in a session, run a **QC audit** (Rule 9) against the cumulative diff

The order matters. QA and security come first because they catch the bugs that are hardest to diagnose after the fact.

**ToS / Legal update rule:** Any change to Terms of Service text in `TermsView.js` requires: (1) updating the "Last updated" date in `TermsView.js`, (2) bumping `TOS_VERSION` in `TermsGate.js` to the new date, and (3) bumping the Privacy Policy date in `PrivacyPolicyView.js` if privacy-related content changed. These must be kept in sync.

## Changelog

| Date | Change |
|------|--------|
| 2026-03-13 | **v61** — EchoMTG integration + order confirmation emails: CardDetailView gains "Graded & Slab Prices" section (BGS 10/9.5/9, PSA 10/9/8, Signed, Artist Proof, etc.) + estimated buylist via EchoMTG API proxy. MarketMoversView adds "Set Gainers" and "Set Losers" tabs pulling price-change data from 6 recent Standard sets via EchoMTG. New `utils/echomtg-api.js` frontend utility. Worker gains `/echomtg` proxy route (KV-cached), Resend email integration (order confirmation + payment confirmation HTML emails), email wired into POST /api/orders and PayPal capture flow. CSP updated: `assets.echomtg.com` in img-src. Wrangler secrets: RESEND_API_KEY, ECHOMTG_API_KEY. |
| 2026-03-13 | **v60** — Card Scanner: camera + Tesseract.js OCR card identification. ScannerView.js with WebRTC camera, photo upload, Scryfall lookup by collector number. |
| 2026-03-11 | **v59** — Sortable tables + JustTCG/MTGStocks data: MarketMoversView rewritten as sortable data table with 7D/30D/90D price change columns, JustTCG progressive loading, and 30-day sparkline charts. CardDetailView gains JustTCG condition breakdown (NM/LP/MP/HP/DMG prices with 7d % change), price trend row (24h/7d/30d/90d), 30-day sparkline, and all-time high/low stats. PortfolioView tables now fully sortable (all columns clickable asc/desc). Worker gains MTGStocks proxy handler (/mtgstocks route, KV-cached 24hr). N/A fix: replaced Power 9 cards (no USD prices) with Mishra's Workshop/Tabernacle/Candelabra in valuable movers. |
| 2026-03-11 | **v58** — Portfolio upgrade: User-created binders with CRUD, card condition tracking (NM/LP/MP/HP/DMG) with condition-adjusted pricing (NM 100%, LP 85%, MP 70%, HP 50%, DMG 30%), virtual lists (Wishlist/Buylist/Trade) with card management. 3 new D1 tables (binders, lists, list_items) + 2 new portfolio columns. Complete PortfolioView rewrite with tabbed UI, group-by controls, binder chip filters. CardDetailView gains inline condition selector and "Add to List" dropdown. 12 new API functions. |
| 2026-03-11 | **v57** — Dynamic carousel refresh: Homepage carousels (Featured, Trending, Budget Staples) now auto-rotate daily via Scryfall queries (commander-legal, paper-only, EDHREC-ranked). Day-seeded page rotation ensures fresh content. KV-cached with 25hr TTL. Admin manual trigger endpoint added. |
| 2026-03-11 | **v56** — Fix seller dashboard delete: `GET /api/sellers` now filters `AND status = 'active'` so deleted listings no longer reappear. Cleaned 3 test listings with $0.00 prices and missing Scryfall data. |
| 2026-03-10 | **Efficiency upgrades** — 5 new dev tools: `tests/full-qa.sh` (combined QA pipeline), `tests/code-review.sh` (AI diff review), auto health monitoring (6 endpoints every 6hr), Google Sheets release tracker (56 historical releases), Cloudflare connector test (not usable for this zone). |
| 2026-03-10 | **Git workflow upgrade** — Replaced manual curl + PAT + Git Trees API push method with native `git push` via GitHub CLI (`gh`). Faster, cleaner commit history, less error-prone. |
| 2026-03-10 | **Debug tool fixes** — JustTCG test changed from `scryfallId` (404) to `tcgplayerId=282800` (native key, returns 200). TLS detection fallback added for curl builds where `%{ssl_version}` is empty. Results: 97/97 passed, 0 warnings. |
| 2026-03-10 | **v51** — Fix portfolio DELETE for signed-in users: Worker `portfolioScope()` used `p.user_id` table alias in DELETE queries (invalid without JOIN), causing D1 `no such column` error — cards were never actually removed from backend. Added `bare` property without alias prefix for DELETE statements. Worker redeployed. |
| 2026-03-10 | **v50** — Fix portfolio card removal race condition: useEffect dependency changed from `[portfolio.length]` to `[]` (mount-only), removed `updatePortfolio()` from fetch response to prevent GET/DELETE race resurrecting removed cards |
| 2026-03-10 | **v49** — Revert homepage redesign to original v46 sleek layout; keep Worker camelCase mapping + workers_dev=false + dead import cleanup |
| 2026-03-10 | **v48** — Fix oversized SVG icons on homepage: added explicit width/height to feature highlight SVGs, constrained icon containers with min/max sizing + overflow hidden |
| 2026-03-10 | **v47** — Repo consolidation: HomeView redesign (eyebrow badge, live stats bar from /api/health, feature highlights grid, CTA section, hero search button), Worker camelCase mapping on GET /api/listings, workers_dev=false security fix, dead showToast import removed |
| 2026-03-10 | **v46** — Seller Dashboard Profile tab UX redesign: inline-editable fields (click-to-edit per field), section-based layout (Personal Info, Contact & Store, Account Details, Session, Danger Zone), collapsible danger zone with type-to-confirm DELETE gate, mobile-responsive |
| 2026-03-09 | **v45** — Seller Dashboard edit/delete: PUT/DELETE /api/sellers endpoints, ProfileEditForm, danger zone delete UI, Header nav same-hash fix |
| 2026-03-09 | **v44** — Portfolio import modal UI hardening: moved the import dialog onto the shared mp-modal overlay/card system, added scroll locking while open, safe-area padding, and mobile/Safari-friendly sizing so the modal renders as a proper overlay instead of appearing inline or under sticky UI |
| 2026-03-09 | **v43** — Portfolio import auth gate fix: PortfolioView now receives authUser from App, and the import modal uses props.user instead of nonexistent state.user so signed-in users are no longer falsely blocked |
| 2026-03-09 | **v42** — Portfolio header layout fix: removed flex-direction:column responsive override so Import button stays inline at all widths |
| 2026-03-09 | **v41** — Import system + storage optimization: shared import-parser.js (CSV/text/MTGA parsing), batch endpoints (POST /api/listings/batch + /api/portfolio/batch, max 500), SellerDashboard CSV/Text tabs with batch import, PortfolioView import modal, prices cache 30-day TTL cron cleanup, image_uri storage optimization, health endpoint storage monitoring |
| 2026-03-09 | **v40** — Cloudflare security hardening: WAF rate limiting on /api/* (20 req/10s per IP), orange-cloud www CNAME (CDN + DDoS), Transform Rules for 6 security headers (HSTS, X-Frame-Options, etc.), LocalBusiness JSON-LD for Guam local search |
| 2026-03-09 | **v39** — Audit hardening: SSL full_strict, always_online enabled, security headers on Worker API, daily cron for auth session cleanup, schema.sql synced with production D1, robots.txt added |
| 2026-03-09 | **v38** — Fix portfolio data persistence: Track button now syncs to D1 backend, app init merges D1 + localStorage (no more data loss on refresh), auto-migrates existing localStorage portfolios to D1 |
| 2026-03-09 | **v37** — Fix selling cards not in stock: removed CardDetailView direct Add to Cart (now Find Sellers → marketplace), BuyLocalModal requires selecting a real listing with seller, worker rejects orders without seller field |
| 2026-03-09 | **v36** — Fix SumUp checkout: corrected merchant code typo (M55T01IN → M55T011N), fixed D1 schema mismatch (user_id → user_email in all order queries), enabled guest checkout, improved SumUp error handling, removed deprecated pay_to_email |
| 2026-03-09 | **v35** — Restore cart to pre-v30 structure: reverted CartView.js and cart CSS to v29 layout (vertical condition cards, seller groups, sticky order summary) while retaining v32 trust badges, savings badges, and package count |
| 2026-03-09 | **v34** — Fix listing modal condition pricing: fetchConditionPrices now uses tcgplayerId (native JustTCG key) instead of scryfallId, enabling real-time condition-specific price updates in the listing form |
| 2026-03-09 | **v33** — D1 schema migration (payment_status, checkout_id, sumup_txn_id on orders), payment status polling route, OrderConfirmation real-time status updates, status badge color variants |
| 2026-03-09 | **v32** — Cart enhancements: condition price savings badges, trust indicators, package count, SumUp widget dark theme + email/amount display, webhook handler, redirect_url for 3DS |
| 2026-03-09 | **v31** — Service worker cache strategy fix: changed CSS from cache-first to network-first, preventing stale style.css from being served after deployments. Cloudflare zone cache purged. |
| 2026-03-09 | **v30** — Cart page complete redesign from scratch. New CartView.js with CartItem/ConditionOption components, BEM class naming (.cart-card, .cond-option, .cart-summary, .cart-group), horizontal flex-wrap condition grid, consolidated ~560 fragmented CSS lines into single clean block, removed all teal accent fallbacks, 899px tablet breakpoint |
| 2026-03-09 | **v29** — Cart condition selector CSS fix: consolidated duplicate `.cart-item` rules (row vs column conflict caused condition cards to render as jumbled text), ensured condition buttons styled properly after button reset, seller group needs-condition border fix |
| 2026-03-09 | **v28** — Cart condition selector redesign (pill chips → full-width cards with dot, abbreviation, full name, price), removed 5-condition limit, full CSS optimization (formatted for readable diffs, replaced 45+ hardcoded gold colors with CSS variables, removed dead classes, added cart-cond-card layout), JS error handling improvements (4 silent catches → console.warn), Cloudflare DNS cleanup (deleted junk CNAME, removed duplicate DMARC, TLS 1.2) |
| 2026-03-09 | **v27** — Homepage carousel card sections: new CardCarousel component (horizontal scroll, CSS scroll-snap, arrow nav, touch-friendly), expanded worker card lists to 12 each (Featured/Trending/Budget), section headers with subtitles, app shell in index.html (skeleton UI before React mounts for faster FCP) |
| 2026-03-09 | **v26** — Updated Terms of Service (14 sections, now covers Google OAuth, 5 conditions, JustTCG pricing), rewrote Privacy Policy (fixed "no backend server" inaccuracy, now covers D1 database, Google OAuth, server-side accounts), added first-visit ToS acceptance gate (versioned modal), added ToS checkbox to seller registration and checkout flows |
| 2026-03-09 | **v25** — Added Damaged (DMG) as 5th card condition across all listing, cart, seller, and pricing flows. JustTCG API query includes DMG. CSV import maps "DAMAGED" to DMG (was HP). CSS badge added. |
| 2026-03-09 | **v24** — Site-wide pricing transparency: added PricingView.js (`#pricing`) with full methodology page, inline "How we source prices" links on CardDetailView and MarketMoversView, Footer "Pricing & Sources" link, new SOUL.md product principle (Rule 4: Pricing transparency is non-negotiable), rules renumbered 4–9 |
| 2026-03-09 | **v19** — Fixed CSP `connect-src` (root cause of sign-in failure), auth.js race condition fix, centralized 4 stale `.workers.dev` URLs to `config.js`, removed debug artifacts. Added SOUL.md Rules 6–8: pre-push QA checklist, security posture, QC audit triggers — all derived from real failures in v14–v19; **v18** — Custom domain `api.investmtg.com` for worker, OAuth redirect hardcoded to custom domain, PROXY_BASE updated in frontend config |
| 2026-03-08 | Cart condition selector UX overhaul: two-tier cart item layout with full-width condition section, animated "Select a condition" prompt with warning icon, red border on items missing condition, checkout button gated until all conditions chosen, scroll-to-first-missing on disabled click; SW v17 |
| 2026-03-08 | SumUp payment processor restored: Card Widget integration with lazy SDK loading, Pay Online + Reserve & Pay at Pickup dual payment methods, `POST /api/sumup/checkout` worker endpoint, admin bypass layer on worker `getAuthUser()` via `ADMIN_TOKEN` secret for testing, removed all Guam GRT tax references site-wide (config, CartView, CheckoutView, OrderConfirmation, TermsView); SW v16 |
| 2026-03-08 | Order workflow overhaul: 4-step checkout wizard with confirmation modal, reserve & pay at pickup, server-generated `GUM-YYYYMM-XXXXX` order IDs, D1 order persistence, My Orders page (`#orders`), Order Confirmation server-first loading, removed dead SumUp code; SW v15 |
| 2026-03-08 | Step-based listing wizard (3-step flow: search → pick printing → details), auto-confirm on blur/Enter, new lf-* CSS system, removed broken 2-column layout; SW v14 |
| 2026-03-08 | 2-column listing form with printings browser panel (grid/list views), fixed listing creation for trade listings (price=0 bug), better error messages; SW v13 |
| 2026-03-08 | Seller listing improvements: set autocomplete via Scryfall printings API, CSV/Manabox bulk import tab, card preview thumbnails, CX polish; SW v12 |
| 2026-03-08 | Full-stack deployment audit: fixed Moxfield CORS (Decks page), added User-Agent to worker proxy, seller role auto-promotion, DB session cleanup; SW v11 |
| 2026-03-08 | Seller registration fix + ListingModal CSS: fixed D1 NOT NULL constraint on session_token for auth-based seller registration; added all missing mp-modal CSS for ListingModal; SW v10 |
| 2026-03-08 | Card detail button hardening & SW auto-reload: try-catch + toast feedback on all button handlers, SW v9 with postMessage auto-reload to eliminate stale-cache bugs |
| 2026-03-08 | Centralized safe localStorage wrapper (`utils/storage.js`): prevents JSON.parse crashes from corrupted values, migrated all 10 files to use it, SW v8 |
| 2026-03-08 | Full site debug: Bearer token auth (cookie-based failed in modern browsers), Featured card pricing fix (physical-only fallback), SW v7 |
| 2026-03-08 | Google OAuth authentication: persistent user accounts for sellers and buyers, Worker v3 with auth routes, frontend auth UI |
| 2026-03-08 | Self-hosted React: eliminated esm.sh redirect chains, vendor/ bundles, SW v4 |
| 2026-03-08 | Fixed mobile black screen: loading fallbacks, SW v3, es-module-shims polyfill for pre-iOS 16.4 browsers |
| 2026-03-08 | Wired root-level SPA to Cloudflare Worker v2 backend; site live at www.investmtg.com; deploy workflow updated to publish root directory directly |
| 2026-03-08 | Formalized `frontend-v2/` as an experimental rewrite (not deployed); root-level SPA confirmed as the production front end |
| 2026-03-08 | Established the Cloudflare Worker v2 backend with D1 database and KV cache support |
| 2026-03-08 | Added release rule that code, docs, and security review ship together |

---

When in doubt, choose the simpler, more honest product behavior.
