# investMTG — Changelog

## 2026-03-15: v78 — Compliance & Legal Policy Update

**Privacy Policy (PrivacyPolicyView.js)**
- Added PayPal, Resend, and EchoMTG to Third-Party Services disclosures
- Added legal basis for processing statement
- Added cookie table with Cloudflare, SumUp, PayPal details
- Expanded data retention with specific timeframes (30-day deletion, 3-year orders)
- Added data subject rights: correction, restriction, objection, opt-out of sale
- Added privacy request response timeframe (5 business days acknowledge, 30 days respond)
- Added DMCA / Copyright Takedown section

**Terms of Service (TermsView.js)**
- Added PayPal to Payments section (§ 6) alongside SumUp
- Added seller fee/chargeback transparency to Seller Obligations (§ 7)
- Added aggregate liability cap ($100) to Limitation of Liability (§ 11)
- Expanded Dispute Resolution (§ 12) with buyer protection for online payments
- Added Refund and Return Policy (new § 13) — FTC Act § 5 compliance
- Added Account Suspension and Termination (new § 15)
- Added under-13 account termination provision (§ 1)
- Renumbered sections 13→14 (Modifications), 14→16 (Contact)

**Cookie Notice (CookieNotice.js)**
- Updated to individually list Cloudflare, SumUp, and PayPal with purposes

**Checkout (CheckoutView.js)**
- Added dispute resolution disclosure at payment step
- Updated Step 3 subtitle to clarify contact details shared with seller

**Terms Gate (TermsGate.js)**
- Bumped TOS_VERSION to 2026-03-15 (triggers re-acceptance for existing users)

**Infrastructure**
- SW bumped to v78

## 2026-03-15: v77 — Foil/Language Variant Support

**Finish (Foil) variants for listings**
- Listings now support a `finish` field: Non-Foil, Foil, or Etched
- DB schema: `ALTER TABLE listings ADD COLUMN finish TEXT DEFAULT 'nonfoil'`
- All existing listings default to 'nonfoil' (backward compatible)
- SellerDashboard listing form: chip selector for finish type, auto-suggests
  foil price from Scryfall `prices.usd_foil` when foil is selected
- ListingModal (quick-list from card detail): same finish selector
- Finish badges displayed on My Listings, Cart, and BuyLocal modals
- Scryfall `finishes` array per printing determines which finishes are available;
  unavailable finishes are disabled in the selector

**Language variants for listings**
- Listings already had `language` column (default 'English') but no UI
- Added language dropdown (12 MTG languages including Phyrexian) to:
  SellerDashboard listing form, ListingModal
- Language badge shown on listings, cart items, and buy-local modal
  when language is not English
- Bulk import (CSV): parses `language` column from Manabox/DragonShield exports

**Worker updates**
- Both INSERT paths (batch + single) now include `finish` column
- PUT (update) path supports `finish` and `language` updates
- GET listings API: new `finish` and `language` query filters
- GET response mapping includes `finish` and `language` fields

**CSS additions**
- `.finish-badge`, `.finish-foil`, `.finish-etched` badge styles
- `.language-badge` for non-English language display
- `.finish-selector`, `.finish-chip` chip selector with active/disabled states
- Light theme variants included

**Files modified:** worker/worker.js, components/SellerDashboard.js,
components/ListingModal.js, components/CartView.js, components/BuyLocalModal.js,
utils/import-parser.js, style.css, sw.js, CHANGES.md

## 2026-03-15: v76 — Fix Sign-In and Camera Scanner

**Bug 1: Sign-in stuck after Google OAuth (CRITICAL)**
- Root cause: `captureTokenFromURL()` in `auth.js` called
  `window.location.replace(pathname + '#home')` after saving the auth token.
  Since the URL change was hash-only (same origin + pathname), browsers treated
  it as a same-page navigation — no full page reload occurred. `checkAuth()`
  returned a never-resolving promise, leaving the auth state permanently stuck.
- Fix: Replaced `window.location.replace()` with `history.replaceState()` to
  silently clean the URL, then let `checkAuth()` proceed normally to verify
  the token with `/auth/me`. Auth now completes in a single page load.

**Bug 2: Camera scanner blocked by Permissions-Policy**
- Root cause: Cloudflare zone-level transform rule "Security headers" sets
  `Permissions-Policy: camera=()` on all proxied responses, blocking
  `navigator.mediaDevices.getUserMedia()` entirely. The `<meta>` tag in
  `index.html` allowing `camera=(self)` is overridden by the HTTP header.
- Partial fix: Updated `ScannerView.js` error handling to detect camera
  permission blocks and guide users to the "Upload Photo" alternative.
  Error state now includes an Upload Photo button alongside Try Again.
- Worker fix: Removed `camera=()` from the worker's own `Permissions-Policy`
  header (line 154) — now only blocks microphone and geolocation.
- **TODO:** The Cloudflare zone transform rule (ID `e787d16aedf44d6888b521f96a2b2ee7`)
  must be updated in the Cloudflare dashboard to change `camera=()` to
  `camera=(self)`. The current API token lacks Transform Rules permissions.

**Files changed:**
- `utils/auth.js` — `captureTokenFromURL()` rewrite, `checkAuth()` simplified
- `components/ScannerView.js` — Camera error handling, Upload Photo fallback in error state
- `style.css` — `.scanner-error-actions` layout
- `worker/worker.js` — `Permissions-Policy` header updated
- `sw.js` — v75 → v76

## 2026-03-14: v75 — Fix Portfolio Page Crash

**Root cause:** `PortfolioView.js` line 759 referenced `items.length` in the
ShareButton text prop. `items` was only declared inside inner `.then()` callbacks
(lines 558, 687) and the `renderCardTable` parameter — none of which hoist to
the component scope. Accessing `.length` on `undefined` threw a TypeError,
caught by ErrorBoundary as "Something went wrong."

**Fix:** Changed `items.length` → `filtered.length` (the enriched+filtered
portfolio array that is in scope at render time).

- `sw.js` — v74 → v75.

## 2026-03-14: v74 — UX Fixes (Search State, Buy Flow, FAQ, Price Fallback)

**Fix 1: Search state preserved on back navigation (CRITICAL)**
- `SearchView.js` — `saveSearchState()` was defined but never called.
  Now called after every successful search, persisting query, results, and
  filter state to `sessionStorage`. Navigating to a card and pressing back
  restores the full search view (10-minute TTL).

**Fix 2: Add to Cart button on card detail page**
- `CardDetailView.js` — Primary CTA changed from "Find Sellers" to "Add to Cart".
  Opens the BuyLocalModal showing available seller listings for that specific card.
  "Browse Marketplace" kept as secondary ghost button.
- `app.js` — Passes `onBuyLocal` prop to CardDetailView.

**Fix 3: FAQ page**
- New `components/FAQView.js` — Accordion-style FAQ with 5 sections:
  About investMTG, Buying Cards, Selling Cards, Pricing & Data, Accounts & Privacy.
  16 questions covering marketplace model, paper-only policy, pricing waterfall,
  N/A prices, and privacy.
- `app.js` — Route `#faq`, SEO title/description, lazy-loaded component.
- `Footer.js` — FAQ link added to legal links row.
- `style.css` — `.faq-*` styles: accordion, chevron animation, responsive.

**Fix 4: Price history fallback when JustTCG unavailable**
- `CardDetailView.js` — When condition pricing is unavailable, the empty state
  now shows resolver-sourced 7-day change data (if available) and a link to
  TCGplayer for full price history.
- `style.css` — `.cd-jtcg-fallback` styling.

- `sw.js` — v73 → v74.

## 2026-03-14: v73 — N/A for Cards Without USD Pricing

**Root cause:** Cards like Zombie Master (Limited Edition Beta) have no USD market
price on Scryfall (`prices.usd: null`). The pricing waterfall returned 0, which
`formatUSD()` rendered as "$0.00" — misleading for a card worth ~€140.

**Fix: CardDetailView, CardGrid, CardCarousel**
- Market price box shows "N/A" with subtitle "No USD data" when all three sources
  (JustTCG, EchoMTG, Scryfall) return no USD price.
- Grid and carousel cards show "N/A" instead of "$0.00".
- `aria-label` updated to say "Price N/A" for accessibility.

- `sw.js` — v72 → v73.

## 2026-03-14: v72 — Multi-Source Pricing Waterfall

**New module: `utils/price-resolver.js`**
- Centralized pricing waterfall: JustTCG → EchoMTG → Scryfall (market price).
- `resolvePrice(card)` — resolves best price from the first available source.
- `resolveBatchPrices(cards)` — batch resolution for grids/carousels.
- `usePriceResolver(card)` / `useBatchPriceResolver(cards)` — React hooks.
- `getBestPrice(resolved)` — picks the best numeric price from resolved data.
- `getPriceSourceLabel(resolved)` — returns source attribution ("JustTCG", "EchoMTG", "Scryfall").
- `formatPriceChange(resolved)` — 7-day price change with direction indicator.
- Each source keyed by `tcgplayerId` (JustTCG), `set_code`+`collector_number` (EchoMTG),
  or native `prices.usd` (Scryfall).

**Fixed: `utils/api.js`**
- `fetchConditionPrices()` and `fetchJustTCGDetail()` now only use `tcgplayerId`.
- Removed dead `scryfallId` fallback paths that always returned NOT_FOUND.

**Fixed: `utils/justtcg-api.js`**
- `getJustTCGPricing()` interface updated; `opts.scryfallId` accepted but JustTCG
  only resolves via `tcgplayerId`.

**Updated: `components/shared/CardGrid.js`**
- Uses `useBatchPriceResolver` for grid-wide price enrichment.
- 7-day change badges (`.mtg-card-change`) and source indicators (`.mtg-card-source`).

**Updated: `components/shared/CardCarousel.js`**
- Same batch resolver integration with change badges on carousel cards.

**Updated: `components/CardDetailView.js`**
- Hero price box powered by `usePriceResolver`.
- Passes `card.tcgplayer_id` to `fetchJustTCGDetail` (was incorrectly using scryfallId).
- EchoMTG grading data now comes through resolver; removed separate useEffect.

**Updated: `components/MarketMoversView.js`**
- Uses native `card.tcgplayer_id` instead of parsing from purchase URL.
- Source attribution updated.

**CSS (`style.css`):**
- `.mtg-card-change`, `.carousel-card-change` — 7-day price change badges.
- `.mtg-card-source` — source attribution label.
- `.pr-change-up`, `.pr-change-down` — green/red change direction.
- `.price-box-sub`, `.price-box--up`, `.price-box--down` — detail view price box modifiers.

- `sw.js` — v71 → v72.

## 2026-03-14: v71 — Image Loading Fix (Scryfall CDN Fallback)

**Root cause:** Scryfall’s search API sometimes returns `cards.scryfall.io` CDN image URLs
that 404 (especially for double-faced cards and promo printings). This left card images
blank in the Seller Dashboard printing grid and other views.

**Fix: `utils/helpers.js`**
- `getCardImageSmall()` and `getScryfallImageUrl()` now fall back to the direct
  Scryfall API image endpoint (`api.scryfall.com/cards/{id}?format=image`) when no
  `image_uris` or `card_faces` images are available. This endpoint always redirects
  to a working image.
- New `handleImageError(e, scryfallId, size)` — `onError` handler that swaps a broken
  `<img>` src to the direct API fallback. Prevents infinite loops by checking current src.
- New `scryfallImageFallback(scryfallId, size)` — returns direct API URL for a card ID.

**Updated components (added `onError` fallback):**
- `SellerDashboard.js` — printing grid (grid + list view), selected card preview, listing thumbs
- `CardDetailView.js` — main card image + other printings thumbnails
- `shared/CardCarousel.js` — homepage featured/trending/budget carousels
- `DecklistView.js` — card hover preview image

- `sw.js` — v70 → v71.

## 2026-03-13: v70 — Deck Browser Overhaul

**Rewritten: `components/DecklistView.js`**
- Full deck browser with Moxfield search integration.
- Format filter tabs (All / Standard / Modern / Pioneer / Commander / Pauper).
- Dynamic browse grid fetches most-viewed decks per format from Moxfield search API.
- Deck detail view with cards grouped by type (Creatures, Instants, Sorceries, etc.).
- Per-card price column with deck total cost badge from Scryfall market data (USD).
- Mana cost symbols rendered as colored circles (W/U/B/R/G).
- Card image hover preview (fixed sidebar, hidden on mobile).
- Click any card row to navigate to its card detail page.
- Share button integration for both browse and detail views.
- Skeleton loading state for browse grid.
- Fallback to curated deck list if Moxfield search is unavailable.

**Rewritten: `utils/moxfield-api.js`**
- Added `searchMoxfieldDecks(format, count)` — queries Moxfield search API sorted by views.
- Updated `processDeck()` with per-card price data (USD, USD foil) from Moxfield card prices.
- Added set code, rarity, and CMC to processed card objects.
- 15-minute in-memory cache for both search results and individual decks.
- Updated curated fallback deck IDs (2026-03-13).

**CSS (`style.css`):**
- Complete replacement of old `.decklist-*` styles with new `dk-*` namespace.
- New classes: `.dk-format-tabs`, `.dk-format-tab`, `.dk-browse-grid`, `.dk-browse-card`,
  `.dk-format-badge`, `.dk-views`, `.dk-detail-header`, `.dk-price-badge`, `.dk-section`,
  `.dk-card-row`, `.dk-card-price`, `.dk-img-preview`, `.mana-w/u/b/r/g`.
- Responsive: single-column grid, hidden image preview, compact tabs on mobile.

- `sw.js` — v69 → v70.

## 2026-03-13: v69 — Global Share Feature

**New component: `components/shared/ShareButton.js`**
- Reusable share button with two modes:
  - Mobile/PWA: native Web Share API (share sheet with apps)
  - Desktop: dropdown with "Copy link" and "Copy with details" options
- Fallback to `document.execCommand('copy')` for older browsers without clipboard API.
- Toast feedback on successful copy.

**New icons: `components/shared/Icons.js`**
- Added `ShareIcon` (node-link), `CopyIcon` (clipboard), `LinkIcon` (chain link).

**Integration across 4 views:**
- **CardDetailView** — Share button in card actions row. Shares clean SEO URL (`/card/:id`), card name, set, price, and investMTG branding.
- **PortfolioView** — Share button in header. Shares portfolio summary (card count, total value, gain/loss).
- **MarketMoversView** — Share button in page header. Shares movers page link.
- **StoreView** — Share button in marketplace header. Shares Guam marketplace link.

**CSS (`style.css`):**
- `.share-wrap`, `.share-btn`, `.share-btn--sm` — button layout + sizing.
- `.share-menu`, `.share-menu-item` — desktop dropdown with slide-in animation.
- `.page-header-row` — flex row for title + share alignment.

- `sw.js` — v68 → v69.

## 2026-03-13: v68 — SEO Overhaul — HTMLRewriter, Dynamic Sitemap, Clean Card URLs

**Worker (worker/worker.js):**
- Added Worker Route `www.investmtg.com/*` alongside existing `api.investmtg.com` custom domain. Worker now intercepts all www requests and passes through to GitHub Pages origin via `cf.resolveOverride` on `origin-www.investmtg.com` (unproxied CNAME).
- Bot/crawler detection: `BOT_UA_RE` regex matches 16 bot user-agents (Googlebot, Bingbot, Facebook, Twitter, Discord, Slack, etc.).
- Clean card URLs: `/card/:id` path — bots receive HTMLRewriter-injected HTML with per-card `<title>`, `<meta description>`, `og:title`, `og:description`, `og:image` (Scryfall card art), `og:url`, `twitter:title`, `twitter:description`, `twitter:image`, and canonical link. Regular users get 302 redirect to `/#card/:id` hash route.
- Dynamic sitemap: `/sitemap.xml` on both `www.investmtg.com` and `api.investmtg.com` — 10 static page routes + all cards from D1 prices table (268 cards) with clean `/card/:id` URLs and `lastmod` dates. Cached 1 hour.
- Card data for HTMLRewriter: queries D1 first (cached within TTL_PRICE), falls back to Scryfall API.

**Frontend (app.js):**
- Added `useEffect` with route-specific `document.title` + `<meta name="description">` updates for all 15 hash routes (home, search, card, cart, checkout, portfolio, seller, movers, store, pricing, privacy, terms, orders, order detail, decks).

**Frontend (components/CardDetailView.js):**
- Added per-card SEO after data loads: `document.title`, `meta[name="description"]`, `og:title`, `og:description`, `og:image` updated dynamically for client-side navigation.

**Infrastructure:**
- New DNS record: `origin-www.investmtg.com` CNAME → `imvestmtg.github.io` (unproxied, used as resolveOverride target for Worker pass-through).
- `wrangler.toml` — added route `{ pattern = "www.investmtg.com/*", zone_name = "investmtg.com" }`.
- `robots.txt` — added secondary sitemap reference: `https://api.investmtg.com/sitemap.xml`.
- `sw.js` — v67 → v68.

## 2026-03-13: v67 — Phase 1 Completion — Promise Safety + DDL Removal

**Worker (worker/worker.js):**
- Removed runtime DDL from `handleOrders` POST: `CREATE TABLE IF NOT EXISTS orders` and 3 `ALTER TABLE` statements ran on every order creation. Tables are now managed via migrations only.
- Removed DDL fallback from `generateOrderId`: `CREATE TABLE IF NOT EXISTS order_counters` in `.catch()` block. Table exists; no self-healing needed.

**Frontend — Unhandled Promise Rejection Fixes (10 chains):**
- **components/DecklistView.js** — `getPopularDeckList().then()` now catches; clears loading state on failure.
- **components/HomeView.js** — `getEventsAsync().then()` now catches silently (events non-critical).
- **components/ListingModal.js** — `fetchConditionPrices().then()` now catches; clears price loading state.
- **components/MetaView.js** — 3 chains fixed: `Promise.all([tournaments])`, `getStaples()`, `getCommanderDetail()` — all clear loading state on failure.
- **components/ScannerView.js** — `workerP.then()` (Tesseract init for file upload) now catches with console error.
- **components/SellerDashboard.js** — `getStoreOptionsAsync().then()` now catches silently (non-critical).
- **components/StoreView.js** — `getStoresAsync().then()` now catches silently (falls back to cached data).
- **utils/auth.js** — `checkAuth().then()` in `useAuth()` hook now catches; sets user to null on failure.

- **sw.js** — v66 → v67.

## 2026-03-13: v66 — Card Lookup v2 (DFC, Treatments, Printings Endpoint)

**Worker — Card Lookup v2 (worker/worker.js):**
- Replaced `fetchAndCacheCard` with v2 system: proper DFC image extraction (`extractImageUris`, `extractAllFaceImages`), DFC field merging (`getCardField` for mana_cost, type_line, oracle_text across both faces), color extraction from card_faces (`getCardColors`).
- Digital-only fallback improved: `findBestPaperPrinting` searches for cheapest paper printing with USD price, prefers regular (non-promo) printings, falls back to foil-only results.
- Treatment detection: `getCardTreatment` / `getTreatmentLabel` identifies showcase, borderless, extended art, retro frame, etched, textured, serialized, galaxy foil, surge foil, confetti foil, and more.
- Price extraction: `extractPrices` / `getBestUsdPrice` now includes `usd_etched` for Commander staples.
- `handleCardDetail` updated to use `cacheCardToD1` with new columns (treatment, price_usd_etched, image_back, finishes).
- New endpoint: `GET /api/card-printings/:name` — returns all paper printings for a card with treatment labels, prices, images (front + back for DFCs), cached 1 hour in KV.

**D1 Migration:**
- `prices` table: added `treatment TEXT`, `price_usd_etched REAL`, `image_back TEXT`, `finishes TEXT` columns.

- **sw.js** — v65 → v66.

## 2026-03-13: v65 — Seller Listing Card Images + Security Hardening Wave 2

**Seller Dashboard:**
- **components/SellerDashboard.js** — Listing cards now display card thumbnail images via three-tier fallback: (1) stored `image_uri`, (2) Scryfall ID-based image URL, (3) Scryfall exact name search image URL. The name-based fallback covers all existing listings that have empty `card_id` and `image_uri` in D1.
- **components/SellerDashboard.js** — `ListingForm` now stores `scryfallId` from the selected printing and passes it as `card_id` to the backend, so new listings get the Scryfall ID stored in D1.

**Security (Worker):**
- **worker/worker.js** — CORS hardening: unknown origins now receive only security headers (no `Access-Control-Allow-Origin`). Previously fell back to `ALLOWED_ORIGINS[0]` for unknown origins.
- **worker/worker.js** — Auth token no longer leaked in URL query parameter after Google OAuth. Redirect now uses URL fragment (`#auth_token=...`) which is never sent to servers, referrer headers, or logged in browser history.
- **utils/auth.js** — `captureTokenFromURL()` updated to read from hash fragment, with legacy query param fallback.
- **worker/worker.js** — SumUp webhook (`/api/sumup-webhook`) security documented: SumUp doesn't support webhook signing, so security relies on the existing server-side re-verification (fetching checkout status from SumUp API before updating orders). Added explanatory comment.
- **worker/worker.js** — JustTCG and TopDeck proxy endpoints now require a valid session cookie or auth token. Prevents external callers from consuming paid API keys. Normal site visitors (who get a session cookie automatically) are unaffected.

- **sw.js** — v64 → v65.

## 2026-03-13: v64 — Security Hardening + Performance Audit Fixes

**Security (Wave 1):**
- **worker.js** — Stripped `e.message` from all 10 client-facing API error responses. Internal details now logged server-side only via `console.error()`; clients receive generic messages.
- **worker.js** — Removed `localhost:3000`, `localhost:5500`, `127.0.0.1:5500` from `ALLOWED_ORIGINS`. Production CORS now allows only `investmtg.com`, `www.investmtg.com`, `api.investmtg.com`, and `imvestmtg.github.io`.
- **worker.js** — Removed `api.mtgstocks.com` from `ALLOWED_PROXY_HOSTS` (unused by the generic proxy; MTGStocks has its own dedicated handler).
- **worker.js** — Added audit logging for admin token bypass: logs IP and path to `console.log` on every use.
- **worker.js** — SumUp error response no longer leaks raw `sumup_errors` array or `detail` string to the client.

**Performance (Wave 2):**
- **utils/api.js** — Added 15-second `AbortController` timeout to `backendFetch()`. All API calls now abort cleanly instead of hanging indefinitely on slow/dead backends.
- **components/CheckoutView.js** — Added `.catch()` to `completeReserveOrder()` chain (payment flow). Prevents stuck processing state on network errors.
- **components/CartView.js** — Added `.catch()` to `Promise.all()` JustTCG pricing fetch. Ensures loading state clears on failure.

**Cleanup (Wave 3):**
- **style.css** — Removed 18 dead CSS blocks (`.market-card` family, `.watchlist-section`, `.cond-dmg`): −2.4 KB.
- **style.css** — Added 16 utility CSS classes (`u-mt-2`, `u-mt-3`, `u-mt-4`, `u-mb-3`, `u-mb-4`, `u-p-4`, `u-p-8`, `u-text-center`, `u-text-muted`, `u-text-sm-muted`, `u-link-primary`, `u-flex-shrink-0`, `u-label-xs`, `u-hidden`, `u-bold`) for gradual inline style migration.
- **sw.js** — v63 → v64.

**QA:** 75/75 pass (full mode).

## 2026-03-13: v63 — Unified QA Script + Workflow Streamlining

- **tests/qa.sh** — New unified QA script replacing smoke-test.sh, debug-tool.sh, full-qa.sh, and code-review.sh:
  - Tiered: `--quick` (18 checks), `--standard` (45 checks, default), `--full` (65 checks incl. DNS/perf).
  - Also `--local` (code only, no HTTP) and `--live` (HTTP only, no local).
  - Caches HTTP responses (index.html + health fetched once, reused) — eliminates ~22 redundant HTTP calls that the old dual-script setup made.
  - No 35-second rate-limit gap needed (single pass, no duplicate requests).
- **Removed** `tests/smoke-test.sh`, `tests/debug-tool.sh`, `tests/full-qa.sh`, `tests/code-review.sh` (all consolidated into qa.sh).
- **investmtg-qa skill** — Trimmed from 512 lines to 96 lines (81% reduction). References qa.sh instead of duplicating inline bash. Saves tokens on every skill load.
- **SOUL.md** — Rule 8 "QA before every push" updated to reference `tests/qa.sh` tiers.
- **BUILD_SPEC.md, README.md** — Tests section rewritten with new qa.sh usage.
- **sw.js** — v62 → v63.

## 2026-03-13: v62 — DFC Image Fix + Paper-Only Enforcement

- **components/SellerDashboard.js** — Fixed blank card images for double-faced cards (DFCs) in printing picker:
  - Used `getCardImageSmall()` / `getScryfallImageUrl()` helpers instead of direct `card.image_uris` access (which is null for DFCs — Scryfall stores images in `card_faces[0].image_uris` for those).
  - Added `-is:digital` filter to Scryfall printings search query — seller can no longer see or list MTGO/digital-only printings.
- **components/ScannerView.js** — Same DFC image fix applied to scanner history thumbnails and match cards.
- **SOUL.md** — Added Rule 2 "Paper cards only" codifying the paper-first principle: all Scryfall queries must exclude digital, only paper prices shown.
- **sw.js** — v61 → v62.

## 2026-03-13: v61 — EchoMTG Integration + Order Confirmation Emails

- **utils/echomtg-api.js** — New EchoMTG API frontend utility:
  - `getEchoCardByEmid()` — single card detail with grading prices.
  - `getEchoSetCards()` — set cards with price change data.
  - `findEmidByCollector()` / `findEmidByTcgplayerId()` — emid lookup.
  - `getGradingPrices()` — full grading data (NM through damaged + graded slabs) for a card.
  - `getSetGainers()` / `getSetLosers()` / `getSetMovers()` — set-level price movers.
  - 15-minute in-memory cache, all calls through Worker proxy.
- **components/CardDetailView.js** — "Graded & Slab Prices" section:
  - BGS 10/9.5/9/8.5/8, PSA 10/9/8/7/6, Signed, Artist Proof, Altered, Pre-release prices.
  - Estimated buylist value.
  - Attribution link to EchoMTG.
  - Loads asynchronously via set_code + collector_number → emid lookup.
- **components/MarketMoversView.js** — Two new tabs:
  - "Set Gainers" — cards gaining value across 6 recent Standard-legal sets (FDN, DSK, BLB, OTJ, MKM, LCI).
  - "Set Losers" — cards losing value, same sets.
  - EchoMTG card images (cropped), set code, mid/low prices, change %.
  - Source attribution updated to include EchoMTG when Echo tabs active.
- **worker/worker.js** — Backend changes:
  - `handleEchoMTG()` — EchoMTG API proxy with server-side API key injection.
    KV-cached: item data 24hr, set data 30min.
  - `/echomtg` route added to main router.
  - `sendOrderConfirmationEmail()` — Resend REST API integration for transactional emails.
  - `buildOrderEmailHtml()` — dark-themed HTML email template matching investMTG brand.
    Supports `order_received` (gold) and `payment_confirmed` (green) variants.
  - Email wired into POST `/api/orders` (fire-and-forget after order creation).
  - Email wired into PayPal capture success flow (fetches order from D1, sends payment confirmation).
  - New wrangler secrets: `RESEND_API_KEY`, `ECHOMTG_API_KEY`.
- **index.html** — CSP: added `https://assets.echomtg.com` to `img-src` for card images.
- **style.css** — ~50 lines new CSS for EchoMTG graded prices grid.
- **sw.js** — Cache version bumped v60 → v61.

## 2026-03-13: v60 — Card Scanner (Camera + OCR)

- **components/ScannerView.js** — New card scanner feature:
  - Device camera access via WebRTC with environment/user camera toggle.
  - Tesseract.js OCR (loaded dynamically from jsdelivr CDN) reads collector number from card bottom.
  - Multi-strategy OCR pipeline: crops bottom 30% of frame, applies contrast threshold pre-processing, extracts collector number + set code, falls back to full-image card name recognition.
  - Scryfall lookup by `number:` + `set:` query for exact match.
  - Photo upload alternative for users without camera access.
  - Guide overlay with corner brackets for card alignment.
  - Camera controls: capture button, flip camera, cancel.
  - Processing state with spinner overlay on captured image.
  - Results view shows matched card(s) with image, name, set, price — click to navigate to card detail.
  - Session scan history (in-memory, up to 20 recent scans).
  - Full mobile-responsive layout.
- **app.js** — Added `#scan` route + lazy-loaded ScannerView component.
- **components/Header.js** — Added "Scan" nav link with camera icon after "Search".
- **index.html** — CSP updates:
  - `connect-src`: added `cdn.jsdelivr.net` (Tesseract language data files).
  - `worker-src`: added `'self' blob:` (Tesseract Web Worker).
  - `img-src`: added `blob:` (captured camera images).
  - `Permissions-Policy`: changed `camera=()` to `camera=(self)` to allow camera access.
- **style.css** — ~640 lines new CSS for scanner page:
  - Scanner hero/landing, camera view with overlay guide, capture controls.
  - Processing spinner, error state, results match cards, scan history grid.
  - Mobile responsive breakpoints.
- **sw.js** — Cache version bumped v59 → v60.

## 2026-03-11: v59 — Sortable tables + JustTCG/MTGStocks data integration

- **components/MarketMoversView.js** — Complete rewrite to sortable data table:
  - Sortable columns: Rank, Card, Price, 7D/30D/90D change. Click column headers to toggle asc/desc.
  - JustTCG condition data loaded progressively per card (NM price + 7d/30d/90d % change).
  - 30-day SVG sparkline chart column showing price trend.
  - SortArrow and Sparkline helper components.
  - Replaces old card-list layout with proper `<table>` structure.
- **components/CardDetailView.js** — JustTCG condition breakdown section:
  - Condition price grid (NM/LP/MP/HP/DMG) with 7-day % change per condition.
  - Price trend stats row (24h/7d/30d/90d % change for NM).
  - 30-day NM price trend SVG sparkline with min/max range.
  - All-time high/low + 52-week range stats.
- **components/PortfolioView.js** — Sortable table headers:
  - All portfolio table columns (Card, Set, Cond, Qty, Buy Price, Current, Gain/Loss) now clickable to sort asc/desc.
  - SortTh component with active state highlighting and directional arrow indicators.
  - sortItems() function handles all sort keys including computed gain/loss.
- **utils/api.js** — 2 new API functions:
  - `fetchJustTCGDetail(ids)` — full JustTCG card data with all conditions, price changes (24h/7d/30d/90d), 30d price history, all-time/1y min/max.
  - `fetchMTGStocksHistory(printId)` — MTGStocks price history proxy (requires print_id mapping).
- **worker/worker.js** — MTGStocks proxy handler:
  - `handleMTGStocks()` — proxies to `api.mtgstocks.com/prints/{id}` and `/prints/{id}/prices/tcgplayer`, KV-cached 24hr.
  - `/mtgstocks` route added.
  - `api.mtgstocks.com` added to `ALLOWED_PROXY_HOSTS`.
  - `TTL_MTGSTOCKS = 86400` constant.
  - N/A fix: replaced Black Lotus/Ancestral Recall/Mox Ruby (no USD prices) with Mishra's Workshop/Tabernacle/Candelabra in valuable movers list.
- **style.css** — ~350 lines added:
  - Market Movers: mv-table-wrap, mv-table, mv-th (sortable headers), mv-row, mv-td, mv-card-img/info/name/set, mv-sort-arrow, mv-change (up/down/flat/na), mv-sparkline + mobile responsive.
  - Card Detail: cd-jtcg-section, cd-jtcg-grid (5-col condition grid), cd-cond-card, cd-cond-label/price/change, cd-trend-row, cd-chart-wrap/svg, cd-alltime + mobile responsive.
  - Portfolio: pf-sortable-th, pf-th-active.
- **sw.js** — v58 → v59

---

## 2026-03-11: v58 — Portfolio upgrade (binders, conditions, lists)

- **worker/worker.js** — Major portfolio system overhaul:
  - `POST /api/portfolio` now accepts `condition` (NM/LP/MP/HP/DMG) and `binder_id` fields.
  - `PUT /api/portfolio` — new endpoint for updating condition, binder, quantity, and price on existing portfolio items.
  - `POST /api/portfolio/batch` — batch import now supports condition and binder_id.
  - `GET/POST/PUT/DELETE /api/binders` — full CRUD for user-created binders (name, color, icon, sort_order). Returns binder list with card counts and unassigned count.
  - `GET/POST/PUT/DELETE /api/lists` — full CRUD for virtual lists (Wishlist, Buylist, Trade). List types: `wishlist`, `buylist`, `trade`.
  - `GET/POST/DELETE /api/lists/:id/items` — manage cards within lists (card_id, card_name, quantity, target_price, condition, notes). UNIQUE constraint on list_id + card_id.
- **worker/migrations/v58-portfolio-upgrade.sql** — Schema migration (applied to D1):
  - New `binders` table (id, user_id, name, color, icon, sort_order, created_at, updated_at).
  - New `lists` table (id, user_id, name, list_type, description, sort_order, created_at, updated_at).
  - New `list_items` table (id, list_id, user_id, card_id, card_name, quantity, target_price, condition, notes, added_at).
  - `portfolios` table: added `condition TEXT DEFAULT 'NM'` and `binder_id INTEGER DEFAULT NULL` columns.
  - Total D1 tables: 14 (was 11).
- **components/PortfolioView.js** — Complete rewrite (~840 lines):
  - Binder sidebar with colored chip filters, "All Cards" and "Unassigned" built-in options.
  - Condition selector on every card (NM/LP/MP/HP/DMG) with color-coded badges.
  - Condition-adjusted pricing: NM 100%, LP 85%, MP 70%, HP 50%, DMG 30%.
  - Group-by controls: set, color, type, rarity, condition, binder.
  - Tabbed interface: Collection tab + Lists tab.
  - Lists panel: create/edit/delete lists, add/remove cards, list type selector (Wishlist/Buylist/Trade).
  - CreateBinderModal and CreateListModal with name, color/icon/type pickers.
- **components/CardDetailView.js** — Track button now includes inline condition selector dropdown and "Add to List" dropdown for quick list assignment.
- **utils/api.js** — 12 new API functions: `updatePortfolioItem`, `fetchBinders`, `createBinder`, `updateBinder`, `deleteBinder`, `fetchLists`, `createList`, `updateList`, `deleteList`, `fetchListItems`, `addListItem`, `removeListItem`.
- **app.js** — Portfolio mapping updated to include condition and binder_id fields.
- **style.css** — ~400 lines added: pf-tabs, pf-toolbar, pf-chip (binder filters), cond-select, cond-badge (NM/LP/MP/HP/DMG color system), pf-grouped-tables, card-track-group, card-list-dropdown, pf-lists-panel, pf-list-grid, pf-type-selector + mobile responsive.
- **sw.js** — v57 → v58

---

## 2026-03-11: v57 — Dynamic carousel refresh (daily auto-rotation)

- **worker/worker.js** — Homepage carousels (Featured, Trending, Budget Staples) now rotate cards daily instead of using static lists.
  - Added `CAROUSEL_QUERIES` config with Scryfall search queries per category (commander-legal, paper-only, priced in USD, sorted by EDHREC rank).
  - Added `refreshCarousels()` — queries Scryfall for each category, picks 12 unique cards with USD prices, stores name lists in KV with 25hr TTL.
  - Added `fetchCarouselNames()` — uses day-of-year seeded page rotation (cycles pages 1–8) so content changes daily.
  - Added `getDynamicNames()` — reads from KV, falls back to static arrays if KV is empty.
  - Updated `handleFeatured/Trending/Budget` to use dynamic names from KV.
  - Static card arrays renamed to `FALLBACK_FEATURED`, `FALLBACK_TRENDING`, `FALLBACK_BUDGET`.
  - Added admin endpoint `POST /api/admin/refresh-carousels` (ADMIN_TOKEN required) for manual triggers.
  - Cron trigger (`scheduled()`) now calls `refreshCarousels()` after session/price purge.
- **sw.js** — v56 → v57
- Worker redeployed. First dynamic refresh populated and verified — all 3 carousels serving 12 fresh cards each.

---

## 2026-03-11: v56 — Fix seller dashboard delete + clean bad listings

- **worker/worker.js** — `GET /api/sellers` now filters listings with `AND status = 'active'`. Previously returned all listings including `status='removed'`, so deleted listings reappeared immediately after the dashboard refreshed.
- **D1 cleanup** — Removed 3 test listings with $0.00 prices and missing Scryfall data (no set_name, card_id, or image_uri). These were created during early testing.
- **sw.js** — v55 → v56
- Worker redeployed.

---

## 2026-03-11: v55 — Revert header redesign

- Reverted v53/v54 3-tier header redesign. Restored original Header.js and style.css from v52.
- **sw.js** — v54 → v55

---

## 2026-03-10: Efficiency upgrades — 5 new development tools

- **tests/full-qa.sh** (NEW) — Combined QA pipeline that runs smoke test, waits 35 seconds (Cloudflare rate limit buffer), then runs the debug tool. Supports `--smoke-only`, `--debug-only`, and `--quick` flags. One command replaces the manual two-step test process.
- **tests/code-review.sh** (NEW) — AI code review helper. Extracts a git diff (staged, all uncommitted, last commit, or specific file), saves to `/tmp/investmtg-review-diff.txt`, and prints a review prompt pre-loaded with investMTG coding rules (var-only, no arrows, no JSX, React.createElement pattern). Designed for paste into ChatGPT/OpenAI.
- **Auto health monitoring** — Recurring task runs every 6 hours checking 6 endpoints: frontend HTTP 200, API health JSON (status=ok, db=connected), ticker (16 items), search, JustTCG proxy (tcgplayerId=282800), CORS proxy. Silent when all pass; sends "investMTG Health Alert" notification on failure.
- **Google Sheets release tracker** — [Release log spreadsheet](https://docs.google.com/spreadsheets/d/1wncB6NFKkm4gosAAtw-C3L0QjILkG2ROhh4est_PXN8/edit) pre-populated with all 56 historical releases from CHANGES.md. Columns: Date, Version, Commit, SW Version, Summary, Smoke Test, Debug Tool, Files Changed. Gold-on-dark header styling.
- **Cloudflare connector** — Tested the Pipedream Cloudflare connector for DNS/cache operations. Returns null for this zone — continuing with direct curl + tokens (documented in investmtg-cloudflare skill).
- No SW bump needed (development tooling only, no frontend/worker changes).

---

## 2026-03-10: Git workflow upgrade — native push via GitHub CLI

- **Development workflow** — Replaced the manual curl + PAT + Git Trees API push method (6 API calls per push: create blob → create tree → create commit → update ref) with standard `git add` / `git commit` / `git push` using the GitHub CLI (`gh`) with pre-configured credentials (`api_credentials=["github"]`).
- Git identity configured: `imvestMTG <bloodshutdawn@gmail.com>`.
- Commits now have proper author metadata instead of API-generated signatures.
- No SW bump needed (workflow change only, no frontend/worker changes).

---

## 2026-03-10: Debug tool fixes — JustTCG test + TLS detection

- **tests/debug-tool.sh** — Fixed JustTCG proxy check returning false WARN (HTTP 404). Root cause: the test used `scryfallId=3fa40ef1-...` but JustTCG's API does not support Scryfall UUID lookups — it requires `tcgplayerId`. Changed to `tcgplayerId=282800` (Sheoldred, the Apocalypse) which returns HTTP 200 with full condition pricing data. This aligns with how the production code works: Scryfall provides `tcgplayer_id` on every card, and `fetchConditionPrices()` in `utils/api.js` passes it as the preferred key.
- **tests/debug-tool.sh** — Fixed TLS version detection always showing WARN. Root cause: `curl -w "%{ssl_version}"` returns empty on some curl builds (including curl 8.14.1/OpenSSL 3.5.1). Added a fallback that parses TLS version from `curl -sv` verbose output (`SSL connection using TLSv1.3 / ...`). Site correctly reports TLSv1.3.
- Debug tool results: **97 passed, 0 warnings, 0 failures** (previously 95 passed, 2 warnings).
- Smoke test: 33/33 passed.
- No SW bump needed (tests only, no frontend/worker changes).

---

## 2026-03-10: Fix portfolio DELETE for signed-in users (SW v51)

- **worker/worker.js** — Fixed a bug where removing a card from the portfolio always failed silently for authenticated users. Root cause: `portfolioScope()` returned SQL clauses with a `p.` table alias prefix (`p.user_id = ?`) designed for the SELECT JOIN query. The DELETE statement used the same scope clause, producing `DELETE FROM portfolios WHERE p.user_id = ? AND card_id = ?` — D1/SQLite threw `no such column: p.user_id` because standalone DELETE has no table alias. The error was swallowed by the frontend's fire-and-forget `.catch()`. On next page load, `fetchPortfolio()` returned the never-deleted card from D1, resurrecting it. Fix: added a `bare` property to `portfolioScope()` without the table alias prefix, and switched the DELETE queries to use `scope.bare` instead of `scope.clause`.
- Worker redeployed to `api.investmtg.com`.
- SW bumped to v51.

---

## 2026-03-10: Fix portfolio card removal race condition (SW v50)

- **components/PortfolioView.js** — Fixed a bug where removing a card from the portfolio would cause it to reappear. Root cause: the `useEffect` that fetches portfolio data from D1 had `[portfolio.length]` as its dependency. When the user removed a card, `portfolio.length` changed, triggering a re-fetch. The `fetchPortfolio()` GET request raced against the `removeFromPortfolioAPI()` DELETE — the GET returned stale data (card still present) and `updatePortfolio()` overwrote the local state, resurrecting the removed card. Fix: changed dependency to `[]` (mount-only) and removed the `updatePortfolio()` call from the fetch response handler — the effect now only updates the price map, never overwrites portfolio items.
- SW bumped to v50.

---

## 2026-03-10: Revert homepage redesign — restore original sleek layout (SW v49)

- **components/HomeView.js** — Reverted to the v46 original: clean hero with static stats ("Real Prices", "Guam Built", "Live Data", "100% Free"), no search button in hero bar, no live stats bar, no feature highlights grid, no CTA section. The redesign from Invest-MTG added too many new sections that broke the layout (oversized SVGs, missing grid styling, CTA blob). The original was sleek and worked.
- **style.css** — Reverted to v46 original. Removed all new CSS (hero-eyebrow, hero-search-btn, live-stats-bar, features-grid, home-cta). Restored original `.hero-stats` / `.hero-stat` / `.hero-stat-value` / `.hero-stat-label` CSS.
- Worker fixes from v47 are kept: camelCase mapping on GET /api/listings, workers_dev=false.
- Dead showToast import removal from v47 is kept.
- SW bumped to v49.

---

## 2026-03-10: Fix oversized SVG icons on homepage (SW v48)

- **components/HomeView.js** — Added explicit `width: '22', height: '22'` to all feature highlight SVG icons. Previously these SVGs had `viewBox` but no intrinsic dimensions, causing them to expand to fill the entire viewport (each icon rendered at ~500px+).
- **style.css** — Added `min-width`, `min-height`, `max-width`, `max-height`, and `overflow: hidden` to `.feature-highlight-icon`, `.feature-highlight-icon svg`, `.live-stat-icon`, and `.live-stat-icon svg` containers. Belt-and-suspenders approach ensures SVGs can never blow out regardless of attribute presence.
- SW bumped to v48.

---

## 2026-03-10: Repo consolidation — HomeView redesign + Worker fixes (SW v47)

Cherry-picked real fixes from the `Invest-MTG` repo (created by Claude Code) back into the primary `investmtg` repo.

- **components/HomeView.js** — Complete homepage redesign:
  - Added "Guam's #1 MTG Platform" hero eyebrow badge with gold pill styling.
  - Hero tagline now has responsive line break (`<br>`) for desktop readability.
  - Added gold "Search" button inside the hero search bar.
  - Replaced static hero stats ("Real Prices", "Guam Built", etc.) with a live stats bar that fetches from `/api/health` and displays real counts: Marketplace Listings, Cards Tracked, Active Sellers, and Users.
  - Added 4-card feature highlights grid: Live Price Tracking, Local Marketplace, Portfolio Tracker, cEDH Meta & Events — each with SVG icon, title, and description.
  - Added CTA section at bottom: "Start Tracking Your Collection" with Browse Cards and My Portfolio buttons.
- **style.css** — Added ~230 lines of new CSS: `.hero-eyebrow`, `.hero-br`, `.hero-search-btn` (positioned inside search input), `.live-stats-bar` + `.live-stat-*` (responsive grid with icon+value+label), `.features-grid` + `.feature-highlight` (4-column responsive grid with hover effects), `.home-cta-*` (gradient CTA section with primary/secondary buttons). Updated `.hero-search input` padding-right for search button. Removed dead `.hero-stats` / `.hero-stat` / `.hero-stat-value` / `.hero-stat-label` CSS. Updated `.hero-stats` animation reference to `.live-stats-bar`.
- **worker/worker.js** — GET `/api/listings` now maps snake_case DB columns to camelCase for frontend (id, seller, contact, store, cardId, cardName, setName, etc.) while preserving snake_case aliases for backward compatibility.
- **worker/wrangler.toml** — Set `workers_dev = false` (security fix — disables the public `.workers.dev` fallback URL).
- **app.js** — Removed dead `showToast` import (only `ToastContainer` is used).
- SW bumped to v47.

---

## 2026-03-10: Seller Dashboard Profile tab UX redesign (SW v46)

- **components/SellerDashboard.js** — Complete redesign of the Profile tab with inline-editable fields following e-commerce best practices:
  - Replaced the read-only table + "Edit Profile" button with click-to-edit fields. Each field (name, contact, store, bio) can be edited in-place — click the field, edit, hit Save or Enter. Changes are saved individually via the PUT /api/sellers endpoint.
  - Organized into clear sections: Personal Information, Contact & Store, Account Details (read-only), Session, and Danger Zone.
  - Each section has an icon header, title, and description for visual hierarchy.
  - Danger Zone is now a collapsible section with a type-to-confirm "DELETE" safety gate instead of a single-click delete button.
  - Removed the old `ProfileEditForm` component and `editingProfile` state in favor of per-field `EditableField` component.
  - New `EditableField` component supports text, textarea, and select field types with keyboard shortcuts (Enter to save, Esc to cancel), inline validation, and saving state.
- **style.css** — Added ~280 lines of new CSS for the profile page: `.pf-page`, `.pf-section`, `.pf-field` (grid layout with edit hints on hover), `.pf-field--editing` (inline input state), `.pf-readonly-field`, `.pf-session-row`, `.pf-danger` (collapsible danger zone with chevron), `.btn-danger:disabled`. Mobile-responsive with touch-friendly adjustments.
- SW bumped to v46.

---

## 2026-03-09: Seller Dashboard edit/delete + nav fix (SW v45)

- **components/SellerDashboard.js** — Added Profile tab with edit profile form, log out button, and danger zone with delete account action.
- **components/Header.js** — Fixed nav dropdown dispatching hashchange when already on same hash.
- **utils/api.js** — Added `updateSeller(data)` (PUT) and `deleteSeller()` (DELETE) API functions.
- **worker/worker.js** — Added PUT /api/sellers (update profile) and DELETE /api/sellers (delete account + listings + role downgrade).
- **style.css** — Added `.seller-profile-actions`, `.seller-danger-zone`, `.seller-danger-title`, `.seller-danger-text` styles.
- SW bumped to v45.

---

## 2026-03-09: Portfolio import modal UI hardening (SW v44)

- **components/PortfolioView.js** — Converted the portfolio import dialog to the shared modal structure (`mp-modal-overlay`, `mp-modal`, `mp-modal-close`) so it renders through the same overlay/card pattern already used by the stable listing modal. Added a mount cleanup effect that locks `body` and `html` scrolling while the modal is open, then restores the previous overflow values on close.
- **style.css** — Simplified the import modal CSS into a shared-modal override layer instead of a separate full overlay system. Kept the import modal at `z-index: 10000`, added safe-area padding, iOS-friendly scrolling (`-webkit-overflow-scrolling: touch`), a `100dvh`-aware max-height, and a mobile top-aligned layout to reduce Safari/iPad fixed-overlay rendering issues.
- **Local QA** — Verified the signed-out import modal now renders as a centered overlay card on desktop and a correctly padded top-aligned modal on mobile, rather than appearing inline or under the sticky header.
- SW bumped to v44.

---

## 2026-03-09: Portfolio import auth gate fix (SW v43)

- **app.js** — `PortfolioView` now receives the same `authUser` object used by the Header and SellerDashboard. This removes the auth-state mismatch where the portfolio route only saw global portfolio data but not the live signed-in user.
- **components/PortfolioView.js** — Import modal auth gating now keys off `props.user` instead of `state.user`. Root cause: `state.user` was never populated in the global state object, so the import flow always evaluated as signed out even when OAuth had succeeded and the Header showed an authenticated session.
- **Result** — Signed-in users can open the portfolio import flow without being incorrectly blocked by the "Sign in to import cards to your portfolio." message.
- SW bumped to v43.

---

## 2026-03-09: Portfolio header layout fix (SW v42)

- **style.css** — Removed `flex-direction: column` responsive override on `.portfolio-header-row` at `@media (max-width: 767px)`. The heading + Import button now stay inline at all viewport widths. The previous rule caused the Import button to stack below "My Portfolio" on narrower browser windows (e.g., when a sidebar was open).
- SW bumped to v42.

---

## 2026-03-09: Import system + storage optimization (SW v41)

- **utils/import-parser.js** (NEW) — Shared parser module extracted from SellerDashboard.js inline parsers. Exports `parseManaboxCSV()`, `parseTextList()`, `parseCSVLine()`, `findCol()`. CSV parser supports Manabox, DragonShield, Deckbox, and TCGplayer column aliases. Text parser handles MTGA format ("4 Lightning Bolt (LEA) 123"), simple card names, and quantity-prefixed lines ("4x Sol Ring"). Both return standardized `{ cards, errors }` shape.
- **utils/api.js** — Added `createListingsBatch(listings)` (POST /api/listings/batch) and `addToPortfolioBatch(items)` (POST /api/portfolio/batch) for bulk import operations.
- **worker/worker.js** — Added `handleListingsBatch()`: auth required, accepts up to 500 listings, chunks into groups of 50 for D1 `batch()` atomic inserts, always sets `image_uri = ''` (storage optimization). Added `handlePortfolioBatch()`: auth required, accepts up to 500 items, uses INSERT OR REPLACE for idempotent imports. Modified existing POST /api/listings to always set `image_uri = ''`. Updated `handleHealth()` to v3.1.0 with storage row counts (listings, prices, portfolios). Updated `scheduled()` cron to purge price cache entries older than 30 days (`DELETE FROM prices WHERE updated_at < ?`). Added batch routes in fetch router before startsWith checks.
- **components/SellerDashboard.js** — Removed inline `parseManaboxCSV`, `findCol`, `parseCSVLine` functions (~135 lines). Now imports from `import-parser.js`. Added CSV/Text tab switcher to BulkImportForm. Text tab supports MTGA format paste. Replaced sequential `createListing()` loop (200ms delay per card) with single `createListingsBatch()` call. Added 500-item cap warning.
- **components/PortfolioView.js** — Added `PortfolioImportModal` component with CSV and Text tab support, file upload, parse preview, 500-item cap, and batch submit via `addToPortfolioBatch()`. Added Import button to portfolio header (both empty and populated states). Auth guard on import modal.
- **style.css** — Added `.import-tabs`, `.import-tab`, `.import-tab--active`, `.portfolio-header-row`, `.portfolio-import-btn`, `.import-modal-overlay`, `.import-modal`, `.import-modal-header`, `.import-modal-close`, `.import-modal-body` styles with responsive mobile overrides.
- **Storage optimizations** — `image_uri` always empty on new listings (~80 bytes/row saved), prices cache auto-purged after 30 days via cron, batch imports capped at 500 items, health endpoint monitors row counts for listings/prices/portfolios.
- SW bumped to v41.

---

## 2026-03-09: Cloudflare security hardening — rate limiting, orange-cloud, security headers, JSON-LD (SW v40)

- **Cloudflare Rate Limiting** — Added WAF rate limiting rule via `http_ratelimit` phase: 20 requests per 10 seconds per IP on `/api/*` endpoints. Block action with 10-second mitigation timeout. Uses `cf.colo.id` + `ip.src` characteristics (free tier compatible). Complements the in-memory rate limiter on the Worker.
- **Cloudflare Orange-Cloud** — Flipped `www.investmtg.com` CNAME from DNS-only (gray cloud) to proxied (orange cloud). All www traffic now routes through Cloudflare's CDN, enabling edge caching, DDoS protection, and HTTP response header injection. SSL `full_strict` mode (set in v39) prevents redirect loops.
- **Cloudflare Transform Rules** — Added HTTP response header transform rule injecting 6 security headers on all proxied responses: `Strict-Transport-Security` (HSTS with preload), `X-Frame-Options` (SAMEORIGIN), `X-Content-Type-Options` (nosniff), `Referrer-Policy` (strict-origin-when-cross-origin), `Permissions-Policy` (camera/mic/geo denied), `X-XSS-Protection` (1; mode=block).
- **index.html** — Added `LocalBusiness` JSON-LD structured data block for Guam local search visibility: schema includes area served (Guam), address region (GU/US), geo coordinates (13.4443, 144.7937), price range, and payment info. Complements existing `WebApplication` schema.
- SW bumped to v40.

---

## 2026-03-09: Audit hardening — security, infrastructure, schema sync (SW v39)

- **Cloudflare** — Upgraded SSL mode from `full` to `full_strict` (validates GitHub Pages origin cert, prevents MITM). Enabled `always_online` (serves cached pages during origin outages). Both via Cloudflare API.
- **worker/worker.js** — Added HTTP security headers to all API responses via `corsHeaders()`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Added `scheduled()` handler for Cron Trigger that purges expired rows from `auth_sessions` daily.
- **worker/wrangler.toml** — Added `[triggers]` section with daily cron (`0 3 * * *` UTC) for auth session cleanup.
- **worker/schema.sql** — Synced with production D1 schema. Added `users` and `auth_sessions` table definitions (were missing). Added `user_id` column to `portfolios`, `listings`, `sellers`, and `cart_items` tables. Fixed `orders` table to match production (`user_email` instead of `user_id`, added `payment_status`, `checkout_id`, `sumup_txn_id` columns). Fixed `order_counters` default from 1 to 0.
- **robots.txt** — Added robots.txt allowing all crawlers with sitemap reference.
- SW bumped to v39.

---

## 2026-03-09: Fix portfolio data persistence (SW v38)

- **CardDetailView.js** — The "Track" button now syncs to the D1 backend via `addToPortfolioAPI()` (fire-and-forget) in addition to updating localStorage. Previously, tracked cards were only stored in localStorage and never written to D1, meaning a page refresh could wipe the portfolio when the backend returned an empty result set.
- **app.js** — Portfolio initialization now merges backend (D1) and localStorage data instead of replacing one with the other. On load: fetches D1 portfolio, identifies any localStorage-only items ("orphans"), pushes orphans to D1 via fire-and-forget `addToPortfolioAPI()` calls, and returns the merged set. This migrates existing users' localStorage portfolios to D1 automatically. Import updated to include `addToPortfolioAPI`.
- **Root cause:** `CardDetailView.addToPortfolio()` only called `updatePortfolio()` (localStorage write) but never `addToPortfolioAPI()` (D1 write). On refresh, `fetchPortfolio()` returned empty from D1, which overwrote localStorage with `[]`, erasing all tracked cards.
- SW bumped to v38.

---

## 2026-03-09: Fix selling cards not in stock (SW v37)

- **CardDetailView.js** — Removed direct "Add to Cart" button that allowed any Scryfall card to be purchased without seller inventory. Replaced with "Find Sellers" button that navigates to the Guam Marketplace (#store). Cards can now only be purchased through community listings that have a real seller, condition, and price. Portfolio tracking and watchlist features remain unchanged.
- **BuyLocalModal.js** — Restructured the Buy Local flow to require selecting a community listing before adding to cart. Previously added items using Scryfall reference price with no seller field. Now: (1) if no listings exist for the card, shows "No sellers" empty state with CTA to list the card; (2) if listings exist, user must select a specific listing (seller + condition + price) AND a pickup store before confirming. Cart items now include `seller`, `condition`, and listing price instead of Scryfall reference price.
- **worker/worker.js** — Added server-side guard on `POST /api/orders`: rejects orders containing items without a `seller` field. Returns 400 with descriptive error naming the invalid items. This is a defense-in-depth measure — the frontend now prevents adding seller-less items, but the backend validates independently.
- SW bumped to v37.

---

## 2026-03-09: Fix SumUp checkout + guest orders (SW v36)

- **worker/worker.js** — Fixed critical SumUp checkout validation error. Root cause: merchant code was `M55T01IN` (letter I) but the actual SumUp merchant code is `M55T011N` (digit 1). Also fixed D1 schema mismatch: all order SQL queries referenced `user_id` column but D1 `orders` table uses `user_email`. Fixed all order handlers (GET list, GET /:id, POST create, payment-status) to use `user_email`. Enabled guest checkout: removed hard auth requirement from `/api/orders` POST and `/api/sumup/checkout`. Guest orders use `contact_email` as `user_email`. Improved SumUp error handling to parse both array and object error formats from SumUp API. Removed deprecated `pay_to_email` field from checkout body (using `merchant_code` only per SumUp recommendation). Amount is now rounded to 2 decimal places before sending to SumUp.
- SW bumped to v36.

---

## 2026-03-09: Restore cart to pre-v30 structure (SW v35)

- **CartView.js** — Reverted to the v29 cart layout structure which displays all condition options as card-style rows in a vertical list. The v30 redesign introduced a grid/step-wizard layout that broke the cart visually. Restored: `.cart-item` → `.cart-item-top` → `.cart-condition-section` → `.cart-condition-chips` → `.cart-cond-card` hierarchy. Retained v32 enhancements: trust badges (`.cart-trust-badges`, `.cart-trust-row`), savings badges (`.cond-card-save`), and package count (`.cart-packages-info`).
- **style.css** — Replaced v30 cart CSS block (~587 lines) with restored v29 cart styles (~559 lines). Restored class names: `.cart-page`, `.cart-page-header`, `.cart-grid`, `.cart-items`, `.cart-seller-group`, `.cart-item`, `.cart-item-top`, `.cart-condition-section`, `.cart-condition-chips`, `.cart-cond-card`, `.order-summary`. Fixed teal accent references to use `var(--color-primary)` instead of `var(--color-accent, #2dd4bf)`. Kept v32 additions: trust badges, savings badge, packages info, SumUp dark theme CSS.
- SW bumped to v35.

---

## 2026-03-09: Fix listing modal condition pricing (SW v34)

- **utils/api.js** — `fetchConditionPrices()` now accepts `{ tcgplayerId, scryfallId }` object and prefers `tcgplayerId` (the native JustTCG key) over `scryfallId`. This was the root cause: JustTCG’s API resolves cards by TCGplayer ID, not Scryfall UUID, so condition-specific prices were never returned.
- **ListingModal.js** — Now extracts `tcgplayer_id` from the card object and passes it to `fetchConditionPrices`. Condition dropdown now correctly updates the price field with real-time JustTCG market prices per condition (NM/LP/MP/HP/DMG).
- SW bumped to v34.

---

## 2026-03-09: D1 schema migration + order payment status (SW v33)

- **worker/worker.js** — Added `payment_status`, `checkout_id`, `sumup_txn_id` columns to orders table (CREATE TABLE + ALTER TABLE migration for existing tables). Checkout creation now stores `checkout_id` on the order and sets `payment_status: 'pending'`. New route: `GET /api/orders/:id/payment-status` polls SumUp API for real-time checkout status, maps PAID/FAILED/PENDING/EXPIRED to internal statuses, and updates D1 on change. Webhook handler now writes to the migrated columns.
- **OrderConfirmation.js** — Added real-time payment status polling (5s intervals for up to 5 minutes) on SumUp orders. Status-aware banner: shows "Payment Confirmed" (green), "Processing Payment" (amber), or "Payment Failed" (red) based on live status. Dynamic status badge with color-coded variants. "Total Due" label changes to "Total Paid" on confirmation.
- **style.css** — Added `.order-status--reserved`, `.order-status--pending`, `.order-status--paid`, `.order-status--failed`, `.order-status--expired`, `.order-status--fulfilled` badge variants. Added `.order-success-banner--pending` and `.order-success-banner--failed` banner color variants.
- **worker/schema.sql** — Added `orders` and `order_counters` table definitions (previously inline-only in worker.js).
- SW bumped to v33.

---

## 2026-03-09: Cart enhancements + SumUp upgrades (SW v32)

- **CartView.js** — Added price savings display on condition buttons ("Save $X.XX" badge comparing to Near Mint price). Added trust & security badges in cart summary sidebar (secure checkout, buyer protection, accepted cards). Added package count indicator showing number of seller packages. New inline SVG icons: LockIcon, ShieldIcon, CardPayIcon.
- **CheckoutView.js** — Enhanced SumUp Card Widget mount config: added `showEmail: true` with pre-filled customer email, `currency: 'USD'`, and `amount` display on pay button.
- **style.css** — Added `.cart-summary__trust`, `.cart-summary__trust-row`, `.cart-summary__packages` for trust badges and package count. Added `.cond-option__save` savings badge (green pill). Added SumUp dark theme CSS overrides targeting `[data-sumup-id]` attributes for widget container, inputs, and submit button.
- **worker/worker.js** — Added `return_url` (webhook) and `redirect_url` (3DS redirect) to SumUp checkout creation. Added `hosted_checkout_url` passthrough in response. New `/api/sumup-webhook` route: handles `CHECKOUT_STATUS_CHANGED` events, validates by polling SumUp API, updates D1 order status.
- SW bumped to v32.

---

## 2026-03-09: Service worker cache fix (SW v31)

- **sw.js** — Changed CSS/manifest/font caching strategy from cache-first to network-first. Root cause of persistent stale-CSS bug: the old cache-first strategy served the old cached style.css even after a new SW version activated, because the page had already loaded before the SW update cycle completed. Network-first ensures fresh CSS is always fetched on page load, falling back to cache only when offline. JS files were already network-first (line 64-72).
- **Cloudflare** — Purged entire zone cache to clear stale CDN-cached CSS.
- SW bumped to v31.

---

## 2026-03-09: Cart page complete redesign (SW v30)

- **CartView.js** — Complete rewrite from scratch. Extracted `CartItem` as a separate internal component with cleaner DOM structure. Extracted `ConditionOption` (replaces `ConditionChip`). New BEM-style class naming: `.cart-card`, `.cart-card__row`, `.cart-card__cond`, `.cond-option`, `.cart-summary`, `.cart-group`, `.cart-layout`. Condition selector now uses horizontal flex-wrap grid on desktop (all conditions visible in a row), vertical stack on mobile. All handler logic (qty update, remove, condition select) centralized and passed as props to CartItem.
- **style.css** — Removed ~560 lines of fragmented cart CSS scattered across 4+ locations in the file (lines 1376-1719, 2862-2999, 4693-4770, plus stale keyframes and dead selectors). Replaced with a single consolidated 400-line block using the site’s design tokens consistently: `--color-surface`, `--color-border`, `--color-primary`, `--color-error`, `--radius-lg/md`, `--space-*`, `--font-display/body`. Eliminated all teal `--color-accent` fallbacks (now uses gold `--color-primary` for links). Removed dead CSS: `.cond-chip-abbr`, `.cond-chip-price`, `@keyframes condChipPulse`, empty `@media (hover:none)` block, duplicate `@keyframes condPromptPulse`.
- **style.css** — Shared `.qty-btn`, `.qty-value`, and `.cart-item-controls` kept as generic utility classes (also used by PortfolioView).
- **style.css** — Cart layout breakpoint raised from 767px to 899px for better tablet experience. Condition grid uses `flex-wrap` for horizontal layout on wider screens.
- SW bumped to v30.

---

## 2026-03-09: Cart condition selector CSS fix (SW v29)

- **style.css** — Fixed cart item layout bug where condition selector rendered as jumbled plaintext instead of interactive cards. Root cause: duplicate `.cart-item` rules at lines 1399 and 7119 conflicted — the early rule set `display: flex` with implicit `flex-direction: row` and `align-items: center`, causing `.cart-item-top` and `.cart-condition-section` to render side-by-side instead of stacking vertically. Consolidated into a single `.cart-item` block with `flex-direction: column`, `gap: 0`, `padding: 0`, and `overflow: hidden`. Removed the stale v17 duplicate block from line 7119.
- **style.css** — Added `width: 100%`, `font-family: var(--font-body)`, and `text-align: left` to `.cart-cond-card` to ensure condition card buttons render with proper styling after the `button { background: none; border: none }` reset in base.css.
- **style.css** — Added `.cart-seller-group .cart-item.cart-item--needs-condition` selector to ensure the red error border renders correctly for items inside seller groups (where `.cart-seller-group .cart-item` strips borders).
- SW bumped to v29.

---

## 2026-03-09: Cart condition selector redesign + CSS optimization + Cloudflare cleanup (SW v28)

- **CartView.js** — Redesigned `ConditionChip` component from small pill buttons to full-width card-style selectors. Each condition now shows a colored status dot, abbreviation (NM/LP/MP/HP/DMG), full condition name (e.g. "Near Mint"), and price. Removed `.slice(0, 5)` limit so all available conditions from JustTCG are displayed. Removed inline hover/press state management (moved to CSS).
- **style.css** — Full CSS overhaul:
  - **Formatting**: Reformatted from 306-line semi-minified blob to ~7,500 lines of readable CSS. One property per line, 2-space indentation, proper whitespace between blocks. Git diffs are now human-readable.
  - **Color variables**: Replaced 29 hardcoded `#D4A843` with `var(--color-primary)`, 16 `rgba(212,168,67,...)` with `oklch(from var(--color-primary) l c h / ...)`, plus `#C09838` → `var(--color-primary-active)` and `#E8B84A` → `var(--color-primary-hover)`. Only theme definitions and gradient text stops retain literal hex.
  - **Dead CSS removed**: `.form-select`, `.form-textarea`, `.price-chart-*` (all unused since v20), old `.cart-cond-chip` pill classes.
  - **Cart condition cards**: New `.cart-cond-card` card layout with `.cond-card-dot`, `.cond-card-label`, `.cond-card-abbr`, `.cond-card-full`, `.cond-card-price`. Vertical stack (`flex-direction: column`). Responsive mobile hides full condition names.
- **JS error handling** — Replaced 4 silent `catch(function() {})` blocks with `console.warn` logging in CardDetailView, CartView, SearchView, and Ticker. Errors now surface in dev tools without crashing.
- **Cloudflare DNS cleanup** — Deleted suspicious `investmtg.investmtg.com` CNAME pointing to non-resolving `minimax.1o` domain. Removed duplicate `_dmarc` TXT record (`p=none`), keeping only `p=reject`. Upgraded minimum TLS version from 1.0 to 1.2.
- SW bumped to v28.

---

## 2026-03-09: Homepage carousel card sections + app shell (SW v27)

- **CardCarousel.js (new)** — Horizontal scrolling carousel component for homepage card sections. CSS scroll-snap, touch-friendly swiping, left/right arrow navigation on desktop (hidden on mobile), edge fade hints, responsive card widths (170px mobile / 200px default / 220px large screens).
- **HomeView.js** — Replaced `CardGrid` with `CardCarousel` for Featured, Trending, and Budget sections. Removed `.slice(0, 3)` limit so all cards from the worker are displayed. Added section headers with subtitles (e.g. "High-value Reserved List and Legacy staples"). Uses new `.card-section` / `.card-section-header` classes.
- **Worker card lists expanded** — Featured: 12 cards (added Tundra, Badlands, Plateau, Scrubland, Gaea's Cradle, Tabernacle). Trending: 12 cards (added Jewel Lotus, Dockside Extortionist, Fierce Guardianship, Smothering Tithe, Cyclonic Rift, Atraxa). Budget: 12 cards (added Beast Within, Chaos Warp, Farseek, Command Tower). KV cache cleared for new lists.
- **style.css** — Added `.card-section-*`, `.carousel-wrap`, `.carousel-track`, `.carousel-card-*`, `.carousel-arrow-*` CSS. Responsive breakpoints for mobile/desktop.
- **index.html** — Replaced bare "Loading..." text with a full app shell: skeleton header with investMTG logo, hero section with tagline and search bar placeholder, carousel skeleton cards with shimmer animation. Improves First Contentful Paint and perceived load time.
- SW bumped to v27.

---

## 2026-03-09: Terms of Service update + acceptance gate + Privacy Policy fix (SW v26)

- **TermsView.js updated** — Now reflects Google OAuth accounts (Section 3: User Accounts), 5 card conditions (NM/LP/MP/HP/DMG) in Section 4, JustTCG condition pricing in Section 5, and links to Privacy Policy and Pricing & Data Sources pages. Renumbered to 14 sections.
- **PrivacyPolicyView.js rewritten** — Fixed critical inaccuracy: previously stated "no backend server" when the site now has a Cloudflare Worker with D1 database, Google OAuth, and server-side user accounts. Now covers: Google OAuth data collection, D1 database storage, server-side account data, authentication tokens, data retention policy, and account deletion rights.
- **TermsGate.js (new)** — First-visit Terms of Service acceptance modal. Versioned (`2026-03-09`) so it re-triggers on future ToS updates. Stores acceptance in localStorage via `storageSetRaw()`.
- **TermsCheckbox (new export)** — Reusable ToS agreement checkbox component, used in both seller registration and checkout.
- **SellerDashboard.js** — Added required ToS checkbox to seller registration form. Registration is blocked until checkbox is checked.
- **CheckoutView.js** — Added required ToS checkbox to checkout step 3 (Contact Information). Checkout cannot proceed to payment until checkbox is checked.
- **style.css** — Added `.tos-gate-*` overlay/modal styles and `.tos-checkbox-*` form checkbox styles.
- SW bumped to v26.

---

## 2026-03-09: 5th card condition — Damaged (DMG) (SW v25)

- Added **Damaged (DMG)** as the 5th supported card condition across the entire platform.
- **ListingModal**: Condition dropdown now includes Damaged (DMG) with real-time JustTCG pricing.
- **SellerDashboard**: CONDITIONS array updated, condition label map includes DMG, step-based wizard shows Damaged option.
- **CSV/Manabox bulk import**: Now recognizes "DMG" and "DAMAGED" in the condition column (previously mapped Damaged to HP).
- **api.js `fetchConditionPrices()`**: JustTCG query now includes DMG; response mapping handles the "Damaged" condition name.
- **CartView**: Already supported DMG (ConditionChip color, sort order, abbreviation mapping) — no changes needed.
- **PricingView**: Updated conditions list to include Damaged (DMG).
- **CSS**: Added `.cond-dmg` badge style (red, `#ef4444`).
- SW bumped to v25.

---

## 2026-03-09: Site-wide pricing transparency (SW v24)

- **New page: Pricing & Data Sources** (`#pricing`) — A full methodology page explaining every data source, update frequency, data flow, and limitation. Covers Scryfall (card data & reference prices), JustTCG (condition-specific pricing), TCGplayer (underlying market data), tournament/meta sources (EDH Top 16, TopDeck.gg, Moxfield), and the Cloudflare Worker pipeline. Includes a "What We Don’t Do" section linked to SOUL.md’s Data Integrity Policy.
- **Footer: "Pricing & Sources" link** — Added to the site-wide footer so every page links to `#pricing`.
- **CardDetailView: inline attribution** — The "Prices via Scryfall" line now includes a "How we source prices" link to `#pricing`.
- **MarketMoversView: inline attribution** — The "Market data from Scryfall" line now includes a "How we source prices" link to `#pricing`.
- **ListingModal** — Already had a pricing transparency disclosure section (v23). No changes needed.
- **SOUL.md: new Rule 4** — "Pricing transparency is non-negotiable" — codifies that every price must be traceable to a named source, inline attribution is required, and suggested prices are never binding. Rules renumbered 4–9.
- SW bumped to v24.

---

## 2026-03-09: Pricing transparency disclosure in ListingModal (SW v23)

- Added a **Pricing Transparency** section to the listing form, visible whenever card data is present.
- When JustTCG prices are available, the disclosure reads: "Suggested prices are real-time TCGplayer market values sourced from JustTCG, which aggregates seller data from TCGplayer. Prices reflect the lowest available listing for each condition and are updated every 6 hours. Card details provided by Scryfall."
- When JustTCG is unavailable (fallback), the disclosure attributes data to Scryfall and notes that condition-specific pricing is unavailable.
- All three data sources (JustTCG, TCGplayer, Scryfall) are linked so users can verify independently.
- Includes an italicized disclaimer: "Prices are estimates and may not reflect actual sale prices. You are free to set any asking price."
- Placed above the submit button, separated by a subtle border, using `--text-xs` and muted text color.
- SW bumped to v23.

---

## 2026-03-09: JustTCG real-time condition pricing in ListingModal (SW v22)

- **Condition-based pricing**: When the seller changes the Condition dropdown (NM/LP/MP/HP), the Price field auto-updates with the real-time market price for that condition from JustTCG API.
- All 4 condition prices are fetched in a single API call when the modal opens (via `fetchConditionPrices()` in `api.js`). No additional calls on each condition change — instant switching.
- Price field remains fully editable. If the seller types a custom price, auto-population stops. A "Reset to market price" link appears to restore the JustTCG price.
- Market reference line shows the current condition’s real market price and, for non-NM conditions, also shows the NM reference.
- Falls back to Scryfall NM price if JustTCG API is unavailable.
- API call routed through existing `/justtcg` worker proxy — API key stays server-side (SOUL.md Rule 7).
- New export `fetchConditionPrices(scryfallId)` in `utils/api.js` returns `{ NM: price, LP: price, MP: price, HP: price }`.
- SW bumped to v22.

---

## 2026-03-09: Listing modal auto-populate — controlled state fix (SW v21)

- **Root cause fix**: Replaced unreliable `useRef` + imperative `useEffect` pattern with controlled `useState` for prefilled fields (card name, set name, price). The previous approach set `.value` on DOM nodes after render, which failed under lazy-loading and concurrent React rendering — React had no awareness of these imperative changes and could overwrite them.
- Controlled inputs use `value` + `onChange` props, so React owns the field state declaratively. Fields are guaranteed populated on first render regardless of component load timing.
- `useEffect` still syncs state if `prefillCard` changes while modal is open, but now calls `setState` (reliable) instead of setting `ref.current.value` (fragile).
- Removed `cardNameRef`, `setNameRef`, `priceRef` — only `formRef` remains (for reading non-prefilled fields on submit).
- **Features from initial implementation preserved**: card name (read-only), set name (read-only), market price prefill, card preview thumbnail, market reference hint, `card_id`/`set_name`/`image_uri` in submission payload.
- SW bumped to v21.

---

## 2026-03-09: Site Performance Optimizations — SW v20

### CSS Optimization (132KB → 120KB, −9%)

- Identified and removed 84 unused CSS class selectors via automated cross-reference against all JS/HTML files. Removed classes include abandoned payment-method-selector UI, unused condition-grid styles, dead local-stores-section, unused mana-pip colors, stale set-picker-wrapper, and duplicate `.cart-checkout-btn--disabled` rules.
- Kept all actively referenced classes intact — safety-checked each removal against the full codebase.

### Image Optimization (271KB → 232KB, −14%)

- Converted all local images from JPEG to WebP: hero-bg (34KB→29KB), event-tcgcon (109KB→97KB), event-commander (69KB→57KB), event-weekend (59KB→48KB).
- Updated CSS (`hero::after` background), HTML preload, and `events-config.js` fallback paths to use `.webp`.
- Updated D1 events table `image_key` column from `.jpg` to `.webp` for all 3 active events.
- Removed original `.jpg` files from `images/` directory.
- Kept `og-image.jpg` for social media crawler compatibility (some crawlers don't support WebP).

### Dead Code Removal (454KB removed)

- Deleted `components/PriceHistoryChart.js` (5.5KB) — defined but never imported anywhere in the codebase.
- Deleted `frontend-v2/` directory (448KB) — abandoned TypeScript/Vite rewrite, not deployed.

### Service Worker v20

- Bumped cache version from `investmtg-v19` to `investmtg-v20`.
- Added `hero-bg.webp` to precached static assets for instant hero render on repeat visits.
- Added stale-while-revalidate strategy for local images (`.webp`, `.jpg`, `.png`, `.svg`) — serves cached copy instantly while fetching fresh version in background.
- Added separate `investmtg-images-v1` cache for Scryfall card images with 100-entry limit, preventing static cache bloat.

### Resource Loading Optimization

- Restructured `<head>` resource order: font CSS preloaded as `<link rel="preload" as="style">` to start parallel download before render-blocking stylesheet loads.
- Removed redundant `base.css` preload (it's only 2KB and loads instantly as the first stylesheet).
- Added `type="image/webp"` to hero preload for correct content negotiation.

---

## 2026-03-09: Auth fix + URL centralization audit + SOUL rules — SW v19

### SOUL.md Rules 6–8 (new)

- **Rule 6: QA before every push** — Pre-push checklist: CSP alignment check, URL centralization check, auth flow smoke test, visual verification via screenshot, console error check. Each item includes the specific grep command to run and a "why this exists" reference to the real failure that motivated it.
- **Rule 7: Security posture** — Codified secrets policy (no keys in frontend, all through worker), CSP as security boundary, OAuth hardcoded redirect URI, `storage.js` as the only localStorage interface. Each rule traces to a real incident.
- **Rule 8: QC audit triggers** — Defines when a targeted codebase audit is mandatory: domain migrations, new integrations, auth changes, 3+ rapid releases, and user-reported failures. Specifies audit scope (CSP, URLs, auth trace, error handling, dead code, doc accuracy).
- **Release discipline updated** — Now references Rules 6–8 explicitly and orders QA/security before docs/deployment.

---

### Root Cause: CSP Blocking API Calls

- **Problem** — After moving the backend from `investmtg-proxy.bloodshutdawn.workers.dev` to `api.investmtg.com`, the Content-Security-Policy `connect-src` directive in `index.html` was never updated. The browser silently blocked all `fetch()` requests to `https://api.investmtg.com`, including the critical `authFetch('/auth/me')` call that validates the auth token. This caused `checkAuth()` to fail silently (the `.catch()` handler set `_user = null`), leaving the user perpetually signed out despite having a valid token in localStorage.
- **Fix** — Updated `connect-src` in `index.html` to include `https://api.investmtg.com`. Removed the stale `investmtg-proxy.bloodshutdawn.workers.dev` entry since all API calls now go through the custom domain.

### Auth Race Condition Fix

- **Problem** — In `auth.js`, `captureTokenFromURL()` called `window.location.replace()` to strip the `?auth_token=` param, but `checkAuth()` continued executing after the call, starting an `authFetch('/auth/me')` request that would be aborted by the page navigation. This was a secondary issue (the page reload would re-run `checkAuth()` cleanly), but the aborted fetch wasted a network request and could confuse debugging.
- **Fix** — `captureTokenFromURL()` now returns `'redirecting'` when it triggers a page reload. `checkAuth()` detects this and returns `new Promise(function() {})` (a never-resolving promise), which prevents any further execution during the page transition.

### URL Centralization (Audit Fix)

- **Problem** — Four API integration files (`justtcg-api.js`, `edhtop16-api.js`, `moxfield-api.js`, `topdeck-api.js`) had the old `investmtg-proxy.bloodshutdawn.workers.dev` URL hardcoded instead of importing from `config.js`. These were silently broken by the CSP cleanup that removed the old workers.dev URL from `connect-src`.
- **Fix** — All four files now import `PROXY_BASE` from `config.js`. No frontend JS file has a hardcoded backend URL anymore — a single change to `config.js` updates everything.

### Debug Artifact Cleanup

- **Removed** `auth-test.html` diagnostic page (was used to isolate the auth bug).
- **Removed** `/auth/debug` endpoint from `worker.js` (temporary admin-only endpoint for checking OAuth config).
- **Removed** debug `console.log` statements from `authFetch()` in `auth.js`.

---

## 2026-03-09: Custom domain & OAuth branding fix — SW v18

### Custom API Domain

- **Worker custom domain** — Added `api.investmtg.com` as a Cloudflare custom domain route for the `investmtg-proxy` worker. The worker is now accessible at both `https://api.investmtg.com` and the legacy `https://investmtg-proxy.bloodshutdawn.workers.dev` URL.
- **wrangler.toml** — Added `routes` with `custom_domain = true` for `api.investmtg.com`; added `workers_dev = true` to keep legacy URL active during transition.
- **PROXY_BASE updated** — `utils/config.js` now points to `https://api.investmtg.com` instead of the `.workers.dev` URL.

### OAuth Consent Screen Branding

- **Problem** — Google OAuth consent screen displayed "You're signing back in to bloodshutdawn.workers.dev" because the `redirect_uri` was built from `url.origin` (the worker's `.workers.dev` URL).
- **Fix** — Replaced dynamic `${url.origin}/auth/callback` with a hardcoded constant `OAUTH_REDIRECT_URI = 'https://api.investmtg.com/auth/callback'` used in both `handleGoogleAuth()` and `handleAuthCallback()`. Google consent screen will now show `investmtg.com`.
- **ALLOWED_ORIGINS** — Added `https://api.investmtg.com` to the worker's allowed origins list.
- **Google Cloud Console** — User must update OAuth credentials: add `https://api.investmtg.com/auth/callback` as an authorized redirect URI, add `api.investmtg.com` as an authorized JavaScript origin, and add `investmtg.com` as an authorized domain.

---

## 2026-03-08: Cart condition selector UX overhaul — SW v17

### Condition Selector Redesign

- **CartView.js** — Restructured cart item layout into two-tier design: top row (image + info + qty + price + remove) and full-width condition selector section below.
- **Condition prompt** — Items without a selected condition now show a prominent animated warning: "Select a condition to continue" with a warning icon. Once selected, shows "Condition: NM" (or whichever was chosen).
- **Visual alert on items** — Items missing a condition get a red border + shadow (`.cart-item--needs-condition`) to draw attention.
- **Checkout gate** — "Proceed to Checkout" button is visually disabled and shows a count-based message ("Select conditions for N items before checkout") when any item with available condition pricing hasn't been selected. Clicking the disabled button scrolls to the first un-selected item.
- **style.css** — New `.cart-condition-section`, `.cart-condition-prompt`, `.cart-checkout-blocked`, `.cart-checkout-btn--disabled` CSS classes. Pulsing animation on the condition prompt. Mobile-responsive chip sizing.

---

## 2026-03-08: GRT removal, SumUp payment restoration, admin bypass — SW v16

### GRT Removed Site-Wide

- **Removed `GUAM_GRT_RATE` from `utils/config.js`** — The 4% Guam Gross Receipts Tax line item has been completely removed from the site per owner’s request.
- **CartView.js** — No longer imports `GUAM_GRT_RATE`, no longer calculates or displays tax. Order summary shows subtotal only.
- **CheckoutView.js** — All 4 checkout steps cleaned of GRT. Tax variable removed from order total calculation. Server order body no longer sends tax.
- **OrderConfirmation.js** — Removed "Guam GRT (4%)" line from order totals display.
- **TermsView.js** — Section 4 (Pricing and Tax) reworded: sellers are responsible for their own tax obligations; investMTG does not collect or remit taxes.

### SumUp Payment Processor Restored

- **Previous session incorrectly stripped SumUp code** — The v15 audit classified the SumUp integration as "dead code" and removed it from CheckoutView.js. In reality, the SumUp public key, Apple Pay verification, and merchant account (M55T01IN) were all active. The only missing piece was the secret key for server-side checkout creation.
- **Worker: `POST /api/sumup/checkout`** — New endpoint creates a SumUp checkout via their API (`api.sumup.com/v0.1/checkouts`). Requires `SUMUP_SECRET_KEY` wrangler secret. Returns `checkout_id` for frontend widget mounting.
- **CheckoutView.js rewritten** — Step 4 (Payment) now offers two payment methods:
  1. **Pay Online** — SumUp Card Widget (credit/debit card via PCI-compliant iframe). SDK lazy-loaded from `gateway.sumup.com/gateway/ecom/card/v2/sdk.js`. Flow: create order → create SumUp checkout → mount widget → handle payment response.
  2. **Reserve & Pay at Pickup** — Original reserve flow preserved for cash/in-person payment.
- **Order status logic** — SumUp orders start with status `pending_payment`; reserve orders start with `reserved`.
- **`SUMUP_SECRET_KEY`** stored as wrangler encrypted secret.

### Admin Bypass Layer

- **Worker: `ADMIN_TOKEN` secret** — New wrangler secret that allows bypassing Google OAuth for testing auth-gated endpoints. Send `Authorization: Bearer <ADMIN_TOKEN>` to any endpoint that requires auth.
- **`getAuthUser()` updated** — Checks for admin token before falling through to normal cookie/Bearer token auth. Returns a synthetic admin user object.
- **Admin token**: `163c70bd-4ef4-45df-bfc6-36cc4823cce0` (stored as wrangler secret, not in code).

### Worker Secrets Added
- `SUMUP_SECRET_KEY` — SumUp API secret key for checkout creation
- `ADMIN_TOKEN` — Admin bypass token for testing

### Infrastructure
- Service Worker bumped to v16.
- Worker redeployed with new SumUp + admin bypass routes.
- Added CSS for payment method selector and SumUp card widget container.

### Files Modified
- `utils/config.js` — removed `GUAM_GRT_RATE`
- `components/CartView.js` — removed GRT import and tax calc
- `components/CheckoutView.js` — full rewrite with SumUp Card Widget + payment method selector
- `components/OrderConfirmation.js` — removed GRT line
- `components/TermsView.js` — updated tax section
- `worker/worker.js` — admin bypass, SumUp checkout endpoint, order status logic
- `style.css` — SumUp checkout CSS
- `sw.js` — v16

---

## 2026-03-08: Order workflow overhaul — reserve system, order persistence, My Orders page — SW v15

### Critical Bug Fixes

- **Reserve flow now requires confirmation** — Previously, clicking "Reserve" instantly completed the order with no confirmation screen and no payment/contact step. Now the checkout is a 4-step wizard (Review → Fulfillment → Contact → Payment) with a modal confirmation before the order is placed.
- **Orders persisted to D1 database** — Orders are now POSTed to `/api/orders` on the Worker and stored in the `orders` D1 table. Falls back to localStorage with a `GUM-LOCAL-*` prefix if the API call fails.
- **Sequential server-generated order IDs** — Format `GUM-YYYYMM-XXXXX` using an `order_counters` D1 table with atomic upserts. No more client-only random IDs.
- **Order Confirmation page fixed** — Loads order data server-first via `backendFetch('/api/orders/:id')`, then falls back to localStorage. Fixed destructuring bug that crashed the page.
- **Removed dead SumUp SDK code** — Stripped all card/wallet payment references from CheckoutView since SumUp was never integrated. Only "Reserve & Pay at Pickup" remains.

### New Features

- **My Orders page (`#orders`)** — New `OrdersView.js` component accessible from the user dropdown menu. Lists all orders sorted newest-first with order ID, date, item count, fulfillment method, total, and status badge. Each card links to `#order/<id>` for full details.
- **Checkout confirmation modal** — Before completing a reservation, a modal overlay summarizes the order total and explains the reserve-and-pay-at-pickup flow. User must explicitly confirm.
- **"View All Orders" link** on the Order Confirmation page links to the new My Orders page.

### Worker (v3 update)

- **`POST /api/orders`** — Creates a new order with auth token, stores in D1, returns server-generated `GUM-YYYYMM-XXXXX` ID.
- **`GET /api/orders`** — Lists all orders for the authenticated user, sorted by `created_at DESC`.
- **`GET /api/orders/:id`** — Returns a single order by ID (owner-only access).
- **D1 tables**: `orders` (16 columns) and `order_counters` (month_key + last_seq) with index on `user_email`.
- **`generateOrderId()`** — Atomic sequential ID generation using D1 upsert on `order_counters`.

### Infrastructure

- Service Worker bumped to v15.
- Added CSS for OrdersView, order status badges, checkout confirmation modal, and reserve info box.
- Header dropdown now includes "My Orders" link.

---

## 2026-03-08: Step-based listing wizard, auto-confirm card search, design overhaul — SW v14

### Redesign

- **Step-based listing form wizard** — Replaced the broken 2-column layout with a clean 3-step vertical wizard: (1) Find Your Card, (2) Choose Printing, (3) Listing Details. Each step reveals progressively as the user completes the previous one.
- **New `lf-*` CSS class system** — All listing form styles now use a dedicated `lf-` prefix (`lf-section`, `lf-step-header`, `lf-pgrid`, `lf-plist`, etc.) for clean separation from other components. Removed all old `listing-form-layout`, `listing-form-columns`, `printings-panel-*`, `printings-grid-*`, and `printings-list-*` classes.
- **Step indicators** — Numbered step badges (1, 2, 3) with green checkmark state when complete.
- **Selected card summary** — Step 3 shows a card image + set info banner so the seller always knows which printing they're listing.

### Features

- **Auto-confirm card name on blur/Enter** — Typing a card name and pressing Enter or tabbing away now automatically confirms the name and triggers the printings fetch, even without clicking an autocomplete suggestion. If autocomplete has an exact match, it picks that; otherwise uses the first suggestion or the typed text.
- **Printings grid/list toggle** — Carried forward from v13 but now using `lf-pgrid` / `lf-plist` class names inside the step-based layout.

### Infrastructure

- Service Worker bumped to v14.
- Removed 67 lines of dead 2-column CSS.

---

## 2026-03-08: 2-column listing form, printings browser panel, listing creation bugfix — SW v13

### Bug Fixes

- **Backend: listing creation rejected trade listings** — `POST /api/listings` used `!body.price` validation which rejected `price=0` (valid for trade-only listings). Changed to `body.price == null` so only truly missing prices are rejected.
- **Frontend: better error messages on listing creation failure** — `handleAddListing` now surfaces HTTP status codes (401 → "Not authenticated", 400 → "Missing required fields") instead of a generic failure message.

### Features

- **2-column listing form layout** — Add Listing tab now uses a side-by-side layout: form fields on the left, printings browser panel on the right.
- **Printings browser panel** — After selecting a card name from autocomplete, all available printings appear in a scrollable panel on the right side. Each printing shows the card image, set name, set code, collector number, rarity, and market price. Clicking a printing selects it for the listing.
- **Grid/list view toggle** — The printings panel has a toggle between grid view (card images in a grid) and list view (compact rows). Grid view is the default.
- **Selected printing display** — The form's left column shows a summary of the currently selected printing with thumbnail and set details, replacing the old hidden dropdown.
- **New icons** — Added GridIcon and ListIcon to shared/Icons.js.

### Infrastructure

- Service Worker bumped to v13.
- Worker redeployed with price validation fix.

---

## 2026-03-08: Seller listing improvements — set autocomplete, bulk CSV import, CX polish — SW v12

### Features Added

**Set autocomplete on Add Listing form:**
- When a seller types a card name and selects it from the Scryfall autocomplete, the system now queries Scryfall's `cards/search?unique=prints` endpoint to fetch all available printings
- A rich dropdown displays all printings with card thumbnail, set name, set code, collector number, rarity, and USD price (regular + foil)
- Selecting a printing auto-fills the set name and auto-suggests the Scryfall price for the price field
- Falls back to a plain text input if no card is confirmed or printings fail to load
- Respects Scryfall rate limits (150ms debounce)

**CSV / Manabox bulk import tab:**
- New "Bulk Import" tab in the Seller Dashboard lets sellers upload or paste CSV data to create multiple listings at once
- Supports Manabox export format (columns: Name, Set Name, Set Code, Quantity, Foil, Condition, Purchase Price, Scryfall ID)
- Also supports generic CSV with flexible column name matching (e.g., "Card Name", "card_name", "cardname")
- Full CSV parser handles quoted fields, escaped quotes, and multi-line values
- Condition values auto-mapped from full names ("Near Mint" → NM, "Lightly Played" → LP, etc.)
- Preview table shows parsed cards before submission (max 20 rows displayed, with count of remaining)
- Bulk settings panel lets the seller set a default price, listing type (sale/trade), and contact info
- Sequential submission with progress bar and failure count
- 200ms delay between submissions to respect backend rate limits

**Customer service / UX improvements:**
- Card preview thumbnail shown in the listing form when a set is selected
- Listings in the "My Listings" grid now display card thumbnails (from image_uri)
- Empty state on the listings tab offers two CTAs: "Add Single Listing" and "Bulk Import from CSV"
- New icon components: UploadIcon, FileTextIcon, AlertCircleIcon, LayersIcon

### Files Modified
- `components/SellerDashboard.js` — complete rewrite of ListingForm (set autocomplete), new BulkImportForm component, new useScryfallPrintings hook, updated tab navigation
- `components/shared/Icons.js` — added UploadIcon, FileTextIcon, AlertCircleIcon, LayersIcon
- `style.css` — added CSS for set-picker dropdown, bulk import zone/preview/progress, listing card preview, seller listing thumbnails
- `sw.js` — bumped to v12

---

## 2026-03-08: Full-stack deployment audit + Moxfield CORS fix — SW v11

### Audit Scope
Comprehensive 9-point deployment audit covering: live site visual check (8 pages), all API endpoints, D1 database integrity, auth flow, service worker, security scan, and performance analysis.

### Issues Found & Fixed

**Decks page broken — Moxfield API CORS block:**
- `utils/moxfield-api.js` was calling `https://api2.moxfield.com/v2` directly from the browser. Moxfield returns no CORS headers, so all browser requests failed silently.
- Fixed by routing through the worker's `/?target=` proxy (same pattern as edhtop16-api.js and justtcg-api.js).
- Also added `User-Agent: investMTG/1.0 (Cloudflare Worker)` header to the generic proxy handler — Moxfield returns 429 "HACK THE PLANET!" without a valid UA.

**Seller role auto-promotion:**
- When a user registers as a seller, their `users.role` was not updated from 'buyer' to 'seller'. Added `UPDATE users SET role='seller'` after seller INSERT in the worker's POST /api/sellers handler.
- Manually promoted bloodshutdawn@gmail.com (user_id 2) to 'seller' role.

**Database cleanup:**
- Purged 5 duplicate auth sessions for user 1 (test artifacts), keeping only the most recent.

### Audit Results (All Pass)
1. Visual audit: 8/8 pages render correctly (Decks fixed)
2. API endpoints: all 14 routes responding (health, ticker, featured, trending, budget, search, movers, listings, stores, events, sellers, portfolio, cart, auth)
3. D1 database: 9 tables intact, schemas correct, data consistent
4. Auth flow: Google OAuth login/callback/me/logout all working
5. Service worker: v11 deployed, caching strategy correct
6. Security: no secrets in tracked files, .env gitignored, CORS restricted
7. Performance: ~108 KB CSS (16 KB gzipped), ~15 KB app.js (4 KB gzipped), all views lazy-loaded, React vendor ~48 KB gzipped

### Files Modified
- `utils/moxfield-api.js` — route through CORS proxy instead of direct Moxfield calls
- `worker/worker.js` — User-Agent on generic proxy + seller role auto-promotion
- `sw.js` — v11 cache bump

### Commits
- `4458aa2` — fix: route Moxfield API through worker CORS proxy

---

## 2026-03-08: Seller registration fix + ListingModal CSS — SW v10

### Issues Reported
1. **"Create Guam Listing" button did nothing** — clicking the button on card detail pages produced no visible result. The ListingModal component rendered into the DOM but was completely invisible because no CSS existed for its `mp-modal-overlay`, `mp-modal`, `mp-form-row`, etc. class names.
2. **Seller registration failed** — clicking "Create Seller Account" on the Sell page returned "Registration failed. Please try again." The root cause was a D1 database constraint violation: the `sellers` table has `session_token TEXT UNIQUE NOT NULL`, but the worker's POST /api/sellers handler was binding `null` for `session_token` when the user is authenticated via Google OAuth (auth-based flow doesn't use anonymous session tokens).

### Fixes Applied

**style.css — ListingModal CSS (entirely missing):**
- Added `.mp-modal-overlay` — fixed fullscreen overlay, z-index 10000, backdrop blur, opacity transition
- Added `.mp-modal-overlay.open` — visible state with pointer-events
- Added `.mp-modal` — centered card with max-width 520px, scroll overflow, slide-up animation
- Added `.mp-modal-header` — flex header with title + close button
- Added `.mp-modal-close` — icon button with hover state
- Added `.mp-listing-form` — form padding
- Added `.mp-form-row` — label + input styling with focus state
- Added `.mp-form-grid-2` — 2-column grid for condition/price and seller/contact
- Added `.mp-radio-group` / `.mp-radio-label` — radio button layout
- Added responsive breakpoint at 480px — single-column on mobile

**components/ListingModal.js — Coding rules compliance:**
- Replaced destructured props `{ isOpen, onClose, onSubmit, prefillCardName }` with `props.*` pattern

**worker/worker.js — Seller registration constraint fix:**
- Changed `session_token` binding from `null` to `'auth_' + auth.userId` — satisfies NOT NULL + UNIQUE constraints
- Added seller object fetch after INSERT — POST response now returns `{ success: true, seller: {...} }` so frontend can hydrate the dashboard immediately
- Worker redeployed via Cloudflare API

**sw.js — Bumped to v10:**
- Forces cache bust for style.css (CSS is cache-first in SW)
- Triggers auto-reload via postMessage to pick up new modal styles

### Files Modified
- `style.css` — ListingModal CSS classes
- `components/ListingModal.js` — props destructuring fix
- `worker/worker.js` — seller registration NOT NULL fix + seller response
- `sw.js` — v10 cache bump

### Commits
- `d39e6af` — fix: add ListingModal CSS + fix destructuring
- `6493d1a` — fix: seller registration NOT NULL constraint on session_token

---

## 2026-03-08: Card detail button hardening & SW auto-reload — SW v9

### Issue Reported
User reported all 4 card detail buttons (Add to Cart, Track, Watch, Create Guam Listing) not responding to clicks on the card detail page. Buttons rendered visually but click handlers did not fire. The issue could not be reproduced in clean browser sessions, strongly suggesting stale-cache / service worker transition as the root cause.

### Root Cause Analysis
The service worker upgrade from v7 → v8 could leave a window where the old SW serves stale cached JS while the new SW waits to activate. During this transition, old JS code that predates the storage.js migration may try to call APIs or access state in ways that silently fail. Additionally, button click handlers had no error trapping — if any handler threw (e.g., `state.cart` was unexpectedly not an array), the error was silently swallowed with no user feedback.

### Fixes Applied

**CardDetailView.js — Defensive button handlers with toast feedback:**
- All 4 button handlers (`addToCart`, `addToPortfolio`, `toggleWatchlist`, `onOpenListing`) now wrapped in try-catch
- Each handler validates its prop is a function before calling (`typeof updateCart !== 'function'`)
- Each handler uses `Array.isArray()` guard on state arrays before calling `.find()` / `.some()` / `.filter()`
- Success actions show toast feedback ("Added to cart", "Added to portfolio", etc.)
- Failures show user-facing error toast with "try refreshing" guidance
- All errors logged to console with `[investMTG]` prefix for debugging
- Added `showToast` import from `shared/Toast.js`

**CardDetailView.js — Diagnostic prop validation:**
- Added `useEffect` on mount that logs a console warning if any handler prop is not a function
- Logs the actual types received — helps diagnose if props are missing due to stale cached JS

**sw.js — Bumped to v9 with client notification:**
- Bumped `CACHE_NAME` to `investmtg-v9`
- On activate, after claiming clients, sends `postMessage({ type: 'SW_UPDATED' })` to all open tabs
- This triggers automatic page reload so users never run stale JS after an SW update

**app.js — SW update auto-reload listener:**
- Added `navigator.serviceWorker.addEventListener('message', ...)` that listens for `SW_UPDATED` messages
- Automatically reloads the page when a new SW version activates
- Eliminates the stale-cache window that caused the original bug

### Files Modified
- `components/CardDetailView.js` — try-catch handlers, toast feedback, prop diagnostics
- `sw.js` — v9, client postMessage on activate
- `app.js` — SW message listener for auto-reload

### Prevention
The SW auto-reload mechanism ensures that any future SW version bump will automatically refresh all open tabs, preventing stale-cache issues from ever reaching users again.

---

## 2026-03-08: Centralized safe localStorage wrapper (storage.js) — SW v8

### Root Cause
Corrupted localStorage values (the string `"undefined"` stored in `investmtg-cart`) caused `JSON.parse("undefined")` to throw, crashing the app before React could mount. The global error handler in `index.html` displayed the "investMTG failed to load" screen.

### Fix: Centralized Storage Wrapper
Created `utils/storage.js` — a safe localStorage abstraction that every file must use instead of raw `localStorage.getItem` / `JSON.parse` / `JSON.stringify` / `localStorage.setItem`.

The wrapper guards against:
- corrupted values (the strings `"undefined"`, `"null"`, empty strings, invalid JSON)
- localStorage being unavailable (private browsing, storage full)
- `JSON.stringify(undefined)` silently producing `undefined`
- any `JSON.parse` throw — catches and returns a fallback, then removes the corrupted key

Four exported functions:
- `storageGet(key, fallback)` — read + JSON.parse with safe fallback
- `storageSet(key, value)` — JSON.stringify + write; refuses to write undefined/null
- `storageGetRaw(key, fallback)` — read a plain string
- `storageSetRaw(key, value)` — write a plain string
- `storageRemove(key)` — remove a key

### Migration
Every file that previously used raw `localStorage` or inline `safeParseJSON` was migrated to import from `utils/storage.js`. Zero raw `localStorage` calls remain outside `storage.js` itself.

### Files Added
- `utils/storage.js` — centralized safe localStorage wrapper

### Files Modified (10)
- `app.js` — uses `storageGet`/`storageSet` for cart, portfolio, watchlist; removed inline `safeParseJSON`; added `Array.isArray` guards
- `utils/api.js` — uses `storageGetRaw` for auth token; fixed unguarded `JSON.parse(card.colors)` with try/catch
- `utils/auth.js` — uses `storageGetRaw`/`storageSetRaw`/`storageRemove` for auth token
- `components/Ticker.js` — uses `storageGet`/`storageSet` for ticker cache
- `components/PortfolioView.js` — uses `storageGet`/`storageSet` for price cache
- `components/CheckoutView.js` — uses `storageGet`/`storageSet` for orders
- `components/OrderConfirmation.js` — uses `storageGet` for orders
- `components/SellerDashboard.js` — uses `storageGet` for orders
- `components/CookieNotice.js` — uses `storageGetRaw`/`storageSetRaw`
- `components/Header.js` — uses `storageGetRaw`/`storageSetRaw` for theme
- `index.html` — improved global error handler (ignores IMG/LINK errors, waits 8s, auto-unregisters SW on fatal)
- `sw.js` — bumped to v8

---

## 2026-03-08: Full site debug — Bearer token auth, featured card pricing, SW v7

### What Changed
Full debug audit of the production site following the auth rewrite. Fixed the auth delivery mechanism (cookie → Bearer token via localStorage), fixed Featured Cards showing $0.00 for digital-only printings, and bumped the service worker.

### Auth Fix: Cookie → Bearer Token
Modern browsers block third-party cookies, so the cookie-based auth (`investmtg_auth` cookie with `SameSite=None`) failed silently. Switched to a Bearer token flow:
- **Worker callback** now appends `?auth_token=UUID` to the redirect URL back to the frontend
- **Frontend `auth.js`** captures the token from the URL on page load, stores it in `localStorage` as `investmtg_auth_token`, and cleans the URL
- **All API calls** now include `Authorization: Bearer <token>` header via both `authFetch()` (auth.js) and `backendFetch()` (api.js)
- **Worker `getAuthUser()`** accepts token from cookie OR `Authorization: Bearer` header
- Cookie is still set as a fallback for browsers that allow it

### Featured Card Pricing Fix
Featured and Movers endpoints returned $0.00 for dual lands (Tropical Island, Underground Sea, Savannah, Bayou, Volcanic Island) because Scryfall's `/cards/named?exact=` returns the Vintage Masters (digital-only) printing which has no USD price.
- **Worker `fetchAndCacheCard()`** now detects when a card is digital-only or has no USD price, and automatically falls back to a Scryfall search with `-is:digital has:usd` to find the physical printing
- Purged stale KV cache entries and D1 price rows for affected cards
- All featured cards now show correct physical-printing prices (e.g., Tropical Island Revised Edition: $521.41)

### Service Worker
- Bumped to `investmtg-v7` to force cache purge of stale JS from the auth rewrite

### Files Modified
- `worker/worker.js` — `fetchAndCacheCard()` physical card fallback, `getAuthUser()` Bearer header support, callback `?auth_token=` redirect
- `utils/auth.js` — rewritten: localStorage token, `captureTokenFromURL()`, `authFetch()` with Bearer header
- `utils/api.js` — `backendFetch()` includes `Authorization: Bearer` header from localStorage
- `sw.js` — v7

---

## 2026-03-08: Google OAuth authentication — persistent user accounts

### What Changed
Added Google OAuth 2.0 sign-in so sellers and buyers have persistent accounts. Previously, the Seller Dashboard was session-based (anonymous cookies), meaning users could lose their listings if they cleared browser data or switched devices. Now accounts are tied to Google identity and stored in D1.

### Backend (Worker v3)
- New auth routes: `/auth/google`, `/auth/callback`, `/auth/me`, `/auth/logout`
- New D1 tables: `users` (id, google_id, email, name, picture, role, created_at, last_login), `auth_sessions` (token, user_id, created_at, expires_at)
- Added `user_id` column to: portfolios, listings, sellers, cart_items
- Auth sessions stored in D1, expire after 30 days
- Anonymous session data auto-migrates to user account on first sign-in
- Write routes (POST listings, register seller) now return 401 if not authenticated
- Read routes (portfolio, cart) work with both auth and anonymous sessions
- New secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `FRONTEND_URL`

### Frontend
- `utils/auth.js` — new auth state manager (checkAuth, signIn, signOut, onAuthChange, useAuth hook)
- `components/Header.js` — rewritten with user avatar, dropdown menu (My Portfolio, Seller Dashboard, Sign Out), and Sign In button
- `components/SellerDashboard.js` — shows "Sign In to Sell" prompt with Google button when not authenticated; seller registration form only after sign-in
- `app.js` — wired auth: imports auth.js, calls checkAuth on mount, passes user/onSignIn/onSignOut to Header and SellerDashboard
- `style.css` — new auth UI styles (avatar, dropdown, sign-in button, Google button, auth prompt)
- `index.html` — CSP updated: added `lh3.googleusercontent.com` to img-src, `accounts.google.com` to form-action
- `sw.js` — bumped to v5

### Files Added
- `utils/auth.js`
- `worker/auth-migration.sql`
- `worker/worker-v3-auth-notes.txt`

### Files Modified
- `worker/worker.js` (v3 — 1102 lines)
- `components/Header.js`
- `components/SellerDashboard.js`
- `app.js`
- `style.css`
- `index.html`
- `sw.js` (v5)

### Setup Required
User must create Google OAuth credentials in Google Cloud Console and set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as Worker secrets.

---

## 2026-03-08: Self-host React — eliminate esm.sh redirect chains (mobile black screen fix)

### Root Cause
The esm.sh CDN returns 158-byte stub modules that re-export from internal relative paths (e.g. `/react@18.3.1/es2022/react.development.mjs`). This creates a cascading chain of module loads that fails on mobile browsers, especially with the es-module-shims polyfill intercepting cross-origin requests. The `?dev=false` parameter also resolved to development builds, adding deeper dependency chains.

### Fix
- Downloaded React 18.3.1, ReactDOM, ReactDOM/client, and Scheduler production bundles from esm.sh stable endpoint
- Saved as self-hosted files in `vendor/` directory with all imports rewritten to local relative paths
- Updated import map in `index.html` to point to `./vendor/react.mjs` and `./vendor/react-dom-client.mjs`
- Removed es-module-shims polyfill (no longer needed — all modules are same-origin)
- Removed esm.sh and ga.jspm.io from Content Security Policy
- Added `modulepreload` hints for all four vendor modules
- Bumped service worker to v4; extended JS-never-cache rule to cover `.mjs` files

### Files Added
- `vendor/react.mjs` — React 18.3.1 production bundle (9.6 KB, self-contained)
- `vendor/react-dom.mjs` — ReactDOM production bundle (132 KB, imports react + scheduler)
- `vendor/react-dom-client.mjs` — ReactDOM/client (1.5 KB, imports react-dom)
- `vendor/scheduler.mjs` — Scheduler production bundle (6.8 KB, self-contained)

### Files Modified
- `index.html` — import map, CSP, modulepreload hints, removed polyfill
- `sw.js` — v4, .mjs handling

---

## 2026-03-08: Fix mobile black screen — loading fallbacks, SW v3, import map polyfill

### Root Cause Analysis (GPT 5.4)
Multiple layers of failure combined to produce a black screen on mobile:
1. `Promise.all` in app.js had no `.catch()` — if backend calls timed out, `loading` stayed `true` forever and the app rendered `null` (invisible against dark background)
2. Loading state returned `null` instead of visible text
3. Lazy component loader returned `null` while dynamic imports resolved
4. No import map polyfill — iOS Safari < 16.4 doesn't support native import maps, causing silent module load failure
5. Service worker (v2) cached stale `index.html` and `app.js` from previous deploys

### Fixes Applied
- **app.js**: Added `.catch()` on `Promise.all` + 6-second safety timeout that clears loading gate with localStorage fallbacks
- **app.js**: Loading state now renders visible "Loading…" text instead of `null`
- **app.js**: `lazyComponent()` shows "Loading…" placeholder while chunks load, with `.catch()` that resets on failure
- **app.js**: Added `data-app` marker so error handler knows when React has mounted
- **index.html**: Added `es-module-shims` polyfill from `ga.jspm.io` for pre-iOS 16.4 browsers
- **index.html**: Fallback "Loading…" HTML inside `#root` (visible before React hydrates)
- **index.html**: Global error handler catches module load failures with user-friendly message
- **index.html**: `modulepreload` hints for React CDN modules
- **index.html**: Import map pinned to `?dev=false` for production builds
- **index.html**: CSP updated to allow `ga.jspm.io` in `script-src` and `connect-src`
- **sw.js**: Bumped cache to `investmtg-v3`, purges all old caches on activation
- **sw.js**: Never caches HTML navigation (always fetches fresh `index.html`)
- **sw.js**: Never caches `.js` files (always fetches fresh on deploy)
- **sw.js**: Skips cross-origin requests entirely (no interference with esm.sh or backend)

---

## 2026-03-08: Go Live — Frontend wired to Cloudflare Worker v2 backend

### What Changed
Wired the production frontend (root-level SPA) to use the deployed Cloudflare Worker v2 backend API instead of localStorage and direct Scryfall API calls. The site at www.investmtg.com now loads all data through the backend.

### Frontend Migration (13 files changed, 800+ lines)
- **utils/api.js** — Added `normalizeCard()` (D1 flat → Scryfall shape converter), `backendFetch()`, and 20+ backend proxy functions for all API endpoints
- **components/Ticker.js** — Uses `fetchTicker()` from backend instead of direct Scryfall collection API
- **components/HomeView.js** — Loads featured/trending/budget cards from `/api/featured`, `/api/trending`, `/api/budget`
- **components/PortfolioView.js** — Server-side CRUD via `/api/portfolio` with localStorage fallback
- **components/StoreView.js** — Dynamic store list from `/api/stores` with static fallback
- **components/SellerDashboard.js** — Full CRUD via `/api/sellers` and `/api/listings`
- **components/MarketMoversView.js** — Uses `/api/movers/:category` with key mapping
- **components/SearchView.js** — Uses `/api/search` with Scryfall autocomplete fallback
- **components/CardDetailView.js** — Uses `/api/card/:id` with Scryfall fallback for full data
- **utils/stores.js** — `getStoresAsync()` with static fallback
- **utils/events-config.js** — `getEventsAsync()` with static fallback
- **utils/marketplace-data.js** — Returns Promise from `/api/listings`
- **app.js** — Async state init via `Promise.all` with loading gate, `refreshMarketplace()` from backend

### Data Shape Normalization
Backend returns two shapes: D1 flat (`price_usd`, `image_small`) for cached endpoints and Scryfall shape (`prices.usd`, `image_uris`) for search/fresh cards. The `normalizeCard()` function in api.js converts D1 flat → Scryfall-compatible shape so all existing components work without modification.

### Deploy Workflow Fix
Restored `.github/workflows/deploy.yml` to deploy the root directory directly (no build step) instead of building `frontend-v2/dist`. The root SPA uses native ES modules via import maps and needs no compilation.

### Not Yet Migrated
- **CartView.js** and **CheckoutView.js** — Cart has a shape mismatch between frontend (array-based) and backend (per-item API). Deferred to a future session.

### Verified Live
All flows tested on www.investmtg.com:
- Ticker strip shows 16 cards with live prices from backend
- Homepage loads featured, trending, and budget sections
- Search returns results from `/api/search`
- Card detail loads from `/api/card/:id`
- Stores (5) and Events (3) load from D1
- Portfolio CRUD works with session cookies
- Seller registration and listing management functional
- Market movers load by category

---

## 2026-03-08: Frontend V2 migration path formalized

### Architecture
- Established `frontend-v2/` as the source of truth for the production front end
- Confirmed the modern stack: React 19, TypeScript, Vite, and TanStack Query
- Kept the legacy root-level SPA in the repository only as a temporary migration holdover
- Removed `react-router-dom` from the rewrite in favor of a lightweight custom hash router for static hosting stability
- Confirmed `vite.config.ts` uses `base: './'` so the build works correctly from static artifact hosting
- Preserved alignment with the newer Cloudflare Worker v2 backend instead of overwriting that backend direction

### Product direction
- Locked the modern rewrite to Guam-only marketplace positioning
- Centered the new app on four surfaces: search, card detail, portfolio, and seller flow
- Removed Cardmarket from the new buyer-facing flow and legacy card detail purchase section
- Preserved TCGplayer-only external reference links where Scryfall provides them
- Renamed the legacy card-detail seller CTA from `List on Market` to `Create Guam Listing`

### Deployment
- Updated `.github/workflows/deploy.yml` to install dependencies from `frontend-v2/`, build the Vite app, and publish `frontend-v2/dist` to GitHub Pages
- Added static-hosting assets for the rewrite, including PWA metadata and fallback files under `frontend-v2/public`
- Kept the Worker deployment as a separate release path managed through Wrangler

### Documentation
- Rewrote `README.md` around the Guam-only modern architecture while retaining Worker v2 infrastructure context
- Rewrote `BUILD_SPEC.md` around the new front-end source of truth and deployment model
- Rewrote `SOUL.md` to reflect the Guam-first product direction and the modern release discipline without discarding backend principles
- Rewrote `worker/README.md` so worker documentation stays aligned with both the modern front end and the Worker v2 backend
- Replaced the default Vite template README inside `frontend-v2/` with project-specific notes

### Security and release hygiene
- Verified the rewrite app does not use `localStorage` or `sessionStorage`
- Verified the rewrite contains no Cardmarket references in the modern app
- Verified no new secret values were introduced into tracked files during the rewrite migration
- Verified the repository remote remains `imvestMTG/investmtg` on branch `main`

---

## 2026-03-08: Cloudflare Backend Infrastructure — D1 + KV + Worker v2

### What Changed
Migrated from a client-only localStorage architecture to a real server-side backend using Cloudflare's free tier services. The existing CORS proxy Worker (`investmtg-proxy`) has been upgraded to a full API backend while preserving all existing proxy routes.

### New Infrastructure
- **Cloudflare D1 Database** (`investmtg-db`) — SQLite-compatible database with 7 tables: `prices`, `portfolios`, `listings`, `sellers`, `events`, `stores`, `cart_items`
- **Cloudflare KV Namespace** (`INVESTMTG_CACHE`) — Edge key-value cache for ticker, featured, trending, budget, and movers data with configurable TTLs
- **Worker v2** — 790+ line unified Worker with 16 new API routes plus all existing proxy routes preserved

### New API Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/health` | GET | Health check (DB connectivity + version) |
| `/api/ticker` | GET | Live prices for 16 tracked cards (KV-cached, 5min TTL) |
| `/api/featured` | GET | Featured high-value cards (KV-cached, 1hr TTL) |
| `/api/trending` | GET | Trending cards (KV-cached, 30min TTL) |
| `/api/budget` | GET | Budget staples (KV-cached, 1hr TTL) |
| `/api/search` | GET | Card search proxied to Scryfall with unique prints |
| `/api/card/:id` | GET | Card detail with D1-cached pricing |
| `/api/movers/:cat` | GET | Market movers by category (valuable/modern/commander/budget) |
| `/api/portfolio` | GET/POST/DELETE | Portfolio CRUD with anonymous session cookies |
| `/api/listings` | GET/POST/PUT/DELETE | Marketplace listings with search, filter, sort, pagination |
| `/api/sellers` | GET/POST | Seller registration and profile management |
| `/api/stores` | GET | Verified Guam stores from D1 |
| `/api/events` | GET | Community events from D1 |
| `/api/cart` | GET/POST/DELETE | Shopping cart linked to listings |

### Preserved Existing Routes
- `/justtcg` — JustTCG API proxy (API key injected server-side)
- `/topdeck` — TopDeck.gg API proxy (API key injected server-side)
- `/chatbot` — AI chatbot proxy (rate-limited: 12 req/min per IP)
- `/?target=` — Generic CORS proxy (allowlisted hosts only)

### Database Schema
- **prices** — Scryfall card price cache with images, set info, rarity, oracle text
- **portfolios** — User portfolio entries linked to session cookies
- **listings** — Marketplace listings with seller info, condition, pricing
- **sellers** — Registered seller profiles
- **events** — Community events (3 seeded: TCG Con, Commander Night, MTG Weekend)
- **stores** — Verified local stores (5 seeded: The Inventory, Geek Out, My Wife TCG, Fraim's, Poke Violet)
- **cart_items** — Shopping cart items linked to listings

### Architecture Improvements
- **Session management** via `investmtg_session` cookie (UUID v4, HttpOnly, Secure, 1-year expiry)
- **Rate limiting** per IP (120 req/min general, 12 req/min chatbot)
- **Scryfall rate limiting** (100ms between calls, proper User-Agent header)
- **Smart caching** — KV cache skips empty results to prevent caching API failures
- **CORS** — Same origin allowlist as v1 (investmtg.com, GitHub Pages, localhost dev)

### New Files in `worker/`
- `schema.sql` — D1 database schema (7 tables)
- `seed.sql` — Seed data for stores and events
- `wrangler.toml` — Updated with D1 and KV binding IDs
- `worker.js` — v2 Worker (790+ lines)

### Deployment
- Worker deployed to: `https://investmtg-proxy.bloodshutdawn.workers.dev`
- All endpoints tested and verified live
- Existing secrets preserved: `JUSTTCG_API_KEY`, `TOPDECK_API_KEY`

---

## 2026-03-08: Marketplace Onboarding & Listing Workflow Fix

### Critical Bugs Fixed
- **Seller listings now appear in marketplace**: `getInitialMarketplaceData()` scans all registered sellers' localStorage and aggregates their listings into the global marketplace. Previously returned `[]` always, making all seller-created listings invisible on the Marketplace tab.
- **SellerDashboard connected to global state**: Now receives `refreshMarketplace` prop from app.js. When a seller adds, edits, or deletes a listing, the global marketplace state updates immediately so StoreView reflects changes in real time.
- **"List a Card" button fixed**: StoreView's "List a Card" button now navigates to `#seller` (Seller Dashboard) instead of incorrectly triggering the "Buy Local" flow with a mock card.
- **ListingModal props corrected**: app.js now passes `isOpen`, `onSubmit`, `prefillCardName`, and `onClose` — matching the component's expected interface. Previously passed `updateListings` which the component didn't use.
- **Marketplace data persisted**: New `saveMarketplaceData()` function writes standalone listings to localStorage. Combined with seller-stored listings, all marketplace data now survives page refresh.
- **Newest-first sort fixed**: `filterMarketplace` now handles both ISO date strings and Unix timestamps when sorting by newest, preventing incorrect sort order.
- **Search includes set name**: Marketplace search filter now also matches against `setName`, not just `cardName` and `seller`.

### UX Improvements
- **Empty marketplace CTA**: When there are 0 listings, marketplace shows a "Become a Seller & List Cards" call-to-action instead of a generic "no results" message.
- **Post-listing feedback**: After adding a listing in the Seller Dashboard, flash message includes a "View Marketplace →" link so sellers can verify their listing is live.
- **Listings tab shows marketplace link**: Sellers with active listings see a note confirming their cards are visible on the Marketplace page with a direct link.
- **Seller contact auto-populated**: When a seller creates a listing without specifying contact info, it falls back to the contact info from their seller profile.

---

## 2026-03-08: Documentation Collation & Security Hardening

### Security
- **API keys migrated to encrypted secrets**: JustTCG and TopDeck API keys moved from `wrangler.toml` `[vars]` (plaintext in public repo) to Cloudflare Worker encrypted secrets via `wrangler secret put`
- **SumUp credentials redacted from BUILD_SPEC.md**: Merchant code and public key now referenced as "stored in config.js" instead of hardcoded in documentation
- **wrangler.toml cleaned**: Removed all plaintext API keys; keys are now comments referencing `wrangler secret put` commands

### Documentation
- **SOUL.md**: Updated API Architecture section with full Worker route table, security measures, encrypted secrets policy. Added 2026-03-08 changelog entry
- **README.md**: Updated project tree with 7 new files (config.js, sanitize.js, group-by-seller.js, events-config.js, ConfirmModal.js, ErrorBoundary.js, sw.js) and `worker/` directory. Updated external services table. Chatbot description updated to reflect Worker proxy
- **BUILD_SPEC.md**: Added ConfirmModal, ErrorBoundary to shared components. Added config.js, sanitize.js, group-by-seller.js, events-config.js, stores.js to utils. Added Worker section with route table. Redacted SumUp credentials. Updated Pollinations AI to Worker proxy
- **worker/README.md**: Added TopDeck route to table. Added encrypted secrets documentation. Updated environment variables section
- **CHANGES.md**: Added this entry documenting all security and documentation changes

---

## 2026-03-08: Comprehensive Code Review — All 39 Findings Resolved

### Critical Security Fixes
- **SumUp merchant code**: Removed from client-side CheckoutView.js, moved to server-side Cloudflare Worker
- **Chatbot AI proxy**: Chatbot now routes through Cloudflare Worker (`/chatbot`) instead of direct text.pollinations.ai
- **CSRF protection**: Documented for future backend transition; localStorage-only operations have limited CSRF surface
- **Input sanitization**: All user inputs (checkout, seller registration, chatbot) now sanitized via shared `sanitize.js`
- **Email validation**: Replaced weak `includes('@')` check with proper RFC 5322 regex
- **CSP updated**: Removed direct pollinations.ai access from Content-Security-Policy header

### High Priority Fixes
- **SumUp SDK race condition**: Fixed duplicate loads via `useRef` tracking; effect depends on `[step]` only
- **Scryfall rate limiting**: Centralized — added `fetchCollection()` behind rate limiter, exported `scryfallFetch`
- **Error boundaries**: Added `ErrorBoundary` component wrapping all route content in app.js
- **Cart quantity limit**: Max 4 per card (tournament playset); `+` button disables at max
- **View state caching**: Added `viewCacheRef` passed to SearchView and MetaView for state persistence

### Medium Priority Fixes
- **Config centralization**: Created `utils/config.js` — tax rate, shipping, cart limits, API intervals, all magic numbers
- **Deduplicated groupBySeller**: Extracted to `utils/group-by-seller.js`, imported in CartView and CheckoutView
- **Console.log removed**: Stripped `console.log('Swift Checkout init:', e)` from CheckoutView
- **ConfirmModal component**: Created `shared/ConfirmModal.js` — replaces `window.confirm()` and `window.alert()`
- **SellerDashboard**: Delete/logout now use styled modal instead of `window.confirm()`
- **StoreView contact**: Replaced `alert()` with ConfirmModal for seller contact display
- **Keyboard accessibility**: Added `role="tab"`, `aria-selected`, `onKeyDown` handlers to StoreView tab buttons
- **Service worker**: Created `sw.js` for basic PWA offline support (cache-first for static, network-first for APIs)
- **404.html simplified**: Removed redundant if/else logic (both branches were identical)
- **Sitemap documented**: Added XML comment explaining hash route SEO limitations

### Low Priority / Code Quality
- **BackToTop.js**: Removed unused `ChevronLeftIcon` import
- **Toast.js**: Added `mountedRef` guard to prevent state updates on unmounted component
- **Icons.js**: `Icon` base component now forwards `className` to SVG; fixed MapPinIcon, PhoneIcon, ClockIcon, GlobeIcon
- **Events config**: Created `utils/events-config.js` for easy event data updates without code changes
- **Sanitize utility**: Created `utils/sanitize.js` with `sanitizeInput()`, `isValidEmail()`, `isValidPhone()`
- **CSS**: Added styles for ConfirmModal and ErrorBoundary fallback in base.css

### New Files
- `utils/config.js` — centralized constants
- `utils/sanitize.js` — input validation and sanitization
- `utils/group-by-seller.js` — shared cart grouping
- `utils/events-config.js` — community events data
- `components/shared/ErrorBoundary.js` — React error boundary
- `components/shared/ConfirmModal.js` — styled confirmation/alert modal
- `sw.js` — service worker for PWA offline support

### Files Modified (17)
- `app.js` — ErrorBoundary, viewCache, service worker registration
- `components/CheckoutView.js` — 13 fixes (security, validation, race condition, config)
- `components/CartView.js` — 5 fixes (config, dedup, quantity limits)
- `components/Chatbot.js` — 4 fixes (proxy, config, sanitize)
- `components/StoreView.js` — 3 fixes (modal, accessibility, contact)
- `components/SellerDashboard.js` — 5 fixes (sanitize, modal, debounce)
- `components/shared/BackToTop.js` — removed unused import
- `components/shared/Toast.js` — memory leak fix
- `components/shared/Icons.js` — className forwarding
- `utils/api.js` — centralized rate limiting, fetchCollection
- `base.css` — ConfirmModal and ErrorBoundary styles
- `404.html` — simplified redirect logic
- `sitemap.xml` — documented hash route limitation
- `index.html` — updated CSP (removed pollinations.ai)
- `CHANGES.md` — this entry
