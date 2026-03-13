/* shared/CardGrid.js — Card grid with multi-source pricing waterfall */
import React from 'react';
import { formatUSD, getCardPrice, getCardImageSmall } from '../../utils/helpers.js';
import { useBatchPriceResolver, getBestPrice, getResolvedChange, formatPriceChange } from '../../utils/price-resolver.js';
var h = React.createElement;

export function CardGrid(props) {
  var cards = props.cards;
  var state = props.state;

  /* Batch-resolve prices: renders Scryfall instantly, upgrades to JustTCG async */
  var batchRef = useBatchPriceResolver(cards);
  var priceMap = batchRef.priceMap;

  if (!cards || cards.length === 0) {
    return h('div', { className: 'empty-state' },
      h('p', null, 'No cards found.')
    );
  }

  return h('div', { className: 'card-grid' },
    cards.map(function(card) {
      if (!card) return null;
      var price = getBestPrice(card, priceMap);
      var resolved = getResolvedChange(card, priceMap);
      var foilPrice = resolved && resolved.foil ? resolved.foil
        : (card.prices && card.prices.usd_foil ? parseFloat(card.prices.usd_foil) : null);
      var change7d = resolved ? resolved.change7d : null;
      var changeText = formatPriceChange(change7d);
      var changeClass = change7d > 0 ? 'pr-change-up' : change7d < 0 ? 'pr-change-down' : '';

      return h('article', {
        key: card.id,
        className: 'mtg-card',
        onClick: function() { window.location.hash = 'card/' + card.id; },
        role: 'button',
        tabIndex: 0,
        onKeyDown: function(e) { if (e.key === 'Enter') window.location.hash = 'card/' + card.id; },
        'aria-label': card.name + ', ' + (price > 0 ? formatUSD(price) : 'Price N/A')
      },
        h('div', { className: 'mtg-card-image' },
          h('img', {
            src: getCardImageSmall(card),
            alt: card.name,
            loading: 'lazy',
            decoding: 'async',
            onError: function(e) {
              e.target.style.opacity = '0';
            },
            onLoad: function(e) {
              e.target.style.opacity = '1';
            },
            style: { transition: 'opacity 0.3s ease' }
          })
        ),
        h('div', { className: 'mtg-card-info' },
          h('div', { className: 'mtg-card-name' }, card.name),
          h('div', { className: 'mtg-card-set' }, card.set_name),
          h('div', { className: 'mtg-card-price-row' },
            h('span', { className: 'mtg-card-price' }, price > 0 ? formatUSD(price) : 'N/A'),
            changeText
              ? h('span', { className: 'mtg-card-change ' + changeClass }, changeText)
              : null,
            foilPrice ? h('span', { className: 'mtg-card-foil' }, 'Foil: ' + formatUSD(foilPrice)) : null
          ),
          resolved && resolved.source !== 'scryfall' && resolved.source !== 'none'
            ? h('div', { className: 'mtg-card-source' }, resolved.source === 'justtcg' ? 'JustTCG' : 'EchoMTG')
            : null
        )
      );
    })
  );
}
