# investmtg-proxy Worker (v3)

Cloudflare Worker that serves as the unified backend for investMTG — combining API gateway, CORS proxy, D1 database, KV edge caching, and Google OAuth 2.0 authentication.

## Role in the stack

- the front end is the root-level SPA (vanilla JS, React 18.3.1 via self-hosted vendor bundles) deployed directly to GitHub Pages from the repository root — no build step
- the Seller Dashboard now uses a step-based listing wizard that queries Scryfall's printings API directly (browser-side, not proxied) for card search and set selection, auto-confirms on blur/Enter, and submits bulk imports via `/api/listings/batch` (single batch call, max 500)
- `POST /api/listings` validates `body.price == null` (not `!body.price`) to allow `price=0` for trade-only listings
- the worker remains the secure layer for proxied API access, server-side data, and protected integrations
- the domain can continue to sit behind Cloudflare while the front-end files are served from GitHub Pages
- the frontend has a 6-second safety timeout on its `Promise.all` backend calls — if the worker does not respond in time, the loading gate is cleared and the app renders with localStorage fallbacks rather than showing a blank screen
- all frontend localStorage access goes through `utils/storage.js` — a centralized wrapper that prevents JSON.parse crashes from corrupted values

## Architecture

```text
Root-level SPA (GitHub Pages)  ──→  Worker (investmtg-proxy)  ──→  Scryfall API
                                    │                    ──→  JustTCG API
                                    │                    ──→  MTGStocks API
                                    │                    ──→  TopDeck.gg API
                                    │                    ──→  Pollinations AI
                                    │                    ──→  Google OAuth
                                    │                    ──→  SumUp Checkouts API
                                    ├── D1 Database (investmtg-db)
                                    └── KV Cache (INVESTMTG_CACHE)
```

## Bindings

| Binding | Type | Resource |
|---------|------|----------|
| `DB` | D1 Database | `investmtg-db` — SQLite database with 11 tables |
| `CACHE` | KV Namespace | `INVESTMTG_CACHE` — edge cache |
| `JUSTTCG_API_KEY` | Secret | JustTCG API key (encrypted) |
| `TOPDECK_API_KEY` | Secret | TopDeck.gg API key (encrypted) |
| `GOOGLE_CLIENT_ID` | Secret | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Secret | Google OAuth client secret |
| `AUTH_SECRET` | Secret | HMAC key for auth session tokens (256-bit) |
| `FRONTEND_URL` | Secret | Frontend URL for OAuth callback redirect |
| `SUMUP_SECRET_KEY` | Secret | SumUp API secret key for creating checkouts |
| `ADMIN_TOKEN` | Secret | Admin bypass token — when `Authorization: Bearer <ADMIN_TOKEN>` is sent, `getAuthUser()` returns a synthetic admin user, bypassing Google OAuth. For testing only. |
| `RESEND_API_KEY` | Secret | Resend.com API key for transactional order confirmation emails |
| `ECHOMTG_API_KEY` | Secret | EchoMTG API key for graded pricing + set data |

## Routes

### Data endpoints
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | health check with storage stats (listings/prices/portfolios row counts), version 3.1.0 |
| `/api/ticker` | GET | tracked card prices |
| `/api/featured` | GET | Featured cards (12 commander staples, USD>$20, EDHREC-ranked). Daily auto-refresh via Scryfall cron; falls back to static list if KV empty. |
| `/api/trending` | GET | Trending cards (12 recent-set commander cards, USD>$1, EDHREC-ranked). Daily auto-refresh; falls back to static list. |
| `/api/budget` | GET | Budget staples (12 commander cards, $0.25–$5, EDHREC-ranked). Daily auto-refresh; falls back to static list. |
| `/api/admin/refresh-carousels` | POST | Admin-only: manually trigger carousel refresh from Scryfall + clear card data cache. Requires `Authorization: Bearer <ADMIN_TOKEN>`. |
| `/api/search` | GET | Scryfall-backed card search |
| `/api/card/:id` | GET | card detail proxy/cache |
| `/api/movers/:cat` | GET | market movers by category |
| `/api/portfolio` | GET/POST/PUT/DELETE | portfolio CRUD. POST accepts `condition` (NM/LP/MP/HP/DMG) and `binder_id`. PUT updates condition, binder, quantity, price on existing items. |
| `/api/portfolio/batch` | POST | batch portfolio import — auth required, max 500 items, D1 batch() in chunks of 50, INSERT OR REPLACE. Supports condition and binder_id. |
| `/api/binders` | GET/POST/PUT/DELETE | Binder CRUD (user-created card organizers with name, color, icon, sort_order). GET returns binders with card counts + unassigned count. Auth required. |
| `/api/lists` | GET/POST/PUT/DELETE | Virtual list CRUD (Wishlist, Buylist, Trade). List types: `wishlist`, `buylist`, `trade`. Auth required. |
| `/api/lists/:id/items` | GET/POST/DELETE | Manage cards within a list (card_id, card_name, quantity, target_price, condition, notes). UNIQUE on list_id + card_id. Auth required. |
| `/api/listings` | GET/POST/PUT/DELETE | marketplace listings — GET maps snake_case DB columns to camelCase for frontend (cardId, cardName, setName, seller, etc.) with backward-compat snake_case aliases. POST always sets image_uri='', storage optimization |
| `/api/listings/batch` | POST | batch listing creation — auth required, max 500, D1 batch() in chunks of 50, image_uri always empty |
| `/api/sellers` | GET/POST | seller profiles (POST requires auth; returns `{ seller }` on success) |
| `/api/stores` | GET | verified Guam stores |
| `/api/events` | GET | community events |
| `/api/cart` | GET/POST/DELETE | shopping cart |
| `/api/orders` | POST | create order (auth required; returns `GUM-YYYYMM-XXXXX` ID) |
| `/api/orders` | GET | list orders for authenticated user (newest first) |
| `/api/orders/:id` | GET | get single order by ID (owner-only) |
| `/api/sumup/checkout` | POST | Create a SumUp checkout (auth required). Accepts `{ amount, description, order_id }`. Calls SumUp Checkouts API with merchant code, returns `{ checkout_id, hosted_checkout_url }`. Sets `return_url` for webhook and `redirect_url` for post-payment redirect. Frontend mounts SumUp Card Widget with the returned checkout ID. |
| `/api/sumup-webhook` | POST | SumUp payment webhook. Receives `CHECKOUT_STATUS_CHANGED` events from SumUp. Validates by polling SumUp API with `SUMUP_SECRET_KEY`, then updates D1 order status to `confirmed` / `paid`. No auth required (validated server-side). |
| `/api/orders/:id/payment-status` | GET | Payment status polling (auth required, owner-only). If order has a `checkout_id`, polls SumUp API for real-time status (PENDING/PAID/FAILED/EXPIRED), maps to internal statuses, updates D1 on change. Used by OrderConfirmation.js for live payment tracking. |

### Auth routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/auth/google` | GET | Start Google OAuth flow (redirect to Google consent screen). Uses hardcoded `OAUTH_REDIRECT_URI` (`https://api.investmtg.com/auth/callback`) so consent screen shows `investmtg.com` branding. |
| `/auth/callback` | GET | Google OAuth callback — exchange code for tokens, create/update user, redirect with `?auth_token=` (Bearer token via localStorage; cookie fallback). Redirect URI must match the one registered in Google Cloud Console. |
| `/auth/me` | GET | Return current authenticated user via Bearer token or cookie (or `{ authenticated: false }`) |
| `/auth/logout` | DELETE | Destroy auth session, clear cookie |

### Proxy routes
| Route | Target | Purpose | Notes |
|-------|--------|---------|-------|
| `/justtcg` | api.justtcg.com | condition pricing | API key injected server-side |
| `/mtgstocks` | api.mtgstocks.com | price history | KV-cached 24hr. Requires `?print_id=N`. Returns print info + TCGplayer price history. |
| `/topdeck` | topdeck.gg API | tournament data | API key injected server-side |
| `/chatbot` | text.pollinations.ai | chat relay | rate-limited |
| `/echomtg` | www.echomtg.com | graded/slab pricing + set data | API key injected server-side; KV-cached (items 24hr, sets 30min) |
| `/?target=` | allowlisted hosts | generic proxy | Adds `User-Agent: investMTG/1.0 (Cloudflare Worker)` header; use sparingly and keep allowlisted |

## Database schema

11 tables in the D1 database:
- `users` — Google-authenticated user accounts (google_id, email, name, picture, role)
- `auth_sessions` — HMAC-signed session tokens with 30-day expiry
- `prices`
- `portfolios` — has `user_id` FK to users
- `listings` — has `user_id` FK to users
- `sellers` — has `user_id` FK to users. Note: `session_token` column has NOT NULL + UNIQUE constraint; auth-based registrations use `'auth_<userId>'` as placeholder. On seller registration, user role is auto-promoted from 'buyer' to 'seller'.
- `events`
- `stores`
- `cart_items` — has `user_id` FK to users
- `orders` — order records with items (JSON), totals, contact info, fulfillment, status, payment_status, checkout_id, sumup_txn_id. Uses `user_email` column (not user_id). Guest orders store `contact_email` as `user_email`. Auto-created by worker if missing. v33 adds ALTER TABLE migration for new payment columns on existing tables.
- `order_counters` — monthly sequential counter for `GUM-YYYYMM-XXXXX` order IDs. Atomic upsert via `ON CONFLICT DO UPDATE`.

## Scheduled tasks (Cron Triggers)

| Cron | UTC | Purpose |
|------|-----|---------|
| `0 3 * * *` | Daily at 3:00 AM | 1) Purge expired rows from `auth_sessions` 2) Purge stale `prices` cache entries older than 30 days 3) Refresh homepage carousel card selections from Scryfall (featured/trending/budget — 12 cards each, stored in KV with 25hr TTL) |

Defined in `wrangler.toml` under `[triggers]`. The `scheduled()` handler in `worker.js` runs all three tasks. Manual trigger available via `POST /api/admin/refresh-carousels` (requires ADMIN_TOKEN).

## Security

All API responses include HTTP security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`) via the `corsHeaders()` helper.

- API keys must remain in encrypted worker secrets
- do not commit secrets to `wrangler.toml`, docs, or source files
- restrict origins to known production and development hosts
- rate-limit abuse-prone endpoints
- keep Guam-first marketplace messaging consistent in backend-generated copy where applicable
- `ADMIN_TOKEN` provides a testing bypass for `getAuthUser()` — when `Authorization: Bearer <ADMIN_TOKEN>` is sent, the worker returns a synthetic admin user (`id: 'admin'`, `role: 'admin'`). This is for development/testing only and should not be exposed to end users.

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
echo "your-key-here" | npx wrangler secret put SUMUP_SECRET_KEY
echo "your-token-here" | npx wrangler secret put ADMIN_TOKEN
echo "re_xxxxx" | npx wrangler secret put RESEND_API_KEY
echo "your-echomtg-key" | npx wrangler secret put ECHOMTG_API_KEY
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

**Note:** The `events` table `image_key` column stores relative paths to local images (e.g., `images/event-tcgcon.webp`). As of v20, all event images use WebP format.

## Live URLs

- **Primary (custom domain):** `https://api.investmtg.com`
- **Legacy:** `https://investmtg-proxy.bloodshutdawn.workers.dev`

## Release checklist

When the worker changes:
- confirm route documentation still matches behavior
- confirm no secret values appear in tracked files
- confirm front-end docs still describe the worker as a separate deployment surface
- confirm the frontend service worker version was bumped if any API response shapes changed (stale-cache prevention)
- confirm `index.html` CSP `connect-src` includes any new backend domains (missed CSP updates silently block all fetch calls)
