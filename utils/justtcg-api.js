/* justtcg-api.js — JustTCG pricing API integration */

var JUSTTCG_KEY = 'tcg_3bc4059b01254581b2aa0f2516565595';
var JUSTTCG_BASE = 'https://api.justtcg.com/v1';

/* ── In-memory cache with TTL ── */
var jtcgCache = {};
var CACHE_TTL = 10 * 60 * 1000; // 10 min

function getCached(key) {
  var entry = jtcgCache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  jtcgCache[key] = { ts: Date.now(), data: data };
}

/* ── Core fetch with error handling ── */
function jtcgFetch(url) {
  return fetch(url, {
    headers: { 'x-api-key': JUSTTCG_KEY }
  }).then(function(res) {
    if (res.status === 429) throw new Error('JustTCG rate limit reached');
    if (!res.ok) throw new Error('JustTCG API error: ' + res.status);
    return res.json();
  });
}

function jtcgPost(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': JUSTTCG_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }).then(function(res) {
    if (res.status === 429) throw new Error('JustTCG rate limit reached');
    if (!res.ok) throw new Error('JustTCG API error: ' + res.status);
    return res.json();
  });
}

/* ── Get detailed pricing by TCGplayer ID ── */
export function getJustTCGPricing(tcgplayerId, opts) {
  if (!tcgplayerId) return Promise.resolve(null);
  var historyDuration = (opts && opts.historyDuration) || '30d';
  var cacheKey = 'jtcg-' + tcgplayerId + '-' + historyDuration;
  var cached = getCached(cacheKey);
  if (cached) return Promise.resolve(cached);

  var url = JUSTTCG_BASE + '/cards?tcgplayerId=' + encodeURIComponent(tcgplayerId) +
    '&include_price_history=true&priceHistoryDuration=' + historyDuration +
    '&include_statistics=7d,30d,90d';

  return jtcgFetch(url).then(function(result) {
    if (result && result.data && result.data.length > 0) {
      var card = result.data[0];
      var processed = processJustTCGCard(card);
      setCache(cacheKey, processed);
      return processed;
    }
    return null;
  }).catch(function(err) {
    console.warn('JustTCG fetch failed:', err.message);
    return null;
  });
}

/* ── Batch lookup by TCGplayer IDs (up to 20 on free tier) ── */
export function batchJustTCGPricing(tcgplayerIds) {
  if (!tcgplayerIds || tcgplayerIds.length === 0) return Promise.resolve([]);

  // Check cache first, only fetch uncached
  var results = {};
  var uncached = [];
  tcgplayerIds.forEach(function(id) {
    var cached = getCached('jtcg-' + id + '-7d');
    if (cached) {
      results[id] = cached;
    } else {
      uncached.push(id);
    }
  });

  if (uncached.length === 0) {
    return Promise.resolve(tcgplayerIds.map(function(id) { return results[id] || null; }));
  }

  // Batch up to 20 per request
  var batches = [];
  for (var i = 0; i < uncached.length; i += 20) {
    batches.push(uncached.slice(i, i + 20));
  }

  var fetches = batches.map(function(batch) {
    var body = batch.map(function(id) {
      return { tcgplayerId: String(id) };
    });
    return jtcgPost(JUSTTCG_BASE + '/cards', body).then(function(result) {
      if (result && result.data) {
        result.data.forEach(function(card) {
          var processed = processJustTCGCard(card);
          var tid = card.tcgplayerId;
          results[tid] = processed;
          setCache('jtcg-' + tid + '-7d', processed);
        });
      }
    }).catch(function(err) {
      console.warn('JustTCG batch failed:', err.message);
    });
  });

  return Promise.all(fetches).then(function() {
    return tcgplayerIds.map(function(id) { return results[id] || null; });
  });
}

/* ── Get trending MTG cards ── */
export function getTrendingCards(period) {
  var orderBy = period || '7d';
  var cacheKey = 'jtcg-trending-' + orderBy;
  var cached = getCached(cacheKey);
  if (cached) return Promise.resolve(cached);

  var url = JUSTTCG_BASE + '/cards?game=mtg&orderBy=' + orderBy +
    '&limit=10&min_price=1&include_price_history=false&include_statistics=7d,30d';

  return jtcgFetch(url).then(function(result) {
    if (result && result.data) {
      var processed = result.data.map(processJustTCGCard);
      setCache(cacheKey, processed);
      return processed;
    }
    return [];
  }).catch(function(err) {
    console.warn('JustTCG trending failed:', err.message);
    return [];
  });
}

/* ── Get worst performers (biggest drops) ── */
export function getBiggestDrops(period) {
  var orderBy = period || '7d';
  var cacheKey = 'jtcg-drops-' + orderBy;
  var cached = getCached(cacheKey);
  if (cached) return Promise.resolve(cached);

  var url = JUSTTCG_BASE + '/cards?game=mtg&orderBy=' + orderBy +
    '&order=asc&limit=10&min_price=1&include_price_history=false&include_statistics=7d,30d';

  return jtcgFetch(url).then(function(result) {
    if (result && result.data) {
      var processed = result.data.map(processJustTCGCard);
      setCache(cacheKey, processed);
      return processed;
    }
    return [];
  }).catch(function(err) {
    console.warn('JustTCG drops failed:', err.message);
    return [];
  });
}

/* ── Process a raw JustTCG card into a clean format ── */
function processJustTCGCard(card) {
  var variants = (card.variants || []);

  // Group by printing type
  var normalVariants = variants.filter(function(v) { return v.printing === 'Normal'; });
  var foilVariants = variants.filter(function(v) { return v.printing === 'Foil'; });

  // Find Near Mint Normal price (most common reference)
  var nmNormal = normalVariants.find(function(v) { return v.condition === 'Near Mint'; });
  var nmFoil = foilVariants.find(function(v) { return v.condition === 'Near Mint'; });

  // Best available NM price
  var bestPrice = nmNormal ? nmNormal.price : (normalVariants.length > 0 ? normalVariants[0].price : null);
  var foilPrice = nmFoil ? nmFoil.price : (foilVariants.length > 0 ? foilVariants[0].price : null);

  // Price changes from NM normal, fallback to any variant
  var refVariant = nmNormal || normalVariants[0] || variants[0];
  var change7d = refVariant ? refVariant.priceChange7d : null;
  var change30d = refVariant ? refVariant.priceChange30d : null;
  var change90d = refVariant ? refVariant.priceChange90d : null;

  // Price history from reference variant
  var priceHistory = refVariant && refVariant.priceHistory ? refVariant.priceHistory : [];

  // Build condition price map
  var conditionPrices = {};
  normalVariants.forEach(function(v) {
    conditionPrices[v.condition] = v.price;
  });

  return {
    id: card.id,
    name: card.name,
    set: card.set_name || card.set,
    setId: card.set,
    number: card.number,
    rarity: card.rarity,
    tcgplayerId: card.tcgplayerId,
    scryfallId: card.scryfallId,
    price: bestPrice,
    foilPrice: foilPrice,
    change7d: change7d,
    change30d: change30d,
    change90d: change90d,
    priceHistory: priceHistory,
    conditionPrices: conditionPrices,
    allVariants: variants.map(function(v) {
      return {
        condition: v.condition,
        printing: v.printing,
        price: v.price,
        change7d: v.priceChange7d,
        change30d: v.priceChange30d,
        lastUpdated: v.lastUpdated
      };
    }),
    source: 'justtcg'
  };
}
