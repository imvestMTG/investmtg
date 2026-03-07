# SOUL.md — The Fair Play Economy

## What investMTG Stands For

investMTG is Guam's local Magic: The Gathering marketplace. Every piece of data on this site must be **real, verifiable, and transparent**. This document defines our principles and is the ethical backbone of the project.

---

## Core Principles

### 1. No Fake Data
- All card prices come from **Scryfall's public API** — the most respected free MTG data source
- We never fabricate price changes, trends, or statistics
- If we can't show real data, we show nothing — no mock charts, no random percentages, no simulated metrics

### 2. Real Stores Only
The local stores listed on investMTG are real, verified businesses on Guam:
- **Geek Out Guam** — Tamuning (verified)
- **The Grid GU** — Dededo (verified)
- **Fokai Guam / Collectibles** — Hagåtña (verified)
- **Inventory Guam** — Tamuning (verified)

We do not list fictional stores or fabricate store data.

### 3. Real Sellers Only
The marketplace listings must come from real people. Seller identities on the platform are either:
- Registered users who created accounts via the Seller Dashboard
- Pre-verified listings tied to known community members

We never populate the marketplace with fake sellers or fabricated listings to make it "look active."

### 4. Transparent Pricing
- **Market prices** are sourced from Scryfall, which aggregates from TCGplayer, Cardmarket, and Cardhoarder
- **Seller prices** are set by individual sellers and may differ from market price
- We clearly label where every price comes from
- Price data refreshes on every page visit (with 5-minute caching to respect API limits)

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
| Card prices (USD, EUR, foil) | [Scryfall API](https://scryfall.com/docs/api) | Live on each visit (5-min cache) |
| Card images | [Scryfall](https://scryfall.com) | Live |
| Card legality, oracle text, set info | [Scryfall](https://scryfall.com) | Live |
| Local store info | Manually verified | Updated as needed |
| Marketplace listings | User-submitted | Real-time (localStorage) |

---

## What We Don't Do

- **No price history charts** — Scryfall's free API doesn't provide historical price data. Rather than show fabricated charts with random numbers, we simply show the current live price and link to Scryfall/TCGplayer for historical data.
- **No percentage change indicators** — Without real historical data, we cannot calculate real % changes. We show current prices only.
- **No "trending" algorithms** — Our "Trending Now" section rotates daily through popular cards, but we don't claim these are trending based on actual trade volume data we don't have.

---

## Technology

investMTG is a static site hosted on GitHub Pages with no backend server. All data persists in the user's browser via localStorage. This means:
- No user data is sent to any server (except Scryfall API for card data)
- No analytics tracking
- No cookies
- Complete privacy

---

## For Developers

If you're contributing to investMTG, follow these rules:
1. Never use `Math.random()` to generate any data shown to users as if it were real
2. Always cite data sources
3. If a feature requires data we don't have, say so honestly — don't fake it
4. Test with real Scryfall API responses, not mocked data
5. Keep the site static — no backend dependencies

---

*This document is the ethical compass of investMTG. When in doubt, choose transparency over appearance.*
