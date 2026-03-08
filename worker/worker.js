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
 *   /api/listings         — Marketplace listings CRUD (write routes require auth)
 *   /api/sellers          — Seller registration + management (write routes require auth)
 *   /api/stores           — Local stores from D1
 *   /api/events           — Community events from D1
 *   /api/cart             — Shopping cart CRUD (auth user or anonymous session)
 *   /auth/google          — Start Google OAuth flow
 *   /auth/callback        — Google OAuth callback
 *   /auth/me              — Current authenticated user
 *   /auth/logout          — Destroy auth session
 *   /justtcg              — JustTCG API proxy (existing)
 *   /topdeck              — TopDeck API proxy (existing)
 *   /chatbot              — AI chatbot proxy (existing)
 *   /?target=             — Generic CORS proxy (existing)
 */

const ALLOWED_ORIGINS = [
  'https://www.investmtg.com',
  'https://investmtg.com',
  'https://imvestmtg.github.io',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
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
const TTL_PRICE = 600;        // 10 minutes for individual card prices

const AUTH_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const AUTH_STATE_MAX_AGE = 60 * 10; // 10 minutes

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

// Featured cards (high-value staples)
const FEATURED_CARD_NAMES = [
  'Serra\'s Sanctum', 'Tropical Island', 'Underground Sea',
  'Savannah', 'Bayou', 'Volcanic Island',
];

// Trending cards
const TRENDING_CARD_NAMES = [
  'Fatal Push', 'The One Ring', 'Ragavan, Nimble Pilferer',
  'Sheoldred, the Apocalypse', 'Orcish Bowmasters', 'Mana Crypt',
];

// Budget staples
const BUDGET_CARD_NAMES = [
  'Sol Ring', 'Rampant Growth', 'Path to Exile', 'Counterspell',
  'Swords to Plowshares', 'Lightning Bolt', 'Cultivate', 'Arcane Signet',
];

/* ── CORS helpers ── */

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
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
  return auth ? { clause: 'p.user_id = ?', value: auth.userId } : { clause: 'p.session_token = ?', value: token };
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

const SCRYFALL_BASE = 'https://api.scryfall.com';
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

async function fetchAndCacheCard(db, name) {
  try {
    const card = await scryfallFetch('/cards/named?exact=' + encodeURIComponent(name));
    if (!card || card.object === 'error') return null;

    const now = Math.floor(Date.now() / 1000);
    const imageUris = card.image_uris || (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris) || {};

    await db.prepare(`
      INSERT OR REPLACE INTO prices
      (card_id, name, set_code, set_name, collector_number, rarity, mana_cost, type_line, oracle_text, colors, price_usd, price_usd_foil, price_eur, image_small, image_normal, image_large, scryfall_uri, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      card.id, card.name, card.set, card.set_name, card.collector_number,
      card.rarity, card.mana_cost || '', card.type_line || '', card.oracle_text || '',
      JSON.stringify(card.colors || []),
      card.prices?.usd ? parseFloat(card.prices.usd) : null,
      card.prices?.usd_foil ? parseFloat(card.prices.usd_foil) : null,
      card.prices?.eur ? parseFloat(card.prices.eur) : null,
      imageUris.small || '', imageUris.normal || '', imageUris.large || '',
      card.scryfall_uri || '', now
    ).run();

    return {
      card_id: card.id, name: card.name, set_code: card.set, set_name: card.set_name,
      rarity: card.rarity, mana_cost: card.mana_cost, type_line: card.type_line,
      price_usd: card.prices?.usd ? parseFloat(card.prices.usd) : null,
      price_usd_foil: card.prices?.usd_foil ? parseFloat(card.prices.usd_foil) : null,
      image_small: imageUris.small || '', image_normal: imageUris.normal || '',
      scryfall_uri: card.scryfall_uri || '', updated_at: now,
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
  const redirectUri = `${url.origin}/auth/callback`;
  const state = await createOAuthState(env);
  const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  googleUrl.searchParams.set('redirect_uri', redirectUri);
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

  const redirectUri = `${url.origin}/auth/callback`;
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!tokenResp.ok) {
    const detail = await tokenResp.text().catch(() => 'OAuth token exchange failed');
    return json({ error: 'Token exchange failed', detail }, 502, request);
  }

  const tokenData = await tokenResp.json();
  if (!tokenData.access_token) return json({ error: 'Missing access token' }, 502, request);

  const userResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
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

  // Pass token via URL query so frontend can store it (cross-site cookies are blocked by modern browsers)
  const redirectUrl = `${env.FRONTEND_URL}?auth_token=${encodeURIComponent(authToken)}`;
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
  const cards = await getCachedCardsByNames(
    env.DB, env.CACHE, 'featured', FEATURED_CARD_NAMES, TTL_FEATURED
  );
  return json(cards, 200, request);
}

/* ── GET /api/trending ── */
async function handleTrending(request, env) {
  const cards = await getCachedCardsByNames(
    env.DB, env.CACHE, 'trending', TRENDING_CARD_NAMES, TTL_TRENDING
  );
  return json(cards, 200, request);
}

/* ── GET /api/budget ── */
async function handleBudget(request, env) {
  const cards = await getCachedCardsByNames(
    env.DB, env.CACHE, 'budget', BUDGET_CARD_NAMES, TTL_BUDGET
  );
  return json(cards, 200, request);
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
    return json({ error: 'Search failed', detail: e.message }, 502, request);
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

  // Fetch from Scryfall
  try {
    const card = await scryfallFetch('/cards/' + cardId);
    const imageUris = card.image_uris || (card.card_faces?.[0]?.image_uris) || {};

    await env.DB.prepare(`
      INSERT OR REPLACE INTO prices
      (card_id, name, set_code, set_name, collector_number, rarity, mana_cost, type_line, oracle_text, colors, price_usd, price_usd_foil, price_eur, image_small, image_normal, image_large, scryfall_uri, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      card.id, card.name, card.set, card.set_name, card.collector_number,
      card.rarity, card.mana_cost || '', card.type_line || '', card.oracle_text || '',
      JSON.stringify(card.colors || []),
      card.prices?.usd ? parseFloat(card.prices.usd) : null,
      card.prices?.usd_foil ? parseFloat(card.prices.usd_foil) : null,
      card.prices?.eur ? parseFloat(card.prices.eur) : null,
      imageUris.small || '', imageUris.normal || '', imageUris.large || '',
      card.scryfall_uri || '', now
    ).run();

    // Return full Scryfall response for card detail page
    return json(card, 200, request);
  } catch (e) {
    return json({ error: 'Card not found', detail: e.message }, 404, request);
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
      'Black Lotus', 'Ancestral Recall', 'Time Walk', 'Mox Sapphire', 'Mox Ruby',
      'Mox Pearl', 'Mox Jet', 'Mox Emerald', 'Timetwister', 'Underground Sea',
      'Volcanic Island', 'Tropical Island', 'Tundra', 'Bayou', 'Savannah', 'Badlands',
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

    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      'INSERT OR REPLACE INTO portfolios (user_id, session_token, card_id, card_name, quantity, added_price, added_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      auth ? auth.userId : null,
      auth ? null : token,
      body.card_id,
      body.card_name || '',
      body.quantity || 1,
      body.added_price || null,
      now
    ).run();

    const resp = json({ success: true, message: 'Added to portfolio' }, 201, request);
    return !auth && isNew ? withSessionCookie(resp, token) : resp;
  }

  if (method === 'DELETE') {
    const parts = url.pathname.split('/');
    const cardId = parts[parts.length - 1];
    if (!cardId || cardId === 'portfolio') {
      await env.DB.prepare(`DELETE FROM portfolios WHERE ${scope.clause}`).bind(scope.value).run();
    } else {
      await env.DB.prepare(`DELETE FROM portfolios WHERE ${scope.clause} AND card_id = ?`).bind(scope.value, cardId).run();
    }
    return json({ success: true }, 200, request);
  }

  return json({ error: 'Method not allowed' }, 405, request);
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

    const countRow = await env.DB.prepare(countQuery).bind(...countParams).first();

    return json({ listings: rows.results, total: countRow?.total || 0, limit, offset }, 200, request);
  }

  const auth = await getAuthUser(request, env);
  if (!auth) return json({ error: 'Authentication required' }, 401, request);

  if (method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body || !body.card_name || !body.price || !body.condition || !body.seller_name) {
      return json({ error: 'card_name, price, condition, and seller_name required' }, 400, request);
    }

    const now = Math.floor(Date.now() / 1000);
    const result = await env.DB.prepare(
      'INSERT INTO listings (user_id, seller_name, seller_contact, seller_store, card_id, card_name, set_name, condition, language, price, image_uri, notes, status, session_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
      body.price,
      body.image_uri || '',
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
      'UPDATE listings SET status = ?, price = COALESCE(?, price), notes = COALESCE(?, notes), updated_at = ? WHERE id = ? AND user_id = ?'
    ).bind(body.status || 'active', body.price || null, body.notes || null, now, id, auth.userId).run();

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

    // Also fetch their listings
    const listings = await env.DB.prepare(
      `SELECT * FROM listings WHERE ${scopeClause} ORDER BY created_at DESC`
    ).bind(scopeValue).all();

    const resp = json({ registered: true, seller, listings: listings.results }, 200, request);
    return !auth && isNew ? withSessionCookie(resp, token) : resp;
  }

  if (method === 'POST') {
    if (!auth) return json({ error: 'Authentication required' }, 401, request);

    const body = await request.json().catch(() => null);
    if (!body || !body.name) return json({ error: 'name required' }, 400, request);

    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      'INSERT OR REPLACE INTO sellers (user_id, session_token, name, contact, store_affiliation, bio, registered_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(auth.userId, null, body.name, body.contact || '', body.store_affiliation || '', body.bio || '', now).run();

    return json({ success: true, message: 'Seller registered' }, 201, request);
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
  return json({ events: rows.results }, 200, request);
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
   EXISTING PROXY ROUTES (unchanged)
   ══════════════════════════════════════ */

async function handleJustTCG(request, env) {
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
    headers: { 'Content-Type': request.headers.get('Content-Type') || 'application/json', 'Accept': request.headers.get('Accept') || 'application/json' },
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
    await env.DB.prepare('SELECT 1').first();
    return json({ status: 'ok', db: 'connected', version: '3.0.0' }, 200, request);
  } catch (e) {
    return json({ status: 'error', db: 'disconnected', error: e.message }, 500, request);
  }
}

/* ══════════════════════════════════════
   MAIN ROUTER
   ══════════════════════════════════════ */

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return handleOptions(request);

    // Rate limit by IP (general)
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (isRateLimited('api:' + ip, RATE_MAX_API)) {
      return json({ error: 'Rate limit exceeded' }, 429, request);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
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
      if (path.startsWith('/api/card/'))                    return handleCardDetail(request, env, path.replace('/api/card/', ''));
      if (path.startsWith('/api/movers'))                   return handleMovers(request, env, path.split('/').pop() || 'valuable');
      if (path.startsWith('/api/portfolio'))                return handlePortfolio(request, env);
      if (path.startsWith('/api/listings'))                 return handleListings(request, env);
      if (path.startsWith('/api/sellers'))                  return handleSellers(request, env);
      if (path === '/api/stores')                           return handleStores(request, env);
      if (path === '/api/events')                           return handleEvents(request, env);
      if (path.startsWith('/api/cart'))                     return handleCart(request, env);

      // Existing proxy routes (preserved)
      if (path === '/justtcg' || path.startsWith('/justtcg'))  return handleJustTCG(request, env);
      if (path.startsWith('/topdeck'))                         return handleTopDeck(request, env);
      if (path === '/chatbot')                                 return handleChatbot(request);
      if (url.searchParams.has('target'))                      return handleGenericProxy(request);

      return json({ error: 'Not found', routes: '/api/health for status' }, 404, request);
    } catch (e) {
      console.error('Worker error:', e.message, e.stack);
      return json({ error: 'Internal error', detail: e.message }, 500, request);
    }
  },
};
