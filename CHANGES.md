# investMTG — Changelog

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
