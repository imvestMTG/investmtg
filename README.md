# investMTG — Guam's MTG Marketplace

**[www.investmtg.com](https://www.investmtg.com)**

A local Magic: The Gathering marketplace for the Guam community. Track real-time card prices in USD, buy and sell locally, manage your portfolio, browse cEDH metagame data, and discover cards from Guam's local game stores.

---

## Features

- **Real-Time Prices (USD Only)** — Live card pricing from [Scryfall](https://scryfall.com), sourced from TCGplayer and Cardmarket. Physical printed cards only — no MTGO or digital-only cards.
- **Condition Pricing** — Cart shows condition-specific prices (DMG, HP, MP, LP, NM) via [JustTCG](https://justtcg.com) with interactive chip selectors
- **Daily Fresh Content** — Homepage Featured, Trending, and Budget sections rotate daily across 50+ card pools
- **Live Price Ticker** — Scrolling ticker with real market prices for 15 major cards, refreshing every 5 minutes
- **Card Search** — Search thousands of printed Magic cards with color, rarity, and price filters
- **Market Movers** — Most Valuable Cards, Modern Staples, Commander Staples, and Budget Finds with real pricing
- **cEDH Metagame** — Competitive EDH commander rankings, tournament results, and staple cards from [EDH Top 16](https://edhtop16.com) and [TopDeck.gg](https://topdeck.gg)
- **Deck Browser** — Import and price decklists from [Moxfield](https://moxfield.com) with popular deck presets
- **Portfolio Tracker** — Track your collection's value against live market prices
- **Local Marketplace** — Buy, sell, and trade cards with Guam's MTG community
- **Seller Dashboard** — Register as a seller, manage listings, track sales
- **4 Local Stores** — Geek Out Guam, The Grid GU, Fokai Guam, Inventory Guam
- **AI Chatbot** — MTG knowledge assistant powered by Pollinations AI
- **Payment Integration** — SumUp card payments, Apple Pay / Google Pay via Swift Checkout
- **Guam GRT** — Automatic 4% Guam Retail Tax calculation at checkout
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
│   └── marketplace-data.js # Marketplace data management
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

## Data Integrity (SOUL.md)

This project follows **The Fair Play Economy** principles:
- All price data is real — Scryfall for market prices, JustTCG for condition prices
- All metagame data is real — EDH Top 16 and TopDeck.gg tournament results
- No fabricated statistics, fake trends, or mock data shown as real
- Physical printed cards only — no digital/MTGO cards
- All listed stores are verified Guam businesses
- See [SOUL.md](SOUL.md) for the full ethical framework

## External Services

| Service | Purpose | Auth |
|---------|---------|------|
| [Scryfall API](https://scryfall.com/docs/api) | Card data, images, and prices | No key required |
| [JustTCG API](https://justtcg.com) | Condition-specific pricing | API key (free tier) |
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

## License

Private project. All rights reserved.

---

*Created with [Perplexity Computer](https://www.perplexity.ai/computer)*
