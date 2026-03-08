/* CardDetailView.js — Card detail with backend pricing + other printings */
import React from 'react';
import { backendGetCard, getCardPrintings } from '../utils/api.js';
import { formatUSD, getCardPrice, getScryfallImageUrl } from '../utils/helpers.js';
import { SkeletonCard } from './shared/SkeletonCard.js';
import { PortfolioIcon, StarIcon, ChevronLeftIcon, ShoppingCartIcon } from './shared/Icons.js';
import { showToast } from './shared/Toast.js';
var h = React.createElement;

var SCRYFALL_BASE = 'https://api.scryfall.com';

export function CardDetailView(props) {
  var cardId = props.cardId;
  var state = props.state;
  var updateCart = props.updateCart;
  var updatePortfolio = props.updatePortfolio;
  var updateWatchlist = props.updateWatchlist;
  var onOpenListing = props.onOpenListing;

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

  /* ── Diagnostic: verify props on mount ── */
  React.useEffect(function() {
    if (typeof updateCart !== 'function' || typeof updatePortfolio !== 'function' || typeof updateWatchlist !== 'function') {
      console.warn('[investMTG] CardDetailView missing handler props:', {
        updateCart: typeof updateCart,
        updatePortfolio: typeof updatePortfolio,
        updateWatchlist: typeof updateWatchlist,
        onOpenListing: typeof onOpenListing
      });
    }
  }, []);

  React.useEffect(function() {
    if (!cardId) return;
    setLoading(true);
    setError(null);
    setCard(null);
    setPrintings([]);
    setShowAllPrintings(false);

    backendGetCard(cardId).then(function(data) {
      /* For cached D1 cards, oracle_id/purchase_uris/legalities may be absent.
       * Fall back to a direct Scryfall call to get the full card data. */
      if (data && !data.oracle_id) {
        var scryfallId = data.id || cardId;
        var scryfallUrl;
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scryfallId)) {
          scryfallUrl = SCRYFALL_BASE + '/cards/' + scryfallId;
        } else {
          scryfallUrl = SCRYFALL_BASE + '/cards/named?fuzzy=' + encodeURIComponent(decodeURIComponent(scryfallId));
        }
        return fetch(scryfallUrl).then(function(res) {
          if (!res.ok) return data; // fall back to backend data if Scryfall fails
          return res.json().then(function(fullCard) {
            /* Merge: prefer full Scryfall data but keep backend prices if present */
            return fullCard;
          });
        }).catch(function() {
          return data; // fall back to backend data on network error
        });
      }
      return data;
    }).then(function(data) {
      setCard(data);
      setLoading(false);

      // Fetch other printings via oracle_id
      if (data && data.oracle_id) {
        getCardPrintings(data.oracle_id).then(function(result) {
          if (result && result.data) {
            // Filter out digital-only printings
            var others = result.data.filter(function(c) {
              return !c.digital;
            });
            setPrintings(others);
          }
        }).catch(function(err) { console.warn('[CardDetail] printings fetch failed:', err); });
      }
    }).catch(function() {
      setError('Card not found.');
      setLoading(false);
    });
  }, [cardId]);

  function goToMarketplace() {
    window.location.hash = 'store';
  }

  function addToPortfolio() {
    try {
      if (!card) return;
      if (typeof updatePortfolio !== 'function') { showToast('Error: portfolio handler unavailable. Try refreshing.', 'error'); return; }
      var portfolio = Array.isArray(state.portfolio) ? state.portfolio : [];
      var price = getCardPrice(card);
      var existing = portfolio.find(function(item) { return item.id === card.id; });
      if (!existing) {
        updatePortfolio(portfolio.concat([{ id: card.id, name: card.name, set: card.set_name, buyPrice: price, currentPrice: price, qty: 1, image: getScryfallImageUrl(card, 'small') }]));
        showToast('Added to portfolio', 'success');
      } else {
        showToast('Already in portfolio', 'default');
      }
    } catch (err) {
      console.error('[investMTG] addToPortfolio error:', err);
      showToast('Failed to track — try refreshing.', 'error');
    }
  }

  function toggleWatchlist() {
    try {
      if (!card) return;
      if (typeof updateWatchlist !== 'function') { showToast('Error: watchlist handler unavailable. Try refreshing.', 'error'); return; }
      var watchlist = Array.isArray(state.watchlist) ? state.watchlist : [];
      var inList = watchlist.some(function(item) { return item.id === card.id; });
      if (inList) {
        updateWatchlist(watchlist.filter(function(item) { return item.id !== card.id; }));
        showToast('Removed from watchlist', 'default');
      } else {
        updateWatchlist(watchlist.concat([{ id: card.id, name: card.name, set: card.set_name }]));
        showToast('Added to watchlist', 'success');
      }
    } catch (err) {
      console.error('[investMTG] toggleWatchlist error:', err);
      showToast('Failed to update watchlist — try refreshing.', 'error');
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
          ' \u00B7 Updated daily \u00B7 ',
          h('a', { href: '#pricing', style: { color: 'inherit', textDecoration: 'underline' } }, 'How we source prices')
        ),

        h('div', { className: 'card-actions' },
          h('button', { className: 'btn btn-primary', onClick: goToMarketplace },
            h(ShoppingCartIcon, null), ' Find Sellers'
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
            onClick: function() {
              try {
                if (typeof onOpenListing !== 'function') { showToast('Error: listing handler unavailable. Try refreshing.', 'error'); return; }
                onOpenListing(card);
              } catch (err) {
                console.error('[investMTG] onOpenListing error:', err);
                showToast('Failed to open listing form \u2014 try refreshing.', 'error');
              }
            }
          }, 'Create Guam Listing')
        ),

        /* ── Purchase Links ── */
        purchaseLinks.tcgplayer
          ? h('div', { className: 'purchase-links' },
              h('h3', null, 'Market Reference'),
              h('div', { className: 'purchase-links-row' },
                h('a', {
                  href: purchaseLinks.tcgplayer,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  className: 'btn btn-sm btn-ghost'
                }, 'TCGplayer')
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
