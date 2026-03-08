# investMTG

**Site:** [www.investmtg.com](https://www.investmtg.com)

Real cards. Real data. Fair play.

investMTG is a Guam-first Magic: The Gathering marketplace and pricing experience built around transparent reference pricing, local seller trust, and cleaner buyer flows.

## Production architecture

The live site at www.investmtg.com is served from the **root-level SPA** — a vanilla JavaScript application using React 18.3.1 via import maps with self-hosted vendor bundles. There is no build step. The repository root is published directly to GitHub Pages.

All API data flows through the Cloudflare Worker v3 backend at `https://investmtg-proxy.bloodshutdawn.workers.dev`.

### Front end
The root-level SPA (`app.js`, `components/`, `utils/`) is the production frontend.

Key characteristics:
- React 18.3.1 self-hosted in `vendor/` via import maps — no npm, no bundler, no CDN
- Vanilla JavaScript — `var` only, no JSX, `React.createElement` for all elements
- Hash-based routing
- Native ES modules via `<script type="module">`
- No build step — deploy as-is to GitHub Pages
- All data loaded from Worker v3 backend API endpoints
- Google OAuth 2.0 authentication for persistent user accounts

Coding rules enforced across all root-level JS files:
- `var h = React.createElement;` — no JSX transform
- `var ref = React.useState()` with `ref[0]` / `ref[1]` — no destructuring
- `var` only — no `let` or `const`
- `function` keyword only — no arrow functions in component bodies

### Backend
`worker/` contains the Cloudflare Worker v3 used as the secure backend layer.

Key characteristics:
- Cloudflare Worker API gateway and proxy
- Cloudflare D1 database for server-side data (users, auth sessions, portfolios, listings, sellers, stores, events, cart)
- Cloudflare KV cache for market and discovery responses (ticker, featured, trending, budget, movers)
- Google OAuth 2.0 authentication with HMAC-signed session tokens stored in D1
- Encrypted secrets for protected third-party APIs and auth credentials
- Bearer token auth via localStorage (cross-site cookie fallback)
- Anonymous session cookie support for server-side user state
- Generic CORS proxy (`/?target=`) for Moxfield, Scryfall, and EDH Top 16 APIs with User-Agent forwarding
- Auto-promotes user role to 'seller' on seller registration

### frontend-v2/ (experimental, not deployed)
`frontend-v2/` is a TypeScript/Vite rewrite of the application. It exists in the repository as an experimental project but **is not the live production app** and is not deployed anywhere.

## Core experience

### Search
- live card search through [Scryfall](https://scryfall.com/docs/api) via `/api/search`
- compact, responsive card results
- Guam-first messaging around what happens after discovery

### Card detail
- live reference pricing from `/api/card/:id`
- local Guam listing rail
- printing table for alternate versions
- TCGplayer-only external market reference link when available

### Portfolio
- portfolio positions with reference values
- server-side CRUD via `/api/portfolio` with session cookie persistence
- localStorage fallback for unauthenticated sessions

### Seller flow
- guided Guam listing workflow with Scryfall-powered set autocomplete
- CSV/Manabox bulk import for listing multiple cards at once
- meetup zone and island delivery framing
- full CRUD via `/api/sellers` and `/api/listings`

### Home / Discovery
- featured, trending, and budget card sections loaded from `/api/featured`, `/api/trending`, `/api/budget`
- ticker strip with 16 live card prices from `/api/ticker`
- market movers by category from `/api/movers/:category`

## Architecture

### Front end
- `app.js` — root application entry, async state init, hash router
- `components/` — all UI components
- `utils/api.js` — backend proxy functions, `normalizeCard()` shape converter, Bearer token auth
- `utils/auth.js` — auth state manager (checkAuth, signIn, signOut, onAuthChange, useAuth)
- `utils/` — config, helpers, stores, events, marketplace data, sanitization
- `index.html` — import map for React 18.3.1 / ReactDOM from self-hosted vendor bundles
- `style.css`, `base.css` — application styles

### Hosting
- GitHub Pages publishes the root directory directly (no build step)
- Cloudflare sits in front of the domain for DNS and caching

### Worker
- `worker/worker.js` — Cloudflare Worker v3 backend and proxy
- `worker/schema.sql` — D1 schema (7 tables)
- `worker/seed.sql` — D1 seed data for Guam stores and events
- the Worker is a separate deployment surface from the GitHub Pages front end

## Project structure

```text
investmtg/
├── .github/workflows/deploy.yml    # publishes root directory to GitHub Pages
├── components/
│   ├── CardDetailView.js
│   ├── CartView.js
│   ├── CheckoutView.js
│   ├── HomeView.js
│   ├── MarketMoversView.js
│   ├── PortfolioView.js
│   ├── SearchView.js
│   ├── SellerDashboard.js
│   ├── StoreView.js
│   ├── Ticker.js
│   ├── ... (other views and shared components)
│   └── shared/
│       ├── CardGrid.js
│       ├── ConfirmModal.js
│       ├── ErrorBoundary.js
│       ├── Icons.js
│       ├── SkeletonCard.js
│       └── Toast.js
├── utils/
│   ├── api.js                      # backend proxy functions, normalizeCard()
│   ├── config.js                   # centralized constants
│   ├── events-config.js            # getEventsAsync() with static fallback
│   ├── helpers.js
│   ├── marketplace-data.js         # Promise-based listings from /api/listings
│   ├── sanitize.js
│   └── stores.js                   # getStoresAsync() with static fallback
├── worker/
│   ├── worker.js
│   ├── wrangler.toml
│   ├── schema.sql
│   ├── seed.sql
│   └── README.md
├── frontend-v2/                    # experimental TypeScript/Vite rewrite (not deployed)
├── app.js                          # root application entry point
├── index.html                      # import map + app bootstrap
├── style.css
├── base.css
├── sw.js                           # service worker v12 (PWA offline support + auto-reload)
├── manifest.json
├── README.md
├── BUILD_SPEC.md
├── CHANGES.md
└── SOUL.md
```

## Deployment

### Front end
The GitHub Actions workflow at `.github/workflows/deploy.yml`:
1. checks out the repository
2. uploads the root directory as the Pages artifact
3. deploys directly to GitHub Pages — no install, no build step

### Worker
Deploy the Worker separately from `worker/` using Wrangler:

```bash
cd worker
npx wrangler deploy
```

## Development

### Front end
No build step required. Open `index.html` directly or serve the root with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

The import map in `index.html` points to self-hosted vendor bundles (`vendor/react.mjs`, `vendor/react-dom-client.mjs`) for React 18.3.1 and ReactDOM 18.3.1.

### Worker
```bash
cd worker
npx wrangler dev
```

## Data sources

- [Scryfall API](https://scryfall.com/docs/api) — card search, images, printings, and reference prices
- [TCGplayer](https://www.tcgplayer.com) — optional external purchase reference links returned through Scryfall purchase URIs
- [JustTCG](https://justtcg.com) — condition-pricing integration via the Worker
- [EDH Top 16](https://edhtop16.com) — meta and tournament-related integrations through the Worker
- [TopDeck.gg](https://topdeck.gg) — tournament data through the Worker
- [Moxfield](https://moxfield.com) — decklist-related integration
- [Cloudflare Workers](https://workers.cloudflare.com/) — proxy and secret-backed API routing
- [Cloudflare D1](https://developers.cloudflare.com/d1/) — server-side data storage
- [Cloudflare KV](https://developers.cloudflare.com/kv/) — cached market/discovery responses
- [GitHub Pages](https://pages.github.com/) — static site hosting

## Notes

- The root-level SPA is the production front end. `frontend-v2/` is an experimental rewrite that is not deployed.
- Cardmarket is excluded from the modern buyer experience.
- No deployment is considered complete until `README.md`, `BUILD_SPEC.md`, `CHANGES.md`, `SOUL.md`, and `worker/README.md` are updated in the same session.

---

Created with [Perplexity Computer](https://www.perplexity.ai/computer)
