/* PortfolioView.js — Portfolio tracker using real Scryfall prices */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { PortfolioIcon } from './shared/Icons.js';
var h = React.createElement;

// Fetch real current prices from Scryfall for portfolio items
function useRealPrices(portfolio) {
  var ref = React.useState({});
  var prices = ref[0], setPrices = ref[1];
  var ref2 = React.useState(false);
  var loading = ref2[0], setLoading = ref2[1];

  React.useEffect(function() {
    if (portfolio.length === 0) return;
    var cancelled = false;
    setLoading(true);

    // Batch fetch prices — one request per unique card ID
    var uniqueIds = [];
    var seen = {};
    portfolio.forEach(function(item) {
      if (!seen[item.id]) {
        seen[item.id] = true;
        uniqueIds.push(item.id);
      }
    });

    // Fetch in small batches to respect Scryfall rate limits (100ms delay between)
    var results = {};
    var idx = 0;

    function fetchNext() {
      if (idx >= uniqueIds.length || cancelled) {
        if (!cancelled) {
          setPrices(results);
          setLoading(false);
        }
        return;
      }
      var id = uniqueIds[idx];
      idx++;
      fetch('https://api.scryfall.com/cards/' + id)
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(card) {
          if (card && card.prices) {
            var usd = parseFloat(card.prices.usd) || parseFloat(card.prices.usd_foil) || 0;
            results[id] = usd;
          }
        })
        .catch(function() {})
        .then(function() {
          setTimeout(fetchNext, 100);
        });
    }
    fetchNext();

    return function() { cancelled = true; };
  }, [portfolio.length]);

  return { prices: prices, loading: loading };
}

export function PortfolioView({ state, updatePortfolio }) {
  var portfolio = state.portfolio;
  var realPrices = useRealPrices(portfolio);

  // Use real Scryfall prices when available, fall back to stored currentPrice
  var enriched = portfolio.map(function(item) {
    var livePrice = realPrices.prices[item.id];
    var currentPrice = livePrice != null ? livePrice : (item.currentPrice || 0);
    var change = item.buyPrice > 0 ? ((currentPrice - item.buyPrice) / item.buyPrice * 100) : 0;
    return Object.assign({}, item, {
      currentPrice: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 10) / 10
    });
  });

  var totalCost = enriched.reduce(function(sum, item) { return sum + (item.buyPrice || 0) * (item.qty || 1); }, 0);
  var totalValue = enriched.reduce(function(sum, item) { return sum + (item.currentPrice || 0) * (item.qty || 1); }, 0);
  var totalGain = totalValue - totalCost;
  var totalGainPct = totalCost > 0 ? ((totalGain / totalCost) * 100) : 0;

  function removeItem(id) {
    updatePortfolio(portfolio.filter(function(item) { return item.id !== id; }));
  }

  function updateQty(id, qty) {
    if (qty < 1) return removeItem(id);
    updatePortfolio(portfolio.map(function(item) {
      return item.id === id ? Object.assign({}, item, { qty: qty }) : item;
    }));
  }

  if (portfolio.length === 0) {
    return h('div', { className: 'container portfolio-page' },
      h('h1', { className: 'page-heading' }, 'My Portfolio'),
      h('div', { className: 'empty-state' },
        h('div', { className: 'empty-state-icon' }, h(PortfolioIcon, null)),
        h('h3', null, 'Your portfolio is empty'),
        h('p', null, 'Search for cards and click "Track" to add them to your portfolio.'),
        h('a', { href: '#search', className: 'btn btn-primary' }, 'Browse Cards')
      )
    );
  }

  return h('div', { className: 'container portfolio-page' },
    h('h1', { className: 'page-heading' }, 'My Portfolio'),

    realPrices.loading && h('div', { style: { textAlign: 'center', padding: 'var(--space-3)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' } },
      'Fetching live prices from Scryfall…'
    ),

    h('div', { className: 'portfolio-kpis' },
      h('div', { className: 'kpi-card' },
        h('div', { className: 'kpi-label' }, 'Total Cost'),
        h('div', { className: 'kpi-value' }, formatUSD(totalCost))
      ),
      h('div', { className: 'kpi-card' },
        h('div', { className: 'kpi-label' }, 'Current Value'),
        h('div', { className: 'kpi-value' }, formatUSD(totalValue))
      ),
      h('div', { className: 'kpi-card' },
        h('div', { className: 'kpi-label' }, 'Total Gain/Loss'),
        h('div', { className: 'kpi-value ' + (totalGain >= 0 ? 'price-up' : 'price-down') },
          (totalGain >= 0 ? '+' : '') + formatUSD(totalGain)
        ),
        h('div', { className: 'kpi-delta ' + (totalGainPct >= 0 ? 'price-up' : 'price-down') },
          (totalGainPct >= 0 ? '+' : '') + totalGainPct.toFixed(1) + '%'
        )
      ),
      h('div', { className: 'kpi-card' },
        h('div', { className: 'kpi-label' }, 'Cards Tracked'),
        h('div', { className: 'kpi-value' }, portfolio.length)
      )
    ),
    h('div', { className: 'portfolio-table-wrapper' },
      h('table', { className: 'portfolio-table' },
        h('thead', null,
          h('tr', null,
            h('th', null, 'Card'),
            h('th', null, 'Set'),
            h('th', null, 'Qty'),
            h('th', null, 'Buy Price'),
            h('th', null, 'Current'),
            h('th', null, 'Gain/Loss'),
            h('th', null, 'Actions')
          )
        ),
        h('tbody', null,
          enriched.map(function(item) {
            var gain = (item.currentPrice - item.buyPrice) * item.qty;
            var gainPct = item.buyPrice > 0 ? ((item.currentPrice - item.buyPrice) / item.buyPrice * 100) : 0;

            return h('tr', { key: item.id },
              h('td', null,
                h('a', {
                  className: 'card-name-cell',
                  href: '#card/' + item.id,
                  onClick: function(e) { e.preventDefault(); window.location.hash = 'card/' + item.id; }
                }, item.name)
              ),
              h('td', null, item.set || '—'),
              h('td', null,
                h('div', { className: 'cart-item-controls' },
                  h('button', { className: 'qty-btn', onClick: function() { updateQty(item.id, (item.qty || 1) - 1); } }, '−'),
                  h('span', { className: 'qty-value' }, item.qty || 1),
                  h('button', { className: 'qty-btn', onClick: function() { updateQty(item.id, (item.qty || 1) + 1); } }, '+')
                )
              ),
              h('td', null, formatUSD(item.buyPrice)),
              h('td', null, formatUSD(item.currentPrice)),
              h('td', null,
                h('span', { className: gain >= 0 ? 'price-up' : 'price-down' },
                  (gain >= 0 ? '+' : '') + formatUSD(gain),
                  ' (', (gainPct >= 0 ? '+' : '') + gainPct.toFixed(1), '%)'
                )
              ),
              h('td', null,
                h('button', { className: 'btn btn-sm btn-danger', onClick: function() { removeItem(item.id); } }, 'Remove')
              )
            );
          })
        )
      )
    ),
    h('p', { style: { textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-4)' } },
      'Prices sourced from Scryfall (TCGplayer market data). Updated on page load.'
    )
  );
}
