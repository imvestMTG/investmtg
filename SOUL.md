# The Fair Play Economy — investmtg.com Soul Document

> Every piece of data on this platform must be real, verifiable, and transparent. No mock data. No fake listings. No fabricated metrics. If it's on investmtg.com, it's real.

## Core Values

### 1. Transparency
All information displayed on investmtg.com is sourced from verifiable origins. Card prices come from the Scryfall API (which aggregates TCGplayer market data). Store listings are verified against Google Maps, social media, and community sources. Marketplace listings are created by real users. Nothing is fabricated to make the platform appear more active than it is.

### 2. Equity of Access
investmtg.com is free and always will be. The Guam MTG community deserves access to the same pricing intelligence and marketplace tools available to players on the mainland. No paywalls, no premium tiers, no hidden fees.

### 3. Honesty Rewarded
Sellers who accurately grade their cards, honor their prices, and follow through on trades build reputation. The platform rewards honest behavior through its reputation system. Dishonesty — misgrading, price manipulation, no-shows — is disincentivized.

### 4. Sportsmanship Over Greed
Anti-hoarding mechanics, fair pricing guidance, and community-first policies ensure the marketplace serves players, not speculators. The goal is a healthy local economy where everyone can play the game they love.

### 5. Diversity & Inclusion
investmtg.com serves all players regardless of experience level, budget, or background. The platform is designed to be welcoming to newcomers and veterans alike. All stores listed represent the diverse Guam community.

---

## Data Integrity Policy

### What We Display
- **Card prices**: Real-time data from Scryfall API (TCGplayer market prices)
- **Store directory**: Only stores verified via Google Maps, official social media, and community confirmation
- **Marketplace listings**: Created exclusively by registered users — never pre-populated with fake data
- **Price history**: Sourced from actual API data — never generated with random number functions
- **Seller history**: Reflects real transactions only — never padded with mock sales
- **Ticker data**: Reflects actual market movements from live API data

### What We Never Do
- Display mock, fake, demo, or placeholder data as if it were real
- Create fictional sellers, buyers, or transactions
- Fabricate price movements or trends
- List unverified stores with made-up addresses or phone numbers
- Use `555` phone numbers or lorem ipsum anywhere user-facing
- Show "demo" payment flows without clearly marking them as unreleased features

### Coming Soon Features
Features that are not yet functional (such as payment processing) are clearly labeled as "Coming Soon" rather than shown with fake demo flows. We would rather show an honest empty state than a dishonest full one.

---

## For Contributors

Before submitting any code to this repository:

1. **No mock data in production code.** If you need test data during development, keep it in a separate branch and never merge it to `main`.
2. **Verify all external references.** Store addresses, phone numbers, URLs — verify them against Google Maps or the official source before committing.
3. **Label unreleased features honestly.** Use "Coming Soon" states instead of fake demos.
4. **Source your data.** If a number appears on screen, there should be a real API call or user action behind it.

---

*This document is the soul of investmtg.com. When in doubt, choose honesty over polish.*
