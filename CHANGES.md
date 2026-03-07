# investMTG — Changelog

## 2026-03-07: Store Correction — Expensive Dreams Removed

- **Removed**: Expensive Dreams (Tumon) — not a TCG store, incorrectly added during store verification
- **Total stores**: 5 verified (down from 6)
- Updated SOUL.md, README.md, BUILD_SPEC.md to reflect correction

---

## 2026-03-07: Major Visual Redesign

### Hero Section
- **AI-generated background**: Cinematic dark scene with golden energy trails and floating card shapes
- **Dark gradient overlay**: Multi-stop oklch gradient for text readability
- **Glass-morphism stats bar**: Semi-transparent backdrop-blur cards for the stat values
- Light mode support with reduced opacity

### Community Events — Complete Redesign
- **AI-generated event artwork**: Three custom images created with GPT Image for TCG Con, Commander Night, and Weekend Events
- **Featured event layout**: Large hero-style card for TCG Con 2026 (full-width with background image)
- **2-column sub-grid**: Commander Night and Weekend Events as smaller cards below
- **Image backgrounds**: Each event card has its own cinematic background with dark gradient overlay
- **Calendar date chip**: Prominent date label overlay on each card
- **Hover effects**: Image zoom (1.04x scale), golden border glow, card lift
- **Section header**: Replaced emoji calendar with styled header featuring golden accent bar + "What's Happening on Guam" subtitle

### Section Headers
- **Golden accent bars**: Added 4px gold vertical bars to all section headers (Featured Cards, Trending Now, Budget Staples)
- **Bottom border accent**: Subtle divider below each section header
- **Improved spacing**: Better visual hierarchy between content sections

### Animations
- **Scroll-driven reveals**: CSS `animation-timeline: view()` for fade-up section animations
- **Browser fallback**: Timed fade-up animations for browsers without scroll-driven animation support
- Applied to all major homepage sections

### Store Directory Update
- **Removed**: Fokai Guam (clothing brand, NOT a TCG store) and The Grid GU (unverifiable)
- **Renamed**: "Geek Out Guam" → "Geek Out Next Level" (correct name, WPN-authorized)
- **Renamed**: "Inventory Guam" → "The Inventory" (correct name, Hagåtña)
- **Added**: My Wife Told Me To Sell It (Dededo, 5.0★ 71 reviews)
- **Added**: Fraim's Collectibles (Mangilao)
- **Added**: Poke Violet 671 (Hagåtña)
- **Total stores**: 5 verified (up from 4, with 2 removed and 3 added)
- Conditional rendering for null phone/hours fields

---

## 2026-03-07: Brand Foundation & Social Media Integration

### Brand
- **SOUL.md**: Added About, Vision, Mission, and Brand sections with The Fair Play Economy five pillars
- **Brand tagline**: "Real cards. Real data. Fair play."
- **Brand voice**: Direct and honest, community-first, island-local
- **Store disclaimer**: Clarified that listed stores are community resources with no formal partnership agreements

### Hero Copy Rework
- **Headline**: Changed from "MTG Price Intelligence" to "Know What Your Cards Are Worth"
- **Subtitle**: Changed to "Guam's MTG marketplace with live market pricing, portfolio tracking, and zero markup. Real cards. Real data. Fair play."
- **Stats bar**: Changed from "Thousands/4/Live/Free" to "Real Prices / No Guesswork | Guam Built / For The Island | Live Data / Every Visit | 100% Free / Always"
- Removed claims about store partnerships and "Guam's only" positioning

### Social Media
- YouTube Data API connected to Perplexity
- YouTube Analytics API connected to Perplexity
- Facebook Pages, LinkedIn pending connection
- investmtg.com email domain verified (Google Workspace with MX + SPF records)

### Documentation
- **SOUL.md**: Brand Voice & Messaging, Social Media status, Changelog section added
- **README.md**: Vision/Mission header, Fair Play Economy pillars, Connected Services table, store disclaimer, new components listed
- **CHANGES.md**: This consolidated entry
- **BUILD_SPEC.md**: Updated pages, APIs, and utils to reflect current state
- **manifest.json**: Description aligned with brand voice

---

## 2026-03-07: Marketing & Compliance Audit Fixes

### Legal & Compliance
- **PrivacyPolicyView.js** (NEW): Full privacy policy page at `#privacy`
- **TermsView.js** (NEW): Terms of service page at `#terms`
- **CookieNotice.js** (NEW): Cookie consent banner (Cloudflare/SumUp cookies only)
- **Footer.js**: Added WotC Fan Content Policy disclaimer, Privacy/Terms links
- **app.js**: Added `#privacy` and `#terms` routes

### Data Integrity
- **marketplace-data.js**: Emptied all mock marketplace listings (SOUL.md compliance)
- **SellerDashboard.js**: Removed mock sales history data
- **CheckoutView.js**: Card payment shows "coming soon" instead of simulating
- **SOUL.md**: Fixed EUR reference in data table

### JustTCG Upgrade
- **justtcg-api.js**: Updated API key to paid tier (`tcg_1f6c8c6d907f42a0aacba9ff6005300c`)

### Accessibility & SEO
- **index.html**: Added skip-to-content link, ARIA landmarks
- **sitemap.xml**: Added `#movers`, `#meta`, `#decks`, `#privacy`, `#terms` routes
- **Image assets**: og-image.jpg, favicon.svg, favicon.png, apple-touch-icon.png, icon-192.png, icon-512.png

### Stores Reconciled
- Geek Out Guam, The Grid GU, Fokai Guam, Inventory Guam verified across StoreView, CheckoutView, SellerDashboard

### Files Changed (21 total)
style.css, app.js, index.html, SOUL.md, sitemap.xml, components/Footer.js, components/PrivacyPolicyView.js, components/TermsView.js, components/CookieNotice.js, components/CheckoutView.js, components/SellerDashboard.js, components/StoreView.js, utils/marketplace-data.js, utils/justtcg-api.js, og-image.jpg, favicon.svg, favicon.png, apple-touch-icon.png, icon-192.png, icon-512.png, manifest.json

---

## 2026-03-07: Multi-Source API Integration — JustTCG + Moxfield

### New Features
- **Market Movers page** (`#movers`): Shows biggest gainers and drops in MTG card prices over 7/30/90-day periods. Data from JustTCG API.
- **Deck Browser page** (`#decks`): Import and browse Moxfield decklists. Paste any public Moxfield deck URL to view the full card list, grouped by type. Click any card to see its price.
- **Price History charts**: Card detail pages now show interactive SVG price history charts with 7D/30D/90D period toggles.
- **Condition-specific pricing**: Card detail pages show NM, LP, MP, HP, and DMG prices from JustTCG alongside Scryfall market prices.

### New Files
- `utils/justtcg-api.js` — JustTCG API wrapper with caching, batch lookups, trending cards, and price processing.
- `utils/moxfield-api.js` — Moxfield unofficial API wrapper for fetching public decklists.
- `components/PriceHistoryChart.js` — SVG-based price chart with period selection.
- `components/DecklistView.js` — Moxfield deck browser with URL import and type-grouped card lists.
- `components/MarketMoversView.js` — Biggest gainers/drops view with period tabs.

### Modified Files
- `components/CardDetailView.js` — Now fetches JustTCG data alongside Scryfall. Shows condition prices, price history chart, and multi-source attribution.
- `components/Header.js` — Added "Movers" and "Decks" nav links.
- `app.js` — Added routes for `#decks` and `#movers`, imported new components.
- `index.html` — Updated CSP to allow JustTCG and Moxfield API connections. Added DNS prefetch.
- `style.css` — Added styles for price chart, condition grid, market movers, and decklist views.

### Data Sources
- **JustTCG** (api.justtcg.com): Free tier — 1,000 calls/month, condition-specific TCGplayer pricing, 7d/30d/90d price history.
- **Moxfield** (api2.moxfield.com): Unofficial public API for decklist data. Supports any public deck by URL/ID.
- **Scryfall** (existing): Continues to serve as primary card data and imagery source.

---

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
