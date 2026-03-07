# investMTG — Know What Your Cards Are Worth

**[www.investmtg.com](https://www.investmtg.com)**

> Real cards. Real data. Fair play.

investMTG is a free Magic: The Gathering marketplace and price intelligence platform built for the Guam community. We give island players the same pricing transparency, portfolio tools, and market data that mainland players take for granted — without the markup, without the guesswork, and without the games.

### Vision
To be Guam's trusted home for Magic: The Gathering — the place every island player checks before they buy, sell, or trade a card.

### Mission
To prove that a trading card marketplace can run on honesty. investMTG exists to give Guam's MTG community free access to real market data, fair pricing tools, and a local marketplace built without fake data, dark patterns, or hidden agendas.

---

## Features

- **Real-Time Prices (USD Only)** — Live card pricing from [Scryfall](https://scryfall.com), sourced from TCGplayer and Cardmarket. Physical printed cards only — no MTGO or digital-only cards.
- **Condition Pricing** — Cart shows condition-specific prices (DMG, HP, MP, LP, NM) via [JustTCG](https://justtcg.com) with interactive chip selectors
- **Immersive Hero** — AI-generated cinematic background with golden energy trails, glass-morphism stats bar, scroll-driven fade-up animations
- **Community Events** — Featured events with AI-generated artwork (TCG Con 2026 hero card, Commander Night, Weekend Events), date chips, hover effects with golden border glow
- **Daily Fresh Content** — Homepage Featured, Trending, and Budget sections rotate daily across 50+ card pools with golden accent bar headers
- **Live Price Ticker** — Scrolling ticker with real market prices for 15 major cards, refreshing every 5 minutes
- **Card Search** — Search thousands of printed Magic cards with color, rarity, and price filters
- **Market Movers** — Most Valuable Cards, Modern Staples, Commander Staples, and Budget Finds with real pricing
- **cEDH Metagame** — Competitive EDH commander rankings, tournament results, and staple cards from [EDH Top 16](https://edhtop16.com) and [TopDeck.gg](https://topdeck.gg)
- **Deck Browser** — Import and price decklists from [Moxfield](https://moxfield.com) with popular deck presets
- **Portfolio Tracker** — Track your collection's value against live market prices
- **Local Marketplace** — Buy, sell, and trade cards with Guam's MTG community
- **Seller Dashboard** — Register as a seller, manage listings, track sales
- **Local Store Directory** — The Inventory, Geek Out Next Level, My Wife Told Me To Sell It, Fraim's Collectibles, Poke Violet 671, Expensive Dreams (6 verified Guam stores — listed as community resources, no formal partnerships)
- **AI Chatbot** — MTG knowledge assistant powered by Pollinations AI
- **Payment Integration** — SumUp card payments, Apple Pay / Google Pay via Swift Checkout
- **Guam GRT** — Automatic 4% Guam Retail Tax calculation at checkout
- **Legal Pages** — Privacy Policy, Terms of Service, Cookie Notice
- **PWA Support** — Installable as a mobile app

## Tech Stack

- **Frontend**: React 18 SPA (no build tools, no JSX)
- **Pattern**: `React.createElement` via esm.sh import maps
- **Hosting**: GitHub Pages at www.investmtg.com
- **Domain**: Cloudflare DNS with HTTPS
- **CORS Proxy**: Cloudflare Worker (investmtg-proxy.bloodshutdawn.workers.dev)
- **Payments**: SumUp (card) + Swift Checkout SDK (Apple Pay / Google Pay)
- **APIs**: Scryfall, JustTCG, EDH Top 16, TopDeck.gg, Moxfield, Pollinations AI
- **Storage**: Browser localStorage (no backend server)
- **Fonts**: Clash Display + Satoshi (FontShare)

## Project Structure

```
investmtg/
├── index.html              # Entry point with import maps, CSP, structured data
├── app.js                  # Root React app, router, global state
├── base.css                # CSS custom properties and tokens
├── style.css               # All component styles
├── manifest.json           # PWA manifest
├── robots.txt              # Search engine crawl rules
├── sitemap.xml             # Sitemap for SEO
├── 404.html                # GitHub Pages SPA fallback
├── SOUL.md                 # Ethical guidelines — The Fair Play Economy
├── BUILD_SPEC.md           # Original build specification
├── CHANGES.md              # Build changelog
├── OPTIMIZATION_SUMMARY.md # Performance optimization log
│
├── images/
│   ├── hero-bg.jpg          # AI-generated hero background (golden energy trails)
│   ├── event-tcgcon.jpg     # AI artwork for TCG Con 2026 event card
│   ├── event-commander.jpg  # AI artwork for Commander Night event card
│   └── event-weekend.jpg    # AI artwork for Weekend Events card
│
├── components/
│   ├── HomeView.js         # Homepage with daily-rotating card sections
│   ├── SearchView.js       # Card search with filters
│   ├── CardDetailView.js   # Card detail with live USD pricing + purchase links
│   ├── PortfolioView.js    # Portfolio tracker with live price updates
│   ├── CartView.js         # Shopping cart with JustTCG condition pricing chips
│   ├── CheckoutView.js     # Full checkout with SumUp + Apple/Google Pay + GRT
│   ├── StoreView.js        # Local stores + marketplace listings
│   ├── SellerDashboard.js  # Seller registration and listing management
│   ├── OrderConfirmation.js# Post-payment confirmation
│   ├── MarketMoversView.js # Top valued cards by category
│   ├── MetaView.js         # cEDH metagame dashboard (EDH Top 16 + TopDeck.gg)
│   ├── DecklistView.js     # Deck browser with Moxfield import
│   ├── PriceHistoryChart.js# Price display component
│   ├── ListingModal.js     # Create marketplace listing modal
│   ├── BuyLocalModal.js    # Buy from local seller modal
│   ├── Ticker.js           # Live price ticker strip
│   ├── Header.js           # Navigation header
│   ├── Footer.js           # Site footer
│   ├── Chatbot.js          # AI chatbot assistant
│   ├── PrivacyPolicyView.js # Privacy policy page
│   ├── TermsView.js        # Terms of service page
│   ├── CookieNotice.js     # Cookie consent banner
│   └── shared/
│       ├── CardGrid.js     # Reusable card grid component
│       ├── Icons.js        # SVG icon components
│       ├── SkeletonCard.js # Loading skeleton
│       ├── Toast.js        # Toast notifications
│       └── BackToTop.js    # Scroll-to-top button
│
├── utils/
│   ├── api.js              # Scryfall API wrapper with rate limiting
│   ├── helpers.js          # Formatting and utility functions
│   ├── justtcg-api.js      # JustTCG condition pricing API
│   ├── edhtop16-api.js     # EDH Top 16 GraphQL API wrapper
│   ├── topdeck-api.js      # TopDeck.gg REST API wrapper
│   ├── moxfield-api.js     # Moxfield decklist API wrapper
│   └── marketplace-data.js # Marketplace data management (empty — no mock data per SOUL.md)
│
└── .well-known/
    └── apple-developer-merchantid-domain-association  # Apple Pay verification
```

## Architecture Rules

- `var h = React.createElement;` — no JSX anywhere
- `var ref = React.useState(x); var val = ref[0], setVal = ref[1];` — no destructuring
- All imports use bare specifiers resolved by the import map in index.html
- Static site with no backend — localStorage for all persistence
- All CSS in `style.css` — no CSS-in-JS or modules
- Mobile-first responsive design with dark/light theme support
- USD only — no EUR, GBP, tix, or other currencies displayed

## The Fair Play Economy (SOUL.md)

This project operates under **The Fair Play Economy** — five pillars that guide every decision:

1. **Transparency** — All prices, sources, and methods are visible
2. **Equity of Access** — Every player gets the same tools, free forever
3. **Honesty Rewarded** — Accurate grading, fair pricing, good-faith trading
4. **Sportsmanship Over Greed** — Anti-hoarding, anti-gouging systems
5. **Diversity & Inclusion** — Every player welcome regardless of budget or background

Key rules:
- All price data is real — Scryfall for market prices, JustTCG for condition prices
- All metagame data is real — EDH Top 16 and TopDeck.gg tournament results
- No fabricated statistics, fake trends, or mock data shown as real
- Physical printed cards only — no digital/MTGO cards
- Store listings are community resources — no formal partnerships claimed
- See [SOUL.md](SOUL.md) for the full ethical framework, brand voice, and changelog

## External Services

| Service | Purpose | Auth |
|---------|---------|------|
| [Scryfall API](https://scryfall.com/docs/api) | Card data, images, and prices | No key required |
| [JustTCG API](https://justtcg.com) | Condition-specific pricing | API key (paid tier) |
| [EDH Top 16 API](https://edhtop16.com) | cEDH commander meta data | No key required |
| [TopDeck.gg API](https://topdeck.gg) | cEDH tournament data | API key (free tier) |
| [Moxfield API](https://moxfield.com) | Decklist imports | No key required |
| [Pollinations AI](https://pollinations.ai) | Chatbot responses | No key required |
| [SumUp](https://developer.sumup.com) | Card payments | Merchant code + public key |
| [Cloudflare Workers](https://workers.cloudflare.com) | CORS proxy for EDH Top 16 / TopDeck | API token |
| [GitHub Pages](https://pages.github.com) | Static hosting | GitHub PAT for deployment |
| [Cloudflare](https://cloudflare.com) | DNS + CDN | API tokens |

## Development

This is a no-build project. To work on it locally:

1. Clone the repo: `git clone https://github.com/imvestMTG/investmtg.git`
2. Serve the files with any static server (e.g., `npx serve .`)
3. Open `http://localhost:3000` in your browser
4. Edit files directly — no compilation step needed

## Connected Services

| Platform | Status |
|----------|--------|
| YouTube (Data + Analytics) | Connected |
| Facebook Pages | Pending |
| LinkedIn | Pending |
| X (Twitter) | Pending (no connector) |
| Instagram | Pending (no connector) |

**Email domain:** investmtg.com (Google Workspace)

## License

Private project. All rights reserved.

---

*Created with [Perplexity Computer](https://www.perplexity.ai/computer)*
