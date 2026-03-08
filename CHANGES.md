# investMTG — Changelog

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
