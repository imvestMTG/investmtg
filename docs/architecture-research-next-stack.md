# investMTG Architecture Research

> **Status:** Saved for future implementation — potential stack migration from vanilla JS to Next.js  
> **Source:** https://claude.ai/public/artifacts/f73a83c7-17a3-4646-966a-d7989b56fa7a  
> **Saved:** 2026-03-18  
> **Context:** User asked Claude to research the best code architecture and infrastructure for a Guam-based MTG community marketplace, including whether to upgrade from the current React JS vanilla approach.

---

## Recommended Stack (Solo Dev Optimized)

| Category | Technology | Description |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | SSR for SEO on card pages, API routes for webhooks/Stripe, Server Actions for mutations. Deploys to Vercel with zero config. |
| Language | **TypeScript** | Type safety across Scryfall data, Stripe objects, and DB models. Catches bugs before production. |
| Styling | **Tailwind CSS v4 + shadcn/ui** | Utility-first CSS with pre-built accessible components. No design system to maintain. |
| Database | **Supabase (PostgreSQL)** | Managed Postgres with built-in auth, real-time subscriptions, Row Level Security, and generous free tier. Pacific region available (Singapore). |
| Cache | **Cloudflare KV + R2** | KV for Scryfall card cache (edge-fast lookups). R2 for card images (zero egress fees). Already have Cloudflare connected. |
| Payments | **Stripe Connect (Express)** | Multi-vendor payouts to Guam sellers. Express accounts = Stripe handles onboarding/KYC. $2/mo per active seller. |
| Auth | **Supabase Auth (or NextAuth.js)** | Email/password + magic link + OAuth. Row-level security ties DB permissions to auth state. |
| Hosting | **Vercel (frontend) + Cloudflare Workers (background jobs)** | Vercel for Next.js SSR/ISR. Cloudflare Workers for webhook polling, scheduled Scryfall sync, and queue processing. |
| Search | **Meilisearch (self-hosted on Fly.io) or Supabase full-text** | Card search needs to be fast and fuzzy. Meilisearch handles typo-tolerance natively. Start with Supabase FTS, upgrade if needed. |

### Why This Stack for Guam

- **Solo developer reality.** Every technology choice must minimize ops burden. Managed services (Supabase, Vercel, Cloudflare) mean you're not patching servers at 2am Guam time.
- **Pacific latency.** Guam sits 1,500 miles from the nearest major cloud region (Tokyo). Cloudflare's edge network has 330+ PoPs globally. Supabase's Singapore region (~2,500mi) gives better DB latency than US-East (~7,800mi).
- **US jurisdiction, island economics.** Guam uses USD, is a US territory, and Stripe operates there. But shipping is expensive and slow — a local marketplace with in-person pickup is a killer advantage over TCGplayer.
- **Community scale.** Serving hundreds to low-thousands of users, not millions. Start monolithic (Next.js handles everything) and extract services when bottlenecks appear.

### Architecture Pattern

- **Modular monolith → eventual extraction.** Start with everything in one Next.js repo. Organize code into clear domain modules (cards, listings, orders, users, pricing). When a module becomes a bottleneck, extract it to a dedicated Cloudflare Worker.
- **API-first design.** Even within the monolith, build internal APIs between modules. This makes future extraction painless.

---

## Stack Comparison

### Frontend Framework Comparison

| FRAMEWORK | SEO | SOLO DEV DX | STRIPE/PAYMENT | MARKETPLACE FIT | GUAM EDGE |
|---|---|---|---|---|---|
| **Next.js 15** *(RECOMMENDED)* | ★★★★★ SSR/ISR | ★★★★★ Vercel deploy | ★★★★★ Native guides | ★★★★★ Full-stack | ★★★★ Vercel CDN |
| Remix | ★★★★★ SSR | ★★★★ Good DX | ★★★★ Works well | ★★★★ Full-stack | ★★★ Fly.io needed |
| SvelteKit | ★★★★★ SSR | ★★★★★ Best DX | ★★★ Fewer guides | ★★★ Smaller ecosystem | ★★★ Vercel/CF |
| Nuxt (Vue) | ★★★★★ SSR | ★★★★ Good DX | ★★★★ Works well | ★★★★ Good ecosystem | ★★★★ Vercel CDN |
| Vanilla HTML/JS | ★★★ Manual | ★★ No tooling | ★★ Manual | ★ Not viable | ★★★★★ Pure static |

### Database Comparison

| DATABASE | TYPE | FREE TIER | NEAREST REGION | REAL-TIME | AUTH BUILT-IN |
|---|---|---|---|---|---|
| **Supabase** *(RECOMMENDED)* | Managed Postgres | 500MB, 50K MAU | Singapore (~2,500mi) | ★★★★★ WebSocket | ★★★★★ Yes |
| Cloudflare D1 | Serverless SQLite | 5M reads/day | Edge (global) | ★★ No native | ★ No |
| PlanetScale | Managed MySQL | 1GB (sunset?) | Tokyo (~1,500mi) | ★★★ Via Vitess | ★ No |
| Neon | Serverless Postgres | 512MB | Singapore | ★★★ Logical replication | ★ No |
| Railway Postgres | Managed Postgres | $5 credit/mo | US-West | ★★ Standard PG | ★ No |

### Hosting & Edge Comparison

| PLATFORM | EDGE POPS | SERVERLESS | COST (HOBBY) | GUAM LATENCY | EXTRAS |
|---|---|---|---|---|---|
| **Vercel** *(RECOMMENDED)* | 126 PoPs | ★★★★★ | Free → $20/mo | Good (edge cache) | Native Next.js |
| Cloudflare Pages | 330+ PoPs | ★★★★★ Workers | Free → $5/mo | ★★★★★ Best edge | D1, R2, KV, Queues |
| Fly.io | 35 regions | ★★★★ Machines | $0 → usage | Tokyo region | Full VM control |
| Railway | US/EU only | ★★★★ Containers | $5/mo credit | Poor for Guam | Easy Postgres |
| AWS Amplify | CloudFront CDN | ★★★★ Lambda | Free tier | Good (CF edge) | Full AWS |

---

## Guam-Optimized Infrastructure Map

```
┌─────────────────────────────────────────────────────────────────┐
│  GUAM USER (Browser/Mobile)                                      │
│  ↓                                                               │
│  Cloudflare CDN (edge PoP closest to Guam)                       │
│  ├── Static assets (HTML, CSS, JS, images) → instant             │
│  ├── Cloudflare KV → card data cache → <5ms reads                │
│  └── Cloudflare R2 → card images → zero egress                   │
│       ↓                                                          │
│  Vercel Edge Network                                             │
│  ├── Next.js SSR/ISR (Singapore or Tokyo region)                 │
│  ├── API Routes (Stripe webhooks, auth callbacks)                │
│  └── Server Actions (listing CRUD, order creation)               │
│       ↓                                                          │
│  Supabase (Singapore region)                                     │
│  ├── PostgreSQL (listings, orders, users, prices)                │
│  ├── Auth (email/password, magic link, OAuth)                    │
│  ├── Realtime (live listing updates, chat)                       │
│  └── Storage (user uploads: card photos for condition)           │
│       ↓                                                          │
│  Cloudflare Workers (background jobs)                            │
│  ├── Delver X webhook poller (per-seller long-poll)              │
│  ├── Scryfall bulk sync (daily cron via Cron Triggers)           │
│  ├── Price update pipeline (daily: TCG, MKM, CK)                │
│  └── Queue processing (Cloudflare Queues)                        │
│       ↓                                                          │
│  External APIs                                                   │
│  ├── Scryfall API (card data, images, bulk files)                │
│  ├── Stripe Connect (seller payouts, buyer checkout)             │
│  └── Delver X Webhook Server (scan-to-list pipeline)             │
└─────────────────────────────────────────────────────────────────┘
```

### Latency Optimization Strategy

- **Edge-cache card data in Cloudflare KV** — Download Scryfall bulk data daily via a Cloudflare Worker cron job. Card detail lookups hit the edge (<5ms) instead of traversing to Supabase Singapore (~60-80ms from Guam).
- **Card images via R2 with Cloudflare CDN** — Mirror Scryfall card images to R2 during the daily sync. Zero egress fees. Users on Guam's often unreliable internet get faster loads from cached edge images.
- **ISR for card pages on Vercel** — Use Incremental Static Regeneration for individual card pages. Pages are generated at build time + revalidated every 24h. First visit is edge-cached; subsequent visits are instant.
- **Supabase in Singapore, not US-East** — Singapore is the nearest Supabase region to Guam (~2,500 miles vs ~7,800 to Virginia). Reduces round trip time for transactional queries.

---

## Data Architecture — Supabase PostgreSQL Schema

```sql
-- users
-- id                  UUID PK (Supabase Auth)
-- display_name        TEXT
-- email               TEXT UNIQUE
-- stripe_account_id   TEXT (Connect account)
-- stripe_onboarded    BOOLEAN
-- location_village    TEXT (Guam village/base)
-- created_at          TIMESTAMPTZ

-- cards (populated from Scryfall bulk data)
-- scryfall_id         TEXT PK
-- oracle_id           TEXT
-- name                TEXT
-- set_code            TEXT
-- collector_number    TEXT
-- rarity              TEXT
-- type_line           TEXT
-- mana_cost           TEXT
-- color_identity      TEXT[]
-- image_uri           TEXT
-- price_usd           DECIMAL
-- price_usd_foil      DECIMAL
-- price_eur           DECIMAL
-- legalities          JSONB
-- updated_at          TIMESTAMPTZ

-- listings
-- id                  UUID PK
-- seller_id           FK → users
-- scryfall_id         FK → cards
-- condition           TEXT (NM/LP/MP/HP/DMG)
-- finish              TEXT (regular/foil/etched)
-- language            TEXT DEFAULT 'en'
-- quantity            INT
-- price               DECIMAL
-- suggested_price     DECIMAL
-- status              TEXT (draft/active/sold/removed)
-- pickup_location     TEXT (village or "ship")
-- source              TEXT (manual/delver/csv)
-- delver_uuid         TEXT UNIQUE (dedup key)
-- raw_payload         JSONB
-- photos              TEXT[] (Supabase Storage URLs)
-- created_at          TIMESTAMPTZ

-- orders
-- id                  UUID PK
-- buyer_id            FK → users
-- seller_id           FK → users
-- stripe_session_id   TEXT
-- stripe_payment_id   TEXT
-- total               DECIMAL
-- platform_fee        DECIMAL
-- status              TEXT (pending/paid/pickup/shipped/complete)
-- fulfillment_type    TEXT (pickup/ship)
-- meetup_location     TEXT
-- meetup_time         TIMESTAMPTZ
-- created_at          TIMESTAMPTZ

-- order_items
-- id                  UUID PK
-- order_id            FK → orders
-- listing_id          FK → listings
-- quantity            INT
-- price_at_purchase   DECIMAL

-- seller_webhooks (Delver X integration)
-- id                  UUID PK
-- seller_id           FK → users
-- endpoint_url        TEXT (encrypted)
-- is_active           BOOLEAN
-- last_polled_at      TIMESTAMPTZ
```

### External API Dependencies

| API | PURPOSE | RATE LIMIT | COST | NOTES |
|---|---|---|---|---|
| Scryfall | Card data + images | 10 req/sec | Free | Use bulk data. Cache 24h. Respect User-Agent. |
| Stripe Connect | Payments + seller payouts | 100 req/sec (test) | $2/active acct/mo | Express accounts for Guam sellers. |
| Delver X Webhooks | Scan-to-list pipeline | N/A (event-driven) | Pro: $4.99/mo/seller | Polling model. Sellers need own Pro sub. |
| Supabase | DB + Auth + Realtime | Standard PG limits | Free → $25/mo | Singapore region for Guam latency. |
| Cloudflare | CDN + KV + R2 + Workers | 100K Workers/day free | Free → $5/mo | Already connected. Best edge for Pacific. |

---

## Monthly Cost Projection

### Phase 1: Launch (0-500 users)

| SERVICE | TIER | COST/MO | NOTES |
|---|---|---|---|
| Vercel | Hobby | $0 | 100GB bandwidth, fine for launch |
| Supabase | Free | $0 | 500MB DB, 50K MAU, 1GB storage |
| Cloudflare | Free | $0 | 100K Worker requests/day, 1GB KV |
| Stripe Connect | Pay-as-go | ~$2-10 | 2.9% + 30¢ per txn + $2/active seller |
| Domain | investmtg.com | ~$12/yr | Already owned |
| **TOTAL** | | **$0-12/mo** | **Essentially free to launch** |

### Phase 2: Growth (500-5,000 users)

| SERVICE | TIER | COST/MO | NOTES |
|---|---|---|---|
| Vercel | Pro | $20 | 1TB bandwidth, team features |
| Supabase | Pro | $25 | 8GB DB, 100K MAU, 100GB storage |
| Cloudflare | Workers Paid | $5 | 10M requests, more KV/R2 |
| Stripe Connect | Pay-as-go | ~$50-200 | Scales with GMV |
| Meilisearch (Fly.io) | Shared VM | $5-15 | If needed for card search |
| **TOTAL** | | **$55-265/mo** | **Scales with revenue** |

Revenue model note: At a 5% platform fee, you need ~$1,100-$5,300/mo in GMV to cover Phase 2 costs.

---

## Build Roadmap

### Phase 1 — Foundation (Weeks 1-4)
- Initialize Next.js 15 project with TypeScript, Tailwind, shadcn/ui
- Set up Supabase project (Singapore region) with auth + schema
- Implement Scryfall bulk data sync as a Cloudflare Worker cron job
- Build card search page with ISR (static generation + revalidation)
- Basic card detail pages with pricing data from Scryfall
- Deploy to Vercel, configure investmtg.com domain

### Phase 2 — Marketplace Core (Weeks 5-8)
- User registration + auth (Supabase Auth)
- Seller onboarding with Stripe Connect Express
- Listing creation flow (manual: select card, set condition/price)
- Listing browsing + filtering (by set, price, condition, seller location)
- Cart + checkout with Stripe Checkout Sessions
- Order management (buyer/seller views, status tracking)

### Phase 3 — Guam-Specific Features (Weeks 9-12)
- In-person pickup coordination (meetup location, time scheduling)
- Village/base location tagging for sellers and listings
- Delver X webhook integration (scan-to-list pipeline)
- CSV / .dlens bulk import as fallback
- Seller dashboard with real-time draft listing feed
- Price intelligence page (compare your collection to market)

### Phase 4 — Community & Growth (Weeks 13-16)
- cEDH league integration (link deck lists to card availability)
- Seller reputation / ratings system
- Price alerts and watchlists
- Mobile PWA optimization (installable, offline card browsing)
- Social sharing (listing cards to Facebook/Instagram)
- Military community outreach features (MWR/USO venue integration)

### Key Decision Points

- **Week 4:** Evaluate if Supabase full-text search is good enough for card search, or if you need Meilisearch.
- **Week 8:** Decide on platform fee structure. Recommend starting at 5% to undercut TCGplayer, with $0 listing fees.
- **Week 12:** Assess if Delver X webhook integration is generating enough adoption to justify maintaining the polling infrastructure.
- **Week 16:** Evaluate whether to pursue Guam business license for marketplace operation.
