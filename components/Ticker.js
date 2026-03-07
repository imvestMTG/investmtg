/* Ticker.js — Live price ticker using Scryfall API */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
var h = React.createElement;

var TICKER_CARDS = [
  'Black Lotus', 'Mox Pearl', 'Ancestral Recall', 'Time Walk',
  'Jace, the Mind Sculptor', 'Force of Will', 'Liliana of the Veil',
  'Snapcaster Mage', 'Dark Confidant', 'Tarmogoyf',
  'Ragavan, Nimble Pilferer', 'The One Ring', 'Doubling Season',
  'Mana Crypt', 'Wrenn and Six'
];

var CACHE_KEY = 'investmtg-ticker-cache';
var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function loadCache() {
  try {
    var raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    var cached = JSON.parse(raw);
    if (Date.now() - cached.ts > CACHE_TTL) return null;
    return cached.data;
  } catch (e) { return null; }
}

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
  } catch (e) { /* ignore */ }
}

function fetchTickerPrices() {
  var identifiers = TICKER_CARDS.map(function(name) { return { name: name }; });
  return fetch('https://api.scryfall.com/cards/collection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifiers: identifiers })
  }).then(function(res) {
    if (!res.ok) throw new Error('Scryfall error: ' + res.status);
    return res.json();
  }).then(function(json) {
    if (!json.data) return [];
    return json.data.filter(function(card) {
      // Exclude digital-only cards (MTGO, Arena)
      return !card.digital;
    }).map(function(card) {
      // Only use physical card USD prices, not MTGO tix
      var price = parseFloat(card.prices && card.prices.usd) || parseFloat(card.prices && card.prices.usd_foil) || 0;
      return {
        name: card.name,
        price: price
      };
    }).filter(function(item) { return item.price > 0; });
  });
}

export function Ticker() {
  var ref1 = React.useState([]);
  var items = ref1[0], setItems = ref1[1];

  React.useEffect(function() {
    var cancelled = false;

    // Try cache first for instant display
    var cached = loadCache();
    if (cached && cached.length > 0) {
      setItems(cached);
    }

    // Always fetch fresh data
    fetchTickerPrices().then(function(data) {
      if (!cancelled && data.length > 0) {
        setItems(data);
        saveCache(data);
      }
    }).catch(function() {
      // Keep cached data on error
    });

    // Refresh every 5 minutes
    var interval = setInterval(function() {
      fetchTickerPrices().then(function(data) {
        if (!cancelled && data.length > 0) {
          setItems(data);
          saveCache(data);
        }
      }).catch(function() {});
    }, CACHE_TTL);

    return function() {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (items.length === 0) return null;

  // Duplicate for seamless scroll animation
  var doubled = items.concat(items);

  return h('div', { className: 'ticker-strip', 'aria-hidden': 'true' },
    h('div', { className: 'ticker-track' },
      doubled.map(function(item, i) {
        return h('span', { key: i, className: 'ticker-item' },
          h('span', { className: 'ticker-name' }, item.name),
          h('span', { className: 'ticker-price' }, formatUSD(item.price))
        );
      })
    )
  );
}
