/* api.js — Scryfall API wrapper with rate limiting + backend proxy functions */
import { SCRYFALL_RATE_LIMIT_MS, PROXY_BASE } from './config.js';
import { storageGetRaw } from './storage.js';

var lastRequestTime = 0;
var MIN_INTERVAL = SCRYFALL_RATE_LIMIT_MS;

function rateLimit() {
  var now = Date.now();
  var elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL) {
    return new Promise(function(resolve) {
      setTimeout(resolve, MIN_INTERVAL - elapsed);
    });
  }
  return Promise.resolve();
}

function apiFetch(url) {
  return rateLimit().then(function() {
    lastRequestTime = Date.now();
    return fetch(url);
  }).then(function(res) {
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  });
}

var BASE = 'https://api.scryfall.com';

export function searchCards(query) {
  return apiFetch(BASE + '/cards/search?q=' + encodeURIComponent(query) + '+-is%3Adigital+has%3Ausd&order=usd&dir=desc');
}

export function searchCardsCheapest(query) {
  return apiFetch(BASE + '/cards/search?q=' + encodeURIComponent(query) + '+usd%3E0.01+has%3Ausd+-is%3Adigital&order=usd&dir=asc');
}

export function getNamedCard(name) {
  return apiFetch(BASE + '/cards/named?fuzzy=' + encodeURIComponent(name));
}

export function getCard(id) {
  /* If id looks like a Scryfall UUID (8-4-4-4-12 hex), use direct lookup.
   * Otherwise treat as card name and use named lookup. */
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return apiFetch(BASE + '/cards/' + id);
  }
  return apiFetch(BASE + '/cards/named?fuzzy=' + encodeURIComponent(decodeURIComponent(id)));
}

export function randomCard() {
  return apiFetch(BASE + '/cards/random?q=usd%3E0.5+has%3Aimage+-is%3Adigital');
}

export function autocomplete(query) {
  return apiFetch(BASE + '/cards/autocomplete?q=' + encodeURIComponent(query));
}

export function getCardPrintings(oracleId) {
  return apiFetch(BASE + '/cards/search?order=released&dir=desc&unique=prints&q=oracleid%3A' + encodeURIComponent(oracleId) + '+-is%3Adigital');
}

export function searchSet(setCode) {
  return apiFetch(BASE + '/cards/search?order=collector_number&dir=asc&q=e%3A' + encodeURIComponent(setCode) + '+-is%3Adigital+has%3Ausd');
}

export { apiFetch as scryfallFetch };

export function fetchCollection(identifiers) {
  return rateLimit().then(function() {
    lastRequestTime = Date.now();
    return fetch(BASE + '/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: identifiers })
    });
  }).then(function(res) {
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  });
}

/* ─────────────────────────────────────────────────────────────────────────
 * BACKEND PROXY FUNCTIONS
 * All calls go through PROXY_BASE with credentials: 'include' for sessions.
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Convert D1 flat card shape to Scryfall-compatible shape.
 * If the card already has Scryfall shape (prices or image_uris present),
 * it is returned as-is.
 */
export function normalizeCard(card) {
  if (!card) return card;
  // Already Scryfall shape
  if (card.prices || card.image_uris) return card;
  // D1 flat shape → Scryfall shape
  return {
    id: card.card_id || card.id,
    name: card.name,
    set: card.set_code,
    set_name: card.set_name,
    collector_number: card.collector_number,
    rarity: card.rarity,
    mana_cost: card.mana_cost,
    type_line: card.type_line,
    oracle_text: card.oracle_text || '',
    colors: typeof card.colors === 'string' ? (function() { try { return JSON.parse(card.colors); } catch(e) { return []; } })() : (card.colors || []),
    prices: {
      usd: card.price_usd != null ? String(card.price_usd) : null,
      usd_foil: card.price_usd_foil != null ? String(card.price_usd_foil) : null,
      eur: card.price_eur != null ? String(card.price_eur) : null
    },
    image_uris: {
      small: card.image_small || '',
      normal: card.image_normal || '',
      large: card.image_large || ''
    },
    scryfall_uri: card.scryfall_uri || '',
    updated_at: card.updated_at
  };
}

/**
 * Generic fetch helper for all backend proxy endpoints.
 * Automatically includes credentials for session-cookie auth.
 */
export function backendFetch(path, options) {
  var opts = options || {};
  opts.credentials = 'include';
  // Include auth token from storage for cross-site requests
  var token = storageGetRaw('investmtg_auth_token', null);
  if (token) {
    opts.headers = opts.headers || {};
    if (!opts.headers['Authorization']) {
      opts.headers['Authorization'] = 'Bearer ' + token;
    }
  }
  return fetch(PROXY_BASE + path, opts).then(function(res) {
    if (!res.ok) throw new Error('Backend error: ' + res.status);
    return res.json();
  });
}

/* ── Card list endpoints ───────────────────────────────────────────────── */

/** GET /api/ticker — returns array of { name, price } objects */
export function fetchTicker() {
  return backendFetch('/api/ticker').then(function(data) {
    var cards = Array.isArray(data) ? data : (data.cards || []);
    return cards.map(function(card) {
      var normalized = normalizeCard(card);
      var price = parseFloat(normalized.prices && normalized.prices.usd) ||
                  parseFloat(normalized.prices && normalized.prices.usd_foil) || 0;
      return { name: normalized.name, price: price };
    }).filter(function(item) { return item.price > 0; });
  });
}

/** GET /api/featured — returns array of normalized cards */
export function fetchFeatured() {
  return backendFetch('/api/featured').then(function(data) {
    var cards = Array.isArray(data) ? data : (data.cards || []);
    return cards.map(normalizeCard);
  });
}

/** GET /api/trending — returns array of normalized cards */
export function fetchTrending() {
  return backendFetch('/api/trending').then(function(data) {
    var cards = Array.isArray(data) ? data : (data.cards || []);
    return cards.map(normalizeCard);
  });
}

/** GET /api/budget — returns array of normalized cards */
export function fetchBudget() {
  return backendFetch('/api/budget').then(function(data) {
    var cards = Array.isArray(data) ? data : (data.cards || []);
    return cards.map(normalizeCard);
  });
}

/** GET /api/movers/:category — returns array of normalized cards */
export function fetchMovers(category) {
  return backendFetch('/api/movers/' + encodeURIComponent(category)).then(function(data) {
    var cards = Array.isArray(data) ? data : (data.cards || []);
    return cards.map(normalizeCard);
  });
}

/* ── Search / card detail ──────────────────────────────────────────────── */

/**
 * GET /api/search?q=...&order=...&dir=...&page=...
 * Returns raw Scryfall response: { data: [...], total_cards, has_more }
 */
export function backendSearch(q, opts) {
  var options = opts || {};
  var params = '?q=' + encodeURIComponent(q);
  if (options.order) params += '&order=' + encodeURIComponent(options.order);
  if (options.dir)   params += '&dir='   + encodeURIComponent(options.dir);
  if (options.page)  params += '&page='  + encodeURIComponent(options.page);
  return backendFetch('/api/search' + params);
}

/**
 * GET /api/card/:id — normalize if the response is D1 flat shape
 */
export function backendGetCard(id) {
  return backendFetch('/api/card/' + encodeURIComponent(id)).then(function(data) {
    return normalizeCard(data);
  });
}

/* ── Stores & Events ───────────────────────────────────────────────────── */

/**
 * GET /api/stores — returns stores array.
 * The backend returns tags as a JSON string; we parse it here.
 */
export function fetchStores() {
  return backendFetch('/api/stores').then(function(data) {
    var stores = data.stores || data || [];
    return stores.map(function(store) {
      var s = Object.assign({}, store);
      if (typeof s.tags === 'string') {
        try { s.tags = JSON.parse(s.tags); } catch (e) { s.tags = []; }
      }
      return s;
    });
  });
}

/**
 * GET /api/events — returns events array.
 * The backend returns tags as a JSON string; we parse it here.
 */
export function fetchEvents() {
  return backendFetch('/api/events').then(function(data) {
    var events = data.events || data || [];
    return events.map(function(evt) {
      var e = Object.assign({}, evt);
      if (typeof e.tags === 'string') {
        try { e.tags = JSON.parse(e.tags); } catch (e2) { e.tags = []; }
      }
      return e;
    });
  });
}

/* ── Portfolio CRUD ────────────────────────────────────────────────────── */

/** GET /api/portfolio — { items: [...], session: "..." } */
export function fetchPortfolio() {
  return backendFetch('/api/portfolio');
}

/** POST /api/portfolio — { card_id, card_name, quantity, added_price } */
export function addToPortfolioAPI(data) {
  return backendFetch('/api/portfolio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

/** DELETE /api/portfolio/:card_id */
export function removeFromPortfolioAPI(cardId) {
  return backendFetch('/api/portfolio/' + encodeURIComponent(cardId), {
    method: 'DELETE'
  });
}

/* ── Listings CRUD ─────────────────────────────────────────────────────── */

/**
 * GET /api/listings?status=...&q=...&condition=...&sort=...&limit=...&offset=...
 * Returns { listings: [...], total, limit, offset }
 */
export function fetchListings(params) {
  var p = params || {};
  var qs = '?';
  var parts = [];
  if (p.status)    parts.push('status='    + encodeURIComponent(p.status));
  if (p.q)         parts.push('q='         + encodeURIComponent(p.q));
  if (p.condition) parts.push('condition=' + encodeURIComponent(p.condition));
  if (p.sort)      parts.push('sort='      + encodeURIComponent(p.sort));
  if (p.limit)     parts.push('limit='     + encodeURIComponent(p.limit));
  if (p.offset)    parts.push('offset='    + encodeURIComponent(p.offset));
  qs = parts.length ? '?' + parts.join('&') : '';
  return backendFetch('/api/listings' + qs);
}

/**
 * POST /api/listings
 * { card_name, price, condition, seller_name, seller_contact?,
 *   card_id?, set_name?, language?, image_uri?, notes? }
 */
export function createListing(data) {
  return backendFetch('/api/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

/** PUT /api/listings/:id — { status?, price?, notes? } */
export function updateListing(id, data) {
  return backendFetch('/api/listings/' + encodeURIComponent(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

/** DELETE /api/listings/:id — soft delete (sets status='removed') */
export function deleteListing(id) {
  return backendFetch('/api/listings/' + encodeURIComponent(id), {
    method: 'DELETE'
  });
}

/* ── Sellers ───────────────────────────────────────────────────────────── */

/** GET /api/sellers — { registered: bool, seller?: {...}, listings?: [...] } */
export function fetchSeller() {
  return backendFetch('/api/sellers');
}

/** POST /api/sellers — { name, contact?, store_affiliation?, bio? } */
export function registerSeller(data) {
  return backendFetch('/api/sellers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

/* ── Cart ──────────────────────────────────────────────────────────────── */

/** GET /api/cart — { items: [...] } */
export function fetchCart() {
  return backendFetch('/api/cart');
}

/** POST /api/cart — { listing_id, quantity? } */
export function addToCartAPI(data) {
  return backendFetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

/** DELETE /api/cart/:listing_id */
export function removeFromCartAPI(listingId) {
  return backendFetch('/api/cart/' + encodeURIComponent(listingId), {
    method: 'DELETE'
  });
}

/** DELETE /api/cart — clear entire cart */
export function clearCartAPI() {
  return backendFetch('/api/cart', {
    method: 'DELETE'
  });
}

/* ── JustTCG Condition Pricing ────────────────────────────────────────── */

/**
 * Fetch real-time condition-specific prices from JustTCG via the proxy.
 * Returns a map: { NM: 918.31, LP: 796.27, MP: 724.39, HP: 631.95 }
 * or {} if the card isn't found or the API errors.
 *
 * @param {string} scryfallId — Scryfall UUID (e.g. "1f35877c-e66c-...")
 */
export function fetchConditionPrices(scryfallId) {
  if (!scryfallId) return Promise.resolve({});
  var qs = '?path=/v1/cards'
    + '&scryfallId=' + encodeURIComponent(scryfallId)
    + '&condition=NM,LP,MP,HP'
    + '&include_price_history=false'
    + '&include_statistics=';
  return fetch(PROXY_BASE + '/justtcg' + qs)
    .then(function(res) {
      if (!res.ok) throw new Error('JustTCG error: ' + res.status);
      return res.json();
    })
    .then(function(json) {
      var prices = {};
      var cards = json.data || [];
      if (cards.length === 0) return prices;
      var variants = cards[0].variants || [];
      variants.forEach(function(v) {
        if (typeof v.price !== 'number') return;
        /* Map JustTCG condition names to our short codes */
        if (v.condition === 'Near Mint')          prices.NM = v.price;
        else if (v.condition === 'Lightly Played')  prices.LP = v.price;
        else if (v.condition === 'Moderately Played') prices.MP = v.price;
        else if (v.condition === 'Heavily Played')  prices.HP = v.price;
      });
      return prices;
    })
    .catch(function(err) {
      console.warn('[investMTG] JustTCG price fetch failed:', err.message);
      return {};
    });
}
