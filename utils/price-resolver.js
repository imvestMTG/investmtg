/* price-resolver.js — Multi-source pricing waterfall
 *
 * Priority: JustTCG → EchoMTG → Scryfall (fallback, always available)
 *
 * Design:
 *   - resolvePrice(card)            → Promise<resolved>
 *   - resolveBatchPrices(cards)     → Promise<Map<cardId, resolved>>
 *   - usePriceResolver(card)        → React hook { resolved, loading }
 *   - useBatchPriceResolver(cards)  → React hook { priceMap, loading }
 *   - getBestPrice(card, priceMap)  → number (sync, for render)
 *   - getPriceSourceLabel(entry)    → string
 *   - formatPriceChange(val)        → string|null
 *
 * Scryfall prices ship with every card object (free). JustTCG/EchoMTG are
 * fetched asynchronously and overlaid. Components render Scryfall instantly,
 * then upgrade to JustTCG when the data arrives.
 *
 * RULES: var-only, no arrows, function keyword, no destructuring (investmtg-code).
 */

import React from 'react';
import { getJustTCGPricing, batchJustTCGPricing } from './justtcg-api.js';
import { getGradingPrices } from './echomtg-api.js';

/* ── In-memory resolved-price cache (capped to prevent memory leaks) ── */
var resolvedCache = {};
var resolvedCacheCount = 0;
var CACHE_TTL = 10 * 60 * 1000; // 10 min
var CACHE_MAX = 200; // max entries before evicting oldest

function getCached(key) {
  var entry = resolvedCache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCacheEntry(key, data) {
  if (!resolvedCache[key]) resolvedCacheCount++;
  resolvedCache[key] = { data: data, ts: Date.now() };
  /* Evict oldest entries when cache exceeds limit */
  if (resolvedCacheCount > CACHE_MAX) {
    var keys = Object.keys(resolvedCache);
    keys.sort(function(a, b) { return resolvedCache[a].ts - resolvedCache[b].ts; });
    var toRemove = Math.floor(CACHE_MAX * 0.25); // remove 25% oldest
    for (var i = 0; i < toRemove && i < keys.length; i++) {
      delete resolvedCache[keys[i]];
      resolvedCacheCount--;
    }
  }
}

/* ── Extract Scryfall baseline (synchronous, always available) ── */
function scryfallBaseline(card) {
  if (!card) return { price: 0, foil: null, source: 'none', change7d: null, change30d: null, change90d: null, conditions: null, grading: null };
  var usd = card.prices ? parseFloat(card.prices.usd) || 0 : (parseFloat(card.price_usd) || 0);
  var foil = card.prices ? parseFloat(card.prices.usd_foil) || null : (parseFloat(card.price_usd_foil) || null);
  return {
    price: usd || (foil || 0),
    foil: foil,
    source: 'scryfall',
    change7d: null,
    change30d: null,
    change90d: null,
    conditions: null,
    grading: null,
    priceHistory: [],
    allVariants: []
  };
}

/* Export baseline for synchronous use before async resolves */
export { scryfallBaseline };

/* ── Merge JustTCG data into a resolved entry ── */
function mergeJustTCG(resolved, jtcg) {
  if (!jtcg || jtcg.price == null || jtcg.price <= 0) return resolved;
  resolved.price = jtcg.price;
  resolved.source = 'justtcg';
  resolved.foil = jtcg.foilPrice || resolved.foil;
  resolved.change7d = jtcg.change7d;
  resolved.change30d = jtcg.change30d;
  resolved.change90d = jtcg.change90d;
  resolved.conditions = jtcg.conditionPrices || null;
  resolved.priceHistory = jtcg.priceHistory || [];
  resolved.allVariants = jtcg.allVariants || [];
  return resolved;
}

/* ── Single-card resolve (async waterfall) ── */
export function resolvePrice(card) {
  if (!card) return Promise.resolve(scryfallBaseline(null));
  var cardId = card.id || card.card_id;
  var cached = getCached('resolved:' + cardId);
  if (cached) return Promise.resolve(cached);

  var baseline = scryfallBaseline(card);

  /* Determine lookup IDs — Scryfall cards include tcgplayer_id */
  var tcgplayerId = card.tcgplayer_id || card.tcgplayerId || null;
  var setCode = card.set || card.set_code || '';
  var collectorNumber = card.collector_number || '';

  /* Try JustTCG first (has best condition + trend data).
   * JustTCG only accepts tcgplayerId — scryfallId lookups return NOT_FOUND. */
  var jtcgPromise;
  if (tcgplayerId) {
    jtcgPromise = getJustTCGPricing(tcgplayerId).catch(function() { return null; });
  } else {
    jtcgPromise = Promise.resolve(null);
  }

  /* Try EchoMTG for grading data */
  var echoPromise;
  if (setCode && collectorNumber) {
    echoPromise = getGradingPrices(setCode, collectorNumber).catch(function() { return null; });
  } else {
    echoPromise = Promise.resolve(null);
  }

  return Promise.all([jtcgPromise, echoPromise]).then(function(results) {
    var jtcg = results[0];
    var echo = results[1];

    var resolved = {
      price: baseline.price,
      foil: baseline.foil,
      source: 'scryfall',
      change7d: null,
      change30d: null,
      change90d: null,
      conditions: null,
      grading: null,
      priceHistory: [],
      allVariants: []
    };

    /* JustTCG overlay — best source for NM price + trends */
    mergeJustTCG(resolved, jtcg);

    /* EchoMTG overlay — grading data + buylist */
    if (echo) {
      resolved.grading = echo;
      /* If JustTCG failed, use EchoMTG tcg_market as price */
      if (resolved.source === 'scryfall' && echo.tcg_market && echo.tcg_market > 0) {
        resolved.price = echo.tcg_market;
        resolved.source = 'echomtg';
      }
    }

    setCacheEntry('resolved:' + cardId, resolved);
    return resolved;
  });
}

/* ── Batch resolve for grids/carousels ──
 * Uses JustTCG batch API for cards with tcgplayer_id (efficient).
 * Falls back to Scryfall baseline for cards without tcgplayer_id.
 * Does NOT call EchoMTG in batch (too many API calls for grids).
 */
export function resolveBatchPrices(cards) {
  if (!cards || cards.length === 0) return Promise.resolve({});

  var resultMap = {};
  var tcgIds = [];
  var tcgIdToCardId = {};

  /* Separate cached vs uncached, collect TCGplayer IDs */
  cards.forEach(function(card) {
    if (!card) return;
    var cardId = card.id || card.card_id;
    var cached = getCached('resolved:' + cardId);
    if (cached) {
      resultMap[cardId] = cached;
      return;
    }
    /* Set Scryfall baseline */
    resultMap[cardId] = scryfallBaseline(card);

    /* Collect TCGplayer IDs for batch fetch */
    var tcgId = card.tcgplayer_id || card.tcgplayerId;
    if (tcgId) {
      tcgIds.push(tcgId);
      tcgIdToCardId[String(tcgId)] = cardId;
    }
  });

  if (tcgIds.length === 0) {
    /* No TCGplayer IDs — cache baselines and return */
    Object.keys(resultMap).forEach(function(cid) {
      setCacheEntry('resolved:' + cid, resultMap[cid]);
    });
    return Promise.resolve(resultMap);
  }

  /* Batch JustTCG fetch (handles chunking internally, 20 per request) */
  return batchJustTCGPricing(tcgIds).then(function(jtcgResults) {
    if (Array.isArray(jtcgResults)) {
      for (var i = 0; i < jtcgResults.length; i++) {
        var jtcg = jtcgResults[i];
        if (!jtcg) continue;
        var tcgId = String(tcgIds[i]);
        var cardId = tcgIdToCardId[tcgId];
        if (!cardId || !resultMap[cardId]) continue;
        mergeJustTCG(resultMap[cardId], jtcg);
      }
    }
    /* Cache all resolved entries */
    Object.keys(resultMap).forEach(function(cid) {
      setCacheEntry('resolved:' + cid, resultMap[cid]);
    });
    return resultMap;
  }).catch(function() {
    /* JustTCG batch failed — return Scryfall baselines */
    Object.keys(resultMap).forEach(function(cid) {
      setCacheEntry('resolved:' + cid, resultMap[cid]);
    });
    return resultMap;
  });
}

/* ── React hook: single card ── */
export function usePriceResolver(card) {
  var ref1 = React.useState(function() { return scryfallBaseline(card); });
  var resolved = ref1[0], setResolvedState = ref1[1];
  var ref2 = React.useState(false);
  var loading = ref2[0], setLoading = ref2[1];

  var cardId = card ? (card.id || card.card_id) : null;

  React.useEffect(function() {
    if (!card || !cardId) return;
    /* Check cache synchronously */
    var cached = getCached('resolved:' + cardId);
    if (cached) {
      setResolvedState(cached);
      return;
    }
    setLoading(true);
    var cancelled = false;
    resolvePrice(card).then(function(result) {
      if (!cancelled) {
        setResolvedState(result);
        setLoading(false);
      }
    }).catch(function() {
      if (!cancelled) setLoading(false);
    });
    return function() { cancelled = true; };
  }, [cardId]);

  return { resolved: resolved, loading: loading };
}

/* ── React hook: batch for grids/carousels ── */
export function useBatchPriceResolver(cards) {
  var ref1 = React.useState({});
  var priceMap = ref1[0], setPriceMap = ref1[1];
  var ref2 = React.useState(false);
  var loading = ref2[0], setLoading = ref2[1];

  /* Create a stable key from card IDs to avoid re-fetching on every render */
  var cardIds = (cards || []).map(function(c) {
    return c ? (c.id || c.card_id || '') : '';
  }).join(',');

  React.useEffect(function() {
    if (!cards || cards.length === 0) return;
    setLoading(true);
    var cancelled = false;
    resolveBatchPrices(cards).then(function(map) {
      if (!cancelled) {
        setPriceMap(map);
        setLoading(false);
      }
    }).catch(function() {
      if (!cancelled) setLoading(false);
    });
    return function() { cancelled = true; };
  }, [cardIds]);

  return { priceMap: priceMap, loading: loading };
}

/* ── Utility: get best price from resolved map or raw card (sync) ── */
export function getBestPrice(card, resolvedMap) {
  if (!card) return 0;
  var cardId = card.id || card.card_id;
  if (resolvedMap && resolvedMap[cardId] && resolvedMap[cardId].price > 0) {
    return resolvedMap[cardId].price;
  }
  /* Fallback to Scryfall baseline */
  if (card.prices) {
    return parseFloat(card.prices.usd) || parseFloat(card.prices.usd_foil) || 0;
  }
  return parseFloat(card.price_usd) || 0;
}

/* ── Utility: get change data from resolved map ── */
export function getResolvedChange(card, resolvedMap) {
  if (!card || !resolvedMap) return null;
  var cardId = card.id || card.card_id;
  return resolvedMap[cardId] || null;
}

/* ── Utility: get source label for display ── */
export function getPriceSourceLabel(resolvedEntry) {
  if (!resolvedEntry) return 'Scryfall';
  var map = { justtcg: 'JustTCG', echomtg: 'EchoMTG', scryfall: 'Scryfall' };
  return map[resolvedEntry.source] || 'Scryfall';
}

/* ── Utility: format change percentage ── */
export function formatPriceChange(val) {
  if (val === null || val === undefined || isNaN(val)) return null;
  var pct = parseFloat(val);
  var prefix = pct > 0 ? '+' : '';
  return prefix + pct.toFixed(1) + '%';
}
