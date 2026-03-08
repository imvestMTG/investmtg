# investMTG — Build Specification

## Project context

investMTG is a Guam-only Magic: The Gathering marketplace and pricing app. The production frontend is the root-level SPA deployed directly to GitHub Pages from the repository root. All API data flows through the Cloudflare Worker v3 backend.

The production architecture combines:
- the root-level SPA (`app.js`, `components/`, `utils/`) — no build step
- the Cloudflare Worker v3 backend in `worker/`

`frontend-v2/` was an experimental TypeScript/Vite rewrite that was removed in the v20 optimization pass (dead code cleanup).

## Front-end architecture

### Source of truth
The root directory is the production front end. Files at the repository root are what gets deployed to GitHub Pages.

### Stack
- React 18.3.1 (self-hosted in `vendor/` directory)
- ReactDOM 18.3.1 + Scheduler 0.23.2 (self-hosted in `vendor/`)
- Vanilla JavaScript — no TypeScript, no bundler, no transpiler
- Native ES modules via `<script type="module">`
- No npm dependencies for the frontend — no `package.json` at root level

### Import map
`index.html` contains the import map that wires React and ReactDOM to self-hosted vendor bundles:

```html
<script type="importmap">
{
  "imports": {
    "react": "./vendor/react.mjs",
    "react-dom/client": "./vendor/react-dom-client.mjs"
  }
}
</script>
```

The vendor bundles were sourced from esm.sh’s stable endpoint and have all imports rewritten to local relative paths. No CDN requests are made at runtime for React. This eliminates the esm.sh redirect-chain problem that caused mobile black screens.

### Content Security Policy
`index.html` includes a `<meta http-equiv="Content-Security-Policy">` tag. **CRITICAL**: When changing backend URLs (e.g. moving from `.workers.dev` to a custom domain), the `connect-src` directive MUST be updated to include the new domain. If omitted, all `fetch()` calls to the backend will be silently blocked by the browser, causing auth failures and broken API calls with no visible error in the network tab (they appear as `net::ERR_BLOCKED_BY_CLIENT` in DevTools Console).

Current `connect-src` allowlist: `'self'`, `api.investmtg.com`, `api.scryfall.com`, `gateway.sumup.com`, `api.sumup.com`, `js.sumup.com`, `api.justtcg.com`, `api2.moxfield.com`, `edhtop16.com`, `topdeck.gg`.

### Loading fallback chain
To prevent blank screens on slow connections or mobile browsers:
1. `index.html` contains a full app shell inside `#root` — skeleton header with logo, hero section with tagline, search bar placeholder, and carousel card skeletons with shimmer animation. Shown before React hydrates for immediate FCP.
2. `app.js` loading state renders visible "Loading…" text instead of `null`
3. `lazyComponent()` shows a "Loading…" placeholder while dynamic imports resolve
4. A global error handler in `index.html` catches module load failures and displays a user-friendly message
5. `app.js` has a 6-second safety timeout on `Promise.all` — if backend calls do not resolve, the loading gate is cleared via localStorage fallbacks rather than hanging indefinitely

### Service worker strategy
`sw.js` is on cache version `investmtg-v37`. The caching strategy is:
- **HTML navigation requests**: never cached — always fetches a fresh `index.html` from the network
- **JS/MJS files**: never cached — always fetches fresh on deploy to avoid stale module problems
- **CSS and other static assets**: cache-first with network fallback
- **Local images** (`.webp`, `.jpg`, `.png`, `.svg`): stale-while-revalidate — serves cached copy instantly, fetches fresh in background
- **Hero image** (`hero-bg.webp`): precached on install for instant LCP on repeat visits
- **Cross-origin requests** (backend Worker, Scryfall, SumUp SDK, etc.): skipped entirely — the service worker does not intercept them
- On activation, all previous cache versions are purged
- On activation, sends `postMessage({ type: 'SW_UPDATED' })` to all open tabs, which triggers an automatic page reload via a listener in `app.js`. This eliminates stale-cache bugs during SW version transitions.

### Coding rules
These rules apply to all root-level `.js` files and must not be violated:

| Rule | Correct | Wrong |
|------|---------|-------|
| Element creation | `var h = React.createElement;` | JSX, Babel, `<Component />` |
| State | `var ref = React.useState(); ref[0]; ref[1]();` | `const [x, setX] = useState()` |
| Variable declarations | `var` only | `let`, `const` |
| Functions | `function myFn() {}` | Arrow functions in component bodies |
| Modules | `import` / `export` via native ES modules | CommonJS `require()` |

### Routing
- hash-based routing only
- no `react-router-dom`
- supported routes driven by `window.location.hash` in `app.js`

### State and data rules
- all data loaded from the Worker v3 backend via `utils/api.js`
- async state init in `app.js` via `Promise.all` with a loading gate
- `normalizeCard()` in `utils/api.js` converts D1 flat shape (`price_usd`, `image_small`) to Scryfall shape (`prices.usd`, `image_uris`) so all components use one consistent shape
- localStorage access exclusively through `utils/storage.js` — no raw `localStorage` calls anywhere else
- localStorage fallback for portfolio and session recovery only

## Components

### Views
| File | Route | Purpose |
|------|-------|---------|
| `components/HomeView.js` | `#home` | Featured, trending, budget sections in horizontal scrolling carousels (12 cards each) |
| `components/SearchView.js` | `#search` | Card search via `/api/search` |
| `components/CardDetailView.js` | `#card/:id` | Card detail via `/api/card/:id`. "Find Sellers" links to marketplace (no direct cart add — items must come from seller listings). |
| `components/PortfolioView.js` | `#portfolio` | Portfolio CRUD via `/api/portfolio` |
| `components/StoreView.js` | `#store` | Store list via `/api/stores`, marketplace listings |
| `components/SellerDashboard.js` | `#seller` | Seller registration (with required ToS checkbox), listing management, step-based listing wizard (search → pick printing → details), auto-confirm on blur/Enter, printings grid/list views, set autocomplete via Scryfall printings, CSV/Manabox bulk import |
| `components/MarketMoversView.js` | `#movers` | Market movers via `/api/movers/:category` |
| `components/CartView.js` | `#cart` | Cart with JustTCG condition selector (card-style layout: colored dot + abbreviation + full name + price per condition), all conditions displayed, checkout gated until all conditions chosen |
| `components/CheckoutView.js` | `#checkout` | 4-step checkout wizard (Review → Fulfillment → Contact → Payment) with confirmation modal and required ToS checkbox at Contact step. Pay Online (SumUp Card Widget) + Reserve & Pay at Pickup. POSTs to `/api/orders` and `/api/sumup/checkout`. |
| `components/OrderConfirmation.js` | `#order/:id` | Order confirmation/detail page. Server-first loading via `/api/orders/:id`, localStorage fallback. Real-time payment status polling for SumUp orders (5s intervals, 5min max). Status-aware banner and badge (reserved/pending/paid/failed/expired). |
| `components/OrdersView.js` | `#orders` | My Orders page — lists all orders from localStorage, newest first. Links to `#order/<id>`. |
| `components/DecklistView.js` | `#decklist` | Decklist import |
| `components/MetaView.js` | `#meta` | Meta/tournament data |
| `components/PricingView.js` | `#pricing` | Pricing & Data Sources methodology page — explains all data sources (Scryfall, JustTCG, TCGplayer), update frequencies, data flow pipeline, limitations, and links to SOUL.md Data Integrity Policy |
| `components/TermsView.js` | `#terms` | Terms of Service (14 sections). Covers user accounts, marketplace transactions, 5 card conditions, pricing data sources, payments, seller obligations, prohibited conduct, IP/WotC, dispute resolution under Guam law. |
| `components/PrivacyPolicyView.js` | `#privacy` | Privacy Policy. Covers Google OAuth data collection, D1 database storage, server-side accounts, third-party services, data retention, and user rights. |
| `components/TermsGate.js` | site-wide overlay | First-visit ToS acceptance modal (versioned `2026-03-09`). Stores acceptance in localStorage. Also exports `TermsCheckbox` component used in seller registration and checkout. |
| `components/CookieNotice.js` | site-wide banner | Third-party cookie consent notice |
| `components/Chatbot.js` | floating | AI chatbot via Worker `/chatbot` proxy |
| `components/Ticker.js` | persistent | Live price ticker via `/api/ticker` |
| `components/ListingModal.js` | modal overlay | Quick-list modal (opened from card detail via "Create Guam Listing" button). Uses `mp-modal-overlay` CSS. On open, fetches all 5 condition prices (NM/LP/MP/HP/DMG) from JustTCG API via `fetchConditionPrices()`. Condition dropdown change auto-populates the real-time market price for that condition. Price remains editable; "Reset to market price" link restores JustTCG price. |
| `components/BuyLocalModal.js` | modal overlay | Buy-local modal: requires selecting a community listing (seller + price) and a store before adding to cart. Shows empty state if no listings exist. |

### Shared components
| File | Purpose |
|------|---------|
| `components/shared/CardCarousel.js` | Horizontal scrolling carousel for homepage card sections (scroll-snap, arrow nav, touch-friendly) |
| `components/shared/CardGrid.js` | Reusable card grid layout (used in search results) |
| `components/shared/ConfirmModal.js` | Styled confirmation/alert modal |
| `components/shared/ErrorBoundary.js` | React error boundary wrapper |
| `components/shared/Icons.js` | SVG icon components |
| `components/shared/SkeletonCard.js` | Loading skeleton for cards |
| `components/shared/Toast.js` | Notification toasts |
| `components/shared/BackToTop.js` | Scroll-to-top button |

## Utils

| File | Purpose |
|------|---------|
| `utils/api.js` | `backendFetch()`, `normalizeCard()`, Bearer token auth, `fetchConditionPrices({ tcgplayerId, scryfallId })` for JustTCG condition pricing (prefers tcgplayerId), and 20+ backend proxy functions for all API endpoints |
| `utils/auth.js` | Auth state manager: `checkAuth()`, `signIn()`, `signOut()`, `onAuthChange()`, `useAuth()`, Bearer token via storage.js. `captureTokenFromURL()` handles OAuth redirect landing — saves token from `?auth_token=` param and triggers `location.replace()` to clean the URL; returns `'redirecting'` to stop `checkAuth()` from running during page transition. |
| `utils/storage.js` | Centralized safe localStorage wrapper: `storageGet()`, `storageSet()`, `storageGetRaw()`, `storageSetRaw()`, `storageRemove()`. All files must use this instead of raw `localStorage`. |
| `utils/config.js` | Centralized constants (shipping, cart limits, API intervals, `PROXY_BASE`, `SUMUP_PUBLIC_KEY`, `SUMUP_SDK_URL`) |
| `utils/helpers.js` | Shared formatting and utility functions |
| `utils/sanitize.js` | `sanitizeInput()`, `isValidEmail()`, `isValidPhone()` |
| `utils/stores.js` | `getStoresAsync()` — fetches from `/api/stores` with static fallback |
| `utils/events-config.js` | `getEventsAsync()` — fetches from `/api/events` with static fallback |
| `utils/marketplace-data.js` | Returns Promise from `/api/listings` |
| `utils/group-by-seller.js` | Shared cart grouping utility |
| `utils/edhtop16-api.js` | EDH Top 16 integration |
| `utils/justtcg-api.js` | JustTCG integration via Worker proxy |
| `utils/topdeck-api.js` | TopDeck.gg integration via Worker proxy |
| `utils/moxfield-api.js` | Moxfield decklist integration via Worker CORS proxy |

## Worker architecture

### Role
The Worker remains separate from the front-end deployment and handles API gateway behavior, protected integrations, and server-side persistence.

### Backend URL
`https://api.investmtg.com` (custom domain; legacy `https://investmtg-proxy.bloodshutdawn.workers.dev` still active)

### Backend services
| Service | Resource | Purpose |
|---------|----------|---------|
| D1 Database | `investmtg-db` | 11-table SQLite database |
| KV Namespace | `INVESTMTG_CACHE` | Edge cache for market and discovery responses |
| Worker | `investmtg-proxy` | Unified backend + proxy |
| SumUp | Checkouts API | Online card payment processing via Card Widget |

### Worker routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/ticker` | GET | Tracked card prices (KV-cached, 5min TTL) |
| `/api/featured` | GET | Featured cards (KV-cached, 1hr TTL) |
| `/api/trending` | GET | Trending cards (KV-cached, 30min TTL) |
| `/api/budget` | GET | Budget staples (KV-cached, 1hr TTL) |
| `/api/search` | GET | Card search proxy |
| `/api/card/:id` | GET | Card detail proxy/cache |
| `/api/movers/:cat` | GET | Market movers by category |
| `/api/portfolio` | GET/POST/DELETE | Portfolio CRUD |
| `/api/listings` | GET/POST/PUT/DELETE | Marketplace listings |
| `/api/sellers` | GET/POST | Seller profiles |
| `/api/stores` | GET | Verified Guam stores |
| `/api/events` | GET | Community events |
| `/api/cart` | GET/POST/DELETE | Shopping cart |
| `/api/orders` | POST | Create order (auth or guest with contact info). Returns server-generated `GUM-YYYYMM-XXXXX` ID. Guest orders use `contact_email` as `user_email`. |
| `/api/orders` | GET | List orders for authenticated user (sorted by `created_at DESC`) |
| `/api/orders/:id` | GET | Get single order by ID (owner-only) |
| `/api/sumup/checkout` | POST | Create SumUp checkout (guests allowed). Accepts `{ amount, order_id }`. Calls SumUp Checkouts API with merchant code `M55T011N`, returns `{ checkout_id, hosted_checkout_url }`. Includes `redirect_url` (3DS redirect). Frontend mounts SumUp Card Widget with the returned ID for PCI/3DS-compliant card entry. |
| `/api/sumup-webhook` | POST | SumUp webhook handler. Receives `CHECKOUT_STATUS_CHANGED` events, validates via SumUp API poll, updates D1 order status to `confirmed`/`paid`. Returns 200 immediately per SumUp requirements. |
| `/api/orders/:id/payment-status` | GET | Payment status polling (auth required, owner-only). If order has a `checkout_id`, polls SumUp API for real-time status (PENDING/PAID/FAILED/EXPIRED), maps to internal statuses, and updates D1 on change. Returns `{ order_id, status, payment_status, payment_method, sumup_txn_id }`. |
| `/justtcg` | proxy | Condition pricing |
| `/topdeck` | proxy | Tournament data |
| `/chatbot` | proxy | Chat relay |
| `/?target=` | proxy | Allowlisted generic proxy |

### Worker files
- `worker/worker.js`
- `worker/wrangler.toml`
- `worker/schema.sql`
- `worker/seed.sql`
- `worker/README.md`

## File structure

```text
investmtg/                          # root = production frontend deployment artifact
├── .github/workflows/deploy.yml   # uploads root directory to GitHub Pages
├── components/
│   ├── CardDetailView.js
│   ├── CartView.js
│   ├── CheckoutView.js
│   ├── OrderConfirmation.js
│   ├── OrdersView.js
│   ├── Chatbot.js
│   ├── DecklistView.js
│   ├── Footer.js
│   ├── Header.js
│   ├── HomeView.js
│   ├── ListingModal.js
│   ├── MarketMoversView.js
│   ├── MetaView.js
│   ├── OrderConfirmation.js
│   ├── PortfolioView.js
# PriceHistoryChart.js removed in v20 (dead code — never imported)
│   ├── PrivacyPolicyView.js
│   ├── SearchView.js
│   ├── SellerDashboard.js
│   ├── StoreView.js
│   ├── Ticker.js
│   ├── TermsView.js
│   ├── TermsGate.js
│   ├── CookieNotice.js
│   └── shared/
│       ├── BackToTop.js
│       ├── CardCarousel.js
│       ├── CardGrid.js
│       ├── ConfirmModal.js
│       ├── ErrorBoundary.js
│       ├── Icons.js
│       ├── SkeletonCard.js
│       └── Toast.js
├── utils/
│   ├── api.js
│   ├── config.js
│   ├── edhtop16-api.js
│   ├── events-config.js
│   ├── group-by-seller.js
│   ├── helpers.js
│   ├── justtcg-api.js
│   ├── marketplace-data.js
│   ├── moxfield-api.js
│   ├── sanitize.js
│   ├── storage.js                 # centralized safe localStorage wrapper
│   ├── stores.js
│   └── topdeck-api.js
├── worker/
│   ├── worker.js
│   ├── wrangler.toml
│   ├── schema.sql
│   ├── seed.sql
│   └── README.md
├── vendor/
│   ├── react.mjs                   # React 18.3.1 production bundle
│   ├── react-dom.mjs               # ReactDOM 18.3.1 production bundle
│   ├── react-dom-client.mjs        # ReactDOM/client entry
│   └── scheduler.mjs               # Scheduler 0.23.2 production bundle
# frontend-v2/ removed in v20 (dead code cleanup)
├── images/
├── app.js                          # root application entry point
├── index.html                      # import map + app bootstrap
├── style.css                       # all component styles (formatted, ~7500 lines)
├── base.css                        # reset, body defaults, confirm modal
├── sw.js                           # service worker v37
├── manifest.json
├── 404.html
├── CNAME
├── robots.txt
├── sitemap.xml
├── README.md
├── BUILD_SPEC.md
├── CHANGES.md
└── SOUL.md
```

## Deployment spec

### Front end
The GitHub Pages workflow must:
1. check out the repository
2. upload the root directory (`.`) as the Pages artifact
3. deploy the artifact to GitHub Pages

No install step. No build step. The root SPA uses native ES modules and import maps — it runs directly in the browser as authored.

### Static hosting constraints
- routes work from hash fragments — no server-side routing needed
- no browser storage assumptions for core data
- service worker (`sw.js`) provides PWA offline support + auto-reload on version change

### Worker
The Worker is deployed independently with Wrangler and must keep its D1, KV, and secret bindings intact.

## Development commands

### Front end
No build step required. Serve the root directory:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080` (or `http://localhost:3000` for `serve`).

### Worker
```bash
cd worker
npx wrangler dev       # local dev
npx wrangler deploy    # deploy to production
```

## Release checklist

Before considering a release complete:
- update `README.md`
- update `BUILD_SPEC.md`
- update `CHANGES.md`
- update `SOUL.md`
- update `worker/README.md` if worker behavior changed
- verify no secrets or sensitive tokens were committed
- confirm the GitHub Pages workflow publishes the root directory directly
- confirm the Worker documentation still matches the live route and binding model
