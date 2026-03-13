/* MarketMoversView.js — Market movers with multi-source pricing waterfall */
import React from 'react';
import { fetchMovers, fetchJustTCGDetail } from '../utils/api.js';
import { formatUSD, getCardPrice, getScryfallImageUrl } from '../utils/helpers.js';
import { getSetGainers, getSetLosers } from '../utils/echomtg-api.js';
import { TrendingIcon } from './shared/Icons.js';
import { ShareButton } from './shared/ShareButton.js';
var h = React.createElement;

/* Map frontend category keys to backend category names */
var CATEGORY_KEY_MAP = {
  'expensive': 'valuable',
  'staples': 'modern',
  'commander': 'commander',
  'budget': 'budget'
};

var CATEGORIES = [
  {
    key: 'expensive',
    title: 'Most Valuable Cards',
    icon: '\u2B50',
    description: 'Highest-value physical MTG cards on the market right now.'
  },
  {
    key: 'staples',
    title: 'Modern Staples',
    icon: '\u2694\uFE0F',
    description: 'Top-priced cards legal in Modern format.'
  },
  {
    key: 'commander',
    title: 'Commander Staples',
    icon: '\uD83D\uDC51',
    description: 'Most valuable cards for the Commander format.'
  },
  {
    key: 'budget',
    title: 'Budget Finds',
    icon: '\uD83D\uDCB0',
    description: 'Affordable rares \u2014 great for building on a budget.'
  },
  {
    key: 'echo-gainers',
    title: 'Set Gainers',
    icon: '\uD83D\uDCC8',
    description: 'Cards gaining the most value in recent Standard-legal sets (via EchoMTG).'
  },
  {
    key: 'echo-losers',
    title: 'Set Losers',
    icon: '\uD83D\uDCC9',
    description: 'Cards dropping the most value in recent Standard-legal sets (via EchoMTG).'
  }
];

var ECHO_SET_CODES = ['FDN', 'DSK', 'BLB', 'OTJ', 'MKM', 'LCI'];

var SORT_COLUMNS = [
  { key: 'rank', label: '#', width: '40px' },
  { key: 'name', label: 'Card', width: null },
  { key: 'price', label: 'Price', width: '100px' },
  { key: 'change7d', label: '7D', width: '80px' },
  { key: 'change30d', label: '30D', width: '80px' },
  { key: 'change90d', label: '90D', width: '80px' }
];

function formatChange(val) {
  if (val === null || val === undefined || isNaN(val)) return h('span', { className: 'mv-change mv-change-na' }, '—');
  var pct = parseFloat(val);
  var cls = pct > 0 ? 'mv-change mv-change-up' : pct < 0 ? 'mv-change mv-change-down' : 'mv-change mv-change-flat';
  var prefix = pct > 0 ? '+' : '';
  return h('span', { className: cls }, prefix + pct.toFixed(1) + '%');
}

function SortArrow(props) {
  var active = props.active;
  var dir = props.dir;
  if (!active) return h('span', { className: 'mv-sort-arrow' }, '\u2195');
  return h('span', { className: 'mv-sort-arrow mv-sort-active' }, dir === 'asc' ? '\u2191' : '\u2193');
}

function Sparkline(props) {
  var points = props.points;
  if (!points || points.length < 2) return null;
  var prices = points.map(function(p) { return p.p; });
  var minP = Math.min.apply(null, prices);
  var maxP = Math.max.apply(null, prices);
  var range = maxP - minP || 1;
  var w = 60;
  var ht = 20;
  var pathParts = prices.map(function(p, i) {
    var x = (i / (prices.length - 1)) * w;
    var y = ht - ((p - minP) / range) * ht;
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  });
  var color = prices[prices.length - 1] >= prices[0] ? 'var(--color-success, #22c55e)' : 'var(--color-error, #ef4444)';
  return h('svg', { width: w, height: ht, viewBox: '0 0 ' + w + ' ' + ht, className: 'mv-sparkline' },
    h('path', { d: pathParts.join(''), fill: 'none', stroke: color, strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round' })
  );
}

export function MarketMoversView() {
  var ref1 = React.useState('expensive');
  var activeCategory = ref1[0], setActiveCategory = ref1[1];
  var ref2 = React.useState([]);
  var cards = ref2[0], setCards = ref2[1];
  var ref3 = React.useState(true);
  var loading = ref3[0], setLoading = ref3[1];
  var ref4 = React.useState(null);
  var error = ref4[0], setError = ref4[1];
  var ref5 = React.useState({ key: 'rank', dir: 'asc' });
  var sortState = ref5[0], setSortState = ref5[1];
  var ref6 = React.useState({});
  var jtcgData = ref6[0], setJtcgData = ref6[1];

  var ref7 = React.useState([]);
  var echoCards = ref7[0], setEchoCards = ref7[1];

  React.useEffect(function() {
    var isEcho = activeCategory === 'echo-gainers' || activeCategory === 'echo-losers';

    setLoading(true);
    setError(null);
    setJtcgData({});

    if (isEcho) {
      /* EchoMTG set movers: fetch from multiple recent sets */
      var fetchFn = activeCategory === 'echo-gainers' ? getSetGainers : getSetLosers;
      Promise.all(ECHO_SET_CODES.map(function(code) {
        return fetchFn(code, 8).catch(function() { return []; });
      })).then(function(results) {
        var merged = [];
        results.forEach(function(items) {
          items.forEach(function(item) { merged.push(item); });
        });
        /* Sort by absolute price change */
        merged.sort(function(a, b) { return Math.abs(b.price_change) - Math.abs(a.price_change); });
        setEchoCards(merged.slice(0, 20));
        setCards([]);
        setLoading(false);
      }).catch(function() {
        setError('Could not load EchoMTG data. Please try again.');
        setLoading(false);
      });
    } else {
      setEchoCards([]);
      var backendCategory = CATEGORY_KEY_MAP[activeCategory] || activeCategory;

      fetchMovers(backendCategory).then(function(result) {
        var seen = {};
        var unique = [];
        result.forEach(function(card) {
          if (!seen[card.name] && unique.length < 16) {
            seen[card.name] = true;
            unique.push(card);
          }
        });
        setCards(unique);
        setLoading(false);

        /* Fetch JustTCG price data for each card via tcgplayer_id (fire-and-forget, progressive loading) */
        unique.forEach(function(card) {
          var cardId = card.id;
          var tcgId = card.tcgplayer_id || card.tcgplayerId;
          if (!tcgId) return; /* Skip cards without tcgplayer_id */
          fetchJustTCGDetail({ tcgplayerId: tcgId }).then(function(detail) {
            if (detail && detail.conditions && detail.conditions.NM) {
              setJtcgData(function(prev) {
                var next = {};
                Object.keys(prev).forEach(function(k) { next[k] = prev[k]; });
                next[cardId] = detail.conditions.NM;
                return next;
              });
            }
          });
        });
      }).catch(function() {
        setError('Could not load market data. Please try again.');
        setLoading(false);
      });
    }
  }, [activeCategory]);

  function toggleSort(key) {
    setSortState(function(prev) {
      if (prev.key === key) {
        return { key: key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      /* Default sort direction: price/change descending, name/rank ascending */
      var defaultDir = (key === 'name' || key === 'rank') ? 'asc' : 'desc';
      return { key: key, dir: defaultDir };
    });
  }

  /* Build sortable data */
  var sortedCards = cards.slice().map(function(card, i) {
    var jtcg = jtcgData[card.id] || {};
    return {
      card: card,
      rank: i + 1,
      price: jtcg.price || getCardPrice(card),
      change7d: typeof jtcg.change7d === 'number' ? jtcg.change7d : null,
      change30d: typeof jtcg.change30d === 'number' ? jtcg.change30d : null,
      change90d: typeof jtcg.change90d === 'number' ? jtcg.change90d : null,
      history30d: jtcg.history30d || []
    };
  });

  sortedCards.sort(function(a, b) {
    var key = sortState.key;
    var dir = sortState.dir === 'asc' ? 1 : -1;
    var va, vb;
    if (key === 'rank') { va = a.rank; vb = b.rank; }
    else if (key === 'name') { va = a.card.name.toLowerCase(); vb = b.card.name.toLowerCase(); }
    else if (key === 'price') { va = a.price || 0; vb = b.price || 0; }
    else if (key === 'change7d') { va = a.change7d === null ? -9999 : a.change7d; vb = b.change7d === null ? -9999 : b.change7d; }
    else if (key === 'change30d') { va = a.change30d === null ? -9999 : a.change30d; vb = b.change30d === null ? -9999 : b.change30d; }
    else if (key === 'change90d') { va = a.change90d === null ? -9999 : a.change90d; vb = b.change90d === null ? -9999 : b.change90d; }
    else { va = a.rank; vb = b.rank; }
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });

  var activeCat = CATEGORIES.find(function(c) { return c.key === activeCategory; });

  return h('div', { className: 'container market-movers-view' },
    h('div', { className: 'page-header-row' },
      h('h1', null, h(TrendingIcon, null), ' Market Movers'),
      h(ShareButton, {
        title: 'MTG Market Movers | investMTG',
        text: 'Check out the biggest MTG price movers right now on investMTG',
        url: 'https://www.investmtg.com/#movers',
        size: 'sm'
      })
    ),
    h('p', { className: 'market-subtitle' },
      'Real-time MTG card prices powered by JustTCG + EchoMTG + Scryfall market data.'
    ),
    h('div', { className: 'market-period-tabs' },
      CATEGORIES.map(function(cat) {
        return h('button', {
          key: cat.key,
          className: 'period-btn' + (activeCategory === cat.key ? ' active' : ''),
          onClick: function() { setActiveCategory(cat.key); setSortState({ key: 'rank', dir: 'asc' }); }
        }, cat.icon + ' ' + cat.title);
      })
    ),

    activeCat && h('p', { className: 'market-cat-desc' }, activeCat.description),

    error && h('div', { className: 'decklist-error' }, error),

    loading
      ? h('div', { className: 'market-list' },
          [1,2,3,4,5].map(function(i) {
            return h('div', { key: i, className: 'skeleton skeleton-text', style: { height: '56px', marginBottom: '6px' } });
          })
        )
      : echoCards.length > 0
        ? h('div', { className: 'mv-table-wrap' },
            h('table', { className: 'mv-table' },
              h('thead', null,
                h('tr', null,
                  h('th', { className: 'mv-th', style: { width: '40px' } }, '#'),
                  h('th', { className: 'mv-th mv-th-name' }, 'Card'),
                  h('th', { className: 'mv-th', style: { width: '80px' } }, 'Set'),
                  h('th', { className: 'mv-th', style: { width: '100px' } }, 'Mid'),
                  h('th', { className: 'mv-th', style: { width: '100px' } }, 'Low'),
                  h('th', { className: 'mv-th', style: { width: '100px' } }, 'Change')
                )
              ),
              h('tbody', null,
                echoCards.map(function(item, i) {
                  var chg = item.price_change;
                  var chgCls = chg > 0 ? 'mv-change mv-change-up' : chg < 0 ? 'mv-change mv-change-down' : 'mv-change mv-change-flat';
                  var chgPrefix = chg > 0 ? '+' : '';
                  return h('tr', { key: item.emid || i, className: 'mv-row' },
                    h('td', { className: 'mv-td mv-td-rank' }, '#' + (i + 1)),
                    h('td', { className: 'mv-td mv-td-card' },
                      item.image_cropped
                        ? h('img', { src: item.image_cropped, alt: item.name, className: 'mv-card-img', loading: 'lazy' })
                        : null,
                      h('div', { className: 'mv-card-info' },
                        h('div', { className: 'mv-card-name' }, item.name),
                        h('div', { className: 'mv-card-set' }, item.rarity || '')
                      )
                    ),
                    h('td', { className: 'mv-td' }, item.set_code ? item.set_code.toUpperCase() : ''),
                    h('td', { className: 'mv-td mv-td-price' }, item.tcg_mid ? formatUSD(item.tcg_mid) : 'N/A'),
                    h('td', { className: 'mv-td mv-td-price' }, item.tcg_low ? formatUSD(item.tcg_low) : 'N/A'),
                    h('td', { className: 'mv-td mv-td-change' }, h('span', { className: chgCls }, chgPrefix + chg + '%'))
                  );
                })
              )
            )
          )
        : h('div', { className: 'mv-table-wrap' },
          h('table', { className: 'mv-table' },
            h('thead', null,
              h('tr', null,
                SORT_COLUMNS.map(function(col) {
                  return h('th', {
                    key: col.key,
                    className: 'mv-th' + (sortState.key === col.key ? ' mv-th-active' : '') + (col.key === 'name' ? ' mv-th-name' : ''),
                    style: col.width ? { width: col.width } : {},
                    onClick: function() { toggleSort(col.key); }
                  },
                    h('span', null, col.label),
                    h(SortArrow, { active: sortState.key === col.key, dir: sortState.dir })
                  );
                }),
                h('th', { className: 'mv-th mv-th-chart', style: { width: '70px' } }, '30D')
              )
            ),
            h('tbody', null,
              sortedCards.length > 0
                ? sortedCards.map(function(row) {
                    var card = row.card;
                    return h('tr', { key: card.id, className: 'mv-row', onClick: function() { window.location.hash = 'card/' + card.id; } },
                      h('td', { className: 'mv-td mv-td-rank' }, '#' + row.rank),
                      h('td', { className: 'mv-td mv-td-card' },
                        h('img', {
                          src: getScryfallImageUrl(card, 'small'),
                          alt: card.name,
                          className: 'mv-card-img',
                          loading: 'lazy'
                        }),
                        h('div', { className: 'mv-card-info' },
                          h('div', { className: 'mv-card-name' }, card.name),
                          h('div', { className: 'mv-card-set' }, card.set_name)
                        )
                      ),
                      h('td', { className: 'mv-td mv-td-price' }, row.price > 0 ? formatUSD(row.price) : 'N/A'),
                      h('td', { className: 'mv-td mv-td-change' }, formatChange(row.change7d)),
                      h('td', { className: 'mv-td mv-td-change' }, formatChange(row.change30d)),
                      h('td', { className: 'mv-td mv-td-change' }, formatChange(row.change90d)),
                      h('td', { className: 'mv-td mv-td-chart' }, h(Sparkline, { points: row.history30d }))
                    );
                  })
                : h('tr', null, h('td', { colSpan: 7, className: 'mv-empty' }, 'No cards found for this category.'))
            )
          )
        ),

    h('p', { className: 'market-source' },
      'Prices from ',
      h('a', { href: 'https://scryfall.com', target: '_blank', rel: 'noopener noreferrer' }, 'Scryfall'),
      ' + ',
      h('a', { href: 'https://justtcg.com', target: '_blank', rel: 'noopener noreferrer' }, 'JustTCG'),
      (activeCategory === 'echo-gainers' || activeCategory === 'echo-losers') ? h(React.Fragment, null, ' + ', h('a', { href: 'https://www.echomtg.com', target: '_blank', rel: 'noopener noreferrer' }, 'EchoMTG')) : null,
      '. Updated regularly. ',
      h('a', { href: '#pricing', style: { color: 'var(--color-primary)', textDecoration: 'underline' } }, 'How we source prices')
    )
  );
}
