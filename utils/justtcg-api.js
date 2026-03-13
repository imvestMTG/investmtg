/* justtcg-api.js — JustTCG pricing API integration
 * API key is stored server-side in the CORS proxy worker.
 * All requests route through the proxy — no secrets in browser JS. */
import { PROXY_BASE as _PROXY } from './config.js';

var PROXY_BASE = _PROXY + '/justtcg';

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

/* ── Core fetch via proxy ── */
function jtcgFetch(queryParams) {
  var url = PROXY_BASE + '?path=/v1/cards';
  Object.keys(queryParams).forEach(function(key) {
    url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(queryParams[key]);
  });
  return fetch(url).then(function(res) {
    if (res.status === 429) throw new Error('JustTCG rate limit reached');
    if (!res.ok) throw new Error('JustTCG API error: ' + res.status);
    return res.json();
  });
}

function jtcgPost(body) {
  return fetch(PROXY_BASE + '?path=/v1/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(function(res) {
    if (res.status === 429) throw new Error('JustTCG rate limit reached');
    if (!res.ok) throw new Error('JustTCG API error: ' + res.status);
    return res.json();
  });
}

/* ── Get detailed pricing by TCGplayer ID or Scryfall ID ── */
export function getJustTCGPricing(tcgplayerId, opts) {
  var scryfallId = opts && opts.scryfallId;
  if (!tcgplayerId && !scryfallId) return Promise.resolve(null);
  var historyDuration = (opts && opts.historyDuration) || '30d';
  var lookupKey = tcgplayerId || ('sf-' + scryfallId);
  var cacheKey = 'jtcg-' + lookupKey + '-' + historyDuration;
  var cached = getCached(cacheKey);
  if (cached) return Promise.resolve(cached);

  var params = {
    include_price_history: 'true',
    priceHistoryDuration: historyDuration,
    include_statistics: '7d,30d,90d'
  };
  if (tcgplayerId) {
    params.tcgplayerId = tcgplayerId;
  } else {
    params.scryfallId = scryfallId;
  }

  return jtcgFetch(params).then(function(result) {
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

/* ── Batch lookup by TCGplayer IDs (up to 20 per request) ── */
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
    return jtcgPost(body).then(function(result) {
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

  return jtcgFetch({
    game: 'magic-the-gathering',
    orderBy: orderBy,
    limit: '10',
    min_price: '1',
    include_price_history: 'false',
    include_statistics: '7d,30d'
  }).then(function(result) {
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

  return jtcgFetch({
    game: 'magic-the-gathering',
    orderBy: orderBy,
    order: 'asc',
    limit: '10',
    min_price: '1',
    include_price_history: 'false',
    include_statistics: '7d,30d'
  }).then(function(result) {
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
  var change7d = refVariant && refVariant.priceChange7d != null ? refVariant.priceChange7d : null;
  var change30d = refVariant && refVariant.priceChange30d != null ? refVariant.priceChange30d : null;
  var change90d = refVariant && refVariant.priceChange90d != null ? refVariant.priceChange90d : null;

  // If main variant has no change data, try to find any variant with data
  if (change7d === null) {
    for (var vi = 0; vi < variants.length; vi++) {
      if (variants[vi].priceChange7d != null) {
        change7d = variants[vi].priceChange7d;
        break;
      }
    }
  }
  if (change30d === null) {
    for (var vj = 0; vj < variants.length; vj++) {
      if (variants[vj].priceChange30d != null) {
        change30d = variants[vj].priceChange30d;
        break;
      }
    }
  }

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
