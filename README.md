# investMTG

**Site:** [www.investmtg.com](https://www.investmtg.com)

Real cards. Real data. Fair play.

investMTG is a Guam-first Magic: The Gathering marketplace and pricing experience built around transparent reference pricing, local seller trust, and cleaner buyer flows.

## Production architecture

The live site at www.investmtg.com is served from the **root-level SPA** — a vanilla JavaScript application using React 18.3.1 via import maps with self-hosted vendor bundles. There is no build step. The repository root is published directly to GitHub Pages.

All API data flows through the Cloudflare Worker v3 backend at `https://api.investmtg.com` (custom domain; legacy URL `https://investmtg-proxy.bloodshutdawn.workers.dev` still active).

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
- Cloudflare D1 database for server-side data (users, auth sessions, portfolios, listings, sellers, stores, events, cart, orders, order counters)
- Cloudflare KV cache for market and discovery responses (ticker, featured, trending, budget, movers)
- Google OAuth 2.0 authentication with HMAC-signed session tokens stored in D1; OAuth redirect uses `api.investmtg.com` custom domain so Google consent screen shows `investmtg.com`
- Encrypted secrets for protected third-party APIs and auth credentials
- Bearer token auth via localStorage (cross-site cookie fallback)
- Anonymous session cookie support for server-side user state
- Generic CORS proxy (`/?target=`) for Moxfield, Scryfall, and EDH Top 16 APIs with User-Agent forwarding
- Auto-promotes user role to 'seller' on seller registration
- SumUp payment integration: `POST /api/sumup/checkout` creates a SumUp checkout, frontend mounts SumUp Card Widget for PCI-compliant card entry
- Admin bypass: `ADMIN_TOKEN` secret allows testing worker endpoints without Google OAuth

### frontend-v2/ (removed)
`frontend-v2/` was an experimental TypeScript/Vite rewrite that was removed in the v20 optimization pass as dead code.

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
- bulk import from CSV (Manabox, DragonShield, Deckbox, TCGplayer) or text (MTGA format, simple names) via `/api/portfolio/batch`
- localStorage fallback for unauthenticated sessions

### Seller flow
- step-based listing wizard: (1) search card name with auto-confirm on blur/Enter, (2) browse and select a printing from visual grid or list, (3) fill listing details with card summary preview
- printings grid/list view toggle with card images, set codes, rarity, and market prices
- guided Guam listing workflow with Scryfall-powered autocomplete and printings search
- CSV/Text/MTGA bulk import for listing multiple cards at once via `/api/listings/batch` (max 500)
- meetup zone and island delivery framing
- full CRUD via `/api/sellers` and `/api/listings`

### Order & Checkout flow
- 4-step checkout wizard: Review → Fulfillment → Contact → Payment with confirmation modal
- Two payment methods: **Pay Online** (SumUp Card Widget — PCI/3DS compliant) and **Reserve & Pay at Pickup** (no online payment; buyer pays seller at meetup)
- SumUp Card Widget lazy-loaded from `gateway.sumup.com` SDK; checkout created via worker `POST /api/sumup/checkout`
- Server-generated sequential order IDs (`GUM-YYYYMM-XXXXX`) via D1 `order_counters` table
- Orders persisted to D1 via `POST /api/orders` with localStorage fallback
- Order status: `pending_payment` (SumUp online), `reserved` (pay at pickup)
- My Orders page (`#orders`) lists all orders with status badges, totals, and fulfillment info
- Order Confirmation page (`#order/:id`) loads server-first with localStorage fallback

### Pricing transparency
- Dedicated Pricing & Data Sources page (`#pricing`) explains every data source, update frequency, data flow pipeline, and limitation in plain language
- Inline attribution on card detail, market movers, and listing forms links to `#pricing`
- Footer site-wide "Pricing & Sources" link
- SOUL.md Rule 4: Pricing transparency is non-negotiable

### Legal & compliance
- Terms of Service (`#terms`) — 14-section ToS covering user accounts, marketplace transactions, card conditions, pricing sources, payments, seller obligations, prohibited conduct, IP/WotC, and dispute resolution under Guam law
- Privacy Policy (`#privacy`) — covers Google OAuth data collection, D1 database storage, server-side accounts, third-party services, data retention, and user rights
- First-visit ToS acceptance gate — versioned modal shown on first visit; re-triggers when ToS is updated
- ToS checkbox required on seller registration and checkout before proceeding
- Cookie consent banner for third-party service cookies

### Home / Discovery
- featured (12 cards), trending (12 cards), and budget (12 cards) sections in horizontal scrolling carousels loaded from `/api/featured`, `/api/trending`, `/api/budget`
- carousel: CSS scroll-snap, touch-friendly swiping, arrow navigation on desktop, edge fade hints
- section headers with subtitles describing each category
- app shell in index.html — skeleton header, hero, and carousel cards shown before React mounts (faster FCP)
- ticker strip with 16 live card prices from `/api/ticker`
- market movers by category from `/api/movers/:category`

## Architecture

### Front end
- `app.js` — root application entry, async state init, hash router
- `components/` — all UI components
- `utils/api.js` — backend proxy functions, `normalizeCard()` shape converter, Bearer token auth
- `utils/auth.js` — auth state manager (checkAuth, signIn, signOut, onAuthChange, useAuth)
- `utils/` — config, helpers, stores, events, marketplace data, sanitization
- `index.html` — import map for React 18.3.1 / ReactDOM from self-hosted vendor bundles, app shell skeleton UI
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
│   ├── TermsGate.js
│   ├── CookieNotice.js
│   ├── ... (other views and shared components)
│   └── shared/
│       ├── CardCarousel.js
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
│   ├── import-parser.js            # shared CSV/text/MTGA parser for bulk imports
│   ├── marketplace-data.js         # Promise-based listings from /api/listings
│   ├── sanitize.js
│   └── stores.js                   # getStoresAsync() with static fallback
├── worker/
│   ├── worker.js
│   ├── wrangler.toml
│   ├── schema.sql
│   ├── seed.sql
│   └── README.md
# frontend-v2/ removed in v20 optimization pass
├── tests/
│   ├── code-review.sh              # AI code review helper (extracts diff → OpenAI prompt)
│   ├── debug-tool.sh               # 24-section diagnostic tool (97 checks)
│   ├── full-qa.sh                  # combined QA pipeline (smoke + debug with gap)
│   └── smoke-test.sh               # fast pre-push smoke test (33 checks)
├── app.js                          # root application entry point
├── index.html                      # import map + app bootstrap
├── style.css
├── base.css
├── sw.js                           # service worker v52 (PWA offline support + auto-reload + image caching)
├── manifest.json
├── README.md
├── BUILD_SPEC.md
├── CHANGES.md
└── SOUL.md
```

## Testing

Four tools live in `tests/`:

### Full QA pipeline (recommended)
```bash
bash tests/full-qa.sh              # runs smoke + debug with 35s gap
bash tests/full-qa.sh --smoke-only # smoke test only
bash tests/full-qa.sh --debug-only # debug tool only
bash tests/full-qa.sh --quick      # smoke only, skip gap
```
Runs the smoke test, waits 35 seconds (avoids Cloudflare rate limits), then runs the debug tool. The recommended way to run QA — one command covers everything.

### Smoke test (fast, pre-push)
```bash
bash tests/smoke-test.sh
```
33 checks covering frontend assets, DOM integrity, payment integration code, service worker, API health, PayPal/SumUp integration, orders validation, and CORS. Runs in ~15 seconds. Use before every push.

### Debug tool (comprehensive diagnostics)
```bash
bash tests/debug-tool.sh
```
97 checks across 24 sections: frontend static assets, JS modules, DOM integrity, payment code, service worker versioning, API health & data routes, auth, proxy routes (JustTCG, CORS), payment end-to-end (PayPal create-order, SumUp checkout), CSP audit, CORS headers, secret scan, DNS resolution, TLS version, database health & integrity, response times, asset sizes, code style (var-only, no arrows), URL centralization, and dual-write integrity.

### AI code review
```bash
bash tests/code-review.sh          # review staged changes
bash tests/code-review.sh --all    # all uncommitted changes
bash tests/code-review.sh --last   # last commit
bash tests/code-review.sh app.js   # specific file
```
Extracts a git diff, saves to `/tmp/investmtg-review-diff.txt`, and prints a review prompt to paste into ChatGPT/OpenAI. Enforces investMTG coding rules (var-only, no arrows, no JSX).

**Important:** Run smoke test and debug tool with a ~30-second gap between them to avoid triggering Cloudflare rate limits (HTTP 1015). The `full-qa.sh` script handles this automatically.

### Data source segmentation

The site cleanly segments data responsibilities:
- **Scryfall** (free, no API key) — card names, images, oracle text, type lines, mana costs, set info, legalities, rarity, and `prices.usd` (TCGplayer market price). Used site-wide on every page.
- **JustTCG** (API key, rate-limited) — condition-specific pricing (NM, LP, MP, HP, DMG). Called only in CartView and ListingModal — two low-traffic, high-intent actions. Scryfall provides `tcgplayer_id` on every card, which is the native key JustTCG requires for lookups.

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
- [SumUp](https://www.sumup.com) — online card payment processing via Card Widget
- [GitHub Pages](https://pages.github.com/) — static site hosting

## Monitoring & Release Tracking

- **Auto health checks** — A recurring task runs every 6 hours checking 6 endpoints (frontend, API health, ticker, search, JustTCG proxy, CORS proxy). Silent when everything passes; sends an alert notification when something breaks.
- **Release tracker** — [Google Sheets release log](https://docs.google.com/spreadsheets/d/1wncB6NFKkm4gosAAtw-C3L0QjILkG2ROhh4est_PXN8/edit) tracks every deployment: date, commit, SW version, summary, test results, and files changed.

## Notes

- The root-level SPA is the production front end. `frontend-v2/` was removed in v20 (dead code cleanup).
- Cardmarket is excluded from the modern buyer experience.
- No deployment is considered complete until `README.md`, `BUILD_SPEC.md`, `CHANGES.md`, `SOUL.md`, and `worker/README.md` are updated in the same session.
- Run `bash tests/full-qa.sh` before every push. Or run smoke and debug tests separately with `bash tests/smoke-test.sh` and `bash tests/debug-tool.sh`.

---

Created with [Perplexity Computer](https://www.perplexity.ai/computer)
