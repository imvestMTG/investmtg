# investMTG — Build Specification

## Project context

investMTG is evolving into a Guam-only Magic: The Gathering marketplace and pricing app with a modern front end centered on search, card detail, portfolio tracking, and seller workflow.

The current production-target architecture combines:
- the Vite app in `frontend-v2/`
- the Cloudflare Worker v2 backend in `worker/`

## Front-end architecture

### Source of truth
- `frontend-v2/` is the primary front-end application
- legacy root-level SPA files remain in the repository temporarily during migration but are no longer the intended long-term front-end path

### Stack
- React 19
- TypeScript
- Vite
- TanStack Query
- Lucide React

### Routing
- hash-based routing only
- no `react-router-dom`
- supported routes:
  - `#/search`
  - `#/portfolio`
  - `#/sell`
  - `#/card/{id}`

The hash router was chosen to keep the app stable on static hosting and avoid the blank-screen issues discovered during preview deployment.

### State and data rules
- remote data is loaded through TanStack Query
- no `localStorage` or `sessionStorage` usage in the rewrite
- seller and portfolio states in the rewrite are currently modeled with structured seed data while production persistence is designed later
- all user-facing market references must stay grounded in real external data

## Product rules

### Geography
- Guam only
- pickup and island delivery first
- marketplace messaging should reflect local meetup zones and local trust cues

### Market references
- Scryfall remains the card-data and reference-pricing layer
- TCGplayer links may be used as external reference links when surfaced by Scryfall
- Cardmarket is excluded from the modern buyer flow and should not appear in the rewrite UI

### Integrity
- no fabricated market activity presented as real
- no fake trend lines or fake portfolio performance claims
- no global-shipping framing in the Guam-first experience

## Current app surfaces

### Search page
Purpose:
- card discovery with fast lookup
- compact result cards
- clear transition into local listing actions

Key files:
- `frontend-v2/src/pages/SearchPage.tsx`
- `frontend-v2/src/hooks/useCardSearch.ts`
- `frontend-v2/src/components/search/*`

### Card detail page
Purpose:
- show core card identity and reference price
- show Guam listing rail
- show other printings
- keep failure states isolated

Key files:
- `frontend-v2/src/pages/CardDetailPage.tsx`
- `frontend-v2/src/hooks/useCardDetail.ts`
- `frontend-v2/src/components/card/*`

### Portfolio page
Purpose:
- display tracked positions in a dashboard-style table
- compare basis versus current reference value
- provide a cleaner path to future persistent collection tracking

Key files:
- `frontend-v2/src/pages/PortfolioPage.tsx`
- `frontend-v2/src/components/portfolio/*`

### Seller page
Purpose:
- replace the old no-feedback listing action with a guided Guam listing workflow
- make meetup zones and delivery expectations explicit
- model trust requirements for local fulfillment

Key files:
- `frontend-v2/src/pages/SellerPage.tsx`
- `frontend-v2/src/components/seller/*`

### App shell
Purpose:
- stable sidebar + topbar navigation
- dark-mode-first presentation
- clear product framing around Guam-only trade

Key files:
- `frontend-v2/src/components/layout/AppShell.tsx`
- `frontend-v2/src/hooks/useTheme.ts`
- `frontend-v2/src/app/router.tsx`

## Worker architecture

### Role
The Worker remains separate from the front-end deployment and handles API gateway behavior, protected integrations, and the evolving server-side persistence model.

### Backend services
| Service | Resource | Purpose |
|---------|----------|---------|
| D1 Database | `investmtg-db` | 7-table SQLite database |
| KV Namespace | `INVESTMTG_CACHE` | edge cache for market and discovery responses |
| Worker | `investmtg-proxy` | unified backend + proxy |

### Worker routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | health check |
| `/api/ticker` | GET | tracked card prices |
| `/api/featured` | GET | featured cards |
| `/api/trending` | GET | trending cards |
| `/api/budget` | GET | budget staples |
| `/api/search` | GET | card search proxy |
| `/api/card/:id` | GET | card detail proxy/cache |
| `/api/movers/:cat` | GET | category movers |
| `/api/portfolio` | GET/POST/DELETE | portfolio CRUD |
| `/api/listings` | GET/POST/PUT/DELETE | marketplace listings |
| `/api/sellers` | GET/POST | seller profiles |
| `/api/stores` | GET | verified Guam stores |
| `/api/events` | GET | community events |
| `/api/cart` | GET/POST/DELETE | shopping cart |
| `/justtcg` | proxy | condition pricing |
| `/topdeck` | proxy | tournament data |
| `/chatbot` | proxy | chat relay |
| `/?target=` | proxy | allowlisted generic proxy |

### Worker files
- `worker/worker.js`
- `worker/wrangler.toml`
- `worker/schema.sql`
- `worker/seed.sql`
- `worker/README.md`

## File structure

```text
frontend-v2/
├── public/
│   ├── 404.html
│   ├── apple-touch-icon.png
│   ├── CNAME
│   ├── favicon.png
│   ├── favicon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── manifest.json
│   ├── og-image.jpg
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── app/
│   ├── components/
│   ├── data/
│   ├── hooks/
│   ├── lib/
│   └── pages/
├── index.html
├── package.json
├── package-lock.json
└── vite.config.ts
```

## Deployment spec

### Front end
The GitHub Pages workflow must:
1. check out the repository
2. install dependencies in `frontend-v2/`
3. run `npm run build` in `frontend-v2/`
4. upload `frontend-v2/dist`
5. deploy the artifact to GitHub Pages

### Static hosting constraints
- Vite must use `base: './'`
- routes must work from hash fragments
- public assets must be emitted from `public/`
- no browser storage assumptions

### Worker
The Worker is deployed independently with Wrangler and must keep its D1, KV, and secret bindings intact.

## Development commands

### Front end
```bash
cd frontend-v2
npm ci
npm run build
npm run lint
npm run preview
```

### Worker
```bash
cd worker
npx wrangler deploy
```

## Release checklist

Before considering a release complete:
- update `README.md`
- update `BUILD_SPEC.md`
- update `CHANGES.md`
- update `SOUL.md`
- update `worker/README.md` if worker behavior changed
- verify no secrets or sensitive tokens were committed
- confirm the GitHub Pages workflow still publishes from `frontend-v2/dist`
- confirm the Worker documentation still matches the live route and binding model
