/* CardDetailView.js — Card detail with multi-source pricing waterfall */
import React from 'react';
import { backendGetCard, getCardPrintings, addToPortfolioAPI, fetchLists, addListItem, fetchJustTCGDetail } from '../utils/api.js';
import { formatUSD, getCardPrice, getScryfallImageUrl, handleImageError } from '../utils/helpers.js';
import { usePriceResolver, getPriceSourceLabel, formatPriceChange } from '../utils/price-resolver.js';
import { SkeletonCard } from './shared/SkeletonCard.js';
import { PortfolioIcon, StarIcon, ChevronLeftIcon, ShoppingCartIcon } from './shared/Icons.js';
import { showToast } from './shared/Toast.js';
import { ShareButton } from './shared/ShareButton.js';
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
  var ref6 = React.useState('NM');
  var trackCondition = ref6[0], setTrackCondition = ref6[1];
  var ref7 = React.useState([]);
  var userLists = ref7[0], setUserLists = ref7[1];
  var ref8 = React.useState(false);
  var showAddToList = ref8[0], setShowAddToList = ref8[1];
  var ref9 = React.useState(null);
  var jtcgDetail = ref9[0], setJtcgDetail = ref9[1];
  var ref10 = React.useState(true);
  var jtcgLoading = ref10[0], setJtcgLoading = ref10[1];

  /* Multi-source price resolver (JustTCG → EchoMTG → Scryfall) */
  var priceRef = usePriceResolver(card);
  var resolved = priceRef.resolved;
  var echoGrading = resolved.grading;

  React.useEffect(function() {
    fetchLists().then(function(data) { setUserLists(data.lists || []); }).catch(function() {});
  }, []);

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

      // SEO: Update document title and meta for card pages
      if (data && data.name) {
        var price = data.prices ? (data.prices.usd || data.prices.usd_foil || '') : (data.price_usd || '');
        var setName = data.set_name || '';
        document.title = data.name + (setName ? ' (' + setName + ')' : '') + (price ? ' — $' + price : '') + ' | investMTG';
        var metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.setAttribute('content', data.name + (setName ? ' from ' + setName : '') + (price ? ' — $' + price + ' USD' : '') + '. View prices, printings, and buy locally on investMTG.');
        }
        var ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', data.name + (price ? ' — $' + price : '') + ' | investMTG');
        var ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', data.name + (setName ? ' from ' + setName : '') + (price ? '. Market price: $' + price : '') + '. Paper card prices on investMTG.');
        var ogImage = document.querySelector('meta[property="og:image"]');
        var cardImage = data.image_uris ? data.image_uris.normal : (data.image_normal || '');
        if (ogImage && cardImage) ogImage.setAttribute('content', cardImage);
      }

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

  /* Fetch JustTCG condition detail (rich data for sparklines/trends).
   * Uses tcgplayer_id — the only lookup key JustTCG accepts.
   * EchoMTG grading data is now handled by usePriceResolver above. */
  React.useEffect(function() {
    if (!card) { setJtcgDetail(null); setJtcgLoading(true); return; }
    var tcgId = card.tcgplayer_id || card.tcgplayerId;
    if (!tcgId) { setJtcgDetail(null); setJtcgLoading(false); return; }
    setJtcgLoading(true);
    fetchJustTCGDetail({ tcgplayerId: tcgId }).then(function(detail) {
      setJtcgDetail(detail);
      setJtcgLoading(false);
    }).catch(function() { setJtcgLoading(false); });
  }, [card && card.id]);

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
        updatePortfolio(portfolio.concat([{ id: card.id, name: card.name, set: card.set_name, buyPrice: price, currentPrice: price, qty: 1, image: getScryfallImageUrl(card, 'small'), condition: trackCondition }]));
        // Sync to D1 backend (fire-and-forget)
        addToPortfolioAPI({ card_id: card.id, card_name: card.name, quantity: 1, added_price: price, condition: trackCondition }).catch(function(err) {
          console.warn('[investMTG] Portfolio backend sync failed:', err.message);
        });
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

  /* Use resolved price from waterfall (JustTCG → EchoMTG → Scryfall) */
  var price = resolved.price > 0 ? resolved.price : getCardPrice(card);
  var foilPrice = resolved.foil || (card.prices && card.prices.usd_foil ? parseFloat(card.prices.usd_foil) : null);
  var sourceLabel = getPriceSourceLabel(resolved);
  var priceUnavailable = price <= 0;
  var inWatchlist = state.watchlist.some(function(item) { return item.id === card.id; });

  var priceBoxes = [
    { label: 'Market', value: priceUnavailable ? 'N/A' : formatUSD(price), sub: priceUnavailable ? 'No USD data' : (sourceLabel !== 'Scryfall' ? 'via ' + sourceLabel : null) },
    { label: 'Foil', value: foilPrice ? formatUSD(foilPrice) : 'N/A' },
  ];
  /* Add 7d change box if available */
  if (resolved.change7d != null) {
    priceBoxes.push({ label: '7d Change', value: formatPriceChange(resolved.change7d), changeVal: resolved.change7d });
  }

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
          loading: 'lazy',
          onError: function(e) { handleImageError(e, card.id, 'normal'); }
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

        /* ── Price Boxes (multi-source waterfall) ── */
        h('div', { className: 'price-breakdown' },
          priceBoxes.map(function(p) {
            var boxClass = 'price-box';
            if (p.changeVal != null) {
              boxClass += p.changeVal > 0 ? ' price-box--up' : p.changeVal < 0 ? ' price-box--down' : '';
            }
            return h('div', { key: p.label, className: boxClass },
              h('div', { className: 'price-box-label' }, p.label),
              h('div', { className: 'price-box-value' }, p.value),
              p.sub ? h('div', { className: 'price-box-sub' }, p.sub) : null
            );
          })
        ),

        h('p', { className: 'price-source' },
          'Prices from ',
          h('a', { href: 'https://justtcg.com', target: '_blank', rel: 'noopener noreferrer' }, 'JustTCG'),
          ' \u00B7 ',
          h('a', { href: 'https://www.echomtg.com', target: '_blank', rel: 'noopener noreferrer' }, 'EchoMTG'),
          ' \u00B7 ',
          h('a', { href: scryfallUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Scryfall'),
          ' \u00B7 ',
          h('a', { href: '#pricing', style: { color: 'inherit', textDecoration: 'underline' } }, 'How we source prices')
        ),

        /* ── JustTCG Condition Breakdown ── */
        h('div', { className: 'cd-jtcg-section' },
          h('h3', { className: 'cd-jtcg-title' }, 'Condition Prices'),
          jtcgLoading
            ? h('div', { className: 'cd-jtcg-loading' }, 'Loading condition data\u2026')
            : jtcgDetail && jtcgDetail.conditions
              ? h('div', { className: 'cd-jtcg-grid' },
                  ['NM', 'LP', 'MP', 'HP', 'DMG'].map(function(cond) {
                    var data = jtcgDetail.conditions[cond];
                    if (!data) return h('div', { key: cond, className: 'cd-cond-card cd-cond-na' },
                      h('div', { className: 'cd-cond-label' }, cond),
                      h('div', { className: 'cd-cond-price' }, 'N/A')
                    );
                    var change = data.change7d;
                    var changeClass = change > 0 ? 'cd-change-up' : change < 0 ? 'cd-change-down' : 'cd-change-flat';
                    var prefix = change > 0 ? '+' : '';
                    return h('div', { key: cond, className: 'cd-cond-card cond-badge-' + cond.toLowerCase() },
                      h('div', { className: 'cd-cond-label' }, cond),
                      h('div', { className: 'cd-cond-price' }, formatUSD(data.price)),
                      h('div', { className: 'cd-cond-change ' + changeClass }, prefix + change.toFixed(1) + '% 7d')
                    );
                  })
                )
              : h('div', { className: 'cd-jtcg-empty' }, 'Condition pricing not available for this card.'),

          /* Price trend stats */
          jtcgDetail && jtcgDetail.conditions && jtcgDetail.conditions.NM
            ? h('div', { className: 'cd-trend-row' },
                (function() {
                  var nm = jtcgDetail.conditions.NM;
                  var items = [
                    { label: '24h', val: nm.change24h },
                    { label: '7d', val: nm.change7d },
                    { label: '30d', val: nm.change30d },
                    { label: '90d', val: nm.change90d }
                  ];
                  return items.map(function(item) {
                    var cls = item.val > 0 ? 'cd-change-up' : item.val < 0 ? 'cd-change-down' : 'cd-change-flat';
                    var prefix = item.val > 0 ? '+' : '';
                    return h('div', { key: item.label, className: 'cd-trend-item' },
                      h('div', { className: 'cd-trend-label' }, item.label),
                      h('div', { className: 'cd-trend-val ' + cls }, prefix + item.val.toFixed(1) + '%')
                    );
                  });
                })()
              )
            : null,

          /* 30-day sparkline chart */
          jtcgDetail && jtcgDetail.conditions && jtcgDetail.conditions.NM && jtcgDetail.conditions.NM.history30d.length > 1
            ? (function() {
                var pts = jtcgDetail.conditions.NM.history30d;
                var prices = pts.map(function(p) { return p.p; });
                var minP = Math.min.apply(null, prices);
                var maxP = Math.max.apply(null, prices);
                var range = maxP - minP || 1;
                var w = 280;
                var ht = 60;
                var pathParts = prices.map(function(p, i) {
                  var x = (i / (prices.length - 1)) * w;
                  var y = ht - 4 - ((p - minP) / range) * (ht - 8);
                  return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
                });
                var color = prices[prices.length - 1] >= prices[0] ? 'var(--color-success, #22c55e)' : 'var(--color-error, #ef4444)';
                var nm = jtcgDetail.conditions.NM;
                return h('div', { className: 'cd-chart-wrap' },
                  h('div', { className: 'cd-chart-header' },
                    h('span', null, '30-Day NM Price Trend'),
                    h('span', { className: 'cd-chart-range' },
                      formatUSD(nm.min30d) + ' \u2013 ' + formatUSD(nm.max30d)
                    )
                  ),
                  h('svg', { width: '100%', height: ht, viewBox: '0 0 ' + w + ' ' + ht, preserveAspectRatio: 'none', className: 'cd-chart-svg' },
                    h('path', { d: pathParts.join(''), fill: 'none', stroke: color, strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' })
                  )
                );
              })()
            : null,

          /* All-time stats */
          jtcgDetail && jtcgDetail.conditions && jtcgDetail.conditions.NM && jtcgDetail.conditions.NM.allTimeLow != null
            ? h('div', { className: 'cd-alltime' },
                h('div', { className: 'cd-alltime-item' },
                  h('span', { className: 'cd-alltime-label' }, 'All-time low'),
                  h('span', { className: 'cd-alltime-val cd-change-down' }, formatUSD(jtcgDetail.conditions.NM.allTimeLow))
                ),
                h('div', { className: 'cd-alltime-item' },
                  h('span', { className: 'cd-alltime-label' }, 'All-time high'),
                  h('span', { className: 'cd-alltime-val cd-change-up' }, formatUSD(jtcgDetail.conditions.NM.allTimeHigh))
                ),
                jtcgDetail.conditions.NM.min1y != null && h('div', { className: 'cd-alltime-item' },
                  h('span', { className: 'cd-alltime-label' }, '52-week range'),
                  h('span', { className: 'cd-alltime-val' }, formatUSD(jtcgDetail.conditions.NM.min1y) + ' \u2013 ' + formatUSD(jtcgDetail.conditions.NM.max1y))
                )
              )
            : null
        ),

        /* ── EchoMTG Graded Slab Prices ── */
        echoGrading && echoGrading.regular && Object.keys(echoGrading.regular).length > 5
          ? h('div', { className: 'cd-echo-section' },
              h('h3', { className: 'cd-jtcg-title' }, 'Graded & Slab Prices'),
              h('div', { className: 'cd-echo-grid' },
                (function() {
                  var reg = echoGrading.regular;
                  var slabLabels = {
                    B10: 'BGS 10', B95: 'BGS 9.5', B9: 'BGS 9', B85: 'BGS 8.5', B8: 'BGS 8',
                    P10: 'PSA 10', P95: 'PSA 9', P9: 'PSA 8', P85: 'PSA 7', P8: 'PSA 6',
                    SGN: 'Signed', ART: 'Artist Proof', ALT: 'Altered', PRE: 'Pre-release'
                  };
                  var items = [];
                  var keys = Object.keys(slabLabels);
                  for (var i = 0; i < keys.length; i++) {
                    var k = keys[i];
                    if (reg[k] && reg[k] > 0) {
                      items.push({ key: k, label: slabLabels[k], price: reg[k] });
                    }
                  }
                  if (items.length === 0) return h('div', { className: 'cd-jtcg-empty' }, 'No graded pricing data available.');
                  return items.map(function(item) {
                    return h('div', { key: item.key, className: 'cd-echo-card' },
                      h('div', { className: 'cd-echo-label' }, item.label),
                      h('div', { className: 'cd-echo-price' }, formatUSD(item.price))
                    );
                  });
                })()
              ),
              echoGrading.buylist
                ? h('div', { className: 'cd-echo-buylist' },
                    h('span', { className: 'cd-echo-label' }, 'Est. Buylist'),
                    h('span', { className: 'cd-echo-price' }, formatUSD(echoGrading.buylist))
                  )
                : null,
              h('p', { className: 'price-source', style: { marginTop: '8px' } },
                'Graded data via ',
                h('a', { href: 'https://www.echomtg.com', target: '_blank', rel: 'noopener noreferrer' }, 'EchoMTG')
              )
            )
          : null,

        h('div', { className: 'card-actions' },
          h('button', { className: 'btn btn-primary', onClick: goToMarketplace },
            h(ShoppingCartIcon, null), ' Find Sellers'
          ),
          h('div', { className: 'card-track-group' },
            h('button', { className: 'btn btn-secondary', onClick: addToPortfolio },
              h(PortfolioIcon, null), ' Track'
            ),
            h('select', {
              className: 'cond-select cond-select-inline',
              value: trackCondition,
              onChange: function(e) { setTrackCondition(e.target.value); },
              title: 'Card condition'
            },
              ['NM', 'LP', 'MP', 'HP', 'DMG'].map(function(c) {
                return h('option', { key: c, value: c }, c);
              })
            )
          ),
          userLists.length > 0 && h('div', { className: 'card-list-add', style: { position: 'relative' } },
            h('button', { className: 'btn btn-secondary btn-sm', onClick: function() { setShowAddToList(!showAddToList); } }, '+ List'),
            showAddToList && h('div', { className: 'card-list-dropdown' },
              userLists.map(function(list) {
                return h('button', {
                  key: list.id, className: 'card-list-dropdown-item',
                  onClick: function() {
                    addListItem(list.id, { card_id: card.id, card_name: card.name, condition: trackCondition }).then(function() {
                      showToast('Added to ' + list.name, 'success');
                      setShowAddToList(false);
                    }).catch(function() { showToast('Already in list', 'default'); setShowAddToList(false); });
                  }
                }, list.name, h('span', { className: 'pf-list-type-tag', style: { marginLeft: '6px' } }, list.list_type));
              })
            )
          ),
          h('button', {
            className: 'btn btn-ghost',
            onClick: toggleWatchlist,
            'aria-pressed': inWatchlist
          },
            h(StarIcon, null), inWatchlist ? ' Watching' : ' Watch'
          ),
          h(ShareButton, {
            title: card.name + ' | investMTG',
            text: card.name + (card.set_name ? ' (' + card.set_name + ')' : '') + ' \u2014 ' + (card.prices && card.prices.usd ? '$' + Number(card.prices.usd).toFixed(2) : 'Price N/A') + '\nTrack prices on investMTG',
            url: 'https://www.investmtg.com/card/' + card.id,
            size: 'md'
          }),
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
                        loading: 'lazy',
                        onError: function(e) { handleImageError(e, p.id, 'small'); }
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
