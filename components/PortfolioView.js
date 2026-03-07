/* PortfolioView.js — Portfolio with live Scryfall prices */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { PortfolioIcon } from './shared/Icons.js';
var h = React.createElement;

var PRICE_CACHE_KEY = 'investmtg-portfolio-prices';
var PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function loadPriceCache() {
  try {
    var raw = localStorage.getItem(PRICE_CACHE_KEY);
    if (!raw) return null;
    var cached = JSON.parse(raw);
    if (Date.now() - cached.ts > PRICE_CACHE_TTL) return null;
    return cached.data;
  } catch (e) { return null; }
}

function savePriceCache(data) {
  try {
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
  } catch (e) { /* ignore */ }
}

function fetchLivePrices(ids) {
  if (!ids || ids.length === 0) return Promise.resolve({});
  var identifiers = ids.map(function(id) { return { id: id }; });
  // Scryfall collection limit is 75 per request
  var batches = [];
  for (var i = 0; i < identifiers.length; i += 75) {
    batches.push(identifiers.slice(i, i + 75));
  }
  return Promise.all(batches.map(function(batch) {
    return fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: batch })
    }).then(function(res) {
      if (!res.ok) throw new Error('API error');
      return res.json();
    });
  })).then(function(results) {
    var priceMap = {};
    results.forEach(function(json) {
      if (json.data) {
        json.data.forEach(function(card) {
          var p = parseFloat(card.prices && card.prices.usd) || parseFloat(card.prices && card.prices.usd_foil) || 0;
          priceMap[card.id] = p;
        });
      }
    });
    return priceMap;
  });
}

export function PortfolioView({ state, updatePortfolio }) {
  var portfolio = state.portfolio;
  var ref1 = React.useState({});
  var livePrices = ref1[0], setLivePrices = ref1[1];
  var ref2 = React.useState(false);
  var pricesLoaded = ref2[0], setPricesLoaded = ref2[1];

  React.useEffect(function() {
    if (portfolio.length === 0) return;
    var cancelled = false;
    var ids = portfolio.map(function(item) { return item.id; });

    // Try cache first
    var cached = loadPriceCache();
    if (cached) {
      setLivePrices(cached);
      setPricesLoaded(true);
    }

    // Fetch live prices
    fetchLivePrices(ids).then(function(priceMap) {
      if (!cancelled) {
        setLivePrices(priceMap);
        savePriceCache(priceMap);
        setPricesLoaded(true);
      }
    }).catch(function() {
      if (!cancelled) setPricesLoaded(true);
    });

    return function() { cancelled = true; };
  }, [portfolio.length]);

  // Enrich portfolio with live prices
  var enriched = portfolio.map(function(item) {
    var currentPrice = livePrices[item.id] !== undefined ? livePrices[item.id] : item.currentPrice;
    return Object.assign({}, item, { currentPrice: currentPrice });
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
    !pricesLoaded && h('p', { className: 'price-source' }, 'Loading live prices from Scryfall...'),
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
    h('p', { className: 'price-source', style: { marginTop: 'var(--space-4)' } },
      'Gain/Loss calculated from your buy price vs. live Scryfall market data. Prices update every 5 minutes.'
    )
  );
}
