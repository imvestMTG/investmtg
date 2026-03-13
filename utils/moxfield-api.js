/* moxfield-api.js — Moxfield decklist integration (unofficial public API)
 * Routed through Cloudflare Worker CORS proxy since Moxfield blocks browser CORS.
 */
import { PROXY_BASE } from './config.js';

var PROXY_URL = PROXY_BASE;
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

/* ── Search popular decks by format from Moxfield ── */
export function searchMoxfieldDecks(format, count) {
  format = format || 'commander';
  count = count || 8;
  var cacheKey = 'mox-search-' + format + '-' + count;
  var cached = getCached(cacheKey);
  if (cached) return Promise.resolve(cached);

  var targetUrl = MOXFIELD_API + '/decks/search?fmt=' + encodeURIComponent(format)
    + '&pageNumber=1&pageSize=' + count
    + '&sortType=Views&sortDirection=Descending';
  var proxyUrl = PROXY_URL + '/?target=' + encodeURIComponent(targetUrl);

  return fetch(proxyUrl).then(function(res) {
    if (!res.ok) throw new Error('Moxfield search error: ' + res.status);
    return res.json();
  }).then(function(data) {
    var decks = (data.data || []).map(function(dk) {
      return {
        id: dk.publicId || dk.id,
        name: dk.name || 'Unknown Deck',
        format: dk.format || format,
        author: dk.createdByUser ? dk.createdByUser.userName : 'Unknown',
        viewCount: dk.viewCount || 0,
        likeCount: dk.likeCount || 0,
        mainboardCount: dk.mainboardCount || 0,
        colors: dk.colorIdentity || dk.colors || [],
        updatedAt: dk.lastUpdatedAtUtc || null,
        moxfieldUrl: 'https://www.moxfield.com/decks/' + (dk.publicId || dk.id)
      };
    });
    setCache(cacheKey, decks);
    return decks;
  }).catch(function(err) {
    console.warn('Moxfield search failed:', err.message);
    return [];
  });
}

/* ── Process raw Moxfield deck data into clean format ── */
function processDeck(data) {
  var mainboard = [];
  var commanders = [];
  var sideboard = [];
  var companion = [];
  var totalCards = 0;
  var totalPriceUsd = 0;

  function processBoard(board, arr) {
    if (!board) return;
    Object.keys(board).forEach(function(key) {
      var entry = board[key];
      var card = entry.card || {};
      var qty = entry.quantity || 1;
      var prices = card.prices || {};
      var priceUsd = prices.usd || 0;
      totalCards += qty;
      totalPriceUsd += priceUsd * qty;
      arr.push({
        name: card.name || key,
        quantity: qty,
        scryfallId: card.scryfall_id || null,
        type: card.type_line || card.type || '',
        manaCost: card.mana_cost || '',
        cmc: card.cmc || 0,
        priceUsd: priceUsd,
        priceUsdFoil: prices.usd_foil || 0,
        rarity: card.rarity || '',
        setCode: card.set || ''
      });
    });
  }

  processBoard(data.mainboard, mainboard);
  processBoard(data.commanders, commanders);
  processBoard(data.sideboard, sideboard);
  processBoard(data.companions, companion);

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
    totalPriceUsd: totalPriceUsd,
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

/* ── Curated popular decks — fallback if Moxfield search is down ── */
/* Updated 2026-03-13. Replace IDs if decks go private/deleted. */
var POPULAR_DECKS = [
  { id: 'nLF_Npu5wkyrthzysm0cEw', name: 'Dimir Midrange', format: 'standard' },
  { id: 'Izv2u85OyUqqa_54-jyIGA', name: 'Izzet Spellementals', format: 'standard' },
  { id: 'iJMdlEwcPkKnjG8sRAer1Q', name: 'Boros Mobilize', format: 'standard' },
  { id: 'YB8wVesOBEaCs_trx9ZGiw', name: 'Esper Goryo\'s V2', format: 'modern' },
  { id: 'fNVWuTplbU6rxeJA-jkMWQ', name: 'Boros Burn', format: 'modern' },
  { id: 'SnGxvDJIlEKLF8mvLkQSHw', name: 'Izzet Creativity', format: 'pioneer' },
  { id: 'amht9VwANE22Tbsd7nmWKA', name: 'Izzet Phoenix', format: 'pioneer' },
  { id: 'jfQkmstWTU-ucVSKHmqnEQ', name: 'Kinnan cEDH 2026', format: 'commander' },
  { id: 'oEWXWHM5eEGMmopExLWRCA', name: 'Commander Tier List [cEDH]', format: 'commander' },
];

export function getPopularDeckList() {
  return Promise.resolve(POPULAR_DECKS);
}
