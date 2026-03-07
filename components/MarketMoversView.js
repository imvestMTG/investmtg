/* MarketMoversView.js — Trending & dropping cards from JustTCG */
import React from 'react';
import { getTrendingCards, getBiggestDrops } from '../utils/justtcg-api.js';
import { formatUSD } from '../utils/helpers.js';
import { TrendingIcon } from './shared/Icons.js';
import { SkeletonCard } from './shared/SkeletonCard.js';
var h = React.createElement;

function MarketCard(props) {
  var card = props.card;
  var rank = props.rank;
  if (!card) return null;

  var change = card.change7d;
  var isPositive = change !== null && change !== undefined && change >= 0;
  var changeStr = change !== null && change !== undefined
    ? (isPositive ? '+' : '') + change.toFixed(1) + '%'
    : 'N/A';

  return h('div', { className: 'market-card' },
    h('div', { className: 'market-card-rank' }, '#' + rank),
    h('div', { className: 'market-card-info' },
      h('div', { className: 'market-card-name' }, card.name),
      h('div', { className: 'market-card-set' }, card.set)
    ),
    h('div', { className: 'market-card-price' },
      h('div', { className: 'market-card-amount' }, card.price ? formatUSD(card.price) : 'N/A'),
      h('div', {
        className: 'market-card-change ' + (isPositive ? 'positive' : 'negative')
      }, changeStr)
    )
  );
}

export function MarketMoversView() {
  var ref1 = React.useState([]);
  var gainers = ref1[0], setGainers = ref1[1];
  var ref2 = React.useState([]);
  var losers = ref2[0], setLosers = ref2[1];
  var ref3 = React.useState(true);
  var loading = ref3[0], setLoading = ref3[1];
  var ref4 = React.useState('7d');
  var period = ref4[0], setPeriod = ref4[1];
  var ref5 = React.useState(null);
  var error = ref5[0], setError = ref5[1];

  React.useEffect(function() {
    setLoading(true);
    setError(null);
    Promise.all([
      getTrendingCards(period),
      getBiggestDrops(period)
    ]).then(function(results) {
      setGainers(results[0] || []);
      setLosers(results[1] || []);
      setLoading(false);
    }).catch(function(err) {
      setError('Could not load market data. JustTCG may be temporarily unavailable.');
      setLoading(false);
    });
  }, [period]);

  var periods = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' }
  ];

  return h('div', { className: 'container market-movers-view' },
    h('h1', null, h(TrendingIcon, null), ' Market Movers'),
    h('p', { className: 'market-subtitle' },
      'Real-time MTG card price movements powered by JustTCG market data.'
    ),
    h('div', { className: 'market-period-tabs' },
      periods.map(function(p) {
        return h('button', {
          key: p.value,
          className: 'period-btn' + (period === p.value ? ' active' : ''),
          onClick: function() { setPeriod(p.value); }
        }, p.label);
      })
    ),

    error && h('div', { className: 'decklist-error' }, error),

    loading
      ? h('div', { className: 'market-grid' },
          h('div', null,
            h('h2', null, 'Biggest Gainers'),
            [1,2,3,4,5].map(function(i) {
              return h('div', { key: i, className: 'skeleton skeleton-text', style: { height: '48px', marginBottom: '8px' } });
            })
          ),
          h('div', null,
            h('h2', null, 'Biggest Drops'),
            [1,2,3,4,5].map(function(i) {
              return h('div', { key: i, className: 'skeleton skeleton-text', style: { height: '48px', marginBottom: '8px' } });
            })
          )
        )
      : h('div', { className: 'market-grid' },
          h('div', { className: 'market-column' },
            h('h2', { className: 'market-column-title gainers' }, '\u2191 Biggest Gainers'),
            gainers.length > 0
              ? gainers.map(function(card, i) {
                  return h(MarketCard, { key: card.id || i, card: card, rank: i + 1 });
                })
              : h('p', { className: 'market-empty' }, 'No gainers data available for this period.')
          ),
          h('div', { className: 'market-column' },
            h('h2', { className: 'market-column-title losers' }, '\u2193 Biggest Drops'),
            losers.length > 0
              ? losers.map(function(card, i) {
                  return h(MarketCard, { key: card.id || i, card: card, rank: i + 1 });
                })
              : h('p', { className: 'market-empty' }, 'No drops data available for this period.')
          )
        ),

    h('p', { className: 'market-source' },
      'Market data from ',
      h('a', { href: 'https://justtcg.com', target: '_blank', rel: 'noopener noreferrer' }, 'JustTCG'),
      '. Prices updated every 6 hours. Sorted by ' + period + ' price change percentage.'
    )
  );
}
