/* Ticker.js */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
var h = React.createElement;

var TICKER_CARDS = [
  { name: 'Black Lotus', change: '+2.1%' },
  { name: 'Mox Pearl', change: '+1.8%' },
  { name: 'Ancestral Recall', change: '-0.5%' },
  { name: 'Time Walk', change: '+3.2%' },
  { name: 'Jace, the Mind Sculptor', change: '+0.9%' },
  { name: 'Force of Will', change: '-1.2%' },
  { name: 'Liliana of the Veil', change: '+2.7%' },
  { name: 'Snapcaster Mage', change: '+0.4%' },
  { name: 'Dark Confidant', change: '-0.8%' },
  { name: 'Tarmogoyf', change: '+1.1%' },
  { name: 'Ragavan, Nimble Pilferer', change: '+4.2%' },
  { name: 'The One Ring', change: '-2.1%' },
  { name: 'Doubling Season', change: '+1.5%' },
  { name: 'Mana Crypt', change: '+0.7%' },
  { name: 'Wrenn and Six', change: '-1.4%' },
];

export function Ticker() {
  var items = TICKER_CARDS.concat(TICKER_CARDS);
  return h('div', { className: 'ticker-strip', 'aria-hidden': 'true' },
    h('div', { className: 'ticker-track' },
      items.map(function(item, i) {
        var isUp = item.change.startsWith('+');
        return h('span', { key: i, className: 'ticker-item' },
          h('span', { className: 'ticker-name' }, item.name),
          h('span', { className: isUp ? 'up' : 'down' }, item.change)
        );
      })
    )
  );
}
