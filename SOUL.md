# SOUL.md — The Fair Play Economy

---

## About

investMTG is a free Magic: The Gathering marketplace and price intelligence platform built for the Guam community. We give island players the same pricing transparency, portfolio tools, and market data that mainland players take for granted — without the markup, without the guesswork, and without the games.

Every price on our platform comes from verified public sources. Every store we list is a real business you can walk into. Every feature we ship is built on real data or not built at all. We don't simulate activity, fabricate trends, or manufacture urgency. What you see is what the market actually says.

investMTG was created by a Guam-based player who got tired of the information gap — where island collectors overpay because they can't easily compare prices, and local trades happen in the dark without fair market context. This platform exists to close that gap.

---

## Vision

To be Guam's trusted home for Magic: The Gathering — the place every island player checks before they buy, sell, or trade a card.

---

## Mission

To prove that a trading card marketplace can run on honesty. investMTG exists to give Guam's MTG community free access to real market data, fair pricing tools, and a local marketplace built without fake data, dark patterns, or hidden agendas.

---

## Brand

**Name:** investMTG
**Tagline:** Real cards. Real data. Fair play.
**Brand Promise:** Every piece of data on this platform is real, verifiable, and transparent.

### The Fair Play Economy

investMTG operates under a governing philosophy called The Fair Play Economy — a set of principles that guide every decision on the platform. It's built on five pillars:

1. **Transparency** — All prices, sources, and methods are visible. Nothing is hidden.
2. **Equity of Access** — Every player gets the same data, the same tools, the same information — free, forever.
3. **Honesty Rewarded** — The platform is designed to reward accurate grading, fair pricing, and good-faith trading.
4. **Sportsmanship Over Greed** — Systems are built to discourage hoarding, price gouging, and market manipulation.
5. **Diversity & Inclusion** — The platform welcomes every player regardless of budget, experience level, or background.

### Brand Voice

- Direct and honest — say what's true, skip what isn't
- Community-first — we build for Guam players, not for metrics
- Confident but never arrogant — we earn trust, we don't claim it
- Island-local — we speak like the community we serve

---

## Core Principles

### 1. No Fake Data
- All card prices come from **Scryfall's public API** — the most respected free MTG data source
- Condition-specific pricing comes from **JustTCG** — real market data for NM, LP, MP, HP, and DMG conditions
- cEDH metagame data comes from **EDH Top 16** and **TopDeck.gg** — real tournament results and commander statistics
- Decklist data comes from **Moxfield** — real community-built decklists
- We never fabricate price changes, trends, or statistics
- If we can't show real data, we show nothing — no mock charts, no random percentages, no simulated metrics

### 2. Real Stores Only
The local stores listed on investMTG are real, verified businesses on Guam:
- **The Inventory** — Hagåtña (verified, WPN-authorized)
- **Geek Out Next Level** — Tamuning (verified, WPN-authorized)
- **My Wife Told Me To Sell It** — Dededo (verified, 5.0★ 71 reviews)
- **Fraim's Collectibles** — Mangilao (verified)
- **Poke Violet 671** — Hagåtña (verified)

We do not list fictional stores or fabricate store data. Stores are periodically re-verified — unverifiable listings are removed (e.g., Fokai Guam, The Grid GU, and Expensive Dreams were removed after failing verification).

**Important:** These stores are listed as community resources for Guam MTG players. investMTG does **not** have formal partnership agreements with any of these stores. Their inclusion does not imply endorsement, affiliation, or inventory integration. Store information is publicly available and manually verified.

### 3. Real Sellers Only
The marketplace listings must come from real people. Seller identities on the platform are either:
- Registered users who created accounts via the Seller Dashboard
- Pre-verified listings tied to known community members

We never populate the marketplace with fake sellers or fabricated listings to make it "look active."

### 4. Transparent Pricing — USD Only
- **All prices are displayed in US Dollars (USD) only** — no EUR, GBP, tix, or other currencies
- **Market prices** are sourced from Scryfall, which aggregates from TCGplayer, Cardmarket, and Cardhoarder
- **Condition prices** are sourced from JustTCG when viewing the cart — showing real market values for each condition grade (DMG, HP, MP, LP, NM)
- **Seller prices** are set by individual sellers and may differ from market price
- We clearly label where every price comes from
- Price data refreshes on every page visit (with 5-minute caching to respect API limits)
- JustTCG condition data is only fetched in cart view to minimize API usage (paid tier)

### 5. Physical Cards Only
- investMTG is a marketplace for real, printed Magic cards — not digital versions
- We filter out all digital-only cards (MTGO, MTG Arena) from search results, the price ticker, and the homepage
- We do not display MTGO ticket prices or link to MTGO retailers
- All API queries include `-is:digital` to exclude digital printings

### 6. No Dark Patterns
- No fake urgency ("Only 2 left!" when we don't track inventory)
- No fabricated reviews or ratings
- No simulated activity feeds
- No misleading statistics

---

## Data Sources

| Data | Source | Update Frequency |
|------|--------|-----------------|
| Card prices (USD, foil) | [Scryfall API](https://scryfall.com/docs/api) | Live on each visit (5-min cache) |
| Card images | [Scryfall](https://scryfall.com) | Live |
| Card legality, oracle text, set info | [Scryfall](https://scryfall.com) | Live |
| Condition pricing (NM/LP/MP/HP/DMG) | [JustTCG API](https://justtcg.com) | On cart view (10-min cache) |
| cEDH commanders, tournaments, staples | [EDH Top 16 API](https://edhtop16.com) | On meta page visit (15-min cache) |
| cEDH tournament data | [TopDeck.gg API](https://topdeck.gg) | On meta page visit (10-min cache) |
| Decklist imports | [Moxfield API](https://moxfield.com) | On demand |
| AI chatbot | [Pollinations AI](https://pollinations.ai) | Real-time (free, no key) |
| Local store info | Manually verified | Updated as needed |
| Marketplace listings | User-submitted | Real-time (localStorage) |
| Payment processing | [SumUp](https://sumup.com) | Real-time |

---

## API Architecture

investMTG uses a **CORS proxy worker** deployed on Cloudflare Workers to relay requests to APIs that don't support browser CORS (EDH Top 16, TopDeck.gg). The proxy:
- Only allows requests to whitelisted domains (edhtop16.com, topdeck.gg)
- Adds CORS headers so the browser can receive the data
- Does not store, modify, or log any data passing through
- Is open-source and transparent

---

## What We Don't Do

- **No price history charts** — Scryfall's free API doesn't provide historical price data. Rather than show fabricated charts with random numbers, we simply show the current live price and link to Scryfall/TCGplayer for historical data.
- **No percentage change indicators** — Without real historical data, we cannot calculate real % changes. We show current prices only.
- **No "trending" algorithms** — Our "Trending Now" section rotates daily through popular cards, but we don't claim these are trending based on actual trade volume data we don't have.

---

## Technology

investMTG is a React 18 single-page application hosted on GitHub Pages with no backend server. All user data persists in the browser via localStorage. This means:
- No user data is sent to any server (except API calls for card/price/meta data)
- No analytics tracking
- No cookies (except Cloudflare security cookies on API proxy)
- Complete privacy
- Payments are processed directly by SumUp — card details never touch our servers

### Tech Stack
- **Frontend:** React 18 via esm.sh import maps (no build tools, no JSX)
- **Hosting:** GitHub Pages (www.investmtg.com)
- **APIs:** Scryfall, JustTCG, EDH Top 16, TopDeck.gg, Moxfield, Pollinations AI
- **CORS Proxy:** Cloudflare Worker (investmtg-proxy.bloodshutdawn.workers.dev)
- **Payments:** SumUp Swift Checkout
- **Fonts:** Clash Display + Satoshi (FontShare)

---

## For Developers

If you're contributing to investMTG, follow these rules:
1. Never use `Math.random()` to generate any data shown to users as if it were real
2. Always cite data sources
3. If a feature requires data we don't have, say so honestly — don't fake it
4. Test with real API responses, not mocked data
5. Keep the site static — no backend dependencies beyond the CORS proxy
6. Respect API rate limits: Scryfall (100ms between calls), JustTCG (paid tier limits), TopDeck (200/min)
7. Never embed sensitive API keys in client-side code — use CORS proxy for key-protected APIs where possible

---

## Messaging Reference

### Hero / Homepage
- **Headline:** "Know What Your Cards Are Worth"
- **Subtitle:** "Guam's MTG marketplace with live market pricing, portfolio tracking, and zero markup. Real cards. Real data. Fair play."
- **Stats bar:** Real Prices / No Guesswork | Guam Built / For The Island | Live Data / Every Visit | 100% Free / Always

### Tone Guidelines
- Speak directly to the user — value propositions, not feature labels
- Lead with transparency and honesty
- Use "Guam" and island-local language to reinforce community identity
- Never claim partnerships, endorsements, or affiliations that don't exist
- Never use "only" or "#1" without verifiable proof
- The tagline "Real cards. Real data. Fair play." is the brand's core promise

---

## Social Media & Connected Services

| Platform | Status | Handle / URL |
|----------|--------|--------------|
| YouTube | Connected (Data + Analytics) | Channel pending creation |
| Facebook Pages | Pending connection | Page pending creation |
| LinkedIn | Pending connection | Profile pending creation |
| X (Twitter) | No connector available | Account pending creation |
| Instagram | No connector available | Account pending creation |

**Email domain:** investmtg.com (Google Workspace — MX records active, SPF configured for Google + iCloud)

Social handles should use **@investMTG** or **investMTG** consistently across all platforms.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-07 | Major visual redesign: AI-generated hero background, cinematic event artwork, scroll-driven animations, glass-morphism stats bar, golden accent bars on section headers |
| 2026-03-07 | Store directory updated: removed Fokai Guam, The Grid GU, and Expensive Dreams (not a TCG store). Added My Wife Told Me To Sell It, Fraim's Collectibles, Poke Violet 671. Renamed Geek Out Guam → Geek Out Next Level, Inventory Guam → The Inventory. Total: 5 verified stores |
| 2026-03-07 | Added About, Vision, Mission, and Brand sections; clarified store listings are not partnerships; updated hero copy for brand voice; documented social media status; JustTCG upgraded to paid tier |
| 2026-03-06 | Audit fixes: legal pages, cookie notice, accessibility, fake data removal, SOUL.md EUR fix |

---

*This document is the ethical compass of investMTG. When in doubt, choose transparency over appearance.*
