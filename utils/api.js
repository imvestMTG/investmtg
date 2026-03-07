/* api.js — Scryfall API wrapper with rate limiting */
import { SCRYFALL_RATE_LIMIT_MS } from './config.js';

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
