# investMTG — Guam's MTG Marketplace

**[www.investmtg.com](https://www.investmtg.com)**

A local Magic: The Gathering marketplace for the Guam community. Track real-time card prices, buy and sell locally, manage your portfolio, and discover cards from Guam's local game stores.

---

## Features

- **Real-Time Prices** — Live card pricing from [Scryfall](https://scryfall.com), sourced from TCGplayer and Cardmarket. Physical printed cards only — no MTGO or digital-only cards.
- **Daily Fresh Content** — Homepage Featured, Trending, and Budget sections rotate daily across 50+ card pools
- **Live Price Ticker** — Scrolling ticker with real market prices for 15 major cards, refreshing every 5 minutes
- **Card Search** — Search thousands of printed Magic cards with color, rarity, and price filters
- **Portfolio Tracker** — Track your collection's value against live market prices
- **Local Marketplace** — Buy, sell, and trade cards with Guam's MTG community
- **Seller Dashboard** — Register as a seller, manage listings, track sales
- **4 Local Stores** — Geek Out Guam, The Grid GU, Fokai Guam, Inventory Guam
- **AI Chatbot** — MTG knowledge assistant powered by Pollinations AI
- **Payment Integration** — SumUp card payments, Apple Pay / Google Pay via Swift Checkout
- **PWA Support** — Installable as a mobile app

## Tech Stack

- **Frontend**: React 18 SPA (no build tools, no JSX)
- **Pattern**: `React.createElement` via esm.sh import maps
- **Hosting**: GitHub Pages at www.investmtg.com
- **Domain**: Cloudflare DNS with HTTPS
- **Payments**: SumUp (card) + Swift Checkout SDK (Apple Pay / Google Pay)
- **API**: Scryfall (card data), Pollinations AI (chatbot)
- **Storage**: Browser localStorage (no backend server)

## Project Structure

```
investmtg_build/
├── index.html              # Entry point with import maps, CSP, structured data
├── app.js                  # Root React app, router, global state
├── base.css                # CSS custom properties and tokens
├── style.css               # All component styles (~89KB)
├── manifest.json           # PWA manifest
├── 404.html                # GitHub Pages SPA fallback
├── SOUL.md                 # Ethical guidelines — The Fair Play Economy
├── BUILD_SPEC.md           # Original build specification
├── CHANGES.md              # Build changelog
├── OPTIMIZATION_SUMMARY.md # Performance optimization log
│
├── components/
│   ├── HomeView.js         # Homepage with daily-rotating card sections
│   ├── SearchView.js       # Card search with filters
│   ├── CardDetailView.js   # Card detail with live pricing + purchase links
│   ├── PortfolioView.js    # Portfolio tracker with live price updates
│   ├── CartView.js         # Shopping cart
│   ├── CheckoutView.js     # Full checkout with SumUp + Apple/Google Pay
│   ├── StoreView.js        # Local stores + marketplace listings
│   ├── SellerDashboard.js  # Seller registration and listing management
│   ├── OrderConfirmation.js# Post-payment confirmation
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
│   └── marketplace-data.js # Initial marketplace seed data
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

## Data Integrity (SOUL.md)

This project follows **The Fair Play Economy** principles:
- All price data is real, from Scryfall's API
- No fabricated statistics, fake trends, or mock data shown as real
- All listed stores are verified Guam businesses
- See [SOUL.md](SOUL.md) for the full ethical framework

## External Services

| Service | Purpose | Auth |
|---------|---------|------|
| [Scryfall API](https://scryfall.com/docs/api) | Card data and prices | No key required |
| [Pollinations AI](https://pollinations.ai) | Chatbot responses | No key required |
| [SumUp](https://developer.sumup.com) | Card payments | Merchant code + public key |
| [Swift Checkout SDK](https://js.sumup.com) | Apple Pay / Google Pay | SumUp public key |
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
