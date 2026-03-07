# investmtg-proxy Worker

Cloudflare Worker that serves as a CORS proxy for investmtg.com.

## Routes

| Route | Target | Purpose |
|-------|--------|---------|
| `/justtcg` | api.justtcg.com | Card search (API key injected server-side) |
| `/topdeck` | topdeck.gg API | Tournament data |
| `/chatbot` | text.pollinations.ai | AI chat advisor (rate-limited) |
| `/?target=` | Allowlisted hosts | Generic CORS proxy |

## Deployment

### Option 1: Cloudflare Dashboard (Quick Edit)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages
2. Click on `investmtg-proxy`
3. Click "Quick edit"
4. Paste the contents of `worker.js`
5. Click "Save and Deploy"

### Option 2: Wrangler CLI

```bash
cd worker/
npm install -g wrangler
wrangler login
wrangler deploy
```

## Environment Variables

- `JUSTTCG_API_KEY` — JustTCG API key (set via dashboard or `wrangler secret put`)
