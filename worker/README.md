# investmtg-proxy Worker

Cloudflare Worker that serves as a CORS proxy and API gateway for investmtg.com.

## Routes

| Route | Target | Auth | Purpose |
|-------|--------|------|---------|
| `/justtcg` | api.justtcg.com | `X-Api-Key` (encrypted secret) | Card condition pricing |
| `/topdeck` | topdeck.gg API | `Authorization` (encrypted secret) | Tournament data |
| `/chatbot` | text.pollinations.ai | None (rate-limited) | AI chat advisor |
| `/?target=` | Allowlisted hosts only | None | Generic CORS proxy |

## Security

- **Origin validation**: Only requests from `investmtg.com` and local dev origins are allowed
- **API keys**: Stored as **encrypted Cloudflare Worker secrets** — never in source code, environment variables, or wrangler.toml
- **Rate limiting**: Chatbot endpoint limited to 12 requests per minute per IP
- **Host allowlist**: Generic proxy only forwards to explicitly allowlisted domains (edhtop16.com, scryfall, moxfield)

## Deployment

### Option 1: Wrangler CLI (recommended)

```bash
cd worker/
npx wrangler deploy
```

Requires environment variables:
- `CLOUDFLARE_API_TOKEN` — API token with Workers Scripts: Edit permission
- `CLOUDFLARE_ACCOUNT_ID` — `12360b71beb495952bc5bdcd1b3eab27`

### Option 2: Cloudflare Dashboard (Quick Edit)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages
2. Click on `investmtg-proxy`
3. Click "Quick edit"
4. Paste the contents of `worker.js`
5. Click "Save and Deploy"

## Secrets Management

API keys are stored as encrypted secrets, not in wrangler.toml or any source file.

To set or rotate secrets:
```bash
echo "your-key-here" | npx wrangler secret put JUSTTCG_API_KEY
echo "your-key-here" | npx wrangler secret put TOPDECK_API_KEY
```

To list current secrets:
```bash
npx wrangler secret list
```

**Required secrets:**
| Secret | Service | How to obtain |
|--------|---------|---------------|
| `JUSTTCG_API_KEY` | JustTCG card pricing | [justtcg.com](https://justtcg.com) account dashboard |
| `TOPDECK_API_KEY` | TopDeck.gg tournaments | [topdeck.gg](https://topdeck.gg) API access request |
