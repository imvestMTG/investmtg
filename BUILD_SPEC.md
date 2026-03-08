# investMTG — Build Specification

## Project context

investMTG is a Guam-only Magic: The Gathering marketplace and pricing app. The production frontend is the root-level SPA deployed directly to GitHub Pages from the repository root. All API data flows through the Cloudflare Worker v3 backend.

The production architecture combines:
- the root-level SPA (`app.js`, `components/`, `utils/`) — no build step
- the Cloudflare Worker v3 backend in `worker/`

`frontend-v2/` is an experimental TypeScript/Vite rewrite that exists in the repository but is not deployed.

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

### Loading fallback chain
To prevent blank screens on slow connections or mobile browsers:
1. `index.html` contains visible "Loading…" HTML inside `#root` — shown before React hydrates
2. `app.js` loading state renders visible "Loading…" text instead of `null`
3. `lazyComponent()` shows a "Loading…" placeholder while dynamic imports resolve
4. A global error handler in `index.html` catches module load failures and displays a user-friendly message
5. `app.js` has a 6-second safety timeout on `Promise.all` — if backend calls do not resolve, the loading gate is cleared via localStorage fallbacks rather than hanging indefinitely

### Service worker strategy
`sw.js` is on cache version `investmtg-v8`. The caching strategy is:
- **HTML navigation requests**: never cached — always fetches a fresh `index.html` from the network
- **JS/MJS files**: never cached — always fetches fresh on deploy to avoid stale module problems
- **CSS and other static assets**: cache-first with network fallback
- **Cross-origin requests** (backend Worker, Scryfall, etc.): skipped entirely — the service worker does not intercept them
- On activation, all previous cache versions are purged

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
| `components/HomeView.js` | `#home` | Featured, trending, budget sections |
| `components/SearchView.js` | `#search` | Card search via `/api/search` |
| `components/CardDetailView.js` | `#card/:id` | Card detail via `/api/card/:id` |
| `components/PortfolioView.js` | `#portfolio` | Portfolio CRUD via `/api/portfolio` |
| `components/StoreView.js` | `#store` | Store list via `/api/stores`, marketplace listings |
| `components/SellerDashboard.js` | `#seller` | Seller registration and listing management |
| `components/MarketMoversView.js` | `#movers` | Market movers via `/api/movers/:category` |
| `components/CartView.js` | `#cart` | Cart (not yet wired to backend) |
| `components/CheckoutView.js` | `#checkout` | Checkout (not yet wired to backend) |
| `components/DecklistView.js` | `#decklist` | Decklist import |
| `components/MetaView.js` | `#meta` | Meta/tournament data |
| `components/Chatbot.js` | floating | AI chatbot via Worker `/chatbot` proxy |
| `components/Ticker.js` | persistent | Live price ticker via `/api/ticker` |

### Shared components
| File | Purpose |
|------|---------|
| `components/shared/CardGrid.js` | Reusable card grid layout |
| `components/shared/ConfirmModal.js` | Styled confirmation/alert modal |
| `components/shared/ErrorBoundary.js` | React error boundary wrapper |
| `components/shared/Icons.js` | SVG icon components |
| `components/shared/SkeletonCard.js` | Loading skeleton for cards |
| `components/shared/Toast.js` | Notification toasts |
| `components/shared/BackToTop.js` | Scroll-to-top button |

## Utils

| File | Purpose |
|------|---------|
| `utils/api.js` | `backendFetch()`, `normalizeCard()`, Bearer token auth, and 20+ backend proxy functions for all API endpoints |
| `utils/auth.js` | Auth state manager: `checkAuth()`, `signIn()`, `signOut()`, `onAuthChange()`, `useAuth()`, Bearer token via storage.js |
| `utils/storage.js` | Centralized safe localStorage wrapper: `storageGet()`, `storageSet()`, `storageGetRaw()`, `storageSetRaw()`, `storageRemove()`. All files must use this instead of raw `localStorage`. |
| `utils/config.js` | Centralized constants (tax rate, shipping, cart limits, API intervals, `PROXY_BASE`) |
| `utils/helpers.js` | Shared formatting and utility functions |
| `utils/sanitize.js` | `sanitizeInput()`, `isValidEmail()`, `isValidPhone()` |
| `utils/stores.js` | `getStoresAsync()` — fetches from `/api/stores` with static fallback |
| `utils/events-config.js` | `getEventsAsync()` — fetches from `/api/events` with static fallback |
| `utils/marketplace-data.js` | Returns Promise from `/api/listings` |
| `utils/group-by-seller.js` | Shared cart grouping utility |
| `utils/edhtop16-api.js` | EDH Top 16 integration |
| `utils/justtcg-api.js` | JustTCG integration via Worker proxy |
| `utils/topdeck-api.js` | TopDeck.gg integration via Worker proxy |
| `utils/moxfield-api.js` | Moxfield decklist integration |

## Worker architecture

### Role
The Worker remains separate from the front-end deployment and handles API gateway behavior, protected integrations, and server-side persistence.

### Backend URL
`https://investmtg-proxy.bloodshutdawn.workers.dev`

### Backend services
| Service | Resource | Purpose |
|---------|----------|---------|
| D1 Database | `investmtg-db` | 7-table SQLite database |
| KV Namespace | `INVESTMTG_CACHE` | Edge cache for market and discovery responses |
| Worker | `investmtg-proxy` | Unified backend + proxy |

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
│   ├── PriceHistoryChart.js
│   ├── PrivacyPolicyView.js
│   ├── SearchView.js
│   ├── SellerDashboard.js
│   ├── StoreView.js
│   ├── Ticker.js
│   ├── TermsView.js
│   └── shared/
│       ├── BackToTop.js
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
├── frontend-v2/                    # experimental rewrite — not deployed
├── images/
├── app.js                          # root application entry point
├── index.html                      # import map + app bootstrap
├── style.css
├── base.css
├── sw.js                           # service worker v8
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
- service worker (`sw.js`) provides basic PWA offline support

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
