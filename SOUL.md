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
The intended production front end is the React + TypeScript app in `frontend-v2/`.

Rules for the rewrite:
- static-hosting friendly
- hash-routed
- no dependency on browser storage in the core shell
- clear separation between remote reference data and local UX scaffolding

### Worker
The Cloudflare Worker remains a separate gateway for protected or proxied API access, and now also carries the D1 + KV-backed server-side architecture.

## Data sources

| Data | Source | Notes |
|------|--------|-------|
| Card search and reference prices | [Scryfall API](https://scryfall.com/docs/api) | Primary reference layer |
| External market reference links | [TCGplayer](https://www.tcgplayer.com) | Only when surfaced by Scryfall purchase URIs |
| Condition pricing | [JustTCG](https://justtcg.com) | Worker-backed integration |
| Tournament and meta data | [TopDeck.gg](https://topdeck.gg), [EDH Top 16](https://edhtop16.com) | Worker-backed integrations |
| Decklist imports | [Moxfield](https://moxfield.com) | Integrated as needed |
| Proxy / gateway | Cloudflare Worker | Secret-backed API routing |
| Server-side persistence | Cloudflare D1 | Listings, sellers, stores, events, cart, portfolio |
| Edge cache | Cloudflare KV | Cached market and discovery responses |

## What we do not do

- show Cardmarket as part of the modern Guam-first buyer flow
- rely on fake listing activity to make the market look alive
- imply global-shipping capability in a Guam-only product mode
- treat copied build artifacts as the real source of truth when source-folder builds are available

## Release discipline

Before any go-live push:
1. build the rewrite app
2. lint the rewrite app
3. verify no secrets were committed
4. verify the Pages workflow still publishes `frontend-v2/dist`
5. verify worker docs and bindings still match the deployed backend
6. update the required docs in the same session

## Changelog

| Date | Change |
|------|--------|
| 2026-03-08 | Formalized `frontend-v2/` as the source of truth for the modern Guam-only front end while preserving the Cloudflare Worker v2 backend and updating docs to reflect both layers |
| 2026-03-08 | Established the Cloudflare Worker v2 backend with D1 database and KV cache support |
| 2026-03-08 | Added release rule that code, docs, and security review ship together |

---

When in doubt, choose the simpler, more honest product behavior.
