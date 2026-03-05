/* shared/CardGrid.js */
import React from 'react';
import { formatUSD, getCardPrice, generateMockChange, getCardImageSmall } from '../../utils/helpers.js';
import { CartIcon, StarIcon } from './Icons.js';
var h = React.createElement;

export function CardGrid({ cards, state, updateCart, updatePortfolio, updateWatchlist, onOpenListing }) {
  if (!cards || cards.length === 0) {
    return h('div', { className: 'empty-state' },
      h('p', null, 'No cards found.')
    );
  }

  return h('div', { className: 'card-grid' },
    cards.map(function(card) {
      if (!card) return null;
      var price = getCardPrice(card);
      var change = generateMockChange();
      var inWatchlist = state && state.watchlist && state.watchlist.some(function(item) { return item.id === card.id; });

      return h('article', {
        key: card.id,
        className: 'mtg-card',
        onClick: function() { window.location.hash = 'card/' + card.id; },
        role: 'button',
        tabIndex: 0,
        onKeyDown: function(e) { if (e.key === 'Enter') window.location.hash = 'card/' + card.id; },
        'aria-label': card.name + ', ' + formatUSD(price)
      },
        h('div', { className: 'mtg-card-image' },
          h('img', {
            src: getCardImageSmall(card),
            alt: card.name,
            loading: 'lazy'
          })
        ),
        h('div', { className: 'mtg-card-info' },
          h('div', { className: 'mtg-card-name' }, card.name),
          h('div', { className: 'mtg-card-set' }, card.set_name),
          h('div', { className: 'mtg-card-price-row' },
            h('span', { className: 'mtg-card-price' }, formatUSD(price)),
            h('span', { className: 'mtg-card-change ' + (change >= 0 ? 'price-up' : 'price-down') },
              (change >= 0 ? '+' : '') + change + '%'
            )
          )
        )
      );
    })
  );
}
