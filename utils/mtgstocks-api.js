/* mtgstocks-api.js — MTGStocks price history integration */
import { PROXY_BASE } from './config.js';
var h = React.createElement;

var cache = {};
var CACHE_TTL = 1000 * 60 * 60; // 1 hour in-memory

function getCached(key) {
  var entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  cache[key] = { data: data, ts: Date.now() };
}

/**
 * Fetch MTGStocks price history for a card.
 * @param {number|string} printId — MTGStocks print ID
 * @returns {Promise<{id, name, set_name, scryfallId, all_time_high, all_time_low, tcgplayer, prices}>}
 */
export function getMTGStocksPriceHistory(printId) {
  var cacheKey = 'mtgstocks:' + printId;
  var cached = getCached(cacheKey);
  if (cached) return Promise.resolve(cached);

  return fetch(PROXY_BASE + '/mtgstocks?print_id=' + encodeURIComponent(printId)).then(function(res) {
    if (!res.ok) throw new Error('MTGStocks fetch failed: ' + res.status);
    return res.json();
  }).then(function(data) {
    setCache(cacheKey, data);
    return data;
  });
}

/**
 * Search MTGStocks for a card by Scryfall ID (via the /prints endpoint embedded data).
 * Since MTGStocks doesn't have a search API, we need the print ID.
 * This function tries to find the MTGStocks print ID from a Scryfall card.
 */
export function findMTGStocksPrintId(scryfallId) {
  // MTGStocks embeds scryfallId in their print data.
  // We can try to find it by searching their site (limited).
  // For now, return null — we'll use the TCGPlayer ID mapping instead.
  return Promise.resolve(null);
}
