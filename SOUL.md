# SOUL.md — The Fair Play Economy

## About

investMTG is a Guam-first Magic: The Gathering marketplace and pricing experience built to reduce information gaps for island players.

The modern direction is straightforward:
- real reference pricing
- local seller trust
- cleaner buying and selling flows
- Guam-only fulfillment framing

If we cannot support a claim with real data, we do not present it as fact.

## Vision

To become the most trusted place for Guam players to check card value, compare local opportunities, and list cards with confidence.

## Mission

Build a cleaner, more honest local MTG experience for Guam players using transparent pricing, simpler workflows, and product decisions that favor trust over noise.

## Brand

**Name:** investMTG  
**Tagline:** Real cards. Real data. Fair play.

### Brand voice
- direct
- calm
- local-first
- transparent
- confident without hype

## Product principles

### 1. Guam-first by design
- marketplace language is for Guam only
- pickup and island delivery come before any broader commerce framing
- seller flows should make meetup zones, response expectations, and local delivery rules explicit

### 2. No fake market signals
- no fabricated trend data
- no fake price history
- no fake seller activity
- no invented liquidity signals

### 3. Reference pricing must stay clear
- Scryfall is the primary reference layer for card data, images, and live prices
- external market reference links may point to TCGplayer when available through Scryfall purchase URIs
- Cardmarket is not part of the modern Guam-first buyer flow

### 4. Trust beats clutter
- every main screen should have a clear primary action
- feedback must be explicit, especially on seller actions
- local trade expectations should be visible, not implied

### 5. Ship code and docs together
A release is not complete until the docs and release notes are updated in the same session.

Required updates after release-impacting work:
- `README.md`
- `BUILD_SPEC.md`
- `CHANGES.md`
- `SOUL.md`
- `worker/README.md` when worker behavior changes
- a security check for secrets and sensitive credentials

## Architecture principles

### Front end
The production front end is the root-level SPA: vanilla JavaScript with React 18.3.1 loaded via import maps from self-hosted vendor bundles. There is no build step — the repository root is deployed directly to GitHub Pages.

Coding rules (must be followed in all root-level JS files):
- `var h = React.createElement;` — no JSX, no Babel transform
- `var ref = React.useState()` with `ref[0]` / `ref[1]` — no array destructuring
- `var` only — no `let` or `const`
- `function` keyword only — no arrow functions inside component bodies
- Native ES modules via `<script type="module">` and import maps
- React 18.3.1 and ReactDOM 18.3.1 self-hosted in `vendor/`

Key characteristics:
- hash-based routing
- static-hosting friendly (no server-side rendering)
- all API data flows through the Worker v3 backend
- Google OAuth 2.0 for persistent user accounts (sellers and buyers)
- `frontend-v2/` exists in the repository as an experimental TypeScript/Vite rewrite but is **not deployed** and is not the production source of truth

### Worker
The Cloudflare Worker (v3) remains a separate gateway for protected or proxied API access, and carries the D1 + KV-backed server-side architecture plus Google OAuth authentication.

## Data sources

| Data | Source | Notes |
|------|--------|-------|
| Card search and reference prices | [Scryfall API](https://scryfall.com/docs/api) | Primary reference layer |
| External market reference links | [TCGplayer](https://www.tcgplayer.com) | Only when surfaced by Scryfall purchase URIs |
| Condition pricing | [JustTCG](https://justtcg.com) | Worker-backed integration |
| Tournament and meta data | [TopDeck.gg](https://topdeck.gg), [EDH Top 16](https://edhtop16.com) | Worker-backed integrations |
| Decklist imports | [Moxfield](https://moxfield.com) | Integrated as needed |
| Proxy / gateway | Cloudflare Worker | Secret-backed API routing |
| User accounts | Google OAuth 2.0 | Authentication via Google sign-in, accounts stored in D1 |
| Server-side persistence | Cloudflare D1 | Users, auth sessions, listings, sellers, stores, events, cart, portfolio |
| Edge cache | Cloudflare KV | Cached market and discovery responses |

## What we do not do

- show Cardmarket as part of the modern Guam-first buyer flow
- rely on fake listing activity to make the market look alive
- imply global-shipping capability in a Guam-only product mode
- treat `frontend-v2/` as the production deployment — it is an experimental rewrite, not deployed

## Release discipline

Before any go-live push:
1. verify the root SPA loads correctly (no build step required)
2. test on mobile Safari and Chrome to verify no blank screen
3. verify no secrets were committed
4. verify the Pages workflow still publishes the root directory directly
5. verify worker docs and bindings still match the deployed backend
6. update the required docs in the same session

## Changelog

| Date | Change |
|------|--------|
| 2026-03-08 | Step-based listing wizard (3-step flow: search → pick printing → details), auto-confirm on blur/Enter, new lf-* CSS system, removed broken 2-column layout; SW v14 |
| 2026-03-08 | 2-column listing form with printings browser panel (grid/list views), fixed listing creation for trade listings (price=0 bug), better error messages; SW v13 |
| 2026-03-08 | Seller listing improvements: set autocomplete via Scryfall printings API, CSV/Manabox bulk import tab, card preview thumbnails, CX polish; SW v12 |
| 2026-03-08 | Full-stack deployment audit: fixed Moxfield CORS (Decks page), added User-Agent to worker proxy, seller role auto-promotion, DB session cleanup; SW v11 |
| 2026-03-08 | Seller registration fix + ListingModal CSS: fixed D1 NOT NULL constraint on session_token for auth-based seller registration; added all missing mp-modal CSS for ListingModal; SW v10 |
| 2026-03-08 | Card detail button hardening & SW auto-reload: try-catch + toast feedback on all button handlers, SW v9 with postMessage auto-reload to eliminate stale-cache bugs |
| 2026-03-08 | Centralized safe localStorage wrapper (`utils/storage.js`): prevents JSON.parse crashes from corrupted values, migrated all 10 files to use it, SW v8 |
| 2026-03-08 | Full site debug: Bearer token auth (cookie-based failed in modern browsers), Featured card pricing fix (physical-only fallback), SW v7 |
| 2026-03-08 | Google OAuth authentication: persistent user accounts for sellers and buyers, Worker v3 with auth routes, frontend auth UI |
| 2026-03-08 | Self-hosted React: eliminated esm.sh redirect chains, vendor/ bundles, SW v4 |
| 2026-03-08 | Fixed mobile black screen: loading fallbacks, SW v3, es-module-shims polyfill for pre-iOS 16.4 browsers |
| 2026-03-08 | Wired root-level SPA to Cloudflare Worker v2 backend; site live at www.investmtg.com; deploy workflow updated to publish root directory directly |
| 2026-03-08 | Formalized `frontend-v2/` as an experimental rewrite (not deployed); root-level SPA confirmed as the production front end |
| 2026-03-08 | Established the Cloudflare Worker v2 backend with D1 database and KV cache support |
| 2026-03-08 | Added release rule that code, docs, and security review ship together |

---

When in doubt, choose the simpler, more honest product behavior.
