# investMTG — Next.js Migration Scaffolding

> **Status:** Saved for future implementation  
> **Source:** https://claude.ai/public/artifacts/c83dcc63-973b-4f76-999c-27331fd3c15f  
> **Saved:** 2026-03-18  
> **Context:** Scaffolding file for potential migration from vanilla JS + GitHub Pages to Next.js 15 + Vercel + Supabase

---

## Stack

- **Framework**: Next.js 15 (App Router, Server Actions, TypeScript)
- **Database**: Supabase PostgreSQL (Singapore region) + Auth + Realtime
- **Payments**: Stripe Connect Express (multi-vendor payouts)
- **Card Data**: Scryfall API + daily bulk sync
- **Hosting**: Vercel (frontend) + Cloudflare Workers (background jobs)
- **Styling**: Tailwind CSS v4 + shadcn/ui

---

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo>
cd investmtg
npm install
```

### 2. Set up Supabase

1. Create a project at supabase.com — **choose Singapore region**
2. Run the migration: go to SQL Editor, paste `supabase/migrations/001_initial_schema.sql`, and execute
3. Copy your project URL and keys

### 3. Set up Stripe

1. Create a Stripe account at stripe.com
2. Enable Stripe Connect in your dashboard
3. Copy your API keys

### 4. Configure environment

```bash
cp .env.local.example .env.local
# Fill in your Supabase, Stripe, and Cloudflare credentials
```

### 5. Run locally

```bash
npm run dev
```

Open http://localhost:3000.

### 6. Deploy to Vercel

```bash
npx vercel
```

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Login, register
│   ├── (marketplace)/      # Cards, listings, cart, checkout
│   ├── (dashboard)/        # Seller dashboard
│   └── api/                # Webhook endpoints, cron jobs
├── components/             # Reusable UI components
│   ├── ui/                 # Base components (shadcn/ui)
│   ├── cards/              # Card display components
│   ├── listings/           # Listing components
│   └── layout/             # Nav, footer, sidebar
├── lib/                    # Business logic & API clients
│   ├── db/                 # Supabase client (server + browser)
│   ├── stripe/             # Stripe Connect + Checkout
│   ├── scryfall/           # Card data API + bulk sync
│   └── delver/             # Delver X webhook integration
├── types/                  # TypeScript types
├── hooks/                  # React hooks
└── styles/                 # Global CSS + design tokens

supabase/
└── migrations/             # Database schema + RLS policies

workers/
├── scryfall-sync/          # Cloudflare Worker: daily bulk data sync
└── delver-poller/          # Cloudflare Worker: webhook polling
```

---

## Key Architecture Decisions

- **Supabase Singapore** for lowest DB latency from Guam (~2,500mi vs ~7,800mi to US-East)
- **Scryfall bulk data** cached in Cloudflare KV for edge-fast card lookups
- **Stripe Connect Express** so sellers handle their own KYC via Stripe
- **Delver X webhooks** for scan-to-list (sellers need Delver Pro at $4.99/mo)
- **Row Level Security** on all tables — no data leaks by design
- **ISR card pages** — statically generated, revalidated daily for SEO

---

## Migration Notes (from current stack)

### What carries over
- Cloudflare Workers infrastructure (already deployed, keep for background jobs)
- Cloudflare KV cache (already populated with card data)
- Domain configuration (investmtg.com already on Cloudflare)
- All business logic and pricing algorithms
- SOUL.md principles and rules

### What changes
- Frontend: vanilla JS + React.createElement → Next.js 15 + TypeScript + JSX
- Styling: single style.css → Tailwind CSS v4 + shadcn/ui
- Database: Cloudflare D1 (SQLite) → Supabase PostgreSQL (Singapore)
- Auth: custom Google OAuth on Worker → Supabase Auth (multi-provider)
- Hosting: GitHub Pages → Vercel
- Payments: PayPal + SumUp → Stripe Connect Express
- Routing: hash-based (#home, #search) → file-based (/home, /search) with SEO

### Data migration required
- D1 tables → Supabase PostgreSQL (users, listings, orders, sellers, etc.)
- localStorage persistence → Supabase row-level storage
- KV cache data can stay in Cloudflare KV (shared between stacks)

---

## License

Private — © investMTG
