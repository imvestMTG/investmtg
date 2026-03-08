# investMTG Frontend V2

Modern React + TypeScript rewrite for the Guam-only investMTG experience.

## Scope

This app replaces the old single-file React shell with a cleaner front end focused on:
- search
- card detail
- portfolio tracking
- seller flow
- Guam-only fulfillment language

Cardmarket is intentionally excluded from this rewrite. The current reference layer uses Scryfall for card data and TCGplayer-only purchase links where relevant.

## Stack

- React 19
- TypeScript
- Vite
- TanStack Query
- Lucide React

## Routing

The app uses a lightweight hash router instead of `react-router-dom` so it works reliably on static hosting.

Examples:
- `#/search`
- `#/portfolio`
- `#/sell`
- `#/card/<id>`

## Data behavior

- Card search uses Scryfall search
- Card detail uses Scryfall card + printings endpoints
- Portfolio values use Scryfall collection lookups against seeded Guam-focused positions
- Seller flow currently demonstrates the target UX with static Guam listing draft data

The rewrite avoids `localStorage` and `sessionStorage` because the preview/deployment environment can block browser storage access.

## Static hosting notes

This project is configured for static deployment:
- `vite.config.ts` uses `base: './'`
- public assets are emitted into the final build
- the app is safe for GitHub Pages artifact deployment from `dist/`

## Commands

```bash
npm ci
npm run build
npm run lint
npm run preview
```

## Deployment

The parent repository deploy workflow builds this folder and publishes `frontend-v2/dist` to GitHub Pages.
