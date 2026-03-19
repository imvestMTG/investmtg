/**
 * investmtg-proxy — Cloudflare Worker (v3)
 * Full backend for investmtg.com with D1 database + KV caching + Google OAuth
 *
 * Bindings:
 *   DB    — D1 database (investmtg-db)
 *   CACHE — KV namespace (INVESTMTG_CACHE)
 *
 * Secrets:
 *   JUSTTCG_API_KEY
 *   TOPDECK_API_KEY
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   AUTH_SECRET
 *   FRONTEND_URL
 *   SUMUP_SECRET_KEY  — SumUp secret API key for checkout creation
 *   PAYPAL_CLIENT_ID  — PayPal client ID (Live)
 *   PAYPAL_CLIENT_SECRET — PayPal client secret (Live)
 *   ADMIN_TOKEN       — Admin bypass token for testing (skips Google OAuth)
 *   RESEND_API_KEY    — Resend.com API key for transactional emails
 *   ECHOMTG_API_KEY   — EchoMTG API key for price history + trending data
 *
 * Routes:
 *   /api/ticker           — KV-cached ticker prices
 *   /api/featured         — KV-cached featured cards
 *   /api/trending         — KV-cached trending cards
 *   /api/budget           — KV-cached budget staples
 *   /api/search           — Proxied Scryfall search with D1 caching
 *   /api/card/:id         — Card detail with D1-cached pricing
 *   /api/movers/:cat      — Market movers data
 *   /api/portfolio        — Portfolio CRUD (auth user or anonymous session)
 *   /api/portfolio/batch  — Batch portfolio import (auth required, max 500)
 *   /api/portfolio/enrich — Batch-fetch Scryfall prices for imported cards
 *   /api/listings         — Marketplace listings CRUD (write routes require auth)
 *   /api/listings/batch   — Batch listing creation (auth required, max 500)
 *   /api/sellers          — Seller registration + management (write routes require auth)
 *   /api/stores           — Local stores from D1
 *   /api/events           — Community events from D1
 *   /api/cart             — Shopping cart CRUD (auth user or anonymous session)
 *   /api/orders           — Order CRUD (POST allows guests with contact_email; GET/GET/:id auth required)
 *   /api/sumup/checkout   — Create SumUp checkout (guests allowed)
 *   /api/paypal/create-order  — Create PayPal order (guests allowed)
 *   /api/paypal/capture-order — Capture PayPal payment (guests allowed)
 *   /auth/google          — Start Google OAuth flow
 *   /auth/callback        — Google OAuth callback
 *   /auth/me              — Current authenticated user
 *   /auth/logout          — Destroy auth session
 *   /justtcg              — JustTCG API proxy (existing)
 *   /topdeck              — TopDeck API proxy (existing)
 *   /chatbot              — AI chatbot proxy (existing)
 *   /echomtg              — EchoMTG API proxy (price history + trending data)
 *   /?target=             — Generic CORS proxy (existing)
 */

/* OAuth redirect uses the custom domain so Google consent screen shows investmtg.com */
const OAUTH_REDIRECT_URI = 'https://api.investmtg.com/auth/callback';

const ALLOWED_ORIGINS = [
  'https://www.investmtg.com',
  'https://investmtg.com',
  'https://api.investmtg.com',
  'https://imvestmtg.github.io',
];

const ALLOWED_PROXY_HOSTS = [
  'edhtop16.com',
  'api.scryfall.com',
  'api2.moxfield.com',
];

// Cache TTLs (seconds)
const TTL_TICKER = 300;       // 5 minutes
const TTL_FEATURED = 3600;    // 1 hour
const TTL_TRENDING = 1800;    // 30 minutes
const TTL_BUDGET = 3600;      // 1 hour
const TTL_MOVERS = 1800;      // 30 minutes
const TTL_MTGSTOCKS = 86400;  // 24 hours (price history doesn't change fast)
const TTL_PRICE = 600;        // 10 minutes for individual card prices

/* ── SEO: Bot user-agent detection for HTMLRewriter SSR ── */
const BOT_UA_RE = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|applebot|pinterestbot|redditbot|slackbot/i;

const GITHUB_PAGES_ORIGIN = 'https://imvestmtg.github.io';
const ORIGIN_WWW_HOSTNAME = 'origin-www.investmtg.com';

const AUTH_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const AUTH_STATE_MAX_AGE = 60 * 10; // 10 minutes

/* ── External API bases (centralized) ── */
const SCRYFALL_API = 'https://api.scryfall.com';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const SUMUP_API_BASE = 'https://api.sumup.com/v0.1/checkouts';
const PAYPAL_API_BASE = 'https://api-m.paypal.com';
const RESEND_API_URL = 'https://api.resend.com/emails';
const SUMUP_MERCHANT_CODE = 'M55T011N';
const ORDER_EMAIL_FROM = 'orders@investmtg.com';
const SITE_URL = 'https://www.investmtg.com';

// Ticker cards to track
const TICKER_CARDS = [
  { name: 'Ragavan, Nimble Pilferer' },
  { name: 'The One Ring' },
  { name: 'Sheoldred, the Apocalypse' },
  { name: 'Dockside Extortionist' },
  { name: 'Mana Crypt' },
  { name: 'Force of Will' },
  { name: 'Arid Mesa' },
  { name: 'Bloodstained Mire' },
  { name: 'Scalding Tarn' },
  { name: 'Misty Rainforest' },
  { name: 'Verdant Catacombs' },
  { name: 'Marsh Flats' },
  { name: 'Polluted Delta' },
  { name: 'Flooded Strand' },
  { name: 'Windswept Heath' },
  { name: 'Wooded Foothills' },
];

// Fallback card lists (used when KV dynamic lists haven't been populated yet)
const FALLBACK_FEATURED = [
  'Serra\'s Sanctum', 'Tropical Island', 'Underground Sea',
  'Savannah', 'Bayou', 'Volcanic Island',
  'Tundra', 'Badlands', 'Plateau', 'Scrubland',
  'Gaea\'s Cradle', 'The Tabernacle at Pendrell Vale',
];
const FALLBACK_TRENDING = [
  'Fatal Push', 'The One Ring', 'Ragavan, Nimble Pilferer',
  'Sheoldred, the Apocalypse', 'Orcish Bowmasters', 'Mana Crypt',
  'Jewel Lotus', 'Dockside Extortionist', 'Fierce Guardianship',
  'Smothering Tithe', 'Cyclonic Rift', 'Atraxa, Grand Unifier',
];
const FALLBACK_BUDGET = [
  'Sol Ring', 'Rampant Growth', 'Path to Exile', 'Counterspell',
  'Swords to Plowshares', 'Lightning Bolt', 'Cultivate', 'Arcane Signet',
  'Beast Within', 'Chaos Warp', 'Farseek', 'Command Tower',
];

// Scryfall queries for daily carousel refresh (cron picks random page from results)
const CAROUSEL_QUERIES = {
  featured: {
    // Popular expensive commander staples with real USD prices
    query: 'usd>20 game:paper f:commander has:usd -t:basic -is:digital -is:funny',
    order: 'edhrec', dir: 'asc', maxPage: 8,
  },
  trending: {
    // Recently printed popular cards with value (last 2 years)
    query: 'usd>1 game:paper year>=2024 f:commander has:usd -t:basic -is:digital -is:funny',
    order: 'edhrec', dir: 'asc', maxPage: 8,
  },
  budget: {
    // Cheap popular commander staples
    query: 'usd<5 usd>0.25 game:paper f:commander has:usd -t:basic -is:digital -is:funny -t:sticker',
    order: 'edhrec', dir: 'asc', maxPage: 8,
  },
};

/* ── CORS helpers ── */

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'microphone=(), geolocation=()',
  };
  /* Only return CORS headers for allowed origins; unknown origins get security headers only */
  if (!ALLOWED_ORIGINS.includes(origin)) return securityHeaders;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    ...securityHeaders,
  };
}

function handleOptions(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  });
}

/* ── Session + auth helpers ── */

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function getSession(request) {
  return getCookie(request, 'investmtg_session');
}

function getAuthToken(request) {
  return getCookie(request, 'investmtg_auth');
}

function generateSession() {
  return crypto.randomUUID();
}

function buildCookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${maxAge}`;
}

function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0`;
}

function withCookies(response, cookies) {
  const headers = new Headers(response.headers);
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(response.body, { status: response.status, headers });
}

function withSessionCookie(response, sessionToken) {
  return withCookies(response, [buildCookie('investmtg_session', sessionToken, 31536000)]);
}

function withAuthCookie(response, authToken) {
  return withCookies(response, [buildCookie('investmtg_auth', authToken, AUTH_SESSION_MAX_AGE)]);
}

function ensureSession(request) {
  let token = getSession(request);
  const isNew = !token;
  const authToken = getAuthToken(request);
  if (!token) token = generateSession();
  return { token, isNew, authToken };
}

function createRedirect(request, location, cookies = []) {
  const headers = new Headers(corsHeaders(request));
  headers.set('Location', location);
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers });
}

function utf8Bytes(str) {
  return new TextEncoder().encode(str);
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmacSign(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    utf8Bytes(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, utf8Bytes(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function createOAuthState(env) {
  const nonce = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${nonce}.${timestamp}`;
  const signature = await hmacSign(env.AUTH_SECRET, payload);
  return `${nonce}.${timestamp}.${signature}`;
}

async function verifyOAuthState(env, state) {
  if (!state) return false;
  const parts = state.split('.');
  if (parts.length !== 3) return false;
  const [nonce, timestamp, signature] = parts;
  if (!nonce || !timestamp || !signature) return false;
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > AUTH_STATE_MAX_AGE) return false;
  const expected = await hmacSign(env.AUTH_SECRET, `${nonce}.${timestamp}`);
  return signature === expected;
}

async function getAuthUser(request, env) {
  // ── ADMIN BYPASS: check for ADMIN_TOKEN first ──
  // Allows testing auth-gated endpoints without Google OAuth.
  // Set via: wrangler secret put ADMIN_TOKEN
  if (env.ADMIN_TOKEN) {
    const authHeader = request.headers.get('Authorization') || '';
    if (authHeader === 'Bearer ' + env.ADMIN_TOKEN) {
      var ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      console.log('[ADMIN_BYPASS] used from IP:', ip, 'path:', new URL(request.url).pathname);
      return {
        userId: 'admin',
        token: 'admin-bypass',
        user: {
          id: 'admin',
          email: 'admin@investmtg.com',
          name: 'Admin (Bypass)',
          picture: '',
          role: 'admin',
        },
      };
    }
  }

  // Accept token from cookie OR Authorization header (for cross-site requests)
  let token = getAuthToken(request);
  if (!token) {
    const authHeader = request.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
  }
  if (!token) return null;

  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(`
    SELECT s.token, s.user_id, u.id, u.email, u.name, u.picture, u.role
    FROM auth_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?
  `).bind(token, now).first();

  if (!row) {
    await env.DB.prepare('DELETE FROM auth_sessions WHERE token = ? OR expires_at <= ?').bind(token, now).run().catch(() => {});
    return null;
  }

  return {
    userId: row.user_id,
    token: row.token,
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      role: row.role,
    },
  };
}

async function migrateAnonymousDataToUser(env, sessionToken, userId) {
  if (!sessionToken || !userId) return;

  await Promise.all([
    env.DB.prepare('UPDATE portfolios SET user_id = ? WHERE session_token = ?').bind(userId, sessionToken).run(),
    env.DB.prepare('UPDATE listings SET user_id = ? WHERE session_token = ?').bind(userId, sessionToken).run(),
    env.DB.prepare('UPDATE sellers SET user_id = ? WHERE session_token = ?').bind(userId, sessionToken).run(),
    env.DB.prepare('UPDATE cart_items SET user_id = ? WHERE session_token = ?').bind(userId, sessionToken).run(),
  ]);
}

function portfolioScope(auth, token) {
  return auth
    ? { clause: 'p.user_id = ?', bare: 'user_id = ?', value: auth.userId }
    : { clause: 'p.session_token = ?', bare: 'session_token = ?', value: token };
}

function listingOwnerScope(auth) {
  return auth ? { clause: 'user_id = ?', value: auth.userId } : null;
}

function sellerScope(auth, token) {
  return auth ? { clause: 'user_id = ?', value: auth.userId } : { clause: 'session_token = ?', value: token };
}

function cartScope(auth, token) {
  return auth ? { clause: 'c.user_id = ?', value: auth.userId } : { clause: 'c.session_token = ?', value: token };
}

/* ── Rate limiting (in-memory, per-isolate) ── */

const rateLimitMap = new Map();
const RATE_WINDOW = 60_000;
const RATE_MAX_CHATBOT = 12;
const RATE_MAX_API = 120; // General API rate limit per IP

function isRateLimited(key, max) {
  const now = Date.now();
  let entry = rateLimitMap.get(key);
  if (!entry || now - entry.start > RATE_WINDOW) {
    entry = { start: now, count: 1 };
    rateLimitMap.set(key, entry);
    return false;
  }
  entry.count++;
  return entry.count > max;
}

/* ── Scryfall helpers ── */

const SCRYFALL_BASE = SCRYFALL_API;
let lastScryfallCall = 0;

async function scryfallFetch(path) {
  // Rate limit: 100ms between calls
  const now = Date.now();
  const wait = Math.max(0, 100 - (now - lastScryfallCall));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastScryfallCall = Date.now();

  const res = await fetch(SCRYFALL_BASE + path, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'investmtg/2.0 (https://www.investmtg.com)',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Scryfall ${res.status}: ${path} — ${body.substring(0, 200)}`);
  }
  return res.json();
}

/* ── Card v2 helpers: image extraction, DFC fields, treatments, prices ── */

const MULTI_FACE_LAYOUTS = new Set([
  'transform', 'modal_dfc', 'double_faced_token', 'reversible_card', 'art_series'
]);

function extractImageUris(card) {
  if (card.image_uris) return card.image_uris;
  if (card.card_faces && card.card_faces.length > 0) {
    if (card.card_faces[0].image_uris) return card.card_faces[0].image_uris;
    if (card.card_faces[1] && card.card_faces[1].image_uris) return card.card_faces[1].image_uris;
  }
  return {};
}

function extractAllFaceImages(card) {
  if (card.image_uris) return [card.image_uris];
  if (card.card_faces) return card.card_faces.filter(f => f.image_uris).map(f => f.image_uris);
  return [];
}

function getCardField(card, field) {
  if (card[field]) return card[field];
  if (card.card_faces && card.card_faces.length > 0) {
    const front = card.card_faces[0][field] || '';
    const back = card.card_faces[1] ? (card.card_faces[1][field] || '') : '';
    if (field === 'mana_cost' || field === 'type_line') return back ? `${front} // ${back}` : front;
    if (field === 'oracle_text') return back ? `${front}\n---\n${back}` : front;
    return front;
  }
  return '';
}

function getCardColors(card) {
  if (card.colors) return card.colors;
  if (card.card_faces && card.card_faces.length > 0) {
    const all = new Set();
    for (const face of card.card_faces) {
      if (face.colors) face.colors.forEach(c => all.add(c));
    }
    return [...all];
  }
  return [];
}

function extractPrices(card) {
  const p = card.prices || {};
  return {
    usd: p.usd ? parseFloat(p.usd) : null,
    usd_foil: p.usd_foil ? parseFloat(p.usd_foil) : null,
    usd_etched: p.usd_etched ? parseFloat(p.usd_etched) : null,
    eur: p.eur ? parseFloat(p.eur) : null,
  };
}

function getBestUsdPrice(card) {
  const p = extractPrices(card);
  return p.usd || p.usd_foil || p.usd_etched || null;
}

function getTreatmentLabel(card) {
  const treatments = [];
  if (card.frame_effects && card.frame_effects.length > 0) {
    if (card.frame_effects.includes('showcase')) treatments.push('Showcase');
    if (card.frame_effects.includes('extendedart')) treatments.push('Extended Art');
    if (card.frame_effects.includes('etched')) treatments.push('Etched');
  }
  if (card.border_color === 'borderless') treatments.push('Borderless');
  if (card.full_art) treatments.push('Full Art');
  if (card.frame === '1993' || card.frame === '1997') treatments.push('Retro Frame');
  if (card.promo_types) {
    if (card.promo_types.includes('textured')) treatments.push('Textured');
    if (card.promo_types.includes('serialized')) treatments.push('Serialized');
    if (card.promo_types.includes('galaxyfoil')) treatments.push('Galaxy Foil');
    if (card.promo_types.includes('surgefoil')) treatments.push('Surge Foil');
  }
  return treatments.length > 0 ? treatments[0] : 'Regular';
}

async function findBestPaperPrinting(name, fallback) {
  try {
    const result = await scryfallFetch(
      '/cards/search?q=' + encodeURIComponent('!"' + name + '" -is:digital game:paper has:usd') +
      '&order=usd&dir=asc&unique=prints'
    );
    if (result && result.data && result.data.length > 0) {
      const regular = result.data.find(c => !c.promo && c.border_color === 'black' && !c.full_art);
      return regular || result.data[0];
    }
  } catch { /* no results */ }
  // Fallback: try any paper printing with foil price
  try {
    const foilResult = await scryfallFetch(
      '/cards/search?q=' + encodeURIComponent('!"' + name + '" -is:digital game:paper') +
      '&order=usd&dir=desc&unique=prints'
    );
    if (foilResult && foilResult.data && foilResult.data.length > 0) {
      const priced = foilResult.data.find(c => getBestUsdPrice(c) !== null);
      return priced || foilResult.data[0];
    }
  } catch { /* no results */ }
  return fallback;
}

/* ── Build a prepared statement to cache a card in D1 (no .run()) ── */
function cacheCardStmt(db, card, now) {
  const imageUris = extractImageUris(card);
  const allFaces = extractAllFaceImages(card);
  const prices = extractPrices(card);
  return db.prepare(`
    INSERT OR REPLACE INTO prices
    (card_id, name, set_code, set_name, collector_number, rarity,
     mana_cost, type_line, oracle_text, colors,
     price_usd, price_usd_foil, price_usd_etched, price_eur,
     image_small, image_normal, image_large, image_back,
     scryfall_uri, treatment, finishes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    card.id, card.name, card.set, card.set_name, card.collector_number,
    card.rarity, getCardField(card, 'mana_cost'), getCardField(card, 'type_line'),
    getCardField(card, 'oracle_text'), JSON.stringify(getCardColors(card)),
    prices.usd, prices.usd_foil, prices.usd_etched, prices.eur,
    imageUris.small || '', imageUris.normal || '', imageUris.large || '',
    allFaces.length > 1 ? (allFaces[1].normal || '') : '',
    card.scryfall_uri || '', getTreatmentLabel(card),
    JSON.stringify(card.finishes || []), now
  );
}

/* ── Cache a card in D1 using v2 helpers ── */
function cacheCardToD1(db, card, now) {
  return cacheCardStmt(db, card, now).run();
}

async function fetchAndCacheCard(db, name) {
  try {
    let card = await scryfallFetch('/cards/named?exact=' + encodeURIComponent(name));
    if (!card || card.object === 'error') return null;

    // If digital-only or no USD price, find the best paper printing
    if (card.digital || !getBestUsdPrice(card)) {
      card = await findBestPaperPrinting(name, card);
    }

    const imageUris = extractImageUris(card);
    const allFaces = extractAllFaceImages(card);
    const prices = extractPrices(card);
    const now = Math.floor(Date.now() / 1000);

    await cacheCardToD1(db, card, now);

    return {
      card_id: card.id, name: card.name, set_code: card.set, set_name: card.set_name,
      rarity: card.rarity,
      mana_cost: getCardField(card, 'mana_cost'),
      type_line: getCardField(card, 'type_line'),
      price_usd: prices.usd, price_usd_foil: prices.usd_foil,
      price_usd_etched: prices.usd_etched,
      image_small: imageUris.small || '', image_normal: imageUris.normal || '',
      image_back: allFaces.length > 1 ? (allFaces[1].normal || '') : '',
      scryfall_uri: card.scryfall_uri || '',
      treatment: getTreatmentLabel(card),
      finishes: card.finishes || [],
      is_dfc: allFaces.length > 1,
      updated_at: now,
    };
  } catch (e) {
    console.error('fetchAndCacheCard error:', name, e.message);
    return null;
  }
}

async function getCachedCardsByNames(db, cache, cacheKey, names, ttl) {
  // Check KV cache first
  const cached = await cache.get(cacheKey, 'json');
  if (cached) return cached;

  // Check D1 for recent entries
  const now = Math.floor(Date.now() / 1000);
  const staleThreshold = now - ttl;
  const placeholders = names.map(() => '?').join(',');
  const rows = await db.prepare(
    `SELECT * FROM prices WHERE name IN (${placeholders}) AND updated_at > ?`
  ).bind(...names, staleThreshold).all();

  const found = new Map(rows.results.map(r => [r.name, r]));
  const missing = names.filter(n => !found.has(n));

  // Fetch missing from Scryfall
  for (const name of missing) {
    const card = await fetchAndCacheCard(db, name);
    if (card) found.set(name, card);
  }

  // Build result in original order
  const result = names.map(n => found.get(n)).filter(Boolean);

  // Only cache in KV if we got meaningful results
  if (result.length > 0) {
    await cache.put(cacheKey, JSON.stringify(result), { expirationTtl: ttl });
  }

  return result;
}

/* ═══════════════════════════════════════════
   AUTH ROUTE HANDLERS
   ═══════════════════════════════════════════ */

async function handleGoogleAuth(request, env) {
  if (!env.GOOGLE_CLIENT_ID || !env.AUTH_SECRET) {
    return json({ error: 'Auth not configured' }, 500, request);
  }

  const url = new URL(request.url);
  const state = await createOAuthState(env);
  const googleUrl = new URL(GOOGLE_AUTH_URL);
  googleUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  googleUrl.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI);
  googleUrl.searchParams.set('response_type', 'code');
  googleUrl.searchParams.set('scope', 'openid email profile');
  googleUrl.searchParams.set('access_type', 'offline');
  googleUrl.searchParams.set('prompt', 'consent');
  googleUrl.searchParams.set('state', state);

  return createRedirect(request, googleUrl.toString());
}

async function handleAuthCallback(request, env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.AUTH_SECRET || !env.FRONTEND_URL) {
    return json({ error: 'Auth not configured' }, 500, request);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) return json({ error: 'Missing code' }, 400, request);
  if (!(await verifyOAuthState(env, state))) return json({ error: 'Invalid state' }, 400, request);

  const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: OAUTH_REDIRECT_URI,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!tokenResp.ok) {
    const detail = await tokenResp.text().catch(() => 'OAuth token exchange failed');
    return json({ error: 'Token exchange failed', detail }, 502, request);
  }

  const tokenData = await tokenResp.json();
  if (!tokenData.access_token) return json({ error: 'Missing access token' }, 502, request);

  const userResp = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userResp.ok) {
    const detail = await userResp.text().catch(() => 'Failed to fetch user info');
    return json({ error: 'User info fetch failed', detail }, 502, request);
  }

  const profile = await userResp.json();
  if (!profile.id || !profile.email) {
    return json({ error: 'Invalid Google profile' }, 502, request);
  }

  const now = Math.floor(Date.now() / 1000);
  const existingUser = await env.DB.prepare(
    'SELECT id, created_at, role FROM users WHERE google_id = ?'
  ).bind(profile.id).first();

  let userId;
  if (existingUser) {
    await env.DB.prepare(`
      UPDATE users
      SET email = ?, name = ?, picture = ?, role = COALESCE(role, 'buyer'), last_login = ?
      WHERE id = ?
    `).bind(
      profile.email,
      profile.name || profile.email,
      profile.picture || '',
      now,
      existingUser.id
    ).run();
    userId = existingUser.id;
  } else {
    const result = await env.DB.prepare(`
      INSERT INTO users (google_id, email, name, picture, role, created_at, last_login)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      profile.id,
      profile.email,
      profile.name || profile.email,
      profile.picture || '',
      'buyer',
      now,
      now
    ).run();
    userId = result.meta?.last_row_id;
  }

  if (!userId) return json({ error: 'Failed to create user' }, 500, request);

  const authToken = crypto.randomUUID();
  const expiresAt = now + AUTH_SESSION_MAX_AGE;
  await env.DB.prepare(
    'INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(authToken, userId, now, expiresAt).run();

  const anonymousSession = getSession(request);
  await migrateAnonymousDataToUser(env, anonymousSession, userId);

  // Pass token via URL fragment (not query param) so it never appears in server logs,
  // referrer headers, or browser history. Fragments are client-side only.
  const redirectUrl = `${env.FRONTEND_URL}#auth_token=${encodeURIComponent(authToken)}`;
  return createRedirect(request, redirectUrl, [
    buildCookie('investmtg_auth', authToken, AUTH_SESSION_MAX_AGE),
  ]);
}


async function handleAuthMe(request, env) {
  const auth = await getAuthUser(request, env);
  if (!auth) return json({ authenticated: false }, 200, request);
  return json({ authenticated: true, user: auth.user }, 200, request);
}

async function handleAuthLogout(request, env) {
  const token = getAuthToken(request);
  if (token) {
    await env.DB.prepare('DELETE FROM auth_sessions WHERE token = ?').bind(token).run().catch(() => {});
  }
  const response = json({ success: true }, 200, request);
  return withCookies(response, [clearCookie('investmtg_auth')]);
}

/* ═══════════════════════════════════════════
   API ROUTE HANDLERS
   ═══════════════════════════════════════════ */

/* ── GET /api/ticker ── */
async function handleTicker(request, env) {
  const cards = await getCachedCardsByNames(
    env.DB, env.CACHE, 'ticker', TICKER_CARDS.map(c => c.name), TTL_TICKER
  );
  return json(cards, 200, request);
}

/* ── GET /api/featured ── */
async function handleFeatured(request, env) {
  const names = await getDynamicNames(env.CACHE, 'carousel_featured', FALLBACK_FEATURED);
  const cards = await getCachedCardsByNames(env.DB, env.CACHE, 'featured', names, TTL_FEATURED);
  return json(cards, 200, request);
}

/* ── GET /api/trending ── */
async function handleTrending(request, env) {
  const names = await getDynamicNames(env.CACHE, 'carousel_trending', FALLBACK_TRENDING);
  const cards = await getCachedCardsByNames(env.DB, env.CACHE, 'trending', names, TTL_TRENDING);
  return json(cards, 200, request);
}

/* ── GET /api/budget ── */
async function handleBudget(request, env) {
  const names = await getDynamicNames(env.CACHE, 'carousel_budget', FALLBACK_BUDGET);
  const cards = await getCachedCardsByNames(env.DB, env.CACHE, 'budget', names, TTL_BUDGET);
  return json(cards, 200, request);
}

/** Read dynamic card name list from KV, fallback to static array */
async function getDynamicNames(cache, key, fallback) {
  try {
    const stored = await cache.get(key, 'json');
    if (stored && Array.isArray(stored) && stored.length >= 6) return stored;
  } catch { /* ignore */ }
  return fallback;
}

/* ── GET /api/search?q=...&page=1 ── */
async function handleSearch(request, env) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  if (!q) return json({ error: 'Missing query parameter q' }, 400, request);

  const page = url.searchParams.get('page') || '1';
  const order = url.searchParams.get('order') || 'usd';
  const dir = url.searchParams.get('dir') || 'desc';

  // Proxy to Scryfall search
  const scryfallUrl = `/cards/search?q=${encodeURIComponent(q)}&unique=prints&order=${order}&dir=${dir}&page=${page}`;

  try {
    const data = await scryfallFetch(scryfallUrl);
    return json(data, 200, request);
  } catch (e) {
    console.error('Search error:', e.message);
    return json({ error: 'Search failed' }, 502, request);
  }
}

/* ── GET /api/card/:id ── */
async function handleCardDetail(request, env, cardId) {
  // Check D1 cache first
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    'SELECT * FROM prices WHERE card_id = ? AND updated_at > ?'
  ).bind(cardId, now - TTL_PRICE).first();

  if (row) return json(row, 200, request);

  // Fetch from Scryfall and cache using v2 helpers
  try {
    const card = await scryfallFetch('/cards/' + cardId);
    await cacheCardToD1(env.DB, card, now);
    // Return full Scryfall response for card detail page
    return json(card, 200, request);
  } catch (e) {
    console.error('Card lookup error:', e.message);
    return json({ error: 'Card not found' }, 404, request);
  }
}

/* ── GET /api/card-printings/:name ── */
async function handleCardPrintings(request, env, cardName) {
  if (!cardName) return json({ error: 'Card name required' }, 400, request);

  const cacheKey = `printings:${cardName.toLowerCase()}`;
  const cached = await env.CACHE.get(cacheKey, 'json');
  if (cached) return json(cached, 200, request);

  try {
    const result = await scryfallFetch(
      '/cards/search?q=' + encodeURIComponent('!"' + cardName + '" -is:digital game:paper') +
      '&unique=prints&order=released&dir=desc'
    );
    if (!result || !result.data) return json({ error: 'Card not found' }, 404, request);

    const printings = result.data.map(card => ({
      card_id: card.id,
      name: card.name,
      set_code: card.set,
      set_name: card.set_name,
      collector_number: card.collector_number,
      rarity: card.rarity,
      treatment: getTreatmentLabel(card),
      finishes: card.finishes || [],
      price_usd: extractPrices(card).usd,
      price_usd_foil: extractPrices(card).usd_foil,
      price_usd_etched: extractPrices(card).usd_etched,
      image_small: extractImageUris(card).small || '',
      image_normal: extractImageUris(card).normal || '',
      image_back: extractAllFaceImages(card).length > 1
        ? (extractAllFaceImages(card)[1].normal || '') : '',
      is_dfc: MULTI_FACE_LAYOUTS.has(card.layout),
    }));

    const response = { name: cardName, total_printings: printings.length, printings };
    await env.CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: 3600 });
    return json(response, 200, request);
  } catch (e) {
    console.error('Card printings error:', e.message);
    return json({ error: 'Card not found' }, 404, request);
  }
}

/* ── GET /api/movers/:category ── */
async function handleMovers(request, env, category) {
  const cacheKey = `movers:${category}`;
  const cached = await env.CACHE.get(cacheKey, 'json');
  if (cached) return json(cached, 200, request);

  // Curated movers lists by category
  const lists = {
    valuable: [
      'Mox Emerald', 'Time Walk', "Mishra's Workshop", 'The Tabernacle at Pendrell Vale',
      'Mox Jet', 'Timetwister', 'Mox Pearl', 'Candelabra of Tawnos',
      'Mox Sapphire', 'Underground Sea', 'Volcanic Island', 'Tropical Island',
      'Tundra', 'Bayou', 'Badlands', 'Savannah',
    ],
    modern: [
      'Ragavan, Nimble Pilferer', 'The One Ring', 'Orcish Bowmasters',
      'Sheoldred, the Apocalypse', 'Force of Negation', 'Wrenn and Six',
      'Solitude', 'Grief', 'Arid Mesa', 'Scalding Tarn', 'Misty Rainforest',
      'Polluted Delta', 'Flooded Strand', 'Bloodstained Mire',
    ],
    commander: [
      'Dockside Extortionist', 'Mana Crypt', 'Jeweled Lotus', 'Smothering Tithe',
      'Cyclonic Rift', 'Rhystic Study', 'Fierce Guardianship', 'Deflecting Swat',
      'Force of Will', 'Mana Drain', 'Demonic Tutor', 'Vampiric Tutor',
      'Sylvan Library', 'Serra\'s Sanctum', 'Gaea\'s Cradle',
    ],
    budget: [
      'Sol Ring', 'Arcane Signet', 'Lightning Bolt', 'Swords to Plowshares',
      'Path to Exile', 'Counterspell', 'Rampant Growth', 'Cultivate',
      'Kodama\'s Reach', 'Beast Within', 'Chaos Warp', 'Return to Nature',
      'Generous Gift', 'Blasphemous Act', 'Vandalblast',
    ],
  };

  const names = lists[category] || lists.valuable;
  const cards = await getCachedCardsByNames(env.DB, env.CACHE, `movers-cards:${category}`, names, TTL_MOVERS);

  await env.CACHE.put(cacheKey, JSON.stringify(cards), { expirationTtl: TTL_MOVERS });
  return json(cards, 200, request);
}

/* ── Portfolio routes ── */

async function handlePortfolio(request, env) {
  const auth = await getAuthUser(request, env);
  const { token, isNew } = ensureSession(request);
  const method = request.method;
  const url = new URL(request.url);
  const scope = portfolioScope(auth, token);

  if (method === 'GET') {
    const rows = await env.DB.prepare(
      `SELECT p.*, pr.price_usd, pr.price_usd_foil, pr.image_small, pr.image_normal, pr.set_name
       FROM portfolios p
       LEFT JOIN prices pr ON p.card_id = pr.card_id
       WHERE ${scope.clause}
       ORDER BY p.added_at DESC`
    ).bind(scope.value).all();
    const resp = json({ items: rows.results, session: token, authenticated: !!auth }, 200, request);
    return !auth && isNew ? withSessionCookie(resp, token) : resp;
  }

  if (method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body || !body.card_id) return json({ error: 'card_id required' }, 400, request);

    const validConditions = ['NM', 'LP', 'MP', 'HP', 'DMG'];
    const condition = validConditions.includes(body.condition) ? body.condition : 'NM';
    const binderId = body.binder_id ? parseInt(body.binder_id) : null;

    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      'INSERT OR REPLACE INTO portfolios (user_id, session_token, card_id, card_name, quantity, added_price, added_at, condition, binder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      auth ? auth.userId : null,
      auth ? null : token,
      body.card_id,
      body.card_name || '',
      body.quantity || 1,
      body.added_price || null,
      now,
      condition,
      binderId
    ).run();

    const resp = json({ success: true, message: 'Added to portfolio' }, 201, request);
    return !auth && isNew ? withSessionCookie(resp, token) : resp;
  }

  if (method === 'PUT') {
    const body = await request.json().catch(() => null);
    if (!body || !body.card_id) return json({ error: 'card_id required' }, 400, request);

    const updates = [];
    const binds = [];
    const validConditions = ['NM', 'LP', 'MP', 'HP', 'DMG'];
    if (body.condition && validConditions.includes(body.condition)) {
      updates.push('condition = ?'); binds.push(body.condition);
    }
    if (body.binder_id !== undefined) {
      updates.push('binder_id = ?'); binds.push(body.binder_id ? parseInt(body.binder_id) : null);
    }
    if (body.quantity !== undefined) {
      updates.push('quantity = ?'); binds.push(parseInt(body.quantity) || 1);
    }
    if (body.added_price !== undefined) {
      updates.push('added_price = ?'); binds.push(parseFloat(body.added_price) || 0);
    }
    if (updates.length === 0) return json({ error: 'No fields to update' }, 400, request);

    binds.push(scope.value, body.card_id);
    await env.DB.prepare(
      `UPDATE portfolios SET ${updates.join(', ')} WHERE ${scope.bare} AND card_id = ?`
    ).bind(...binds).run();

    return json({ success: true }, 200, request);
  }

  if (method === 'DELETE') {
    const parts = url.pathname.split('/');
    const cardId = parts[parts.length - 1];
    if (!cardId || cardId === 'portfolio') {
      await env.DB.prepare(`DELETE FROM portfolios WHERE ${scope.bare}`).bind(scope.value).run();
    } else {
      await env.DB.prepare(`DELETE FROM portfolios WHERE ${scope.bare} AND card_id = ?`).bind(scope.value, cardId).run();
    }
    return json({ success: true }, 200, request);
  }

  return json({ error: 'Method not allowed' }, 405, request);
}

/* ── Batch portfolio import ── */

async function handlePortfolioBatch(request, env) {
  const auth = await getAuthUser(request, env);
  if (!auth) return json({ error: 'Authentication required — bulk import needs a persistent account' }, 401, request);

  const { token } = ensureSession(request);
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return json({ error: 'items array required' }, 400, request);
  }

  if (body.items.length > 500) {
    return json({ error: 'Maximum 500 items per batch' }, 400, request);
  }

  const now = Math.floor(Date.now() / 1000);
  let created = 0;

  // Process in chunks of 50
  const chunks = [];
  for (let i = 0; i < body.items.length; i += 50) {
    chunks.push(body.items.slice(i, i + 50));
  }

  for (const chunk of chunks) {
    try {
      const validConds = ['NM', 'LP', 'MP', 'HP', 'DMG'];
      const stmts = chunk.map(item => {
        if (!item.card_name) return null;
        const cond = validConds.includes(item.condition) ? item.condition : 'NM';
        return env.DB.prepare(
          'INSERT OR REPLACE INTO portfolios (user_id, session_token, card_id, card_name, quantity, added_price, added_at, condition, binder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          auth.userId,
          token,
          item.card_id || '',
          item.card_name,
          item.quantity || 1,
          item.added_price || null,
          now,
          cond,
          item.binder_id ? parseInt(item.binder_id) : null
        );
      }).filter(s => s !== null);

      if (stmts.length > 0) {
        await env.DB.batch(stmts);
        created += stmts.length;
      }
    } catch (e) {
      console.error('[Batch Portfolio] Chunk failed:', e.message);
    }
  }

  return json({ success: true, created }, 201, request);
}

/* ── Enrich portfolio: batch-fetch Scryfall prices for imported cards ── */
async function handlePortfolioEnrich(request, env) {
  const auth = await getAuthUser(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401, request);

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.card_ids) || body.card_ids.length === 0) {
    return json({ error: 'card_ids array required' }, 400, request);
  }

  // Filter out IDs already in prices table (fresh within 24h)
  const cutoff = Math.floor(Date.now() / 1000) - 86400;
  const allIds = body.card_ids.slice(0, 500).filter(id => id);
  const existingSet = new Set();
  // Check in chunks of 50 to avoid too many bind params
  for (let c = 0; c < allIds.length; c += 50) {
    const idChunk = allIds.slice(c, c + 50);
    const ph = idChunk.map(() => '?').join(',');
    const rows = await env.DB.prepare(
      `SELECT card_id FROM prices WHERE card_id IN (${ph}) AND updated_at > ?`
    ).bind(...idChunk, cutoff).all();
    (rows.results || []).forEach(r => existingSet.add(r.card_id));
  }
  const needed = allIds.filter(id => !existingSet.has(id));

  if (needed.length === 0) {
    return json({ success: true, enriched: 0, message: 'All prices already cached' }, 200, request);
  }

  const now = Math.floor(Date.now() / 1000);
  let enriched = 0;

  // Scryfall /cards/collection accepts max 75 identifiers per request
  for (let i = 0; i < needed.length; i += 75) {
    const chunk = needed.slice(i, i + 75);
    const identifiers = chunk.map(id => ({ id: id }));
    try {
      // Rate-limit between Scryfall calls
      if (i > 0) await new Promise(r => setTimeout(r, 100));
      const res = await fetch(SCRYFALL_BASE + '/cards/collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'investmtg/2.0 (https://www.investmtg.com)',
        },
        body: JSON.stringify({ identifiers }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const cards = data.data || [];

      // Filter out digital-only cards
      const paperCards = cards.filter(c => !c.digital);

      // Batch write to D1 in chunks of 50 (D1 batch limit)
      for (let j = 0; j < paperCards.length; j += 50) {
        const dbChunk = paperCards.slice(j, j + 50);
        const stmts = dbChunk.map(card => cacheCardStmt(env.DB, card, now));
        if (stmts.length > 0) {
          await env.DB.batch(stmts);
          enriched += stmts.length;
        }
      }
    } catch (e) {
      console.error('[Enrich] Chunk failed:', e.message);
    }
  }

  return json({ success: true, enriched }, 200, request);
}

/* ══════════════════════════════════════
   BINDERS — User-created portfolio folders
   ══════════════════════════════════════ */

async function handleBinders(request, env) {
  const auth = await getAuthUser(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401, request);
  const method = request.method;
  const url = new URL(request.url);
  const parts = url.pathname.split('/');
  const binderId = parts.length >= 4 ? parts[3] : null;

  if (method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT * FROM binders WHERE user_id = ? ORDER BY sort_order ASC, name ASC'
    ).bind(auth.userId).all();
    // Also count cards per binder
    const counts = await env.DB.prepare(
      `SELECT binder_id, COUNT(*) as count FROM portfolios
       WHERE user_id = ? AND binder_id IS NOT NULL
       GROUP BY binder_id`
    ).bind(auth.userId).all();
    const countMap = {};
    (counts.results || []).forEach(r => { countMap[r.binder_id] = r.count; });
    const binders = (rows.results || []).map(b => Object.assign({}, b, { card_count: countMap[b.id] || 0 }));
    // Also count unbindered cards
    const unassigned = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM portfolios WHERE user_id = ? AND (binder_id IS NULL OR binder_id = 0)'
    ).bind(auth.userId).first();
    return json({ binders, unassigned_count: unassigned ? unassigned.count : 0 }, 200, request);
  }

  if (method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body || !body.name || !body.name.trim()) return json({ error: 'name required' }, 400, request);
    const now = Math.floor(Date.now() / 1000);
    const result = await env.DB.prepare(
      'INSERT INTO binders (user_id, name, color, icon, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      auth.userId, body.name.trim(), body.color || '#D4A843', body.icon || 'folder',
      body.sort_order || 0, now, now
    ).run();
    return json({ success: true, id: result.meta.last_row_id }, 201, request);
  }

  if (method === 'PUT' && binderId) {
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'Body required' }, 400, request);
    const updates = []; const binds = [];
    if (body.name) { updates.push('name = ?'); binds.push(body.name.trim()); }
    if (body.color) { updates.push('color = ?'); binds.push(body.color); }
    if (body.icon) { updates.push('icon = ?'); binds.push(body.icon); }
    if (body.sort_order !== undefined) { updates.push('sort_order = ?'); binds.push(parseInt(body.sort_order)); }
    if (updates.length === 0) return json({ error: 'No fields to update' }, 400, request);
    updates.push('updated_at = ?'); binds.push(Math.floor(Date.now() / 1000));
    binds.push(auth.userId, parseInt(binderId));
    await env.DB.prepare(
      `UPDATE binders SET ${updates.join(', ')} WHERE user_id = ? AND id = ?`
    ).bind(...binds).run();
    return json({ success: true }, 200, request);
  }

  if (method === 'DELETE' && binderId) {
    // Unassign cards from this binder first
    await env.DB.prepare(
      'UPDATE portfolios SET binder_id = NULL WHERE user_id = ? AND binder_id = ?'
    ).bind(auth.userId, parseInt(binderId)).run();
    await env.DB.prepare(
      'DELETE FROM binders WHERE user_id = ? AND id = ?'
    ).bind(auth.userId, parseInt(binderId)).run();
    return json({ success: true }, 200, request);
  }

  return json({ error: 'Method not allowed' }, 405, request);
}

/* ══════════════════════════════════════
   LISTS — Virtual tracking (Wishlist, Buylist, Trade)
   ══════════════════════════════════════ */

async function handleLists(request, env) {
  const auth = await getAuthUser(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401, request);
  const method = request.method;
  const url = new URL(request.url);
  const parts = url.pathname.split('/');
  // /api/lists/:id/items/:itemId
  const listId = parts.length >= 4 ? parts[3] : null;
  const isItems = parts.length >= 5 && parts[4] === 'items';
  const itemId = parts.length >= 6 ? parts[5] : null;

  // ── List item operations ──
  if (isItems && listId) {
    // Verify list ownership
    const list = await env.DB.prepare(
      'SELECT id FROM lists WHERE id = ? AND user_id = ?'
    ).bind(parseInt(listId), auth.userId).first();
    if (!list) return json({ error: 'List not found' }, 404, request);

    if (method === 'GET') {
      const rows = await env.DB.prepare(
        `SELECT li.*, pr.price_usd, pr.price_usd_foil, pr.image_small, pr.set_name
         FROM list_items li
         LEFT JOIN prices pr ON li.card_id = pr.card_id
         WHERE li.list_id = ? AND li.user_id = ?
         ORDER BY li.added_at DESC`
      ).bind(parseInt(listId), auth.userId).all();
      return json({ items: rows.results || [] }, 200, request);
    }

    if (method === 'POST') {
      const body = await request.json().catch(() => null);
      if (!body || !body.card_id) return json({ error: 'card_id required' }, 400, request);
      const validConds = ['NM', 'LP', 'MP', 'HP', 'DMG'];
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT OR REPLACE INTO list_items (list_id, user_id, card_id, card_name, quantity, target_price, condition, notes, added_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        parseInt(listId), auth.userId, body.card_id, body.card_name || '',
        body.quantity || 1, body.target_price || null,
        validConds.includes(body.condition) ? body.condition : 'NM',
        body.notes || '', now
      ).run();
      return json({ success: true }, 201, request);
    }

    if (method === 'DELETE' && itemId) {
      await env.DB.prepare(
        'DELETE FROM list_items WHERE id = ? AND list_id = ? AND user_id = ?'
      ).bind(parseInt(itemId), parseInt(listId), auth.userId).run();
      return json({ success: true }, 200, request);
    }

    return json({ error: 'Method not allowed' }, 405, request);
  }

  // ── List CRUD ──
  if (method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT * FROM lists WHERE user_id = ? ORDER BY sort_order ASC, name ASC'
    ).bind(auth.userId).all();
    // Count items per list
    const counts = await env.DB.prepare(
      'SELECT list_id, COUNT(*) as count FROM list_items WHERE user_id = ? GROUP BY list_id'
    ).bind(auth.userId).all();
    const countMap = {};
    (counts.results || []).forEach(r => { countMap[r.list_id] = r.count; });
    const lists = (rows.results || []).map(l => Object.assign({}, l, { item_count: countMap[l.id] || 0 }));
    return json({ lists }, 200, request);
  }

  if (method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body || !body.name || !body.name.trim()) return json({ error: 'name required' }, 400, request);
    const validTypes = ['wishlist', 'buylist', 'tradelist', 'custom'];
    const now = Math.floor(Date.now() / 1000);
    const result = await env.DB.prepare(
      'INSERT INTO lists (user_id, name, list_type, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      auth.userId, body.name.trim(),
      validTypes.includes(body.list_type) ? body.list_type : 'custom',
      body.description || '', body.sort_order || 0, now, now
    ).run();
    return json({ success: true, id: result.meta.last_row_id }, 201, request);
  }

  if (method === 'PUT' && listId) {
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'Body required' }, 400, request);
    const updates = []; const binds = [];
    if (body.name) { updates.push('name = ?'); binds.push(body.name.trim()); }
    if (body.list_type) { updates.push('list_type = ?'); binds.push(body.list_type); }
    if (body.description !== undefined) { updates.push('description = ?'); binds.push(body.description); }
    if (body.sort_order !== undefined) { updates.push('sort_order = ?'); binds.push(parseInt(body.sort_order)); }
    if (updates.length === 0) return json({ error: 'No fields to update' }, 400, request);
    updates.push('updated_at = ?'); binds.push(Math.floor(Date.now() / 1000));
    binds.push(auth.userId, parseInt(listId));
    await env.DB.prepare(
      `UPDATE lists SET ${updates.join(', ')} WHERE user_id = ? AND id = ?`
    ).bind(...binds).run();
    return json({ success: true }, 200, request);
  }

  if (method === 'DELETE' && listId) {
    // Delete items first, then the list
    await env.DB.prepare(
      'DELETE FROM list_items WHERE list_id = ? AND user_id = ?'
    ).bind(parseInt(listId), auth.userId).run();
    await env.DB.prepare(
      'DELETE FROM lists WHERE id = ? AND user_id = ?'
    ).bind(parseInt(listId), auth.userId).run();
    return json({ success: true }, 200, request);
  }

  return json({ error: 'Method not allowed' }, 405, request);
}

/* ── Batch listing creation ── */

async function handleListingsBatch(request, env) {
  const auth = await getAuthUser(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401, request);

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.listings) || body.listings.length === 0) {
    return json({ error: 'listings array required' }, 400, request);
  }

  if (body.listings.length > 500) {
    return json({ error: 'Maximum 500 listings per batch' }, 400, request);
  }

  const now = Math.floor(Date.now() / 1000);
  let created = 0;
  let failed = 0;

  // Process in chunks of 50 for D1 batch limits
  const chunks = [];
  for (let i = 0; i < body.listings.length; i += 50) {
    chunks.push(body.listings.slice(i, i + 50));
  }

  for (const chunk of chunks) {
    try {
      const stmts = chunk.map(item => {
        if (!item.card_name || item.price == null || !item.condition || !item.seller_name) {
          failed++;
          return null;
        }
        return env.DB.prepare(
          'INSERT INTO listings (user_id, seller_name, seller_contact, seller_store, card_id, card_name, set_name, condition, language, finish, price, image_uri, notes, status, session_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          auth.userId,
          item.seller_name,
          item.seller_contact || '',
          item.seller_store || '',
          item.card_id || '',
          item.card_name,
          item.set_name || '',
          item.condition,
          item.language || 'English',
          item.finish || 'nonfoil',
          item.price,
          '',  // image_uri always empty — storage optimization
          item.notes || '',
          'active',
          null,
          now,
          now
        );
      }).filter(s => s !== null);

      if (stmts.length > 0) {
        await env.DB.batch(stmts);
        created += stmts.length;
      }
    } catch (e) {
      console.error('[Batch Listings] Chunk failed:', e.message);
      failed += chunk.length;
    }
  }

  return json({ success: true, created, failed }, 201, request);
}

/* ── Listing routes ── */

async function handleListings(request, env) {
  const url = new URL(request.url);
  const method = request.method;

  if (method === 'GET') {
    const status = url.searchParams.get('status') || 'active';
    const search = url.searchParams.get('q') || '';
    const condition = url.searchParams.get('condition') || '';
    const sort = url.searchParams.get('sort') || 'newest';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = 'SELECT * FROM listings WHERE status = ?';
    const params = [status];

    if (search) {
      query += ' AND (card_name LIKE ? OR seller_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (condition) {
      query += ' AND condition = ?';
      params.push(condition);
    }

    const finish = url.searchParams.get('finish') || '';
    if (finish) {
      query += ' AND finish = ?';
      params.push(finish);
    }

    const language = url.searchParams.get('language') || '';
    if (language) {
      query += ' AND language = ?';
      params.push(language);
    }

    if (sort === 'price_asc') query += ' ORDER BY price ASC';
    else if (sort === 'price_desc') query += ' ORDER BY price DESC';
    else query += ' ORDER BY created_at DESC';

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await env.DB.prepare(query).bind(...params).all();

    // Also get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM listings WHERE status = ?';
    const countParams = [status];
    if (search) { countQuery += ' AND (card_name LIKE ? OR seller_name LIKE ?)'; countParams.push(`%${search}%`, `%${search}%`); }
    if (condition) { countQuery += ' AND condition = ?'; countParams.push(condition); }
    if (finish) { countQuery += ' AND finish = ?'; countParams.push(finish); }
    if (language) { countQuery += ' AND language = ?'; countParams.push(language); }

    const countRow = await env.DB.prepare(countQuery).bind(...countParams).first();

    // Map snake_case DB columns to camelCase for frontend
    const mapped = rows.results.map(r => ({
      id: r.id,
      seller: r.seller_name,
      contact: r.seller_contact,
      store: r.seller_store,
      cardId: r.card_id,
      cardName: r.card_name,
      setName: r.set_name,
      condition: r.condition,
      language: r.language || 'English',
      finish: r.finish || 'nonfoil',
      price: r.price,
      image: r.image_uri || (r.card_id ? 'https://cards.scryfall.io/small/front/' + r.card_id.charAt(0) + '/' + r.card_id.charAt(1) + '/' + r.card_id + '.jpg' : ''),
      notes: r.notes,
      status: r.status,
      type: r.price > 0 ? 'sale' : 'trade',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      userId: r.user_id,
      // Keep snake_case aliases for backward compat
      card_id: r.card_id,
      card_name: r.card_name,
      set_name: r.set_name,
      image_uri: r.image_uri,
      seller_name: r.seller_name,
      seller_contact: r.seller_contact,
      created_at: r.created_at,
    }));

    return json({ listings: mapped, total: countRow?.total || 0, limit, offset }, 200, request);
  }

  const auth = await getAuthUser(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401, request);

  if (method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body || !body.card_name || body.price == null || !body.condition || !body.seller_name) {
      return json({ error: 'card_name, price, condition, and seller_name required' }, 400, request);
    }

    const now = Math.floor(Date.now() / 1000);
    const result = await env.DB.prepare(
      'INSERT INTO listings (user_id, seller_name, seller_contact, seller_store, card_id, card_name, set_name, condition, language, finish, price, image_uri, notes, status, session_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      auth.userId,
      body.seller_name,
      body.seller_contact || '',
      body.seller_store || '',
      body.card_id || '',
      body.card_name,
      body.set_name || '',
      body.condition,
      body.language || 'English',
      body.finish || 'nonfoil',
      body.price,
      '',  // image_uri always empty — storage optimization v41
      body.notes || '',
      'active',
      null,
      now,
      now
    ).run();

    return json({ success: true, id: result.meta?.last_row_id }, 201, request);
  }

  if (method === 'PUT') {
    const parts = url.pathname.split('/');
    const id = parts[parts.length - 1];
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'Body required' }, 400, request);

    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      'UPDATE listings SET status = ?, price = COALESCE(?, price), notes = COALESCE(?, notes), finish = COALESCE(?, finish), language = COALESCE(?, language), updated_at = ? WHERE id = ? AND user_id = ?'
    ).bind(body.status || 'active', body.price || null, body.notes || null, body.finish || null, body.language || null, now, id, auth.userId).run();

    return json({ success: true }, 200, request);
  }

  if (method === 'DELETE') {
    const parts = url.pathname.split('/');
    const id = parts[parts.length - 1];
    await env.DB.prepare(
      'UPDATE listings SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?'
    ).bind('removed', Math.floor(Date.now() / 1000), id, auth.userId).run();
    return json({ success: true }, 200, request);
  }

  return json({ error: 'Method not allowed' }, 405, request);
}

/* ── Seller routes ── */

async function handleSellers(request, env) {
  const auth = await getAuthUser(request, env);
  const { token, isNew } = ensureSession(request);
  const method = request.method;

  if (method === 'GET') {
    const scopeClause = auth ? 'user_id = ?' : 'session_token = ?';
    const scopeValue = auth ? auth.userId : token;

    const seller = await env.DB.prepare(
      `SELECT * FROM sellers WHERE ${scopeClause}`
    ).bind(scopeValue).first();

    if (!seller) {
      const resp = json({ registered: false }, 200, request);
      return !auth && isNew ? withSessionCookie(resp, token) : resp;
    }

    // Also fetch their active listings (exclude removed/sold)
    const listings = await env.DB.prepare(
      `SELECT * FROM listings WHERE ${scopeClause} AND status = 'active' ORDER BY created_at DESC`
    ).bind(scopeValue).all();

    const resp = json({ registered: true, seller, listings: listings.results }, 200, request);
    return !auth && isNew ? withSessionCookie(resp, token) : resp;
  }

  if (method === 'POST') {
    if (!auth) return json({ error: 'Authentication required' }, 401, request);

    const body = await request.json().catch(() => null);
    if (!body || !body.name) return json({ error: 'name required' }, 400, request);

    const now = Math.floor(Date.now() / 1000);
    // session_token has NOT NULL + UNIQUE constraint — use 'auth_<userId>' as placeholder
    const sessionPlaceholder = 'auth_' + auth.userId;
    await env.DB.prepare(
      'INSERT OR REPLACE INTO sellers (user_id, session_token, name, contact, store_affiliation, bio, registered_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(auth.userId, sessionPlaceholder, body.name, body.contact || '', body.store_affiliation || '', body.bio || '', now).run();

    // Promote user role to 'seller' now that they have a seller account
    await env.DB.prepare('UPDATE users SET role = ? WHERE id = ? AND role = ?')
      .bind('seller', auth.userId, 'buyer').run();

    // Fetch the newly created seller to return full object
    const newSeller = await env.DB.prepare(
      'SELECT * FROM sellers WHERE user_id = ?'
    ).bind(auth.userId).first();

    return json({ success: true, seller: newSeller }, 201, request);
  }

  // PUT /api/sellers — update seller profile
  if (method === 'PUT') {
    if (!auth) return json({ error: 'Authentication required' }, 401, request);

    const body = await request.json().catch(() => null);
    if (!body || !body.name) return json({ error: 'name required' }, 400, request);

    const existing = await env.DB.prepare(
      'SELECT id FROM sellers WHERE user_id = ?'
    ).bind(auth.userId).first();
    if (!existing) return json({ error: 'Seller profile not found' }, 404, request);

    await env.DB.prepare(
      'UPDATE sellers SET name = ?, contact = ?, store_affiliation = ?, bio = ? WHERE user_id = ?'
    ).bind(
      body.name.slice(0, 100),
      (body.contact || '').slice(0, 200),
      body.store_affiliation || null,
      (body.bio || '').slice(0, 500) || null,
      auth.userId
    ).run();

    const updated = await env.DB.prepare(
      'SELECT * FROM sellers WHERE user_id = ?'
    ).bind(auth.userId).first();

    return json({ success: true, seller: updated }, 200, request);
  }

  // DELETE /api/sellers — delete seller account + all listings
  if (method === 'DELETE') {
    if (!auth) return json({ error: 'Authentication required' }, 401, request);

    const existing = await env.DB.prepare(
      'SELECT id FROM sellers WHERE user_id = ?'
    ).bind(auth.userId).first();
    if (!existing) return json({ error: 'Seller profile not found' }, 404, request);

    // Delete all listings belonging to this seller
    await env.DB.prepare(
      'DELETE FROM listings WHERE user_id = ?'
    ).bind(auth.userId).run();

    // Delete seller profile
    await env.DB.prepare(
      'DELETE FROM sellers WHERE user_id = ?'
    ).bind(auth.userId).run();

    // Downgrade user role back to buyer
    await env.DB.prepare('UPDATE users SET role = ? WHERE id = ? AND role = ?')
      .bind('buyer', auth.userId, 'seller').run();

    return json({ success: true }, 200, request);
  }

  return json({ error: 'Method not allowed' }, 405, request);
}

/* ── Store routes ── */

async function handleStores(request, env) {
  const rows = await env.DB.prepare(
    'SELECT * FROM stores WHERE active = 1 AND verified = 1 ORDER BY name'
  ).all();
  return json({ stores: rows.results }, 200, request);
}

/* ── Event routes ── */

async function handleEvents(request, env) {
  const rows = await env.DB.prepare(
    'SELECT * FROM events WHERE active = 1 ORDER BY id'
  ).all();
  // Parse JSON-stringified tags into arrays
  const events = (rows.results || []).map(function(evt) {
    var parsed = evt;
    if (typeof evt.tags === 'string') {
      try { parsed = Object.assign({}, evt, { tags: JSON.parse(evt.tags) }); }
      catch(e) { parsed = Object.assign({}, evt, { tags: [] }); }
    }
    return parsed;
  });
  return json({ events: events }, 200, request);
}

/* ── Cart routes ── */

async function handleCart(request, env) {
  const auth = await getAuthUser(request, env);
  const { token, isNew } = ensureSession(request);
  const method = request.method;
  const url = new URL(request.url);
  const scope = cartScope(auth, token);

  if (method === 'GET') {
    const rows = await env.DB.prepare(
      `SELECT c.*, l.card_name, l.set_name, l.condition, l.price, l.seller_name, l.image_uri
       FROM cart_items c
       JOIN listings l ON c.listing_id = l.id
       WHERE ${scope.clause} AND l.status = ?`
    ).bind(scope.value, 'active').all();
    const resp = json({ items: rows.results, authenticated: !!auth }, 200, request);
    return !auth && isNew ? withSessionCookie(resp, token) : resp;
  }

  if (method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body || !body.listing_id) return json({ error: 'listing_id required' }, 400, request);

    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      'INSERT OR REPLACE INTO cart_items (user_id, session_token, listing_id, quantity, added_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(auth ? auth.userId : null, auth ? null : token, body.listing_id, body.quantity || 1, now).run();

    const resp = json({ success: true }, 201, request);
    return !auth && isNew ? withSessionCookie(resp, token) : resp;
  }

  if (method === 'DELETE') {
    const parts = url.pathname.split('/');
    const id = parts[parts.length - 1];
    if (!id || id === 'cart') {
      await env.DB.prepare(`DELETE FROM cart_items WHERE ${auth ? 'user_id = ?' : 'session_token = ?'}`).bind(scope.value).run();
    } else {
      await env.DB.prepare(`DELETE FROM cart_items WHERE ${auth ? 'user_id = ?' : 'session_token = ?'} AND listing_id = ?`).bind(scope.value, id).run();
    }
    return json({ success: true }, 200, request);
  }

  return json({ error: 'Method not allowed' }, 405, request);
}

/* ══════════════════════════════════════
   ORDER ROUTES
   ══════════════════════════════════════

  D1 TABLE (run once via wrangler d1 execute):

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    items TEXT NOT NULL,
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    shipping REAL DEFAULT 0,
    total REAL NOT NULL,
    fulfillment TEXT DEFAULT 'pickup',
    pickup_store TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    payment_method TEXT DEFAULT 'reserve',
    status TEXT DEFAULT 'reserved',
    payment_status TEXT DEFAULT NULL,
    checkout_id TEXT DEFAULT NULL,
    sumup_txn_id TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
*/

/**
 * Generate a sequential order ID in the format GUM-YYYYMM-XXXXX.
 * Uses a D1 counter table row keyed by month to get the next sequence number.
 */
async function generateOrderId(db) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const monthKey = `${year}${month}`;

  // Upsert a counter row for this month
  await db.prepare(
    `INSERT INTO order_counters (month_key, last_seq)
     VALUES (?, 1)
     ON CONFLICT(month_key) DO UPDATE SET last_seq = last_seq + 1`
  ).bind(monthKey).run();

  const row = await db.prepare(
    'SELECT last_seq FROM order_counters WHERE month_key = ?'
  ).bind(monthKey).first();

  const seq = row ? row.last_seq : 1;
  return `GUM-${monthKey}-${String(seq).padStart(5, '0')}`;
}

/**
 * POST /api/orders  — create a new order (auth required)
 * GET  /api/orders  — list orders for the authenticated user
 * GET  /api/orders/:id — get a single order by ID
 */
async function handleOrders(request, env, orderId) {
  const method = request.method;

  // ── GET /api/orders/:id ──
  if (method === 'GET' && orderId) {
    const auth = await getAuthUser(request, env);
    if (!auth) return json({ error: 'Authentication required' }, 401, request);

    const row = await env.DB.prepare(
      'SELECT * FROM orders WHERE id = ? AND user_email = ?'
    ).bind(orderId, auth.user.email).first().catch(() => null);

    if (!row) return json({ error: 'Order not found' }, 404, request);

    // Parse items JSON
    const order = Object.assign({}, row);
    if (typeof order.items === 'string') {
      try { order.items = JSON.parse(order.items); } catch (e) { order.items = []; }
    }
    if (typeof order.pickup_store === 'string' && order.pickup_store) {
      try { order.pickup_store = JSON.parse(order.pickup_store); } catch (e) { /* keep as string */ }
    }

    return json({ order }, 200, request);
  }

  // ── GET /api/orders ──
  if (method === 'GET') {
    const auth = await getAuthUser(request, env);
    if (!auth) return json({ error: 'Authentication required' }, 401, request);

    const rows = await env.DB.prepare(
      'SELECT * FROM orders WHERE user_email = ? ORDER BY created_at DESC'
    ).bind(auth.user.email).all().catch(() => ({ results: [] }));

    const orders = (rows.results || []).map(function(row) {
      const order = Object.assign({}, row);
      if (typeof order.items === 'string') {
        try { order.items = JSON.parse(order.items); } catch (e) { order.items = []; }
      }
      if (typeof order.pickup_store === 'string' && order.pickup_store) {
        try { order.pickup_store = JSON.parse(order.pickup_store); } catch (e) { /* keep as string */ }
      }
      return order;
    });

    return json({ orders }, 200, request);
  }

  // ── POST /api/orders ──
  if (method === 'POST') {
    const auth = await getAuthUser(request, env);

    const body = await request.json().catch(() => null);
    if (!body || !body.items || !Array.isArray(body.items)) {
      return json({ error: 'items array required' }, 400, request);
    }
    if (body.total == null || body.subtotal == null) {
      return json({ error: 'subtotal and total required' }, 400, request);
    }

    // v37: Reject items without a seller — prevents purchasing cards not in stock
    const invalidItems = body.items.filter(item => !item.seller || !item.seller.trim());
    if (invalidItems.length > 0) {
      const names = invalidItems.map(item => item.name || 'Unknown').join(', ');
      return json({ error: 'Items must come from a seller listing: ' + names }, 400, request);
    }

    // Guest orders use contact_email as identifier; authenticated users use their auth email
    const userEmail = auth ? auth.user.email : (body.contact_email || '').trim();
    if (!userEmail) {
      return json({ error: 'contact_email required for guest orders' }, 400, request);
    }

    const id = await generateOrderId(env.DB);
    const nowStr = new Date().toISOString();
    const itemsJson = JSON.stringify(body.items);
    const pickupStoreJson = body.pickup_store
      ? (typeof body.pickup_store === 'object' ? JSON.stringify(body.pickup_store) : body.pickup_store)
      : null;

    await env.DB.prepare(
      `INSERT INTO orders
       (id, user_email, items, subtotal, tax, shipping, total, fulfillment,
        pickup_store, contact_name, contact_email, contact_phone,
        payment_method, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      userEmail,
      itemsJson,
      body.subtotal,
      body.tax || 0,
      body.shipping || 0,
      body.total,
      body.fulfillment || 'pickup',
      pickupStoreJson,
      body.contact_name || '',
      body.contact_email || '',
      body.contact_phone || '',
      body.payment_method || 'reserve',
      body.payment_method === 'sumup' ? 'pending_payment' : 'reserved',
      nowStr,
      nowStr
    ).run();

    const initialStatus = body.payment_method === 'sumup' ? 'pending_payment' : 'reserved';
    const order = {
      id,
      user_email: userEmail,
      items: body.items,
      subtotal: body.subtotal,
      tax: body.tax || 0,
      shipping: body.shipping || 0,
      total: body.total,
      fulfillment: body.fulfillment || 'pickup',
      pickup_store: body.pickup_store || null,
      contact_name: body.contact_name || '',
      contact_email: body.contact_email || '',
      contact_phone: body.contact_phone || '',
      payment_method: body.payment_method || 'reserve',
      status: initialStatus,
      created_at: nowStr,
      updated_at: nowStr,
    };

    // Fire-and-forget: send order confirmation email
    sendOrderConfirmationEmail(order, env, 'order_received').catch(function(e) {
      console.error('[Email] fire-and-forget error:', e.message);
    });

    return json({ ok: true, order }, 201, request);
  }

  return json({ error: 'Method not allowed' }, 405, request);
}

/* ══════════════════════════════════════
   SUMUP PAYMENT ROUTES
   ══════════════════════════════════════

   POST /api/sumup/checkout
   Creates a SumUp checkout via their API.
   The checkout ID is returned to the frontend which mounts the SumUp Card Widget.
   Requires SUMUP_SECRET_KEY wrangler secret.
*/

async function handleSumUpCheckout(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, request);
  }

  if (!env.SUMUP_SECRET_KEY) {
    return json({ error: 'SumUp not configured. Set SUMUP_SECRET_KEY via wrangler secret put.' }, 500, request);
  }

  // Allow guest checkouts — SumUp handles payment security
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON body' }, 400, request);
  if (!body.amount || body.amount <= 0) return json({ error: 'amount must be > 0' }, 400, request);
  if (!body.order_id) return json({ error: 'order_id required' }, 400, request);

  // Round amount to 2 decimal places and ensure it's a number
  const amount = Math.round(parseFloat(body.amount) * 100) / 100;
  if (isNaN(amount) || amount <= 0) {
    return json({ error: 'Invalid amount' }, 400, request);
  }

  const checkoutBody = {
    checkout_reference: body.order_id,
    amount: amount,
    currency: 'USD',
    merchant_code: SUMUP_MERCHANT_CODE,
    description: 'investMTG Order ' + body.order_id,
  };

  // Only add redirect_url if needed for 3DS flow
  const redirectUrl = (env.FRONTEND_URL || SITE_URL) + '/#order/' + body.order_id;
  checkoutBody.redirect_url = redirectUrl;

  try {
    const resp = await fetch(SUMUP_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + env.SUMUP_SECRET_KEY,
      },
      body: JSON.stringify(checkoutBody),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error('SumUp checkout error:', resp.status, JSON.stringify(data));
      // Log full error server-side, return generic message to client
      return json({
        error: 'SumUp checkout creation failed',
        status: resp.status >= 500 ? 502 : resp.status,
      }, resp.status >= 500 ? 502 : resp.status, request);
    }

    // Store checkout_id on the order for status lookups
    if (data.id && body.order_id) {
      await env.DB.prepare(
        'UPDATE orders SET checkout_id = ?, payment_status = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(data.id, 'pending', body.order_id).run().catch(function(e) {
        console.error('Failed to store checkout_id on order:', e.message);
      });
    }

    return json({
      ok: true,
      checkout_id: data.id,
      amount: data.amount,
      currency: data.currency,
      hosted_checkout_url: data.hosted_checkout_url || null,
    }, 201, request);
  } catch (e) {
    console.error('SumUp checkout fetch error:', e.message);
    return json({ error: 'SumUp service unavailable' }, 502, request);
  }
}

/* ══════════════════════════════════════
   SUMUP WEBHOOK HANDLER
   ══════════════════════════════════════

   POST /api/sumup-webhook
   Receives CHECKOUT_STATUS_CHANGED events from SumUp.
   Validates by polling SumUp API, then updates the D1 order.
*/

async function handleSumUpWebhook(request, env) {
  // SumUp webhooks are POST requests
  if (request.method !== 'POST') {
    return json({ ok: true }, 200, request);
  }

  // SumUp doesn't support webhook signing secrets in their dashboard.
  // Security relies on server-side re-verification: the handler below calls
  // GET /v0.1/checkouts/{id} with SUMUP_SECRET_KEY to confirm payment status
  // directly with SumUp before updating any order.

  const body = await request.json().catch(() => null);
  if (!body || !body.id) {
    return json({ ok: true, message: 'No checkout ID' }, 200, request);
  }

  // Only handle CHECKOUT_STATUS_CHANGED (ignore unknown event types)
  if (body.event_type && body.event_type !== 'CHECKOUT_STATUS_CHANGED') {
    return json({ ok: true, message: 'Ignored event: ' + body.event_type }, 200, request);
  }

  // Validate by fetching the checkout from SumUp API
  if (env.SUMUP_SECRET_KEY) {
    try {
      const checkoutResp = await fetch(SUMUP_API_BASE + '/' + body.id, {
        headers: { 'Authorization': 'Bearer ' + env.SUMUP_SECRET_KEY }
      });
      const checkout = await checkoutResp.json();

      if (checkout.status === 'PAID' && checkout.checkout_reference) {
        // Update order status in D1
        const txnId = (checkout.transactions && checkout.transactions[0])
          ? checkout.transactions[0].id : null;
        try {
          await env.DB.prepare(
            'UPDATE orders SET status = ?, payment_status = ?, sumup_txn_id = ?, updated_at = datetime("now") WHERE id = ?'
          ).bind('confirmed', 'paid', txnId || '', checkout.checkout_reference).run();
          console.log('Webhook: order ' + checkout.checkout_reference + ' confirmed via SumUp');
        } catch (dbErr) {
          console.error('Webhook DB error:', dbErr.message);
        }
      }
    } catch (e) {
      console.error('Webhook SumUp validation error:', e.message);
    }
  }

  return json({ ok: true }, 200, request);
}

/* ══════════════════════════════════════
   PAYPAL PAYMENT ROUTES
   ══════════════════════════════════════

   POST /api/paypal/create-order
   Creates a PayPal order via Orders v2 API.
   Returns the PayPal order ID for the frontend SDK.

   POST /api/paypal/capture-order
   Captures payment after buyer approves.
   Requires PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET wrangler secrets.
*/

// PAYPAL_API_BASE defined at top of file

async function getPayPalAccessToken(env) {
  const auth = btoa(env.PAYPAL_CLIENT_ID + ':' + env.PAYPAL_CLIENT_SECRET);
  const resp = await fetch(PAYPAL_API_BASE + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + auth,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await resp.json();
  if (!resp.ok || !data.access_token) {
    throw new Error('PayPal auth failed: ' + (data.error_description || data.error || 'Unknown'));
  }
  return data.access_token;
}

async function handlePayPalCreateOrder(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, request);
  }

  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    return json({ error: 'PayPal not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET via wrangler secret put.' }, 500, request);
  }

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON body' }, 400, request);
  if (!body.amount || body.amount <= 0) return json({ error: 'amount must be > 0' }, 400, request);
  if (!body.order_id) return json({ error: 'order_id required' }, 400, request);

  const amount = (Math.round(parseFloat(body.amount) * 100) / 100).toFixed(2);
  if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return json({ error: 'Invalid amount' }, 400, request);
  }

  try {
    const accessToken = await getPayPalAccessToken(env);

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: body.order_id,
        description: 'investMTG Order ' + body.order_id,
        amount: {
          currency_code: 'USD',
          value: amount,
        },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
            brand_name: 'investMTG',
            locale: 'en-US',
            landing_page: 'LOGIN',
            user_action: 'PAY_NOW',
            return_url: (env.FRONTEND_URL || SITE_URL) + '/#order/' + body.order_id,
            cancel_url: (env.FRONTEND_URL || SITE_URL) + '/#checkout',
          },
        },
      },
    };

    const resp = await fetch(PAYPAL_API_BASE + '/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken,
        'PayPal-Request-Id': body.order_id + '-' + Date.now(),
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await resp.json();

    if (!resp.ok || !data.id) {
      console.error('PayPal create-order error:', resp.status, JSON.stringify(data));
      const detail = (data.details && data.details[0]) ? data.details[0].description : (data.message || 'Unknown error');
      return json({ error: 'PayPal order creation failed', detail: detail }, resp.status >= 500 ? 502 : resp.status, request);
    }

    // Store PayPal order ID on the D1 order
    if (data.id && body.order_id) {
      await env.DB.prepare(
        'UPDATE orders SET checkout_id = ?, payment_status = ?, payment_method = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind('paypal:' + data.id, 'pending', 'paypal', body.order_id).run().catch(function(e) {
        console.error('Failed to store PayPal order ID:', e.message);
      });
    }

    return json({
      ok: true,
      id: data.id,
      paypal_order_id: data.id,
      status: data.status,
    }, 201, request);
  } catch (e) {
    console.error('PayPal create-order fetch error:', e.message);
    return json({ error: 'PayPal service unavailable' }, 502, request);
  }
}

async function handlePayPalCaptureOrder(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, request);
  }

  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    return json({ error: 'PayPal not configured' }, 500, request);
  }

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON body' }, 400, request);
  if (!body.paypal_order_id) return json({ error: 'paypal_order_id required' }, 400, request);

  try {
    const accessToken = await getPayPalAccessToken(env);

    const resp = await fetch(PAYPAL_API_BASE + '/v2/checkout/orders/' + body.paypal_order_id + '/capture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken,
      },
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error('PayPal capture error:', resp.status, JSON.stringify(data));
      const detail = (data.details && data.details[0]) ? data.details[0].description : (data.message || 'Unknown error');
      return json({ error: 'PayPal capture failed', detail: detail }, resp.status >= 500 ? 502 : resp.status, request);
    }

    // If capture succeeded, update the D1 order
    if (data.status === 'COMPLETED') {
      const purchaseUnit = data.purchase_units && data.purchase_units[0];
      const captureId = (purchaseUnit && purchaseUnit.payments && purchaseUnit.payments.captures && purchaseUnit.payments.captures[0])
        ? purchaseUnit.payments.captures[0].id : null;
      const refId = purchaseUnit ? purchaseUnit.reference_id : null;

      if (refId) {
        await env.DB.prepare(
          'UPDATE orders SET status = ?, payment_status = ?, sumup_txn_id = ?, updated_at = datetime("now") WHERE id = ?'
        ).bind('confirmed', 'paid', 'paypal:' + (captureId || data.id), refId).run().catch(function(e) {
          console.error('Failed to update order after PayPal capture:', e.message);
        });
        console.log('PayPal: order ' + refId + ' confirmed, capture ' + (captureId || data.id));

        // Fire-and-forget: send payment confirmation email
        env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(refId).first().then(function(row) {
          if (row) {
            const order = {
              id: row.id,
              user_email: row.user_email,
              items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
              subtotal: row.subtotal,
              tax: row.tax,
              shipping: row.shipping,
              total: row.total,
              fulfillment: row.fulfillment,
              pickup_store: row.pickup_store,
              contact_name: row.contact_name,
              contact_email: row.contact_email,
              contact_phone: row.contact_phone,
              payment_method: row.payment_method,
              status: 'confirmed',
              created_at: row.created_at,
            };
            return sendOrderConfirmationEmail(order, env, 'payment_confirmed');
          }
        }).catch(function(e) {
          console.error('[Email] PayPal capture email error:', e.message);
        });
      }
    }

    // Include the investMTG order_id so the frontend can navigate to order confirmation
    var investOrderId = null;
    if (data.status === 'COMPLETED' && data.purchase_units && data.purchase_units[0]) {
      investOrderId = data.purchase_units[0].reference_id || null;
    }

    return json({
      ok: true,
      status: data.status,
      order_id: investOrderId,
      payer: data.payer ? { email: data.payer.email_address, name: (data.payer.name ? data.payer.name.given_name : '') } : null,
    }, 200, request);
  } catch (e) {
    console.error('PayPal capture fetch error:', e.message);
    return json({ error: 'PayPal service unavailable' }, 502, request);
  }
}

/* ══════════════════════════════════════
   ORDER PAYMENT STATUS
   ══════════════════════════════════════

   GET /api/orders/:id/payment-status
   Returns the current payment status for an order.
   If a checkout_id is stored, polls SumUp for real-time status.
   Auth required — only the order owner can check.
*/

async function handleOrderPaymentStatus(request, env, orderId) {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, request);
  }

  const auth = await getAuthUser(request, env);
  if (!auth) {
    return json({ error: 'Authentication required' }, 401, request);
  }

  // Fetch the order
  const row = await env.DB.prepare(
    'SELECT id, status, payment_status, checkout_id, sumup_txn_id, payment_method FROM orders WHERE id = ? AND user_email = ?'
  ).bind(orderId, auth.user.email).first().catch(() => null);

  if (!row) {
    return json({ error: 'Order not found' }, 404, request);
  }

  // If there's a checkout_id and payment isn't finalized, poll SumUp
  if (row.checkout_id && row.payment_status !== 'paid' && row.payment_status !== 'failed' && env.SUMUP_SECRET_KEY) {
    try {
      const checkoutResp = await fetch(SUMUP_API_BASE + '/' + row.checkout_id, {
        headers: { 'Authorization': 'Bearer ' + env.SUMUP_SECRET_KEY }
      });
      const checkout = await checkoutResp.json();

      // Map SumUp status to our status
      let newPaymentStatus = row.payment_status;
      let newStatus = row.status;
      let txnId = row.sumup_txn_id;

      if (checkout.status === 'PAID') {
        newPaymentStatus = 'paid';
        newStatus = 'confirmed';
        txnId = (checkout.transactions && checkout.transactions[0]) ? checkout.transactions[0].id : txnId;
      } else if (checkout.status === 'FAILED') {
        newPaymentStatus = 'failed';
        newStatus = 'payment_failed';
      } else if (checkout.status === 'PENDING') {
        newPaymentStatus = 'pending';
      } else if (checkout.status === 'EXPIRED') {
        newPaymentStatus = 'expired';
        newStatus = 'expired';
      }

      // Update D1 if status changed
      if (newPaymentStatus !== row.payment_status || newStatus !== row.status) {
        await env.DB.prepare(
          'UPDATE orders SET status = ?, payment_status = ?, sumup_txn_id = ?, updated_at = datetime("now") WHERE id = ?'
        ).bind(newStatus, newPaymentStatus, txnId || '', orderId).run().catch(() => {});
      }

      return json({
        order_id: row.id,
        status: newStatus,
        payment_status: newPaymentStatus,
        payment_method: row.payment_method,
        sumup_status: checkout.status,
        sumup_txn_id: txnId || null,
      }, 200, request);
    } catch (e) {
      console.error('Status poll error:', e.message);
      // Fall through to return stored status
    }
  }

  // Return stored status (no SumUp poll or poll failed)
  return json({
    order_id: row.id,
    status: row.status,
    payment_status: row.payment_status || null,
    payment_method: row.payment_method,
    sumup_txn_id: row.sumup_txn_id || null,
  }, 200, request);
}

/* ══════════════════════════════════════
   EXISTING PROXY ROUTES (unchanged)
   ══════════════════════════════════════ */

async function handleJustTCG(request, env) {
  // Require valid session (anonymous or authenticated) to prevent external API key abuse
  const auth = await getAuthUser(request, env);
  if (!auth && !getSession(request)) {
    return json({ error: 'Session required' }, 401, request);
  }
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || '/v1/cards/browse';
  const targetUrl = 'https://api.justtcg.com' + path;
  const params = new URLSearchParams(url.searchParams);
  params.delete('path');
  const fullUrl = targetUrl + (params.toString() ? '?' + params.toString() : '');
  const headers = { 'Content-Type': 'application/json', 'X-Api-Key': env.JUSTTCG_API_KEY || '' };
  let fetchOpts = { method: request.method, headers };
  if (request.method === 'POST' || request.method === 'PUT') {
    fetchOpts.body = await request.text();
  }
  const resp = await fetch(fullUrl, fetchOpts);
  const body = await resp.text();
  return new Response(body, {
    status: resp.status,
    headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json', ...corsHeaders(request) },
  });
}

async function handleTopDeck(request, env) {
  // Require valid session (anonymous or authenticated) to prevent external API key abuse
  const auth = await getAuthUser(request, env);
  if (!auth && !getSession(request)) {
    return json({ error: 'Session required' }, 401, request);
  }
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/^\/topdeck/, '') || '/';
  if (pathname === '/') return json({ error: 'Missing TopDeck API path' }, 400, request);
  const targetUrl = 'https://topdeck.gg/api' + pathname + url.search;
  const actualMethod = request.headers.get('X-Original-Method') || request.method;
  let fetchOpts = {
    method: actualMethod,
    headers: { 'Content-Type': 'application/json', 'Authorization': env.TOPDECK_API_KEY || '' },
  };
  if (request.method === 'POST' || request.method === 'PUT') fetchOpts.body = await request.text();
  const resp = await fetch(targetUrl, fetchOpts);
  const body = await resp.text();
  return new Response(body, {
    status: resp.status,
    headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json', ...corsHeaders(request) },
  });
}

async function handleChatbot(request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, request);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited('chatbot:' + ip, RATE_MAX_CHATBOT)) {
    return json({ error: 'Too many requests. Please wait a moment.' }, 429, request);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400, request); }
  if (!body.messages || !Array.isArray(body.messages)) return json({ error: 'Missing messages array' }, 400, request);
  const messages = body.messages.slice(-10);
  const systemMessage = {
    role: 'system',
    content: 'You are the investMTG AI Advisor, a helpful assistant for Magic: The Gathering players. You help with card pricing, deck building advice, trading tips, and tournament information. Always be friendly, fair, and promote good sportsmanship. Keep responses concise and helpful. You serve the investMTG community on Guam with Guam-first marketplace and fulfillment context.'
  };
  const chatBody = {
    model: body.model || 'openai', messages: [systemMessage, ...messages],
    max_tokens: Math.min(body.max_tokens || 512, 1024), temperature: body.temperature || 0.7,
  };
  try {
    const resp = await fetch('https://text.pollinations.ai/openai/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(chatBody),
    });
    const data = await resp.text();
    return new Response(data, {
      status: resp.status, headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
    });
  } catch { return json({ error: 'Chat service unavailable' }, 502, request); }
}

/* ── MTGStocks proxy ── */
async function handleMTGStocks(request, env) {
  const url = new URL(request.url);
  const printId = url.searchParams.get('print_id');
  if (!printId) return json({ error: 'print_id required' }, 400, request);

  // Check KV cache
  const cacheKey = `mtgstocks:${printId}`;
  const cached = await env.CACHE.get(cacheKey, 'json');
  if (cached) return json(cached, 200, request);

  // Fetch from MTGStocks API
  try {
    const [printResp, priceResp] = await Promise.all([
      fetch(`https://api.mtgstocks.com/prints/${printId}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'investMTG/1.0' }
      }),
      fetch(`https://api.mtgstocks.com/prints/${printId}/prices/tcgplayer`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'investMTG/1.0' }
      })
    ]);

    if (!printResp.ok) return json({ error: 'MTGStocks card not found' }, 404, request);

    const printData = await printResp.json();
    const priceData = priceResp.ok ? await priceResp.json() : null;

    const result = {
      id: printData.id,
      name: printData.name,
      set_name: printData.card_set?.name || '',
      scryfallId: printData.scryfallId || null,
      all_time_high: printData.all_time_high || null,
      all_time_low: printData.all_time_low || null,
      tcgplayer: printData.tcgplayer || null,
      prices: priceData || null
    };

    await env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: TTL_MTGSTOCKS });
    return json(result, 200, request);
  } catch (e) {
    console.error('MTGStocks fetch error:', e.message);
    return json({ error: 'MTGStocks service unavailable' }, 502, request);
  }
}

async function handleGenericProxy(request) {
  const url = new URL(request.url);
  const target = url.searchParams.get('target');
  if (!target) return json({ error: 'Invalid route' }, 400, request);
  let targetUrl;
  try { targetUrl = new URL(target); } catch { return json({ error: 'Invalid target URL' }, 400, request); }
  const isAllowed = ALLOWED_PROXY_HOSTS.some(host => targetUrl.hostname === host || targetUrl.hostname.endsWith('.' + host));
  if (!isAllowed) return json({ error: 'Target host not allowed' }, 403, request);
  let fetchOpts = {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
      'Accept': request.headers.get('Accept') || 'application/json',
      'User-Agent': 'investMTG/1.0 (Cloudflare Worker)',
    },
  };
  if (request.method === 'POST' || request.method === 'PUT') fetchOpts.body = await request.text();
  const resp = await fetch(targetUrl.toString(), fetchOpts);
  const body = await resp.text();
  return new Response(body, {
    status: resp.status,
    headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json', ...corsHeaders(request) },
  });
}

/* ── Health check ── */
async function handleHealth(request, env) {
  try {
    const [dbCheck, listingCount, priceCount, portfolioCount] = await Promise.all([
      env.DB.prepare('SELECT 1').first(),
      env.DB.prepare('SELECT COUNT(*) as cnt FROM listings').first(),
      env.DB.prepare('SELECT COUNT(*) as cnt FROM prices').first(),
      env.DB.prepare('SELECT COUNT(*) as cnt FROM portfolios').first(),
    ]);
    return json({
      status: 'ok',
      db: 'connected',
      version: '3.1.0',
      storage: {
        listings: listingCount?.cnt || 0,
        prices: priceCount?.cnt || 0,
        portfolios: portfolioCount?.cnt || 0,
      }
    }, 200, request);
  } catch (e) {
    console.error('Health check DB error:', e.message);
    return json({ status: 'error', db: 'disconnected' }, 500, request);
  }
}

/* ══════════════════════════════════════
   DAILY CAROUSEL REFRESH
   Queries Scryfall for fresh card picks, stores name lists in KV.
   Called by the scheduled() cron (daily at 3 AM UTC).
   ══════════════════════════════════════ */

async function refreshCarousels(env) {
  const categories = ['featured', 'trending', 'budget'];
  for (const cat of categories) {
    try {
      const names = await fetchCarouselNames(cat);
      if (names && names.length >= 6) {
        // Store name list in KV (expires in 25 hours so there's overlap with next cron)
        await env.CACHE.put('carousel_' + cat, JSON.stringify(names), { expirationTtl: 90000 });
        // Clear the cached card data so it rebuilds with fresh names
        await env.CACHE.delete(cat);
        console.log('[Cron] Refreshed ' + cat + ' carousel: ' + names.length + ' cards');
      } else {
        console.log('[Cron] Skipped ' + cat + ' — not enough results');
      }
    } catch (e) {
      console.error('[Cron] Failed to refresh ' + cat + ':', e.message);
    }
  }
}

async function fetchCarouselNames(category) {
  const cfg = CAROUSEL_QUERIES[category];
  if (!cfg) return null;

  // Pick a random page (seeded by day-of-year so it changes daily)
  const dayOfYear = Math.floor(Date.now() / 86400000);
  const page = (dayOfYear % cfg.maxPage) + 1;

  const url = '/cards/search?q=' + encodeURIComponent(cfg.query)
    + '&order=' + cfg.order + '&dir=' + cfg.dir
    + '&unique=cards&page=' + page;

  const data = await scryfallFetch(url);
  if (!data || !data.data || data.data.length === 0) return null;

  // Filter to cards with USD prices and deduplicate by name
  const seen = new Set();
  const cards = [];
  for (const card of data.data) {
    if (!card.prices || !card.prices.usd) continue;
    if (card.digital) continue;
    if (seen.has(card.name)) continue;
    seen.add(card.name);
    cards.push(card.name);
    if (cards.length >= 12) break;
  }
  return cards;
}

/* ══════════════════════════════════════
   ORDER CONFIRMATION EMAIL (Resend)
   ══════════════════════════════════════

   Sends transactional order emails via Resend REST API.
   Requires RESEND_API_KEY wrangler secret.
   Fire-and-forget — never blocks order creation.
*/

function buildOrderEmailHtml(order, emailType) {
  const isPaid = emailType === 'payment_confirmed';
  const title = isPaid ? 'Payment Confirmed' : 'Order Received';
  const statusText = isPaid ? 'Payment confirmed — your order is being prepared.'
    : order.payment_method === 'reserve' ? 'Your order has been reserved. Pay when you pick up.'
    : 'Your order is being processed.';
  const statusColor = isPaid ? '#22c55e' : '#D4A843';

  let items;
  try { items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items; }
  catch (e) { items = []; }

  const itemRows = (items || []).map(function(item) {
    const cond = item.condition || 'NM';
    const price = typeof item.price === 'number' ? '$' + item.price.toFixed(2) : item.price || '';
    const qty = item.quantity || 1;
    return '<tr>' +
      '<td style="padding:8px 0;border-bottom:1px solid #2A2F3A;color:#E8E6E1">' + (item.name || 'Card') + ' <span style="color:#8B8D94;font-size:13px">(' + cond + ')</span></td>' +
      '<td style="padding:8px 0;border-bottom:1px solid #2A2F3A;text-align:center;color:#8B8D94">' + qty + '</td>' +
      '<td style="padding:8px 0;border-bottom:1px solid #2A2F3A;text-align:right;color:#D4A843;font-weight:600">' + price + '</td>' +
      '</tr>';
  }).join('');

  let pickupInfo = '';
  if (order.fulfillment === 'pickup' && order.pickup_store) {
    let store = order.pickup_store;
    try { if (typeof store === 'string') store = JSON.parse(store); } catch (e) { /* keep as string */ }
    const storeName = typeof store === 'object' ? (store.name || 'Selected Store') : store;
    pickupInfo = '<div style="background:#1A1E27;border-radius:8px;padding:16px;margin:16px 0">' +
      '<p style="margin:0 0 4px;font-size:13px;color:#8B8D94;text-transform:uppercase;letter-spacing:0.05em">Pickup Location</p>' +
      '<p style="margin:0;color:#E8E6E1;font-weight:600">' + storeName + '</p>' +
      '</div>';
  }

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#0D0F12;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">' +
    '<div style="max-width:600px;margin:0 auto;padding:24px 16px">' +

    // Header
    '<div style="text-align:center;padding:24px 0">' +
    '<span style="font-size:24px;font-weight:700;color:#E8E6E1">invest<span style="color:#D4A843">MTG</span></span>' +
    '</div>' +

    // Status banner
    '<div style="background:' + statusColor + '20;border:1px solid ' + statusColor + '40;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">' +
    '<p style="margin:0 0 4px;font-size:20px;font-weight:700;color:' + statusColor + '">' + title + '</p>' +
    '<p style="margin:0;color:#8B8D94;font-size:14px">' + statusText + '</p>' +
    '</div>' +

    // Order ID
    '<div style="background:#111318;border:1px solid #2A2F3A;border-radius:12px;padding:20px;margin-bottom:24px">' +
    '<p style="margin:0 0 4px;font-size:13px;color:#8B8D94;text-transform:uppercase;letter-spacing:0.05em">Order Number</p>' +
    '<p style="margin:0;font-size:18px;font-weight:700;color:#D4A843;letter-spacing:0.02em">' + order.id + '</p>' +
    '<p style="margin:8px 0 0;font-size:13px;color:#8B8D94">' + new Date(order.created_at || Date.now()).toLocaleString('en-US', { timeZone: 'Pacific/Guam', dateStyle: 'long', timeStyle: 'short' }) + ' ChST</p>' +
    '</div>' +

    // Items table
    '<div style="background:#111318;border:1px solid #2A2F3A;border-radius:12px;padding:20px;margin-bottom:24px">' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
    '<thead><tr>' +
    '<th style="padding:0 0 8px;text-align:left;color:#8B8D94;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #2A2F3A">Card</th>' +
    '<th style="padding:0 0 8px;text-align:center;color:#8B8D94;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #2A2F3A">Qty</th>' +
    '<th style="padding:0 0 8px;text-align:right;color:#8B8D94;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #2A2F3A">Price</th>' +
    '</tr></thead>' +
    '<tbody>' + itemRows + '</tbody>' +
    '</table>' +

    // Totals
    '<div style="border-top:2px solid #2A2F3A;margin-top:12px;padding-top:12px">' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:#8B8D94;font-size:13px">Subtotal</span><span style="color:#E8E6E1;font-size:13px">$' + (order.subtotal || 0).toFixed(2) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:#8B8D94;font-size:13px">Tax</span><span style="color:#E8E6E1;font-size:13px">$' + (order.tax || 0).toFixed(2) + '</span></div>' +
    (order.shipping ? '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:#8B8D94;font-size:13px">Shipping</span><span style="color:#E8E6E1;font-size:13px">$' + order.shipping.toFixed(2) + '</span></div>' : '') +
    '<div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid #2A2F3A"><span style="color:#E8E6E1;font-weight:700;font-size:15px">Total</span><span style="color:#D4A843;font-weight:700;font-size:18px">$' + (order.total || 0).toFixed(2) + '</span></div>' +
    '</div></div>' +

    // Pickup info
    pickupInfo +

    // Contact info
    '<div style="background:#111318;border:1px solid #2A2F3A;border-radius:12px;padding:20px;margin-bottom:24px">' +
    '<p style="margin:0 0 12px;font-size:13px;color:#8B8D94;text-transform:uppercase;letter-spacing:0.05em">Contact Info</p>' +
    (order.contact_name ? '<p style="margin:0 0 4px;color:#E8E6E1">' + order.contact_name + '</p>' : '') +
    (order.contact_email ? '<p style="margin:0 0 4px;color:#8B8D94;font-size:13px">' + order.contact_email + '</p>' : '') +
    (order.contact_phone ? '<p style="margin:0;color:#8B8D94;font-size:13px">' + order.contact_phone + '</p>' : '') +
    '</div>' +

    // CTA
    '<div style="text-align:center;margin:24px 0">' +
    '<a href="https://www.investmtg.com/#order/' + order.id + '" style="display:inline-block;background:#D4A843;color:#0D0F12;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px">View Order Details</a>' +
    '</div>' +

    // Footer
    '<div style="text-align:center;padding:24px 0;border-top:1px solid #2A2F3A">' +
    '<p style="margin:0 0 4px;color:#8B8D94;font-size:12px">investMTG — Guam\'s MTG Marketplace</p>' +
    '<p style="margin:0;color:#8B8D94;font-size:11px">Live pricing · Zero markup · Community-driven</p>' +
    '</div>' +

    '</div></body></html>';
}

async function sendOrderConfirmationEmail(order, env, emailType) {
  if (!env.RESEND_API_KEY) {
    console.log('[Email] Skipped — RESEND_API_KEY not configured');
    return;
  }

  const to = order.contact_email || order.user_email;
  if (!to) {
    console.log('[Email] Skipped — no recipient email');
    return;
  }

  const isPaid = emailType === 'payment_confirmed';
  const subject = isPaid
    ? 'Payment Confirmed — Order ' + order.id
    : 'Order Received — ' + order.id;

  const html = buildOrderEmailHtml(order, emailType);

  try {
    const resp = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'investMTG <' + ORDER_EMAIL_FROM + '>',
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      console.log('[Email] Sent order confirmation to ' + to + ' — email id: ' + data.id);
    } else {
      const errText = await resp.text();
      console.error('[Email] Failed: ' + resp.status + ' — ' + errText);
    }
  } catch (e) {
    console.error('[Email] Error sending: ' + e.message);
  }

  // ── Seller notification (only on new orders, not payment confirmations) ──
  if (emailType === 'order_received') {
    try {
      let items;
      try { items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items; }
      catch (e) { items = []; }

      // Collect unique seller names from items
      const sellerNames = [...new Set((items || []).map(i => i.seller).filter(Boolean))];
      if (sellerNames.length === 0) return;

      // Look up seller emails from DB
      for (const sellerName of sellerNames) {
        // sellers table uses 'name' and 'contact' columns
        const seller = await env.DB.prepare(
          'SELECT name, contact FROM sellers WHERE name = ? LIMIT 1'
        ).bind(sellerName).first();

        // contact may be email or phone — only send if it looks like an email
        const sellerContact = seller && seller.contact ? seller.contact.trim() : '';
        if (!sellerContact || !sellerContact.includes('@')) {
          console.log('[Email] No email found for seller: ' + sellerName + ' (contact: ' + sellerContact + ')');
          continue;
        }

        const sellerItems = items.filter(i => i.seller === sellerName);
        const sellerItemList = sellerItems.map(i => '• ' + (i.name || 'Card') + ' (' + (i.condition || 'NM') + ') — $' + ((i.price || 0).toFixed ? i.price.toFixed(2) : i.price)).join('\n');
        const sellerTotal = sellerItems.reduce(function(sum, i) { return sum + (parseFloat(i.price) || 0) * (i.quantity || 1); }, 0);

        const sellerHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
          '<body style="margin:0;padding:0;background:#0D0F12;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">' +
          '<div style="max-width:600px;margin:0 auto;padding:24px 16px">' +
          '<div style="text-align:center;padding:24px 0"><span style="font-size:24px;font-weight:700;color:#E8E6E1">invest<span style="color:#D4A843">MTG</span></span></div>' +
          '<div style="background:#22c55e20;border:1px solid #22c55e40;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">' +
          '<p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#22c55e">New Reservation</p>' +
          '<p style="margin:0;color:#8B8D94;font-size:14px">A buyer has reserved cards from your listings.</p></div>' +
          '<div style="background:#111318;border:1px solid #2A2F3A;border-radius:12px;padding:20px;margin-bottom:24px">' +
          '<p style="margin:0 0 8px;font-size:13px;color:#8B8D94;text-transform:uppercase;letter-spacing:0.05em">Order Details</p>' +
          '<p style="margin:0 0 4px;color:#D4A843;font-weight:700">' + order.id + '</p>' +
          '<p style="margin:0 0 12px;color:#8B8D94;font-size:13px">' + new Date(order.created_at || Date.now()).toLocaleString('en-US', { timeZone: 'Pacific/Guam', dateStyle: 'long', timeStyle: 'short' }) + ' ChST</p>' +
          '<p style="margin:0 0 4px;color:#8B8D94;font-size:12px;text-transform:uppercase">Items reserved from you:</p>' +
          '<pre style="margin:0;color:#E8E6E1;font-size:14px;white-space:pre-wrap">' + sellerItemList + '</pre>' +
          '<p style="margin:12px 0 0;color:#E8E6E1;font-weight:700">Your total: $' + sellerTotal.toFixed(2) + '</p></div>' +
          '<div style="background:#111318;border:1px solid #2A2F3A;border-radius:12px;padding:20px;margin-bottom:24px">' +
          '<p style="margin:0 0 8px;font-size:13px;color:#8B8D94;text-transform:uppercase;letter-spacing:0.05em">Buyer Contact</p>' +
          (order.contact_name ? '<p style="margin:0 0 4px;color:#E8E6E1">' + order.contact_name + '</p>' : '') +
          (order.contact_email ? '<p style="margin:0 0 4px;color:#8B8D94;font-size:13px">' + order.contact_email + '</p>' : '') +
          (order.contact_phone ? '<p style="margin:0;color:#8B8D94;font-size:13px">' + order.contact_phone + '</p>' : '') +
          '</div>' +
          '<div style="text-align:center;padding:24px 0;border-top:1px solid #2A2F3A">' +
          '<p style="margin:0;color:#8B8D94;font-size:12px">investMTG — Guam\'s MTG Marketplace</p></div>' +
          '</div></body></html>';

        await fetch(RESEND_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + env.RESEND_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'investMTG <' + ORDER_EMAIL_FROM + '>',
            to: [sellerContact],
            subject: 'New Reservation — ' + order.id,
            html: sellerHtml,
          }),
        }).then(function(r) {
          if (r.ok) console.log('[Email] Seller notification sent to ' + sellerContact);
          else r.text().then(function(t) { console.error('[Email] Seller notification failed: ' + t); });
        });
      }
    } catch (sellerErr) {
      console.error('[Email] Seller notification error:', sellerErr.message);
    }
  }
}

/* ══════════════════════════════════════
   ECHOMTG API PROXY
   ══════════════════════════════════════

   Proxies requests to EchoMTG API with server-side API key injection.
   KV-cached with configurable TTL per endpoint type.

   /echomtg?path=/api/data/history/&emid=267        — Price history
   /echomtg?path=/api/group/&name=trendingup&limit=20 — Trending up cards
   /echomtg?path=/api/group/&name=trendingdown&limit=20 — Trending down
   /echomtg?path=/api/data/set/&set_code=ONE&limit=20 — Set data
   /echomtg?path=/api/data/item/&emid=267             — Single card item
*/

async function handleEchoMTG(request, env) {
  if (!env.ECHOMTG_API_KEY) {
    return json({ error: 'EchoMTG not configured. Set ECHOMTG_API_KEY via wrangler secret put.' }, 500, request);
  }

  const url = new URL(request.url);
  const apiPath = url.searchParams.get('path');
  if (!apiPath) {
    return json({ error: 'path parameter required (e.g. /api/data/history/)' }, 400, request);
  }

  // Build the EchoMTG URL
  const params = new URLSearchParams(url.searchParams);
  params.delete('path');
  params.set('auth', env.ECHOMTG_API_KEY);
  const echoUrl = 'https://www.echomtg.com' + apiPath + '?' + params.toString();

  // KV cache key
  const cacheKey = 'echomtg:' + apiPath + ':' + params.toString();

  // Determine TTL based on endpoint type
  let ttl = 3600; // default 1 hour
  if (apiPath.includes('/history/')) ttl = 86400; // 24 hours for price history
  if (apiPath.includes('/group/'))  ttl = 1800;  // 30 min for trending/groups
  if (apiPath.includes('/data/set/')) ttl = 86400; // 24 hours for set data

  // Check KV cache first
  const cached = await env.CACHE.get(cacheKey, 'text');
  if (cached) {
    return new Response(cached, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    const resp = await fetch(echoUrl, {
      headers: { 'User-Agent': 'investMTG/1.0 (api.investmtg.com)' },
    });

    const body = await resp.text();

    // Cache successful responses
    if (resp.ok) {
      await env.CACHE.put(cacheKey, body, { expirationTtl: ttl }).catch(function(e) {
        console.warn('[EchoMTG] KV cache write failed:', e.message);
      });
    }

    return new Response(body, {
      status: resp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Cache': 'MISS',
      },
    });
  } catch (e) {
    console.error('[EchoMTG] Fetch error:', e.message);
    return json({ error: 'EchoMTG service unavailable' }, 502, request);
  }
}

/* ══════════════════════════════════════
   SEO: HTMLRewriter for bot/crawler card pages
   ══════════════════════════════════════ */

async function handleBotCardPage(request, env, cardId) {
  // Fetch card data from D1 (or Scryfall via handleCardDetail fallback)
  var now = Math.floor(Date.now() / 1000);
  var row = await env.DB.prepare(
    'SELECT name, set_name, type_line, oracle_text, price_usd, price_usd_foil, image_normal, rarity FROM prices WHERE card_id = ? AND updated_at > ?'
  ).bind(cardId, now - TTL_PRICE).first();

  // If no cached row, try Scryfall directly
  if (!row) {
    try {
      var card = await scryfallFetch('/cards/' + cardId);
      row = {
        name: card.name || 'Unknown Card',
        set_name: card.set_name || '',
        type_line: card.type_line || '',
        oracle_text: card.oracle_text || '',
        price_usd: card.prices ? card.prices.usd : null,
        price_usd_foil: card.prices ? card.prices.usd_foil : null,
        image_normal: (card.image_uris && card.image_uris.normal) || '',
        rarity: card.rarity || '',
      };
    } catch (e) {
      row = null;
    }
  }

  if (!row) {
    // Can't find card — just pass through to origin
    var fallbackReq = new Request('https://www.investmtg.com/', { headers: request.headers });
    return fetch(fallbackReq, { cf: { resolveOverride: ORIGIN_WWW_HOSTNAME } });
  }

  var title = row.name + ' — $' + (row.price_usd || 'N/A') + ' | investMTG';
  var desc = row.name + ' (' + row.set_name + ') — ' + row.type_line + '. '
    + (row.price_usd ? 'Market price: $' + Number(row.price_usd).toFixed(2) : 'Price unavailable')
    + (row.price_usd_foil ? ' | Foil: $' + Number(row.price_usd_foil).toFixed(2) : '')
    + '. Track prices and buy locally on investMTG.';
  var image = row.image_normal || 'https://www.investmtg.com/og-image.jpg';
  var cardUrl = 'https://www.investmtg.com/#card/' + cardId;

  // Fetch the origin HTML from GitHub Pages
  var originReq = new Request('https://www.investmtg.com/', { headers: request.headers });
  var originResponse = await fetch(originReq, { cf: { resolveOverride: ORIGIN_WWW_HOSTNAME } });

  // Use HTMLRewriter to inject SEO meta tags
  return new HTMLRewriter()
    .on('title', {
      element: function(el) { el.setInnerContent(title); }
    })
    .on('meta[name="description"]', {
      element: function(el) { el.setAttribute('content', desc); }
    })
    .on('meta[property="og:title"]', {
      element: function(el) { el.setAttribute('content', row.name + ' | investMTG'); }
    })
    .on('meta[property="og:description"]', {
      element: function(el) { el.setAttribute('content', desc); }
    })
    .on('meta[property="og:image"]', {
      element: function(el) { el.setAttribute('content', image); }
    })
    .on('meta[property="og:url"]', {
      element: function(el) { el.setAttribute('content', cardUrl); }
    })
    .on('meta[name="twitter:title"]', {
      element: function(el) { el.setAttribute('content', row.name + ' | investMTG'); }
    })
    .on('meta[name="twitter:description"]', {
      element: function(el) { el.setAttribute('content', desc); }
    })
    .on('meta[name="twitter:image"]', {
      element: function(el) { el.setAttribute('content', image); }
    })
    .on('link[rel="canonical"]', {
      element: function(el) { el.setAttribute('href', cardUrl); }
    })
    .transform(originResponse);
}

/* ── SEO: Dynamic sitemap.xml from D1 ── */

async function handleSitemap(request, env) {
  // Static page routes
  var pages = [
    { loc: 'https://www.investmtg.com/', freq: 'daily', priority: '1.0' },
    { loc: 'https://www.investmtg.com/#search', freq: 'weekly', priority: '0.9' },
    { loc: 'https://www.investmtg.com/#store', freq: 'weekly', priority: '0.8' },
    { loc: 'https://www.investmtg.com/#movers', freq: 'daily', priority: '0.8' },
    { loc: 'https://www.investmtg.com/#portfolio', freq: 'weekly', priority: '0.7' },
    { loc: 'https://www.investmtg.com/#seller', freq: 'weekly', priority: '0.7' },
    { loc: 'https://www.investmtg.com/#cart', freq: 'weekly', priority: '0.5' },
    { loc: 'https://www.investmtg.com/#pricing', freq: 'monthly', priority: '0.6' },
    { loc: 'https://www.investmtg.com/#privacy', freq: 'monthly', priority: '0.3' },
    { loc: 'https://www.investmtg.com/#terms', freq: 'monthly', priority: '0.3' },
  ];

  // Dynamic card pages from D1
  var rows = await env.DB.prepare(
    'SELECT card_id, name, updated_at FROM prices ORDER BY updated_at DESC LIMIT 5000'
  ).all();
  var cards = (rows && rows.results) ? rows.results : [];

  var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Static pages
  for (var i = 0; i < pages.length; i++) {
    xml += '  <url>\n';
    xml += '    <loc>' + pages[i].loc + '</loc>\n';
    xml += '    <changefreq>' + pages[i].freq + '</changefreq>\n';
    xml += '    <priority>' + pages[i].priority + '</priority>\n';
    xml += '  </url>\n';
  }

  // Card pages
  for (var j = 0; j < cards.length; j++) {
    var c = cards[j];
    var lastmod = c.updated_at ? new Date(c.updated_at * 1000).toISOString().split('T')[0] : '';
    xml += '  <url>\n';
    xml += '    <loc>https://www.investmtg.com/card/' + encodeURIComponent(c.card_id) + '</loc>\n';
    if (lastmod) xml += '    <lastmod>' + lastmod + '</lastmod>\n';
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.6</priority>\n';
    xml += '  </url>\n';
  }

  xml += '</urlset>';

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

/* ══════════════════════════════════════
   MAIN ROUTER
   ══════════════════════════════════════ */

/* ── Price Alerts CRUD ── */
async function handlePriceAlerts(request, env) {
  const auth = await getAuthUser(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401, request);

  const method = request.method;
  const url = new URL(request.url);
  const userEmail = auth.user.email;

  if (method === 'GET') {
    const cardId = url.searchParams.get('card_id');
    if (cardId) {
      const row = await env.DB.prepare(
        'SELECT * FROM price_alerts WHERE user_email = ? AND card_id = ? LIMIT 1'
      ).bind(userEmail, cardId).first();
      return json({ alert: row || null }, 200, request);
    }
    const rows = await env.DB.prepare(
      'SELECT * FROM price_alerts WHERE user_email = ? ORDER BY created_at DESC'
    ).bind(userEmail).all();
    return json({ alerts: rows.results }, 200, request);
  }

  if (method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body || !body.card_id || !body.card_name || !body.direction || !body.target_price) {
      return json({ error: 'card_id, card_name, direction, target_price required' }, 400, request);
    }
    if (body.direction !== 'above' && body.direction !== 'below') {
      return json({ error: 'direction must be above or below' }, 400, request);
    }
    const targetPrice = parseFloat(body.target_price);
    if (isNaN(targetPrice) || targetPrice <= 0) {
      return json({ error: 'target_price must be a positive number' }, 400, request);
    }
    const currentPrice = body.current_price ? parseFloat(body.current_price) : null;

    await env.DB.prepare(
      `INSERT INTO price_alerts (user_email, card_id, card_name, direction, target_price, current_price)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_email, card_id, direction) DO UPDATE SET
         target_price = excluded.target_price,
         current_price = excluded.current_price,
         card_name = excluded.card_name,
         triggered_at = NULL`
    ).bind(userEmail, body.card_id, body.card_name, body.direction, targetPrice, currentPrice).run();

    return json({ ok: true, alert: { user_email: userEmail, card_id: body.card_id, direction: body.direction, target_price: targetPrice } }, 200, request);
  }

  if (method === 'DELETE') {
    const cardId = url.searchParams.get('card_id');
    const direction = url.searchParams.get('direction');
    if (!cardId) return json({ error: 'card_id required' }, 400, request);

    if (direction) {
      await env.DB.prepare(
        'DELETE FROM price_alerts WHERE user_email = ? AND card_id = ? AND direction = ?'
      ).bind(userEmail, cardId, direction).run();
    } else {
      await env.DB.prepare(
        'DELETE FROM price_alerts WHERE user_email = ? AND card_id = ?'
      ).bind(userEmail, cardId).run();
    }
    return json({ ok: true }, 200, request);
  }

  return json({ error: 'Method not allowed' }, 405, request);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return handleOptions(request);

    // Rate limit by IP (general)
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (isRateLimited('api:' + ip, RATE_MAX_API)) {
      return json({ error: 'Rate limit exceeded' }, 429, request);
    }

    const url = new URL(request.url);
    const host = url.hostname;
    const path = url.pathname;

    try {
      /* ── SEO: Intercept www.investmtg.com requests ── */
      if (host === 'www.investmtg.com') {
        var ua = request.headers.get('User-Agent') || '';
        var isBot = BOT_UA_RE.test(ua);

        // Sitemap — serve dynamic sitemap for all requesters
        if (path === '/sitemap.xml') return handleSitemap(request, env);

        // Clean card URL: /card/:id
        // Bots get HTMLRewriter-injected meta; humans get 302 to hash route
        if (path.startsWith('/card/')) {
          var seoCardId = path.replace('/card/', '');
          if (seoCardId) {
            if (isBot) return handleBotCardPage(request, env, seoCardId);
            // Regular user — redirect to hash route
            return new Response(null, {
              status: 302,
              headers: { 'Location': 'https://www.investmtg.com/#card/' + seoCardId },
            });
          }
        }

        // Pass through to GitHub Pages origin
        // Use resolveOverride to send to GH Pages while keeping Host: www.investmtg.com
        return fetch(request, {
          cf: { resolveOverride: ORIGIN_WWW_HOSTNAME },
        });
      }

      // SEO: Sitemap on api domain too
      if (path === '/sitemap.xml')                          return handleSitemap(request, env);

      // Auth routes
      if (path === '/auth/google')                          return handleGoogleAuth(request, env);
      if (path === '/auth/callback')                        return handleAuthCallback(request, env);
      if (path === '/auth/me')                              return handleAuthMe(request, env);

      if (path === '/auth/logout' && request.method === 'DELETE') return handleAuthLogout(request, env);

      // New API routes (D1 + KV backed)
      if (path === '/api/health')                           return handleHealth(request, env);
      if (path === '/api/ticker')                           return handleTicker(request, env);
      if (path === '/api/featured')                         return handleFeatured(request, env);
      if (path === '/api/trending')                         return handleTrending(request, env);
      if (path === '/api/budget')                           return handleBudget(request, env);
      if (path === '/api/search')                           return handleSearch(request, env);
      if (path.startsWith('/api/card-printings/'))           return handleCardPrintings(request, env, decodeURIComponent(path.replace('/api/card-printings/', '')));
      if (path.startsWith('/api/card/'))                    return handleCardDetail(request, env, path.replace('/api/card/', ''));
      if (path.startsWith('/api/movers'))                   return handleMovers(request, env, path.split('/').pop() || 'valuable');
      if (path === '/api/listings/batch' && request.method === 'POST') return handleListingsBatch(request, env);
      if (path === '/api/portfolio/batch' && request.method === 'POST') return handlePortfolioBatch(request, env);
      if (path === '/api/portfolio/enrich' && request.method === 'POST') return handlePortfolioEnrich(request, env);
      if (path.startsWith('/api/portfolio'))                return handlePortfolio(request, env);
      if (path.startsWith('/api/listings'))                 return handleListings(request, env);
      if (path.startsWith('/api/binders'))                  return handleBinders(request, env);
      if (path.startsWith('/api/lists'))                    return handleLists(request, env);
      if (path.startsWith('/api/sellers'))                  return handleSellers(request, env);
      if (path === '/api/stores')                           return handleStores(request, env);
      if (path === '/api/events')                           return handleEvents(request, env);
      if (path.startsWith('/api/cart'))                     return handleCart(request, env);
      if (path.match(/^\/api\/orders\/[^/]+\/payment-status$/)) {
        const psOrderId = path.split('/')[3];
        return handleOrderPaymentStatus(request, env, psOrderId);
      }
      if (path.startsWith('/api/orders')) {
        const orderId = path.replace(/^\/api\/orders\/?/, '') || null;
        return handleOrders(request, env, orderId || undefined);
      }
      if (path === '/api/sumup/checkout')                    return handleSumUpCheckout(request, env);
      if (path === '/api/sumup-webhook')                      return handleSumUpWebhook(request, env);
      if (path === '/api/paypal/create-order')                return handlePayPalCreateOrder(request, env);
      if (path === '/api/paypal/capture-order')               return handlePayPalCaptureOrder(request, env);
      if (path === '/api/price-alerts')                         return handlePriceAlerts(request, env);

      // Admin-only: manual carousel refresh trigger
      if (path === '/api/admin/refresh-carousels' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization') || '';
        if (!env.ADMIN_TOKEN || authHeader !== 'Bearer ' + env.ADMIN_TOKEN) {
          return json({ error: 'Unauthorized' }, 401, request);
        }
        await refreshCarousels(env);
        // Also clear the card-data cache keys so endpoints rebuild from new names
        await env.CACHE.delete('featured');
        await env.CACHE.delete('trending');
        await env.CACHE.delete('budget');
        return json({ ok: true, message: 'Carousels refreshed and cache cleared' }, 200, request);
      }

      // Existing proxy routes (preserved)
      if (path === '/justtcg' || path.startsWith('/justtcg'))  return handleJustTCG(request, env);
      if (path === '/mtgstocks' || path.startsWith('/mtgstocks')) return handleMTGStocks(request, env);
      if (path.startsWith('/topdeck'))                         return handleTopDeck(request, env);
      if (path === '/chatbot')                                 return handleChatbot(request);
      if (path === '/echomtg' || path.startsWith('/echomtg'))    return handleEchoMTG(request, env);
      if (url.searchParams.has('target'))                      return handleGenericProxy(request);

      return json({ error: 'Not found', routes: '/api/health for status' }, 404, request);
    } catch (e) {
      console.error('Worker error:', e.message, e.stack);
      return json({ error: 'Internal error' }, 500, request);
    }
  },

  /* Cron Trigger — runs on schedule defined in wrangler.toml */
  async scheduled(event, env, ctx) {
    const now = Math.floor(Date.now() / 1000);
    // Purge expired auth sessions
    const authResult = await env.DB.prepare(
      'DELETE FROM auth_sessions WHERE expires_at <= ?'
    ).bind(now).run();
    console.log('[Cron] Purged ' + (authResult.meta?.changes || 0) + ' expired auth sessions');

    // Purge stale price cache entries (>30 days old)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
    const priceResult = await env.DB.prepare(
      'DELETE FROM prices WHERE updated_at < ?'
    ).bind(thirtyDaysAgo).run();
    console.log('[Cron] Purged ' + (priceResult.meta?.changes || 0) + ' stale price cache entries (>30 days old)');

    // Refresh carousel card selections from Scryfall
    await refreshCarousels(env);
  },
};
