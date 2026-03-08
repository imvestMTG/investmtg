# investmtg-proxy Worker (v3)

Cloudflare Worker that serves as the unified backend for investMTG — combining API gateway, CORS proxy, D1 database, KV edge caching, and Google OAuth 2.0 authentication.

## Role in the stack

- the front end is the root-level SPA (vanilla JS, React 18.3.1 via self-hosted vendor bundles) deployed directly to GitHub Pages from the repository root — no build step
- the worker remains the secure layer for proxied API access, server-side data, and protected integrations
- the domain can continue to sit behind Cloudflare while the front-end files are served from GitHub Pages
- the frontend has a 6-second safety timeout on its `Promise.all` backend calls — if the worker does not respond in time, the loading gate is cleared and the app renders with localStorage fallbacks rather than showing a blank screen
- all frontend localStorage access goes through `utils/storage.js` — a centralized wrapper that prevents JSON.parse crashes from corrupted values

## Architecture

```text
Root-level SPA (GitHub Pages)  ──→  Worker (investmtg-proxy)  ──→  Scryfall API
                                    │                    ──→  JustTCG API
                                    │                    ──→  TopDeck.gg API
                                    │                    ──→  Pollinations AI
                                    │                    ──→  Google OAuth
                                    ├── D1 Database (investmtg-db)
                                    └── KV Cache (INVESTMTG_CACHE)
```

## Bindings

| Binding | Type | Resource |
|---------|------|----------|
| `DB` | D1 Database | `investmtg-db` — SQLite database with 9 tables |
| `CACHE` | KV Namespace | `INVESTMTG_CACHE` — edge cache |
| `JUSTTCG_API_KEY` | Secret | JustTCG API key (encrypted) |
| `TOPDECK_API_KEY` | Secret | TopDeck.gg API key (encrypted) |
| `GOOGLE_CLIENT_ID` | Secret | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Secret | Google OAuth client secret |
| `AUTH_SECRET` | Secret | HMAC key for auth session tokens (256-bit) |
| `FRONTEND_URL` | Secret | Frontend URL for OAuth callback redirect |

## Routes

### Data endpoints
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | health check |
| `/api/ticker` | GET | tracked card prices |
| `/api/featured` | GET | featured cards |
| `/api/trending` | GET | trending cards |
| `/api/budget` | GET | budget staples |
| `/api/search` | GET | Scryfall-backed card search |
| `/api/card/:id` | GET | card detail proxy/cache |
| `/api/movers/:cat` | GET | market movers by category |
| `/api/portfolio` | GET/POST/DELETE | portfolio CRUD |
| `/api/listings` | GET/POST/PUT/DELETE | marketplace listings |
| `/api/sellers` | GET/POST | seller profiles (POST requires auth; returns `{ seller }` on success) |
| `/api/stores` | GET | verified Guam stores |
| `/api/events` | GET | community events |
| `/api/cart` | GET/POST/DELETE | shopping cart |

### Auth routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/auth/google` | GET | Start Google OAuth flow (redirect to Google consent screen) |
| `/auth/callback` | GET | Google OAuth callback — exchange code for tokens, create/update user, redirect with `?auth_token=` (Bearer token via localStorage; cookie fallback) |
| `/auth/me` | GET | Return current authenticated user via Bearer token or cookie (or `{ authenticated: false }`) |
| `/auth/logout` | DELETE | Destroy auth session, clear cookie |

### Proxy routes
| Route | Target | Purpose | Notes |
|-------|--------|---------|-------|
| `/justtcg` | api.justtcg.com | condition pricing | API key injected server-side |
| `/topdeck` | topdeck.gg API | tournament data | API key injected server-side |
| `/chatbot` | text.pollinations.ai | chat relay | rate-limited |
| `/?target=` | allowlisted hosts | generic proxy | Adds `User-Agent: investMTG/1.0 (Cloudflare Worker)` header; use sparingly and keep allowlisted |

## Database schema

9 tables in the D1 database:
- `users` — Google-authenticated user accounts (google_id, email, name, picture, role)
- `auth_sessions` — HMAC-signed session tokens with 30-day expiry
- `prices`
- `portfolios` — has `user_id` FK to users
- `listings` — has `user_id` FK to users
- `sellers` — has `user_id` FK to users. Note: `session_token` column has NOT NULL + UNIQUE constraint; auth-based registrations use `'auth_<userId>'` as placeholder. On seller registration, user role is auto-promoted from 'buyer' to 'seller'.
- `events`
- `stores`
- `cart_items` — has `user_id` FK to users

## Security

- API keys must remain in encrypted worker secrets
- do not commit secrets to `wrangler.toml`, docs, or source files
- restrict origins to known production and development hosts
- rate-limit abuse-prone endpoints
- keep Guam-first marketplace messaging consistent in backend-generated copy where applicable

## Deployment

### Wrangler CLI

```bash
cd worker
npx wrangler deploy
```

Environment requirements:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### Database management

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

## Secrets management

```bash
echo "your-key-here" | npx wrangler secret put JUSTTCG_API_KEY
echo "your-key-here" | npx wrangler secret put TOPDECK_API_KEY
```

List configured secrets:

```bash
npx wrangler secret list
```

## Files

| File | Description |
|------|-------------|
| `worker.js` | Worker v3 source |
| `wrangler.toml` | deployment config with D1 and KV bindings |
| `schema.sql` | D1 database schema |
| `seed.sql` | Guam store and event seed data |

## Live URL

`https://investmtg-proxy.bloodshutdawn.workers.dev`

## Release checklist

When the worker changes:
- confirm route documentation still matches behavior
- confirm no secret values appear in tracked files
- confirm front-end docs still describe the worker as a separate deployment surface
- confirm the frontend service worker version was bumped if any API response shapes changed (stale-cache prevention)
