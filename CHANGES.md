# investMTG — Changelog

## 2026-03-07: Physical Cards Only — Remove Digital/MTGO Content

### Changes
- **api.js**: All search functions now include `-is:digital` filter. `searchCards()`, `searchCardsCheapest()`, and `randomCard()` only return physical printed cards.
- **CardDetailView.js**: Removed MTGO (tix) price box. Removed Cardhoarder purchase link (MTGO-only retailer). Now shows Market USD, Foil USD, and EUR only.
- **Ticker.js**: Filters out digital-only cards from the Scryfall collection API response.
- **HomeView.js**: Cleaned up redundant digital filter (now handled globally by api.js).
- **SOUL.md**: Added "Physical Cards Only" principle. Removed MTGO from data sources.
- **README.md**: Updated to reflect physical-cards-only policy.
- **BUILD_SPEC.md**: Removed Cardhoarder from external services.
- **index.html**: Updated meta descriptions to say "printed cards."

---

## 2026-03-07: Real-Time Pricing & Documentation

### Live Price Data (SOUL.md Compliance)
- **Ticker.js**: Completely rewritten — fetches live prices from Scryfall `/cards/collection` API every 5 minutes with localStorage caching. No more hardcoded fake percentages.
- **HomeView.js**: Daily-rotating card sections — Featured, Trending, and Budget cards now draw from pools of 18-20 cards each, shuffled with a date-seeded algorithm so content is fresh every day.
- **CardDetailView.js**: Removed fake price history chart and mock % change. Now shows real USD, Foil, and EUR prices from Scryfall. Added links to TCGplayer and Cardmarket for purchase. Added Scryfall source attribution.
- **PortfolioView.js**: Portfolio now fetches live prices from Scryfall for all tracked cards (via `/cards/collection`). Gain/loss calculated against real market data instead of random numbers.
- **CardGrid.js**: Removed fake % change badges. Now shows foil price when available.
- **SearchView.js**: Removed unused mock function import.
- **helpers.js**: Removed `generateMockChange()` and `generateMockPriceHistory()` — these violated SOUL.md by fabricating data.

### Documentation
- **SOUL.md** (NEW): The Fair Play Economy — ethical guidelines for all data on the site
- **README.md** (NEW): Complete project documentation with features, tech stack, structure, and architecture
- **robots.txt** (NEW): Search engine crawl permissions
- **sitemap.xml** (NEW): Site map for search engine indexing
- **BUILD_SPEC.md**: Updated to reflect current state — SumUp now active (not placeholder), added all components and services
- **CHANGES.md**: This file — consolidated changelog

### CSS Updates
- Updated ticker styles: replaced up/down color classes with gold accent price display
- Replaced chart-container styles with price-source attribution and purchase-links styles
- Added `.mtg-card-foil` style for foil price display in card grids

---

## 2026-03-07: Performance Optimization

### Changes
- Removed blocking Chart.js (204KB) and SumUp SDK (286KB) from initial page load
- Chart.js now lazy-loaded only on CardDetailView
- SumUp SDK loaded on-demand in CheckoutView
- Added preconnect hints for Fontshare CDN
- Added DNS prefetch for Scryfall API
- Added CSS preloading for critical stylesheets
- Added `content-visibility: auto` to card grids for render optimization
- Fixed hero section spacing (reduced excessive bottom padding)
- Fixed empty state visibility in dark theme
- Cleaned up 5 duplicate CSS rule blocks
- Added async image decoding and fade transitions to CardGrid

### Impact
- ~490KB removed from initial page load
- TTFB improved from 126ms to 37ms

---

## 2026-03-07: SumUp Payment Integration

### New Payment Methods
- **Reserve & Pay at Pickup**: Contact seller, arrange pickup at Guam store
- **Pay with Card Online**: Full SumUp card payment via Swift Checkout SDK
- **Apple Pay / Google Pay**: Wallet payments via SumUp Swift Checkout

### Files
- `CheckoutView.js` (694 lines): Full 4-step checkout with 3 payment options
- `.well-known/apple-developer-merchantid-domain-association`: Apple Pay domain verification
- `index.html`: Updated CSP for SumUp domains

---

## 2026-03-06: Storefront & Marketplace Build

### New Components
- `CheckoutView.js`: Full checkout flow
- `SellerDashboard.js`: Seller registration, listing CRUD, sales history
- `OrderConfirmation.js`: Post-payment confirmation page

### Modified Components
- `Icons.js`: Added 9 new icons
- `app.js`: Added routes for checkout, seller, order
- `Header.js`: Added "Sell" nav link
- `CartView.js`: Enhanced with seller grouping, quantity controls
- `StoreView.js`: Added "Add to Cart", "Become a Seller" CTA, seller badges
- `index.html`: SumUp SDK, updated CSP
- `style.css`: ~600 lines of new component styles

### Architecture
- ✅ `var h = React.createElement` — no JSX
- ✅ No destructuring — `var ref = React.useState()`
- ✅ All imports via esm.sh import maps
- ✅ Static site, localStorage persistence
- ✅ All existing code preserved
