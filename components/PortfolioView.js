/* PortfolioView.js — Portfolio with live prices from backend */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { PortfolioIcon } from './shared/Icons.js';
import { fetchPortfolio, addToPortfolioAPI, removeFromPortfolioAPI } from '../utils/api.js';
import { storageGet, storageSet } from '../utils/storage.js';
var h = React.createElement;

var PRICE_CACHE_KEY = 'investmtg-portfolio-prices';
var PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function loadPriceCache() {
  var cached = storageGet(PRICE_CACHE_KEY, null);
  if (!cached || !cached.ts || Date.now() - cached.ts > PRICE_CACHE_TTL) return null;
  return cached.data || null;
}

function savePriceCache(data) {
  storageSet(PRICE_CACHE_KEY, { ts: Date.now(), data: data });
}

export function PortfolioView(props) {
  var state = props.state;
  var updatePortfolio = props.updatePortfolio;
  var portfolio = state.portfolio;

  var ref1 = React.useState({});
  var livePrices = ref1[0], setLivePrices = ref1[1];
  var ref2 = React.useState(false);
  var pricesLoaded = ref2[0], setPricesLoaded = ref2[1];

  React.useEffect(function() {
    if (portfolio.length === 0) return;
    var cancelled = false;

    // Apply local price cache for instant display
    var cached = loadPriceCache();
    if (cached) {
      setLivePrices(cached);
      setPricesLoaded(true);
    }

    // Fetch live portfolio data from backend — includes prices already joined
    fetchPortfolio().then(function(data) {
      if (cancelled) return;
      var items = (data && data.items) ? data.items : [];
      var priceMap = {};
      items.forEach(function(item) {
        if (item.card_id) {
          var price = parseFloat(item.price_usd) || parseFloat(item.price_usd_foil) || 0;
          priceMap[item.card_id] = price;
        }
      });

      // Also update the portfolio in global state with the enriched backend data
      // Map backend shape to frontend shape
      var updatedPortfolio = items.map(function(item) {
        return {
          id: item.card_id,
          name: item.card_name,
          set: item.set_name || '',
          qty: item.quantity || 1,
          buyPrice: item.added_price || 0,
          currentPrice: parseFloat(item.price_usd) || parseFloat(item.price_usd_foil) || 0,
          image: item.image_small || null
        };
      });

      // Only update if we got results; otherwise keep what we have
      if (updatedPortfolio.length > 0) {
        updatePortfolio(updatedPortfolio);
      }

      setLivePrices(priceMap);
      savePriceCache(priceMap);
      setPricesLoaded(true);
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
    // Update local state immediately
    updatePortfolio(portfolio.filter(function(item) { return item.id !== id; }));
    // Fire-and-forget backend delete
    removeFromPortfolioAPI(id).catch(function() {
      // silently ignore — localStorage already updated
    });
  }

  function updateQty(id, qty) {
    if (qty < 1) return removeItem(id);
    var updated = portfolio.map(function(item) {
      return item.id === id ? Object.assign({}, item, { qty: qty }) : item;
    });
    updatePortfolio(updated);
    // Sync qty change to backend: remove then re-add with new quantity
    var item = portfolio.find(function(i) { return i.id === id; });
    if (item) {
      removeFromPortfolioAPI(id).then(function() {
        return addToPortfolioAPI({
          card_id: id,
          card_name: item.name,
          quantity: qty,
          added_price: item.buyPrice || 0
        });
      }).catch(function() {
        // silently ignore — localStorage already updated
      });
    }
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
    !pricesLoaded && h('p', { className: 'price-source' }, 'Loading live prices...'),
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
      'Gain/Loss calculated from your buy price vs. live market data. Prices update every 5 minutes.'
    )
  );
}
