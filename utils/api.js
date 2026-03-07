/* api.js — Scryfall API wrapper with rate limiting */

var lastRequestTime = 0;
var MIN_INTERVAL = 100;

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

// Search with unique=prints to show every printing/variant separately
export function searchCards(query, options) {
  var opts = options || {};
  var uniqueMode = opts.unique || 'prints';
  var order = opts.order || 'usd';
  var dir = opts.dir || 'desc';
  var url = BASE + '/cards/search?q=' + encodeURIComponent(query)
    + '&unique=' + uniqueMode
    + '&order=' + order
    + '&dir=' + dir;
  return apiFetch(url);
}

// Fetch additional pages of results
export function fetchPage(url) {
  return apiFetch(url);
}

export function getCard(id) {
  return apiFetch(BASE + '/cards/' + id);
}

// Get all printings of a card by oracle ID
export function getCardPrints(oracleId) {
  return apiFetch(BASE + '/cards/search?q=oracleid%3A' + encodeURIComponent(oracleId) + '&unique=prints&order=released&dir=desc');
}

export function randomCard() {
  return apiFetch(BASE + '/cards/random?q=usd%3E0.5+has%3Aimage');
}

export function autocomplete(query) {
  return apiFetch(BASE + '/cards/autocomplete?q=' + encodeURIComponent(query));
}

// Cache for set catalog
var setCache = null;
var setCacheTime = 0;
var SET_CACHE_TTL = 1000 * 60 * 60; // 1 hour

export function getSets() {
  var now = Date.now();
  if (setCache && (now - setCacheTime) < SET_CACHE_TTL) {
    return Promise.resolve(setCache);
  }
  return apiFetch(BASE + '/sets').then(function(data) {
    setCache = data.data || [];
    setCacheTime = Date.now();
    return setCache;
  });
}
