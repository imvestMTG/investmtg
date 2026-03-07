/* CardDetailView.js */
import React from 'react';
import { getCard, getCardPrints } from '../utils/api.js';
import { formatUSD, getCardPrice, getAllPrices, generateMockPriceHistory, generateMockChange, getScryfallImageUrl, getFinishTags, getFinishLabel, getVariantLabel } from '../utils/helpers.js';
import { SkeletonCard } from './shared/SkeletonCard.js';
import { CartIcon, PortfolioIcon, StarIcon, ChevronLeftIcon } from './shared/Icons.js';
var h = React.createElement;

function PrintingRow({ printing, isCurrentCard }) {
  var price = getCardPrice(printing);
  var finishes = getFinishTags(printing);
  var variantLabel = getVariantLabel(printing);
  var allPrices = getAllPrices(printing);

  return h('div', {
    className: 'printing-row' + (isCurrentCard ? ' printing-row-current' : ''),
    onClick: function() {
      if (!isCurrentCard) {
        window.location.hash = 'card/' + printing.id;
      }
    },
    role: isCurrentCard ? undefined : 'button',
    tabIndex: isCurrentCard ? undefined : 0,
    style: { cursor: isCurrentCard ? 'default' : 'pointer' }
  },
    h('div', { className: 'printing-image' },
      h('img', {
        src: getScryfallImageUrl(printing, 'small'),
        alt: printing.set_name,
        loading: 'lazy'
      })
    ),
    h('div', { className: 'printing-info' },
      h('div', { className: 'printing-set-name' },
        printing.set_name,
        isCurrentCard && h('span', { className: 'printing-current-badge' }, 'Viewing')
      ),
      h('div', { className: 'printing-meta' },
        '#' + (printing.collector_number || '?'),
        ' · ',
        (printing.rarity || '').charAt(0).toUpperCase() + (printing.rarity || '').slice(1)
      ),
      variantLabel && h('div', { className: 'printing-variant' }, variantLabel),
      h('div', { className: 'printing-finishes' },
        finishes.map(function(f) {
          return h('span', {
            key: f,
            className: 'finish-badge finish-badge-' + f
          }, getFinishLabel(f));
        })
      )
    ),
    h('div', { className: 'printing-prices' },
      allPrices.length > 0 ? allPrices.map(function(p) {
        return h('div', { key: p.label, className: 'printing-price-item' },
          h('span', { className: 'printing-price-label' }, p.label),
          h('span', { className: 'printing-price-value' }, p.isTix ? p.value.toFixed(2) + ' tix' : formatUSD(p.value))
        );
      }) : h('div', { className: 'printing-price-item' },
        h('span', { className: 'printing-price-value printing-price-na' }, 'N/A')
      )
    )
  );
}

export function CardDetailView({ cardId, state, updateCart, updatePortfolio, updateWatchlist, onOpenListing }) {
  var ref1 = React.useState(null);
  var card = ref1[0], setCard = ref1[1];
  var ref2 = React.useState(true);
  var loading = ref2[0], setLoading = ref2[1];
  var ref3 = React.useState(null);
  var error = ref3[0], setError = ref3[1];
  var ref4 = React.useState('1m');
  var timeframe = ref4[0], setTimeframe = ref4[1];
  var chartRef = React.useRef(null);
  var chartInstance = React.useRef(null);

  // Printings state
  var ref5 = React.useState([]);
  var printings = ref5[0], setPrintings = ref5[1];
  var ref6 = React.useState(false);
  var loadingPrintings = ref6[0], setLoadingPrintings = ref6[1];
  var ref7 = React.useState(false);
  var showAllPrintings = ref7[0], setShowAllPrintings = ref7[1];

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
      // Fetch all printings
      if (data.oracle_id) {
        setLoadingPrintings(true);
        getCardPrints(data.oracle_id).then(function(printsData) {
          setPrintings(printsData && printsData.data ? printsData.data : []);
          setLoadingPrintings(false);
        }).catch(function() {
          setLoadingPrintings(false);
        });
      }
    }).catch(function() {
      setError('Card not found.');
      setLoading(false);
    });
  }, [cardId]);

  React.useEffect(function() {
    if (!card || !chartRef.current) return;
    if (typeof Chart === 'undefined') return;

    var price = getCardPrice(card);
    var days = timeframe === '1w' ? 7 : timeframe === '1m' ? 30 : timeframe === '3m' ? 90 : 365;
    var history = generateMockPriceHistory(price, days);
    var labels = history.map(function(_, i) {
      var d = new Date();
      d.setDate(d.getDate() - (history.length - 1 - i));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    var ctx = chartRef.current.getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(212, 168, 67, 0.25)');
    gradient.addColorStop(1, 'rgba(212, 168, 67, 0.0)');

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: history,
          borderColor: '#D4A843',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          x: { display: false },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { callback: function(v) { return '$' + v.toFixed(2); }, color: '#8B8D94', font: { size: 11 } }
          }
        }
      }
    });

    return function() {
      if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; }
    };
  }, [card, timeframe]);

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
  var change = generateMockChange();
  var inWatchlist = state.watchlist.some(function(item) { return item.id === card.id; });
  var allPrices = getAllPrices(card);
  var finishes = getFinishTags(card);
  var variantLabel = getVariantLabel(card);

  var priceBoxes = allPrices.map(function(p) {
    return { label: p.label, value: p.isTix ? p.value.toFixed(2) + ' tix' : formatUSD(p.value) };
  });
  priceBoxes.push({ label: '30d Change', value: (change > 0 ? '+' : '') + change + '%' });

  var legalities = Object.entries(card.legalities || {}).filter(function(entry) {
    return ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'commander', 'pauper'].indexOf(entry[0]) !== -1;
  });

  // Show first 5 printings by default, rest behind "Show All"
  var visiblePrintings = showAllPrintings ? printings : printings.slice(0, 5);
  var hasMorePrintings = printings.length > 5;

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
        }),
        // Finish badges on detail image
        finishes.length > 0 && h('div', { className: 'detail-finish-badges' },
          finishes.map(function(f) {
            return h('span', { key: f, className: 'finish-badge finish-badge-' + f }, getFinishLabel(f));
          })
        )
      ),
      h('div', { className: 'card-detail-info' },
        h('h1', null, card.name),
        h('p', { className: 'card-detail-set' },
          card.set_name, ' · ', card.rarity, ' · #', card.collector_number || '?'
        ),
        variantLabel && h('p', { className: 'card-detail-variant' }, variantLabel),
        h('div', { className: 'price-breakdown' },
          priceBoxes.map(function(p) {
            return h('div', { key: p.label, className: 'price-box' },
              h('div', { className: 'price-box-label' }, p.label),
              h('div', { className: 'price-box-value' }, p.value)
            );
          })
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
        h('div', { className: 'chart-container' },
          h('h3', null, 'Price History'),
          h('div', { style: { display: 'flex', gap: '8px', marginBottom: '12px' } },
            ['1w','1m','3m','1y'].map(function(tf) {
              return h('button', {
                key: tf,
                className: 'btn btn-sm ' + (timeframe === tf ? 'btn-primary' : 'btn-ghost'),
                onClick: function() { setTimeframe(tf); }
              }, tf);
            })
          ),
          h('canvas', { ref: chartRef })
        ),
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

        // ===== ALL PRINTINGS SECTION =====
        h('div', { className: 'printings-section' },
          h('div', { className: 'printings-header' },
            h('h3', null, 'All Printings'),
            printings.length > 0 && h('span', { className: 'printings-count' }, printings.length + ' versions')
          ),
          loadingPrintings && h('div', { className: 'printings-loading' },
            h('div', { className: 'skeleton skeleton-text' }),
            h('div', { className: 'skeleton skeleton-text' }),
            h('div', { className: 'skeleton skeleton-text' })
          ),
          !loadingPrintings && printings.length === 0 && h('p', { className: 'printings-empty' }, 'No other printings found.'),
          !loadingPrintings && visiblePrintings.map(function(printing) {
            return h(PrintingRow, {
              key: printing.id,
              printing: printing,
              isCurrentCard: printing.id === card.id
            });
          }),
          !loadingPrintings && hasMorePrintings && !showAllPrintings && h('button', {
            className: 'btn btn-ghost printings-show-all-btn',
            onClick: function() { setShowAllPrintings(true); }
          }, 'Show All ' + printings.length + ' Printings'),
          !loadingPrintings && showAllPrintings && hasMorePrintings && h('button', {
            className: 'btn btn-ghost printings-show-all-btn',
            onClick: function() { setShowAllPrintings(false); }
          }, 'Show Less')
        )
      )
    )
  );
}
