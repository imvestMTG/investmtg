/* PortfolioView.js */
import React from 'react';
import { formatUSD, generateMockChange } from '../utils/helpers.js';
import { PortfolioIcon } from './shared/Icons.js';
var h = React.createElement;

export function PortfolioView({ state, updatePortfolio }) {
  var portfolio = state.portfolio;

  // Add mock current prices
  var enriched = portfolio.map(function(item) {
    var mockChange = generateMockChange();
    var currentPrice = item.currentPrice * (1 + mockChange / 100);
    return Object.assign({}, item, {
      currentPrice: Math.round(currentPrice * 100) / 100,
      change: mockChange
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
    )
  );
}
