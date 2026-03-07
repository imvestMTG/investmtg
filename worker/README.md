# investmtg-proxy Worker (v2)

Cloudflare Worker that serves as the unified backend for investmtg.com — combining API gateway, CORS proxy, D1 database, and KV edge caching.

## Architecture

```
Frontend (GitHub Pages)  ──→  Worker (investmtg-proxy)  ──→  Scryfall API
                                    │                    ──→  JustTCG API
                                    │                    ──→  TopDeck.gg API
                                    │                    ──→  Pollinations AI
                                    ├── D1 Database (investmtg-db)
                                    └── KV Cache (INVESTMTG_CACHE)
```

## Bindings

| Binding | Type | Resource |
|---------|------|----------|
| `DB` | D1 Database | `investmtg-db` — SQLite database with 7 tables |
| `CACHE` | KV Namespace | `INVESTMTG_CACHE` — Edge key-value cache |
| `JUSTTCG_API_KEY` | Secret | JustTCG API key (encrypted) |
| `TOPDECK_API_KEY` | Secret | TopDeck.gg API key (encrypted) |

## API Routes

### Data Endpoints (D1 + KV backed)

| Route | Method | Cache | Description |
|-------|--------|-------|-------------|
| `/api/health` | GET | — | Health check (DB connectivity + version) |
| `/api/ticker` | GET | KV 5min | Live prices for 16 tracked high-value cards |
| `/api/featured` | GET | KV 1hr | Featured high-value cards (dual lands, Reserved List) |
| `/api/trending` | GET | KV 30min | Trending popular cards |
| `/api/budget` | GET | KV 1hr | Budget-friendly staples |
| `/api/search?q=` | GET | — | Card search proxied to Scryfall (unique prints) |
| `/api/card/:id` | GET | D1 10min | Card detail with cached pricing |
| `/api/movers/:cat` | GET | KV 30min | Market movers (valuable/modern/commander/budget) |

### User Data Endpoints (D1 + session cookies)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/portfolio` | GET/POST/DELETE | Portfolio CRUD (anonymous session) |
| `/api/listings` | GET/POST/PUT/DELETE | Marketplace listings with search, filter, sort, pagination |
| `/api/sellers` | GET/POST | Seller registration and profile management |
| `/api/stores` | GET | Verified Guam stores |
| `/api/events` | GET | Community events |
| `/api/cart` | GET/POST/DELETE | Shopping cart linked to listings |

### Proxy Routes (preserved from v1)

| Route | Target | Auth | Description |
|-------|--------|------|-------------|
| `/justtcg` | api.justtcg.com | `X-Api-Key` (encrypted secret) | Card condition pricing |
| `/topdeck` | topdeck.gg API | `Authorization` (encrypted secret) | Tournament data |
| `/chatbot` | text.pollinations.ai | None (rate-limited) | AI chat advisor |
| `/?target=` | Allowlisted hosts only | None | Generic CORS proxy |

## Database Schema

7 tables in the D1 database (`schema.sql`):

- **prices** — Scryfall card price cache (card_id, name, prices, images, metadata)
- **portfolios** — User portfolio entries (session_token, card_id, quantity, added_price)
- **listings** — Marketplace listings (seller info, card, condition, price, status)
- **sellers** — Registered seller profiles (name, contact, store affiliation)
- **events** — Community events (title, host, location, date, tags)
- **stores** — Verified local stores (name, address, hours, tags, verified flag)
- **cart_items** — Shopping cart (session_token, listing_id, quantity)

## Security

- **Origin validation**: Only requests from `investmtg.com`, `imvestmtg.github.io`, and local dev origins
- **API keys**: Stored as **encrypted Cloudflare Worker secrets** — never in source code
- **Rate limiting**: 120 req/min per IP (general), 12 req/min per IP (chatbot)
- **Scryfall rate limiting**: 100ms between calls, proper User-Agent header
- **Session cookies**: HttpOnly, Secure, SameSite=Lax, 1-year expiry
- **Host allowlist**: Generic proxy only forwards to explicitly allowlisted domains
- **Smart caching**: KV cache skips empty results to prevent caching API failures

## Deployment

### Prerequisites

```bash
export CLOUDFLARE_API_TOKEN="<your-token>"    # Needs Workers Scripts + D1 + KV permissions
export CLOUDFLARE_ACCOUNT_ID="12360b71beb495952bc5bdcd1b3eab27"
```

### Deploy Worker

```bash
cd worker/
npx wrangler deploy
```

### Database Management

Apply schema:
```bash
npx wrangler d1 execute investmtg-db --file=schema.sql --remote
```

Seed data:
```bash
npx wrangler d1 execute investmtg-db --file=seed.sql --remote
```

Query database:
```bash
npx wrangler d1 execute investmtg-db --command="SELECT COUNT(*) FROM stores" --remote
```

### Secrets Management

API keys are stored as encrypted secrets:

```bash
echo "your-key-here" | npx wrangler secret put JUSTTCG_API_KEY
echo "your-key-here" | npx wrangler secret put TOPDECK_API_KEY
```

List secrets:
```bash
npx wrangler secret list
```

| Secret | Service | How to obtain |
|--------|---------|---------------|
| `JUSTTCG_API_KEY` | JustTCG card pricing | [justtcg.com](https://justtcg.com) account dashboard |
| `TOPDECK_API_KEY` | TopDeck.gg tournaments | [topdeck.gg](https://topdeck.gg) API access request |

## Files

| File | Description |
|------|-------------|
| `worker.js` | Full v2 Worker source (790+ lines) |
| `wrangler.toml` | Deployment config with D1 and KV binding IDs |
| `schema.sql` | D1 database schema (7 tables) |
| `seed.sql` | Seed data (5 Guam stores, 3 community events) |

## Live URL

`https://investmtg-proxy.bloodshutdawn.workers.dev`
