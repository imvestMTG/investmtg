# investMTG

**Site:** [www.investmtg.com](https://www.investmtg.com)

Real cards. Real data. Fair play.

investMTG is a Guam-first Magic: The Gathering marketplace and pricing experience built around transparent reference pricing, local seller trust, and cleaner buyer flows.

## What changed

The project now has two important layers:
- a modern React + TypeScript front end in `frontend-v2/`
- a Cloudflare Worker v2 backend in `worker/` with D1 + KV infrastructure

The new product direction is intentionally narrow:
- Guam-only marketplace language
- pickup and island delivery first
- no Cardmarket-facing buyer flow
- modern search, card detail, portfolio, and seller surfaces

## Current stack

### Front end
`frontend-v2/` is the source of truth for the modern production front end.

Key characteristics:
- React 19 + TypeScript + Vite
- TanStack Query for remote data loading
- lightweight hash routing for static hosting safety
- no browser storage dependency in the rewrite shell
- static deployment through GitHub Pages artifact publishing

### Backend
`worker/` contains the Cloudflare Worker v2 used as the secure backend layer.

Key characteristics:
- Cloudflare Worker API gateway and proxy
- Cloudflare D1 database for server-side data
- Cloudflare KV cache for market and discovery responses
- encrypted secrets for protected third-party APIs
- anonymous session cookie support for server-side user state

## Core experience

### Search
- live card search through [Scryfall](https://scryfall.com/docs/api)
- compact, responsive card results
- Guam-first messaging around what happens after discovery

### Card detail
- live reference pricing from [Scryfall](https://scryfall.com/docs/api)
- local Guam listing rail
- printing table for alternate versions
- TCGplayer-only external market reference link when available

### Portfolio
- seeded portfolio positions displayed in a cleaner dashboard layout
- reference values pulled through the [Scryfall collection API](https://scryfall.com/docs/api/cards/collection)
- architecture ready for future backend persistence through the Worker + D1 stack

### Seller flow
- guided Guam listing workflow
- meetup zone and island delivery framing
- trust prompts for local fulfillment
- current rewrite uses structured draft data to model the intended UX while the backend path matures

## Architecture

### Front end
- `frontend-v2/` — modern React + TypeScript rewrite
- `components/`, `utils/`, `app.js`, `style.css` — legacy app retained during migration

### Hosting
- GitHub Pages publishes the built output from `frontend-v2/dist`
- Cloudflare continues to sit in front of the domain for DNS and caching

### Worker
- `worker/worker.js` — Cloudflare Worker v2 backend and proxy
- `worker/schema.sql` — D1 schema
- `worker/seed.sql` — D1 seed data for Guam stores and events
- the worker remains a separate deployment surface from the GitHub Pages front end

## Project structure

```text
investmtg/
├── .github/workflows/deploy.yml
├── frontend-v2/
│   ├── public/
│   ├── src/
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── worker/
│   ├── worker.js
│   ├── wrangler.toml
│   ├── schema.sql
│   ├── seed.sql
│   └── README.md
├── README.md
├── BUILD_SPEC.md
├── CHANGES.md
├── SOUL.md
└── legacy app files retained during migration
```

## Deployment

### Front end
The GitHub Actions workflow at `.github/workflows/deploy.yml`:
1. installs dependencies in `frontend-v2/`
2. builds the Vite app
3. publishes `frontend-v2/dist` to GitHub Pages

Root-level copied build artifacts are not the intended release path anymore.

### Worker
Deploy the Worker separately from `worker/` using Wrangler.

## Development

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

## Data sources

- [Scryfall API](https://scryfall.com/docs/api) — card search, images, printings, and reference prices
- [TCGplayer](https://www.tcgplayer.com) — optional external purchase reference links returned through Scryfall purchase URIs
- [JustTCG](https://justtcg.com) — condition-pricing integration via the worker
- [EDH Top 16](https://edhtop16.com) — meta and tournament-related integrations through the worker path where needed
- [TopDeck.gg](https://topdeck.gg) — tournament data through the worker
- [Moxfield](https://moxfield.com) — decklist-related integration
- [Cloudflare Workers](https://workers.cloudflare.com/) — proxy and secret-backed API routing
- [Cloudflare D1](https://developers.cloudflare.com/d1/) — server-side data storage
- [Cloudflare KV](https://developers.cloudflare.com/kv/) — cached market/discovery responses
- [GitHub Pages](https://pages.github.com/) — static site hosting

## Notes

- The rewrite is Guam-only by product intent.
- Cardmarket is excluded from the modern buyer experience.
- The old legacy app remains in the repository during migration, but it is no longer the intended long-term front-end architecture.
- No deployment is considered complete until `README.md`, `BUILD_SPEC.md`, `CHANGES.md`, `SOUL.md`, and `worker/README.md` are updated in the same session.

---

Created with [Perplexity Computer](https://www.perplexity.ai/computer)
