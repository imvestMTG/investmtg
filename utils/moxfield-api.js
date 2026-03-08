/* moxfield-api.js — Moxfield decklist integration (unofficial public API)
 * Routed through Cloudflare Worker CORS proxy since Moxfield blocks browser CORS.
 */

var PROXY_URL = 'https://investmtg-proxy.bloodshutdawn.workers.dev';
var MOXFIELD_API = 'https://api2.moxfield.com/v2';

/* ── Cache ── */
var moxCache = {};
var CACHE_TTL = 15 * 60 * 1000; // 15 min

function getCached(key) {
  var entry = moxCache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  moxCache[key] = { ts: Date.now(), data: data };
}

/* ── Fetch a specific public deck by URL or ID ── */
export function getMoxfieldDeck(deckIdOrUrl) {
  if (!deckIdOrUrl) return Promise.resolve(null);

  // Extract deck ID from URL if needed
  var deckId = deckIdOrUrl;
  if (deckIdOrUrl.indexOf('moxfield.com/decks/') !== -1) {
    deckId = deckIdOrUrl.split('moxfield.com/decks/')[1].split('/')[0].split('?')[0];
  }

  var cacheKey = 'mox-deck-' + deckId;
  var cached = getCached(cacheKey);
  if (cached) return Promise.resolve(cached);

  var targetUrl = MOXFIELD_API + '/decks/all/' + deckId;
  var proxyUrl = PROXY_URL + '/?target=' + encodeURIComponent(targetUrl);
  return fetch(proxyUrl).then(function(res) {
    if (!res.ok) throw new Error('Moxfield error: ' + res.status);
    return res.json();
  }).then(function(data) {
    var processed = processDeck(data);
    setCache(cacheKey, processed);
    return processed;
  }).catch(function(err) {
    console.warn('Moxfield deck fetch failed:', err.message);
    return null;
  });
}

/* ── Process raw Moxfield deck data into clean format ── */
function processDeck(data) {
  var mainboard = [];
  var commanders = [];
  var sideboard = [];
  var companion = [];
  var totalCards = 0;

  // Process mainboard
  if (data.mainboard) {
    Object.keys(data.mainboard).forEach(function(key) {
      var entry = data.mainboard[key];
      var card = entry.card || {};
      var qty = entry.quantity || 1;
      totalCards += qty;
      mainboard.push({
        name: card.name || key,
        quantity: qty,
        scryfallId: card.scryfall_id || null,
        type: card.type_line || card.type || '',
        manaCost: card.mana_cost || '',
        cmc: card.cmc || 0
      });
    });
  }

  // Process commanders
  if (data.commanders) {
    Object.keys(data.commanders).forEach(function(key) {
      var entry = data.commanders[key];
      var card = entry.card || {};
      commanders.push({
        name: card.name || key,
        quantity: entry.quantity || 1,
        scryfallId: card.scryfall_id || null,
        type: card.type_line || card.type || '',
        manaCost: card.mana_cost || ''
      });
    });
  }

  // Process sideboard
  if (data.sideboard) {
    Object.keys(data.sideboard).forEach(function(key) {
      var entry = data.sideboard[key];
      var card = entry.card || {};
      sideboard.push({
        name: card.name || key,
        quantity: entry.quantity || 1,
        scryfallId: card.scryfall_id || null,
        type: card.type_line || card.type || ''
      });
    });
  }

  // Process companion
  if (data.companions) {
    Object.keys(data.companions).forEach(function(key) {
      var entry = data.companions[key];
      var card = entry.card || {};
      companion.push({
        name: card.name || key,
        quantity: entry.quantity || 1,
        scryfallId: card.scryfall_id || null,
        type: card.type_line || card.type || ''
      });
    });
  }

  // Sort mainboard by type then name
  mainboard.sort(function(a, b) {
    var ta = getTypeCategory(a.type);
    var tb = getTypeCategory(b.type);
    if (ta !== tb) return ta - tb;
    return a.name.localeCompare(b.name);
  });

  return {
    id: data.publicId || data.id,
    name: data.name || 'Unknown Deck',
    format: data.format || 'unknown',
    description: data.description || '',
    author: data.createdByUser ? data.createdByUser.userName : 'Unknown',
    viewCount: data.viewCount || 0,
    likeCount: data.likeCount || 0,
    commentCount: data.commentCount || 0,
    createdAt: data.createdAtUtc || null,
    updatedAt: data.lastUpdatedAtUtc || null,
    mainboard: mainboard,
    commanders: commanders,
    sideboard: sideboard,
    companion: companion,
    totalCards: totalCards,
    colors: data.colors || [],
    moxfieldUrl: 'https://www.moxfield.com/decks/' + (data.publicId || data.id)
  };
}

/* ── Sort helper: category order ── */
function getTypeCategory(type) {
  if (!type) return 99;
  var t = type.toLowerCase();
  if (t.indexOf('creature') !== -1) return 1;
  if (t.indexOf('instant') !== -1) return 2;
  if (t.indexOf('sorcery') !== -1) return 3;
  if (t.indexOf('enchantment') !== -1) return 4;
  if (t.indexOf('artifact') !== -1) return 5;
  if (t.indexOf('planeswalker') !== -1) return 6;
  if (t.indexOf('land') !== -1) return 7;
  return 8;
}

/* ── Curated popular decks (since search endpoint is blocked) ── */
/* Popular decks — verified 2026-03-08. Replace IDs if decks go private/deleted. */
var POPULAR_DECKS = [
  { id: 'oEWXWHM5eEGMmopExLWRCA', name: 'Commander Tier List [cEDH]', format: 'commander' },
  { id: 'wAVaIwJLcES5Wo8HyHW0cQ', name: 'Nationals Azorius Control', format: 'standard' },
  { id: 'mqjvKOBtsEicQRa4MdtdLg', name: 'Standard Prowess', format: 'standard' },
  { id: 'UDgLae4ejUWdmOVAEcHw8Q', name: 'Creativity', format: 'modern' },
  { id: 'amht9VwANE22Tbsd7nmWKA', name: 'Izzet Phoenix', format: 'pioneer' },
];

export function getPopularDeckList() {
  return Promise.resolve(POPULAR_DECKS);
}
