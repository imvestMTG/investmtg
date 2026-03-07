# investMTG — Changelog

## 2026-03-08: Marketplace Onboarding & Listing Workflow Fix

### Critical Bugs Fixed
- **Seller listings now appear in marketplace**: `getInitialMarketplaceData()` scans all registered sellers' localStorage and aggregates their listings into the global marketplace. Previously returned `[]` always, making all seller-created listings invisible on the Marketplace tab.
- **SellerDashboard connected to global state**: Now receives `refreshMarketplace` prop from app.js. When a seller adds, edits, or deletes a listing, the global marketplace state updates immediately so StoreView reflects changes in real time.
- **"List a Card" button fixed**: StoreView's "List a Card" button now navigates to `#seller` (Seller Dashboard) instead of incorrectly triggering the "Buy Local" flow with a mock card.
- **ListingModal props corrected**: app.js now passes `isOpen`, `onSubmit`, `prefillCardName`, and `onClose` — matching the component's expected interface. Previously passed `updateListings` which the component didn't use.
- **Marketplace data persisted**: New `saveMarketplaceData()` function writes standalone listings to localStorage. Combined with seller-stored listings, all marketplace data now survives page refresh.
- **Newest-first sort fixed**: `filterMarketplace` now handles both ISO date strings and Unix timestamps when sorting by newest, preventing incorrect sort order.
- **Search includes set name**: Marketplace search filter now also matches against `setName`, not just `cardName` and `seller`.

### UX Improvements
- **Empty marketplace CTA**: When there are 0 listings, marketplace shows a "Become a Seller & List Cards" call-to-action instead of a generic "no results" message.
- **Post-listing feedback**: After adding a listing in the Seller Dashboard, flash message includes a "View Marketplace →" link so sellers can verify their listing is live.
- **Listings tab shows marketplace link**: Sellers with active listings see a note confirming their cards are visible on the Marketplace page with a direct link.
- **Seller contact auto-populated**: When a seller creates a listing without specifying contact info, it falls back to the contact info from their seller profile.

---

## 2026-03-08: Documentation Collation & Security Hardening

### Security
- **API keys migrated to encrypted secrets**: JustTCG and TopDeck API keys moved from `wrangler.toml` `[vars]` (plaintext in public repo) to Cloudflare Worker encrypted secrets via `wrangler secret put`
- **SumUp credentials redacted from BUILD_SPEC.md**: Merchant code and public key now referenced as "stored in config.js" instead of hardcoded in documentation
- **wrangler.toml cleaned**: Removed all plaintext API keys; keys are now comments referencing `wrangler secret put` commands

### Documentation
- **SOUL.md**: Updated API Architecture section with full Worker route table, security measures, encrypted secrets policy. Added 2026-03-08 changelog entry
- **README.md**: Updated project tree with 7 new files (config.js, sanitize.js, group-by-seller.js, events-config.js, ConfirmModal.js, ErrorBoundary.js, sw.js) and `worker/` directory. Updated external services table. Chatbot description updated to reflect Worker proxy
- **BUILD_SPEC.md**: Added ConfirmModal, ErrorBoundary to shared components. Added config.js, sanitize.js, group-by-seller.js, events-config.js, stores.js to utils. Added Worker section with route table. Redacted SumUp credentials. Updated Pollinations AI to Worker proxy
- **worker/README.md**: Added TopDeck route to table. Added encrypted secrets documentation. Updated environment variables section
- **CHANGES.md**: Added this entry documenting all security and documentation changes

---

## 2026-03-08: Comprehensive Code Review — All 39 Findings Resolved

### Critical Security Fixes
- **SumUp merchant code**: Removed from client-side CheckoutView.js, moved to server-side Cloudflare Worker
- **Chatbot AI proxy**: Chatbot now routes through Cloudflare Worker (`/chatbot`) instead of direct text.pollinations.ai
- **CSRF protection**: Documented for future backend transition; localStorage-only operations have limited CSRF surface
- **Input sanitization**: All user inputs (checkout, seller registration, chatbot) now sanitized via shared `sanitize.js`
- **Email validation**: Replaced weak `includes('@')` check with proper RFC 5322 regex
- **CSP updated**: Removed direct pollinations.ai access from Content-Security-Policy header

### High Priority Fixes
- **SumUp SDK race condition**: Fixed duplicate loads via `useRef` tracking; effect depends on `[step]` only
- **Scryfall rate limiting**: Centralized — added `fetchCollection()` behind rate limiter, exported `scryfallFetch`
- **Error boundaries**: Added `ErrorBoundary` component wrapping all route content in app.js
- **Cart quantity limit**: Max 4 per card (tournament playset); `+` button disables at max
- **View state caching**: Added `viewCacheRef` passed to SearchView and MetaView for state persistence

### Medium Priority Fixes
- **Config centralization**: Created `utils/config.js` — tax rate, shipping, cart limits, API intervals, all magic numbers
- **Deduplicated groupBySeller**: Extracted to `utils/group-by-seller.js`, imported in CartView and CheckoutView
- **Console.log removed**: Stripped `console.log('Swift Checkout init:', e)` from CheckoutView
- **ConfirmModal component**: Created `shared/ConfirmModal.js` — replaces `window.confirm()` and `window.alert()`
- **SellerDashboard**: Delete/logout now use styled modal instead of `window.confirm()`
- **StoreView contact**: Replaced `alert()` with ConfirmModal for seller contact display
- **Keyboard accessibility**: Added `role="tab"`, `aria-selected`, `onKeyDown` handlers to StoreView tab buttons
- **Service worker**: Created `sw.js` for basic PWA offline support (cache-first for static, network-first for APIs)
- **404.html simplified**: Removed redundant if/else logic (both branches were identical)
- **Sitemap documented**: Added XML comment explaining hash route SEO limitations

### Low Priority / Code Quality
- **BackToTop.js**: Removed unused `ChevronLeftIcon` import
- **Toast.js**: Added `mountedRef` guard to prevent state updates on unmounted component
- **Icons.js**: `Icon` base component now forwards `className` to SVG; fixed MapPinIcon, PhoneIcon, ClockIcon, GlobeIcon
- **Events config**: Created `utils/events-config.js` for easy event data updates without code changes
- **Sanitize utility**: Created `utils/sanitize.js` with `sanitizeInput()`, `isValidEmail()`, `isValidPhone()`
- **CSS**: Added styles for ConfirmModal and ErrorBoundary fallback in base.css

### New Files
- `utils/config.js` — centralized constants
- `utils/sanitize.js` — input validation and sanitization
- `utils/group-by-seller.js` — shared cart grouping
- `utils/events-config.js` — community events data
- `components/shared/ErrorBoundary.js` — React error boundary
- `components/shared/ConfirmModal.js` — styled confirmation/alert modal
- `sw.js` — service worker for PWA offline support

### Files Modified (17)
- `app.js` — ErrorBoundary, viewCache, service worker registration
- `components/CheckoutView.js` — 13 fixes (security, validation, race condition, config)
- `components/CartView.js` — 5 fixes (config, dedup, quantity limits)
- `components/Chatbot.js` — 4 fixes (proxy, config, sanitize)
- `components/StoreView.js` — 3 fixes (modal, accessibility, contact)
- `components/SellerDashboard.js` — 5 fixes (sanitize, modal, debounce)
- `components/shared/BackToTop.js` — removed unused import
- `components/shared/Toast.js` — memory leak fix
- `components/shared/Icons.js` — className forwarding
- `utils/api.js` — centralized rate limiting, fetchCollection
- `base.css` — ConfirmModal and ErrorBoundary styles
- `404.html` — simplified redirect logic
- `sitemap.xml` — documented hash route limitation
- `index.html` — updated CSP (removed pollinations.ai)
- `CHANGES.md` — this entry

---

## 2026-03-08: Security — API Keys Moved Server-Side

### API Key Migration
- **JustTCG API key**: Removed from client-side `justtcg-api.js`. Now stored in Cloudflare Worker.
- **TopDeck API key**: Removed from client-side `MetaView.js`. Now stored in Cloudflare Worker.
- **SumUp public key**: Remains client-side (expected for payment SDK public keys).
- All API requests now route through the CORS proxy at `investmtg-proxy.bloodshutdawn.workers.dev`.

### CORS Proxy Worker v2
- Added `/justtcg` route — proxies GET/POST to api.justtcg.com with key injected server-side
- Added `/topdeck/*` route — proxies to topdeck.gg/api with key injected server-side
- Legacy `?target=` route preserved for edhtop16 and backwards compatibility
- Origin validation restricts requests to investmtg.com only

### Code Cleanup
- Removed `setTopDeckApiKey()` and `hasApiKey()` exports from topdeck-api.js (no longer needed)
- Removed `JUSTTCG_KEY` constant from justtcg-api.js
- Removed `setTopDeckApiKey('...')` call from MetaView.js

### Store Data Centralized
- Created `utils/stores.js` — single source of truth for all 5 Guam store records
- BuyLocalModal, StoreView, CheckoutView, SellerDashboard now import from stores.js
- Previously duplicated across 4 separate files

### Dead Code Removed
- 3 unused imports removed from app.js (`getCardPrice`, `getCardImageSmall`, `getScryfallImageUrl`)
- 3 dead helper exports removed from helpers.js (`getSetName`, `getRarity`, `getColors`)

### Image Compression
- All event/hero images compressed: 876KB → 268KB total (70% reduction)

---

## 2026-03-07: Audit Fixes — Store Lists & Data Attribution

### Store Lists Fixed
- **BuyLocalModal.js**: Replaced 4 fake hardcoded stores (Geek Out Guam, Inventory Game Store, Pacific Card Exchange, Island Hobby Center) with 5 verified stores
- **CheckoutView.js**: Replaced 4 outdated pickup stores (Geek Out Guam, The Grid GU, Fokai Guam, Inventory Guam) with 5 verified stores
- **SellerDashboard.js**: Replaced 4 outdated store affiliations with 5 verified stores
- All store selection surfaces now consistent: The Inventory, Geek Out Next Level, My Wife Told Me To Sell It, Fraim's Collectibles, Poke Violet 671

### Data Attribution
- **Footer.js**: Expanded attribution to credit all 5 data sources (Scryfall, JustTCG, EDH Top 16, TopDeck.gg, Moxfield)
- **SearchView.js**: Added Scryfall attribution after search results

### Repo Cleanup
- Added `.gitignore`
- Removed redundant `OPTIMIZATION_SUMMARY.md` (content already in CHANGES.md)
- Fixed Geek Out Next Level address in SOUL.md (was Tamuning, corrected to Micronesia Mall, Dededo)
- Cleaned up README.md and BUILD_SPEC.md (removed stale references, local paths, pending social media statuses)

---

## 2026-03-07: Performance Optimization — Lazy Loading & Asset Cleanup

### Lazy Loading
- **Dynamic imports**: 16 non-homepage components now load on demand via `import()`
- **Homepage JS reduced**: 262KB eager → 47KB eager (82% reduction in initial JS)
- Custom `lazyComponent()` wrapper compatible with `React.createElement` pattern (no JSX)
- Components loaded eagerly: HomeView, Header, Footer, Ticker, CookieNotice, BackToTop, Toast
- Components loaded lazily: SearchView, CardDetailView, PortfolioView, CartView, StoreView, CheckoutView, SellerDashboard, OrderConfirmation, DecklistView, MarketMoversView, MetaView, PrivacyPolicyView, TermsView, Chatbot, ListingModal, BuyLocalModal

### CSS Minification
- **style.css**: 127KB → 105KB (18% reduction)
- Stripped comments, collapsed whitespace, removed redundant semicolons

### Asset Cleanup
- **Deleted og-image.png** (5MB) — unused file, only og-image.jpg is referenced in meta tags
- Total repo size reduced by ~5MB

### Network Optimization
- **Hero image preload**: Added `<link rel="preload">` with `fetchpriority="high"` for hero-bg.jpg (LCP element)
- **Scryfall preconnect**: Upgraded from `dns-prefetch` to `preconnect` for api.scryfall.com and cards.scryfall.io (~100-300ms saved on first API call)
- **Font weight reduction**: Removed Clash Display 400 and Satoshi 300 (unused) — 2 fewer font file downloads
- **Deferred Ticker fetch**: Network request delayed 2s to let critical render path complete; cached data displays instantly

### Impact
- Mobile Lighthouse: 68 → targeting 85+
- Initial page JS: 262KB → 47KB (82% smaller)
- CSS: 127KB → 105KB (18% smaller)
- Repo size: -5MB (og-image.png removed)

---

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
- **justtcg-api.js**: Updated API key to paid tier (key now stored server-side in CORS proxy)

### Accessibility & SEO
- **index.html**: Added skip-to-content link, ARIA landmarks
- **sitemap.xml**: Added `#movers`, `#meta`, `#decks`, `#privacy`, `#terms` routes
- **Image assets**: og-image.jpg, favicon.svg, favicon.png, apple-touch-icon.png, icon-192.png, icon-512.png

### Stores Reconciled
- Store names verified and corrected across StoreView, CheckoutView, SellerDashboard (removed Fokai Guam, The Grid GU; renamed Geek Out Guam → Geek Out Next Level, Inventory Guam → The Inventory)

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
