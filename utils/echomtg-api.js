/**
 * EchoMTG API integration — condition-graded pricing + set-level market data
 *
 * All calls route through the Worker proxy at /echomtg to keep the API key server-side.
 * The Worker caches responses in KV (items: 24hr, sets: 30min).
 *
 * Available EchoMTG endpoints (via proxy):
 *   /echomtg?path=/api/data/item/&emid=267          — single card detail + grading prices
 *   /echomtg?path=/api/data/set/&set_code=ONE&limit=50 — set cards with price changes
 */

import { PROXY_BASE } from './config.js';

/* ─── In-memory cache ─── */
var echoCache = {};
var CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function cachedFetch(key, url) {
  var now = Date.now();
  if (echoCache[key] && (now - echoCache[key].ts) < CACHE_TTL) {
    return Promise.resolve(echoCache[key].data);
  }
  return fetch(url).then(function(res) {
    if (!res.ok) throw new Error('EchoMTG proxy error: ' + res.status);
    return res.json();
  }).then(function(data) {
    echoCache[key] = { data: data, ts: now };
    return data;
  });
}

/**
 * Get detailed card data by EchoMTG ID (emid).
 * Returns: { card_name, tcg_mid, tcg_low, tcg_market, change, gradingPrices, ... }
 */
export function getEchoCardByEmid(emid) {
  var url = PROXY_BASE + '/echomtg?path=/api/data/item/&emid=' + emid;
  return cachedFetch('item:' + emid, url).then(function(data) {
    if (data.status === 'error') return null;
    return data;
  });
}

/**
 * Get cards from a set with price change data.
 * Returns: { set: { name, items: [...] }, status, message }
 * Each item has: name, emid, tcgplayer_id, tcg_low, tcg_mid, price_change, ...
 */
export function getEchoSetCards(setCode, limit) {
  var lim = limit || 50;
  var url = PROXY_BASE + '/echomtg?path=/api/data/set/&set_code=' + setCode + '&limit=' + lim;
  return cachedFetch('set:' + setCode + ':' + lim, url).then(function(data) {
    if (!data || !data.set) return [];
    return data.set.items || [];
  });
}

/**
 * Look up a card's EchoMTG emid using set_code + collector_number.
 * Fetches the set, scans for a matching collector_number, returns the emid.
 * Returns null if not found.
 */
export function findEmidByCollector(setCode, collectorNumber) {
  return getEchoSetCards(setCode, 500).then(function(items) {
    for (var i = 0; i < items.length; i++) {
      if (String(items[i].collectors_number) === String(collectorNumber)) {
        return items[i].emid;
      }
    }
    return null;
  });
}

/**
 * Look up a card's EchoMTG emid using tcgplayer_id.
 * Fetches the set, scans for a matching tcgplayer_id, returns the emid.
 * Returns null if not found.
 */
export function findEmidByTcgplayerId(setCode, tcgplayerId) {
  return getEchoSetCards(setCode, 500).then(function(items) {
    for (var i = 0; i < items.length; i++) {
      if (String(items[i].tcgplayer_id) === String(tcgplayerId)) {
        return items[i].emid;
      }
    }
    return null;
  });
}

/**
 * Get grading prices for a card given set_code + collector_number.
 * This is the main function for CardDetailView — returns the full grading data.
 * Returns: { NM, LP, MP, HP, D, ... graded slab prices } or null if not found.
 */
export function getGradingPrices(setCode, collectorNumber) {
  return findEmidByCollector(setCode, collectorNumber).then(function(emid) {
    if (!emid) return null;
    return getEchoCardByEmid(emid).then(function(card) {
      if (!card || !card.gradingPrices) return null;
      return {
        regular: card.gradingPrices.regular || {},
        foil: card.gradingPrices.foil || {},
        tcg_mid: card.tcg_mid,
        tcg_low: card.tcg_low,
        tcg_market: card.tcg_market,
        change: card.change,
        buylist: card.buylist_assumption,
        emid: card.emid || card.id,
      };
    });
  });
}

/**
 * Get top movers from a set — cards sorted by absolute price change.
 * Used in MarketMoversView for the "EchoMTG Movers" section.
 * Returns array of { name, emid, price_change, tcg_mid, tcg_low, set, ... }
 */
export function getSetMovers(setCode, limit) {
  var lim = limit || 20;
  return getEchoSetCards(setCode, 200).then(function(items) {
    // Filter to cards with price data and sort by absolute change
    var withPrices = items.filter(function(c) {
      return c.price_change !== null && c.price_change !== undefined && c.price_change !== 0;
    });
    withPrices.sort(function(a, b) {
      return Math.abs(b.price_change) - Math.abs(a.price_change);
    });
    return withPrices.slice(0, lim);
  });
}

/**
 * Get gainers from a set — cards with positive price change.
 */
export function getSetGainers(setCode, limit) {
  var lim = limit || 10;
  return getEchoSetCards(setCode, 200).then(function(items) {
    var gainers = items.filter(function(c) {
      return c.price_change > 0;
    });
    gainers.sort(function(a, b) { return b.price_change - a.price_change; });
    return gainers.slice(0, lim);
  });
}

/**
 * Get losers from a set — cards with negative price change.
 */
export function getSetLosers(setCode, limit) {
  var lim = limit || 10;
  return getEchoSetCards(setCode, 200).then(function(items) {
    var losers = items.filter(function(c) {
      return c.price_change < 0;
    });
    losers.sort(function(a, b) { return a.price_change - b.price_change; });
    return losers.slice(0, lim);
  });
}
