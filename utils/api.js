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

export function searchCards(query) {
  return apiFetch(BASE + '/cards/search?q=' + encodeURIComponent(query) + '+has%3Ausd&order=usd&dir=desc');
}

export function searchCardsCheapest(query) {
  return apiFetch(BASE + '/cards/search?q=' + encodeURIComponent(query) + '+usd%3E0.01+has%3Ausd+-is%3Adigital&order=usd&dir=asc');
}

export function getNamedCard(name) {
  return apiFetch(BASE + '/cards/named?fuzzy=' + encodeURIComponent(name));
}

export function getCard(id) {
  return apiFetch(BASE + '/cards/' + id);
}

export function randomCard() {
  return apiFetch(BASE + '/cards/random?q=usd%3E0.5+has%3Aimage');
}

export function autocomplete(query) {
  return apiFetch(BASE + '/cards/autocomplete?q=' + encodeURIComponent(query));
}
