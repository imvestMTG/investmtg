/* CardDetailView.js — Card detail with real Scryfall pricing */
import React from 'react';
import { getCard } from '../utils/api.js';
import { formatUSD, getCardPrice, getScryfallImageUrl } from '../utils/helpers.js';
import { SkeletonCard } from './shared/SkeletonCard.js';
import { CartIcon, PortfolioIcon, StarIcon, ChevronLeftIcon } from './shared/Icons.js';
var h = React.createElement;

export function CardDetailView({ cardId, state, updateCart, updatePortfolio, updateWatchlist, onOpenListing }) {
  var ref1 = React.useState(null);
  var card = ref1[0], setCard = ref1[1];
  var ref2 = React.useState(true);
  var loading = ref2[0], setLoading = ref2[1];
  var ref3 = React.useState(null);
  var error = ref3[0], setError = ref3[1];

  React.useEffect(function() {
    if (!cardId) return;
    setLoading(true);
    setError(null);
    setCard(null);
    getCard(cardId).then(function(data) {
      setCard(data);
      setLoading(false);
    }).catch(function() {
      setError('Card not found.');
      setLoading(false);
    });
  }, [cardId]);

  function addToCart() {
    if (!card) return;
    var price = getCardPrice(card);
    var existing = state.cart.find(function(item) { return item.id === card.id; });
    if (existing) {
      updateCart(state.cart.map(function(item) {
        return item.id === card.id ? Object.assign({}, item, { qty: (item.qty || 1) + 1 }) : item;
      }));
    } else {
      updateCart(state.cart.concat([{ id: card.id, name: card.name, set: card.set_name, price: price, qty: 1, image: getScryfallImageUrl(card, 'small') }]));
    }
  }

  function addToPortfolio() {
    if (!card) return;
    var price = getCardPrice(card);
    var existing = state.portfolio.find(function(item) { return item.id === card.id; });
    if (!existing) {
      updatePortfolio(state.portfolio.concat([{ id: card.id, name: card.name, set: card.set_name, buyPrice: price, currentPrice: price, qty: 1, image: getScryfallImageUrl(card, 'small') }]));
    }
  }

  function toggleWatchlist() {
    if (!card) return;
    var inList = state.watchlist.some(function(item) { return item.id === card.id; });
    if (inList) {
      updateWatchlist(state.watchlist.filter(function(item) { return item.id !== card.id; }));
    } else {
      updateWatchlist(state.watchlist.concat([{ id: card.id, name: card.name, set: card.set_name }]));
    }
  }

  if (loading) return h('div', { className: 'container card-detail' },
    h('div', { className: 'card-detail-grid' },
      h('div', null, h('div', { className: 'skeleton skeleton-image' })),
      h('div', null,
        h('div', { className: 'skeleton skeleton-heading' }),
        [1,2,3].map(function(i) { return h('div', { key: i, className: 'skeleton skeleton-text' }); })
      )
    )
  );

  if (error) return h('div', { className: 'container card-detail' },
    h('div', { className: 'empty-state' }, h('p', null, error))
  );

  if (!card) return null;

  var price = getCardPrice(card);
  var inWatchlist = state.watchlist.some(function(item) { return item.id === card.id; });

  var priceBoxes = [
    { label: 'Market (USD)', value: formatUSD(price) },
    { label: 'Foil (USD)', value: card.prices && card.prices.usd_foil ? formatUSD(parseFloat(card.prices.usd_foil)) : 'N/A' },
    { label: 'EUR', value: card.prices && card.prices.eur ? '€' + parseFloat(card.prices.eur).toFixed(2) : 'N/A' },
  ];

  var legalities = Object.entries(card.legalities || {}).filter(function(entry) {
    return ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'commander', 'pauper'].indexOf(entry[0]) !== -1;
  });

  var scryfallUrl = card.scryfall_uri || ('https://scryfall.com/card/' + card.set + '/' + card.collector_number);
  var purchaseLinks = card.purchase_uris || {};

  return h('div', { className: 'container card-detail' },
    h('a', {
      className: 'back-link',
      onClick: function() { window.history.back(); },
      href: '#'
    }, h(ChevronLeftIcon, null), ' Back'),
    h('div', { className: 'card-detail-grid' },
      h('div', { className: 'card-detail-image' },
        h('img', {
          src: getScryfallImageUrl(card, 'normal'),
          alt: card.name,
          loading: 'lazy'
        })
      ),
      h('div', { className: 'card-detail-info' },
        h('h1', null, card.name),
        h('p', { className: 'card-detail-set' }, card.set_name, ' · ', card.rarity, ' · #', card.collector_number),
        h('div', { className: 'price-breakdown' },
          priceBoxes.map(function(p) {
            return h('div', { key: p.label, className: 'price-box' },
              h('div', { className: 'price-box-label' }, p.label),
              h('div', { className: 'price-box-value' }, p.value)
            );
          })
        ),
        h('p', { className: 'price-source' },
          'Prices from ',
          h('a', { href: scryfallUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Scryfall'),
          ' · Updated daily'
        ),
        h('div', { className: 'card-actions' },
          h('button', { className: 'btn btn-primary', onClick: addToCart },
            h(CartIcon, null), ' Add to Cart'
          ),
          h('button', { className: 'btn btn-secondary', onClick: addToPortfolio },
            h(PortfolioIcon, null), ' Track'
          ),
          h('button', {
            className: 'btn btn-ghost',
            onClick: toggleWatchlist,
            'aria-pressed': inWatchlist
          },
            h(StarIcon, null), inWatchlist ? ' Watching' : ' Watch'
          ),
          onOpenListing && h('button', {
            className: 'btn btn-secondary',
            onClick: function() { onOpenListing(card); }
          }, 'List on Market')
        ),

        /* Purchase Links */
        (purchaseLinks.tcgplayer || purchaseLinks.cardmarket)
          ? h('div', { className: 'purchase-links' },
              h('h3', null, 'Buy This Card'),
              h('div', { className: 'purchase-links-row' },
                purchaseLinks.tcgplayer && h('a', {
                  href: purchaseLinks.tcgplayer,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  className: 'btn btn-sm btn-ghost'
                }, 'TCGplayer'),
                purchaseLinks.cardmarket && h('a', {
                  href: purchaseLinks.cardmarket,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  className: 'btn btn-sm btn-ghost'
                }, 'Cardmarket')
              )
            )
          : null,

        h('div', { className: 'legality-grid' },
          legalities.map(function(entry) {
            return h('span', {
              key: entry[0],
              className: 'legality-badge ' + (entry[1] === 'legal' ? 'legality-legal' : 'legality-not-legal')
            }, entry[0]);
          })
        ),
        card.oracle_text && h('p', { style: { fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: '1.6', marginBottom: 'var(--space-4)' } },
          card.oracle_text
        )
      )
    )
  );
}
