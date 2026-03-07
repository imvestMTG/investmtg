# investMTG — Build Specification

## Project Context
investmtg.com is Guam's MTG marketplace and price intelligence platform. Built on The Fair Play Economy — every piece of data must be real, verifiable, and transparent.

It's a React 18 SPA using `React.createElement` (no JSX, no build tools) loaded via esm.sh import maps. Hosted on GitHub Pages.

The codebase is at `/home/user/workspace/investmtg_build/`. All files are served statically.

## Architecture Rules (CRITICAL)
- Use `var h = React.createElement;` pattern — NO JSX
- Use `var ref = React.useState()` with `ref[0]`/`ref[1]` — no destructuring
- All imports from `'react'` via esm.sh import maps
- Static site, no backend server — use localStorage for data persistence
- All CSS goes into the existing `style.css` file
- Keep the existing design system (CSS variables from `:root` and `[data-theme]`)
- File naming: PascalCase for components, lowercase for utils

## Data Integrity (SOUL.md)
All data must be real and verifiable:
- Card prices from Scryfall API only — no mock/random data
- No `Math.random()` for any user-facing metrics
- All stores verified Guam businesses
- See SOUL.md for full guidelines

## Components

### Pages
| Component | Route | Description |
|-----------|-------|-------------|
| HomeView | `#` (home) | Daily-rotating Featured/Trending/Budget cards from Scryfall |
| SearchView | `#search` | Full card search with color, rarity, price filters |
| CardDetailView | `#card/{id}` | Live pricing, legality, purchase links from Scryfall |
| PortfolioView | `#portfolio` | Portfolio tracker with live Scryfall price updates |
| CartView | `#cart` | Shopping cart with seller grouping |
| CheckoutView | `#checkout` | 3 payment methods: Reserve & Pay at Pickup, SumUp Card, Apple/Google Pay |
| StoreView | `#store` | Local stores + community marketplace |
| SellerDashboard | `#seller` | Seller registration, listing CRUD, sales history |
| OrderConfirmation | `#order/{id}` | Post-payment confirmation |
| MarketMoversView | `#movers` | Most valuable cards by category with real pricing |
| MetaView | `#meta` | cEDH metagame dashboard (EDH Top 16 + TopDeck.gg) |
| DecklistView | `#decks` | Deck browser with Moxfield import |
| PrivacyPolicyView | `#privacy` | Privacy policy |
| TermsView | `#terms` | Terms of service |

### Shared Components
| Component | Description |
|-----------|-------------|
| Ticker | Live price ticker fetching from Scryfall collection API every 5 min |
| Header | Navigation with cart badge |
| Footer | Site footer with attribution |
| Chatbot | AI assistant via Pollinations API |
| CardGrid | Reusable card display grid |
| Icons | SVG icon library |
| SkeletonCard | Loading placeholder |
| Toast | Notification system |
| BackToTop | Scroll-to-top button |
| CookieNotice | Cookie consent banner |

### Utils
| File | Description |
|------|-------------|
| api.js | Scryfall API wrapper with 100ms rate limiting |
| helpers.js | formatUSD, getCardPrice, image URL helpers, debounce |
| justtcg-api.js | JustTCG condition pricing API (paid tier) |
| edhtop16-api.js | EDH Top 16 GraphQL API wrapper |
| topdeck-api.js | TopDeck.gg REST API wrapper |
| moxfield-api.js | Moxfield decklist API wrapper |
| marketplace-data.js | Marketplace data management (empty — no mock data per SOUL.md) |

## Payment Integration (ACTIVE)

### SumUp Card Payments
- **Merchant code**: M55T01IN
- **Public key**: sup_pk_qRhf6eGzMipB9IwxFFKpsqe0w15FXo4Jk
- **SDK**: Swift Checkout SDK loaded from `https://js.sumup.com/swift-checkout.js`
- Payment flow: Create checkout → Mount widget → Process payment → Confirm

### Apple Pay / Google Pay
- Uses SumUp Swift Checkout SDK with wallet payment support
- Apple Pay domain verification file at `/.well-known/apple-developer-merchantid-domain-association`
- Domain verified: www.investmtg.com

### Reserve & Pay at Pickup
- No online payment — buyer contacts seller to arrange pickup at a Guam store
- Order saved to localStorage with "pending pickup" status

## Design System
- Gold accent: `#D4A843` (dark) / `#B8912E` (light)
- Dark surfaces with subtle borders
- Cards use `var(--color-surface)` background
- Font: Clash Display (headings), Satoshi (body) via Fontshare
- Mobile-first responsive design
- Dark/light theme support via `[data-theme]`

## External Services
| Service | Endpoint | Auth |
|---------|----------|------|
| Scryfall | `https://api.scryfall.com` | None (free, 100ms rate limit) |
| JustTCG | `https://api.justtcg.com` | API key (paid tier) |
| EDH Top 16 | `https://edhtop16.com` (via CORS proxy) | None |
| TopDeck.gg | `https://topdeck.gg` (via CORS proxy) | API key |
| Moxfield | `https://api2.moxfield.com` | None |
| Pollinations AI | `https://text.pollinations.ai/openai/chat/completions` | None (free) |
| SumUp | `https://js.sumup.com` / `https://api.sumup.com` | Public key |
| Fontshare | `https://api.fontshare.com` | None |

## Deployment
- GitHub repo: `imvestMTG/investmtg` (branch: `main`)
- Hosted on GitHub Pages
- Domain: www.investmtg.com via Cloudflare DNS
- HTTPS certificate managed by GitHub Pages
- Deploy via GitHub API with PAT (push individual files)
