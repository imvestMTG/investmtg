/* Ticker.js — Live price ticker using real Scryfall data */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
var h = React.createElement;

var TICKER_CARD_NAMES = [
  'Black Lotus', 'Mox Pearl', 'Ancestral Recall', 'Time Walk',
  'Jace, the Mind Sculptor', 'Force of Will', 'Liliana of the Veil',
  'Snapcaster Mage', 'Dark Confidant', 'Tarmogoyf',
  'Ragavan, Nimble Pilferer', 'The One Ring', 'Doubling Season',
  'Mana Crypt', 'Wrenn and Six'
];

function fetchTickerPrices() {
  var cards = TICKER_CARD_NAMES.map(function(name) {
    var url = 'https://api.scryfall.com/cards/named?exact=' + encodeURIComponent(name);
    return fetch(url).then(function(r) {
      if (!r.ok) return null;
      return r.json();
    }).then(function(card) {
      if (!card) return null;
      var price = card.prices && (card.prices.usd || card.prices.usd_foil);
      return {
        name: card.name,
        price: price ? '$' + price : null
      };
    }).catch(function() { return null; });
  });
  return Promise.all(cards).then(function(results) {
    return results.filter(function(r) { return r && r.price; });
  });
}

export function Ticker() {
  var ref = React.useState([]);
  var items = ref[0], setItems = ref[1];
  var ref2 = React.useState(true);
  var loading = ref2[0], setLoading = ref2[1];

  React.useEffect(function() {
    var cancelled = false;
    fetchTickerPrices().then(function(data) {
      if (!cancelled && data.length > 0) {
        setItems(data);
      }
      setLoading(false);
    });
    // Refresh every 5 minutes
    var interval = setInterval(function() {
      fetchTickerPrices().then(function(data) {
        if (!cancelled && data.length > 0) {
          setItems(data);
        }
      });
    }, 300000);
    return function() { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading || items.length === 0) return null;

  var doubled = items.concat(items);
  return h('div', { className: 'ticker-strip', 'aria-hidden': 'true' },
    h('div', { className: 'ticker-track' },
      doubled.map(function(item, i) {
        return h('span', { key: i, className: 'ticker-item' },
          h('span', { className: 'ticker-name' }, item.name),
          h('span', { className: 'ticker-price' }, item.price)
        );
      })
    )
  );
}
