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

### 4. Pricing transparency is non-negotiable
- Every price displayed on the site must be traceable to a named, verifiable data source
- The Pricing & Data Sources page (`#pricing`) explains every data pipeline, update frequency, and limitation in plain language
- Inline attribution appears alongside prices on card detail, market movers, and listing forms so users never have to guess where a number came from
- If a data source is unavailable, we show nothing rather than fabricating a fallback
- Suggested prices are never binding — sellers always set their own asking price

### 5. Trust beats clutter
- every main screen should have a clear primary action
- feedback must be explicit, especially on seller actions
- local trade expectations should be visible, not implied

### 6. Ship code and docs together
A release is not complete until the docs and release notes are updated in the same session.

Required updates after release-impacting work:
- `README.md`
- `BUILD_SPEC.md`
- `CHANGES.md`
- `SOUL.md`
- `worker/README.md` when worker behavior changes
- a security check for secrets and sensitive credentials

### 7. QA before every push
No code reaches `main` without passing QA. Every push must include verification, not just implementation.

**Pre-push QA checklist** (minimum):
1. **CSP alignment** — Run `grep -roh 'https://[a-zA-Z0-9._-]*' --include='*.js' . | sort -u` against the `connect-src` in `index.html`. Every external domain the frontend fetches from must be in the CSP. A single missing entry silently kills all calls to that domain with zero visible error.
   - *Why this exists: v19 — sign-in was broken for an entire session because `api.investmtg.com` was missing from CSP after the domain migration. The backend was 100% working; the browser was blocking the requests before they ever left.*
2. **URL centralization** — Run `grep -rn 'https://' --include='*.js' . | grep -v vendor | grep -v worker | grep -v node_modules`. Every backend URL in frontend code must come from `config.js PROXY_BASE`. No hardcoded proxy URLs.
   - *Why this exists: v19 audit — 4 API modules still pointed to the old `.workers.dev` URL after the domain migration. The CSP fix would have broken JustTCG, EDH Top 16, Moxfield, and TopDeck data.*
3. **Auth flow smoke test** — After any auth-related change, verify the full loop: `signIn()` → Google consent → `/auth/callback` → `?auth_token=` in URL → token stored → `checkAuth()` returns user → Header shows user name. If you cannot test the full loop (auth-gated), verify each leg independently.
4. **Visual verification** — Screenshot the live URL after push. Do not trust "it should work" — verify it does. The screenshot tool captures early, so wait for the full render.
5. **Console error check** — Open the browser console on the live site. Zero errors is the standard. CSP violations, failed fetches, and module import errors all show here.

### 8. Security posture
Security is not optional. Every session must verify these constraints.

**Secrets and credentials:**
- No API keys, tokens, client secrets, or passwords in frontend code. Ever.
- All secret-backed API calls route through the Cloudflare Worker. The worker injects secrets server-side.
- `SumUp public key` is the only exception — it is designed by SumUp to be client-side.
- After every commit, run `grep -rn 'API_KEY\|SECRET\|password\|token.*=.*["'\']' --include='*.js' . | grep -v vendor | grep -v node_modules | grep -v worker/` and verify zero matches leak real values.
- *Why this exists: early builds had JustTCG and TopDeck API keys exposed in client-side JS. They were moved behind the worker proxy, but the pattern must never recur.*

**Content Security Policy (CSP):**
- The CSP in `index.html` is a security boundary. It controls what the browser is allowed to connect to, load scripts from, embed frames from, and display images from.
- Any change to backend URLs, third-party integrations, or external services must include a corresponding CSP update.
- The CSP is the first thing to check when any `fetch()` call fails silently.
- *Why this exists: the v18→v19 CSP mismatch was invisible in the network tab, returned no error message, and took multiple sessions and a diagnostic page to identify. A 30-second grep would have caught it.*

**OAuth and authentication:**
- OAuth client ID and client secret are stored as Cloudflare Worker secrets, never in frontend code.
- The `OAUTH_REDIRECT_URI` is hardcoded in the worker (not derived from `url.origin`) to prevent redirect attacks and ensure the Google consent screen shows `investmtg.com`.
- Auth tokens are stored in localStorage via `storageSetRaw()` (not cookies — cross-site cookies are blocked by modern browsers).
- The `/auth/me` endpoint is the single source of truth for "is this user authenticated." If it fails, the user is not signed in. Period.
- *Why this exists: the original OAuth implementation used `url.origin` to build the redirect URI, which resolved to the `.workers.dev` domain and made Google show "bloodshutdawn.workers.dev" on the consent screen.*

**Data integrity:**
- `storageGet()` / `storageSet()` from `utils/storage.js` is the only way to read/write localStorage. Direct `localStorage.getItem()` is banned. The wrapper prevents `JSON.parse` crashes from corrupted values.
- *Why this exists: v8 — a `JSON.parse(undefined)` crash caused a blank screen that was hard to reproduce because it only happened with corrupted localStorage data.*

### 9. QC audit triggers
A targeted codebase audit must happen when any of these conditions are true:

1. **Domain or URL migration** — When any backend URL changes (e.g., `.workers.dev` to custom domain), audit every file that references the old URL. Check CSP, check config imports, check hardcoded strings.
2. **New third-party integration** — When adding a new external API or SDK, verify: CSP allows it, the URL is centralized in config, the API key (if any) is server-side only.
3. **Auth flow changes** — When anything in the sign-in/sign-out path changes, verify the full loop end-to-end. Auth bugs are invisible and cascade.
4. **3+ rapid releases** — When shipping 3 or more versions in a single session, pause and run the pre-push QA checklist against the cumulative diff, not just the last commit. Fast iteration accumulates silent drift.
5. **User-reported "it doesn't work"** — Before debugging application logic, check CSP, check network tab, check console. The browser may be blocking things before the code even runs.

The audit scope: CSP alignment, URL centralization, auth flow trace, error handling (silent catches), dead code (unused exports/files), and doc accuracy.

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
- all API data flows through the Worker v3 backend at `api.investmtg.com`
- Google OAuth 2.0 for persistent user accounts (sellers and buyers); OAuth redirect uses the custom domain so Google consent screen shows `investmtg.com`
- `frontend-v2/` was removed in v20 (dead code cleanup — it was an abandoned TypeScript/Vite rewrite)

### Worker
The Cloudflare Worker (v3) is the secure backend at `api.investmtg.com` (custom domain) with the legacy `.workers.dev` URL still active. It serves as the gateway for protected or proxied API access, and carries the D1 + KV-backed server-side architecture plus Google OAuth authentication.

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
| Server-side persistence | Cloudflare D1 | Users, auth sessions, listings, sellers, stores, events, cart, portfolio, orders, order counters |
| Edge cache | Cloudflare KV | Cached market and discovery responses |

## What we do not do

- show Cardmarket as part of the modern Guam-first buyer flow
- rely on fake listing activity to make the market look alive
- imply global-shipping capability in a Guam-only product mode
- treat dead code as acceptable — unused components and abandoned directories are removed proactively

## Release discipline

Before any go-live push:
1. Run the **pre-push QA checklist** (Rule 7) — CSP alignment, URL centralization, visual verification, console error check
2. Run the **security checks** (Rule 8) — no secrets in frontend code, CSP current, OAuth config intact
3. Verify the root SPA loads correctly (no build step required)
4. Test on mobile Safari and Chrome to verify no blank screen
5. Verify no secrets were committed (`git diff --staged` before push)
6. Verify the Pages workflow still publishes the root directory directly
7. Verify worker docs and bindings still match the deployed backend
8. Update the required docs in the same session (Rule 6)
9. If this is the 3rd+ release in a session, run a **QC audit** (Rule 9) against the cumulative diff

The order matters. QA and security come first because they catch the bugs that are hardest to diagnose after the fact.

## Changelog

| Date | Change |
|------|--------|
| 2026-03-09 | **v28** — Cart condition selector redesign (pill chips → full-width cards with dot, abbreviation, full name, price), removed 5-condition limit, full CSS optimization (formatted for readable diffs, replaced 45+ hardcoded gold colors with CSS variables, removed dead classes, added cart-cond-card layout), JS error handling improvements (4 silent catches → console.warn), Cloudflare DNS cleanup (deleted junk CNAME, removed duplicate DMARC, TLS 1.2) |
| 2026-03-09 | **v27** — Homepage carousel card sections: new CardCarousel component (horizontal scroll, CSS scroll-snap, arrow nav, touch-friendly), expanded worker card lists to 12 each (Featured/Trending/Budget), section headers with subtitles, app shell in index.html (skeleton UI before React mounts for faster FCP) |
| 2026-03-09 | **v26** — Updated Terms of Service (14 sections, now covers Google OAuth, 5 conditions, JustTCG pricing), rewrote Privacy Policy (fixed "no backend server" inaccuracy, now covers D1 database, Google OAuth, server-side accounts), added first-visit ToS acceptance gate (versioned modal), added ToS checkbox to seller registration and checkout flows |
| 2026-03-09 | **v25** — Added Damaged (DMG) as 5th card condition across all listing, cart, seller, and pricing flows. JustTCG API query includes DMG. CSV import maps "DAMAGED" to DMG (was HP). CSS badge added. |
| 2026-03-09 | **v24** — Site-wide pricing transparency: added PricingView.js (`#pricing`) with full methodology page, inline "How we source prices" links on CardDetailView and MarketMoversView, Footer "Pricing & Sources" link, new SOUL.md product principle (Rule 4: Pricing transparency is non-negotiable), rules renumbered 4–9 |
| 2026-03-09 | **v19** — Fixed CSP `connect-src` (root cause of sign-in failure), auth.js race condition fix, centralized 4 stale `.workers.dev` URLs to `config.js`, removed debug artifacts. Added SOUL.md Rules 6–8: pre-push QA checklist, security posture, QC audit triggers — all derived from real failures in v14–v19; **v18** — Custom domain `api.investmtg.com` for worker, OAuth redirect hardcoded to custom domain, PROXY_BASE updated in frontend config |
| 2026-03-08 | Cart condition selector UX overhaul: two-tier cart item layout with full-width condition section, animated "Select a condition" prompt with warning icon, red border on items missing condition, checkout button gated until all conditions chosen, scroll-to-first-missing on disabled click; SW v17 |
| 2026-03-08 | SumUp payment processor restored: Card Widget integration with lazy SDK loading, Pay Online + Reserve & Pay at Pickup dual payment methods, `POST /api/sumup/checkout` worker endpoint, admin bypass layer on worker `getAuthUser()` via `ADMIN_TOKEN` secret for testing, removed all Guam GRT tax references site-wide (config, CartView, CheckoutView, OrderConfirmation, TermsView); SW v16 |
| 2026-03-08 | Order workflow overhaul: 4-step checkout wizard with confirmation modal, reserve & pay at pickup, server-generated `GUM-YYYYMM-XXXXX` order IDs, D1 order persistence, My Orders page (`#orders`), Order Confirmation server-first loading, removed dead SumUp code; SW v15 |
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
