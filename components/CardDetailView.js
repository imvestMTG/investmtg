/* CardDetailView.js — Card detail with Scryfall pricing + other printings */
import React from 'react';
import { getCard, getCardPrintings } from '../utils/api.js';
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
  var ref4 = React.useState([]);
  var printings = ref4[0], setPrintings = ref4[1];
  var ref5 = React.useState(false);
  var showAllPrintings = ref5[0], setShowAllPrintings = ref5[1];

  React.useEffect(function() {
    if (!cardId) return;
    setLoading(true);
    setError(null);
    setCard(null);
    setPrintings([]);
    setShowAllPrintings(false);
    getCard(cardId).then(function(data) {
      setCard(data);
      setLoading(false);

      // Fetch other printings via oracle_id
      if (data && data.oracle_id) {
        getCardPrintings(data.oracle_id).then(function(result) {
          if (result && result.data) {
            // Filter out the current card and digital-only
            var others = result.data.filter(function(c) {
              return !c.digital;
            });
            setPrintings(others);
          }
        }).catch(function() {});
      }
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
      updateCart(state.cart.concat([{
        id: card.id,
        name: card.name,
        set: card.set_name,
        setCode: card.set,
        price: price,
        qty: 1,
        image: getScryfallImageUrl(card, 'small'),
        tcgplayerId: card.tcgplayer_id || null
      }]));
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
    { label: 'Market', value: formatUSD(price) },
    { label: 'Foil', value: card.prices && card.prices.usd_foil ? formatUSD(parseFloat(card.prices.usd_foil)) : 'N/A' },
  ];

  var legalities = Object.entries(card.legalities || {}).filter(function(entry) {
    return ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'commander', 'pauper'].indexOf(entry[0]) !== -1;
  });

  var scryfallUrl = card.scryfall_uri || ('https://scryfall.com/card/' + card.set + '/' + card.collector_number);
  var purchaseLinks = card.purchase_uris || {};

  // Other printings (excluding current)
  var otherPrintings = printings.filter(function(p) { return p.id !== card.id; });
  var visiblePrintings = showAllPrintings ? otherPrintings : otherPrintings.slice(0, 6);

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

        /* ── Set name as clickable link ── */
        h('p', { className: 'card-detail-set' },
          h('a', {
            href: '#search',
            className: 'set-link',
            onClick: function(e) {
              e.preventDefault();
              window.location.hash = 'search';
              setTimeout(function() {
                var ev = new CustomEvent('investmtg-search', { detail: 'e:' + card.set });
                window.dispatchEvent(ev);
              }, 50);
            }
          }, card.set_name),
          ' \u00B7 ', card.rarity, ' \u00B7 #', card.collector_number
        ),

        /* ── Scryfall Price Boxes ── */
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
          ' \u00B7 Updated daily'
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

        /* ── Purchase Links ── */
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

        /* ── Format Legality ── */
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
        ),

        /* ── Other Printings ── */
        otherPrintings.length > 0
          ? h('div', { className: 'other-printings' },
              h('h3', { className: 'other-printings-title' },
                'Other Printings',
                h('span', { className: 'other-printings-count' }, otherPrintings.length + ' versions')
              ),
              h('div', { className: 'printings-grid' },
                visiblePrintings.map(function(p) {
                  var pPrice = (p.prices && (parseFloat(p.prices.usd) || parseFloat(p.prices.usd_foil))) || 0;
                  var isCurrent = p.id === card.id;
                  return h('a', {
                    key: p.id,
                    href: '#card/' + p.id,
                    className: 'printing-card' + (isCurrent ? ' printing-current' : '')
                  },
                    h('div', { className: 'printing-img-wrap' },
                      h('img', {
                        src: getScryfallImageUrl(p, 'small'),
                        alt: p.set_name,
                        loading: 'lazy'
                      })
                    ),
                    h('div', { className: 'printing-info' },
                      h('div', { className: 'printing-set' }, p.set_name),
                      h('div', { className: 'printing-number' }, '#' + p.collector_number),
                      h('div', { className: 'printing-price' }, pPrice > 0 ? formatUSD(pPrice) : 'N/A')
                    )
                  );
                })
              ),
              otherPrintings.length > 6 && !showAllPrintings
                ? h('button', {
                    className: 'btn btn-ghost btn-sm printings-show-all',
                    onClick: function() { setShowAllPrintings(true); }
                  }, 'Show All ' + otherPrintings.length + ' Printings')
                : null
            )
          : null
      )
    )
  );
}
