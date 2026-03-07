/* MarketMoversView.js — Trending cards using Scryfall data (no JustTCG) */
import React from 'react';
import { searchCards } from '../utils/api.js';
import { formatUSD, getCardPrice, getScryfallImageUrl } from '../utils/helpers.js';
import { TrendingIcon } from './shared/Icons.js';
import { SkeletonCard } from './shared/SkeletonCard.js';
var h = React.createElement;

/* Curated card pools for different market categories — Scryfall searches */
var CATEGORIES = [
  {
    key: 'expensive',
    title: 'Most Valuable Cards',
    query: 'usd>50 has:usd',
    icon: '\u2B50',
    description: 'Highest-value physical MTG cards on the market right now.'
  },
  {
    key: 'staples',
    title: 'Modern Staples',
    query: 'f:modern usd>5 has:usd',
    icon: '\u2694\uFE0F',
    description: 'Top-priced cards legal in Modern format.'
  },
  {
    key: 'commander',
    title: 'Commander Staples',
    query: 'f:commander usd>10 has:usd',
    icon: '\uD83D\uDC51',
    description: 'Most valuable cards for the Commander format.'
  },
  {
    key: 'budget',
    title: 'Budget Finds',
    query: 'usd<2 usd>0.10 has:usd r:rare',
    icon: '\uD83D\uDCB0',
    description: 'Affordable rares — great for building on a budget.'
  }
];

function MarketCard(props) {
  var card = props.card;
  var rank = props.rank;
  if (!card) return null;

  var price = getCardPrice(card);
  var foilPrice = card.prices && card.prices.usd_foil ? parseFloat(card.prices.usd_foil) : null;

  return h('a', { className: 'market-card', href: '#card/' + card.id },
    h('div', { className: 'market-card-rank' }, '#' + rank),
    h('div', { className: 'market-card-img' },
      h('img', {
        src: getScryfallImageUrl(card, 'small'),
        alt: card.name,
        loading: 'lazy'
      })
    ),
    h('div', { className: 'market-card-info' },
      h('div', { className: 'market-card-name' }, card.name),
      h('div', { className: 'market-card-set' }, card.set_name)
    ),
    h('div', { className: 'market-card-price' },
      h('div', { className: 'market-card-amount' }, price > 0 ? formatUSD(price) : 'N/A'),
      foilPrice && h('div', { className: 'market-card-foil' }, 'Foil: ' + formatUSD(foilPrice))
    )
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

  React.useEffect(function() {
    setLoading(true);
    setError(null);
    var category = CATEGORIES.find(function(c) { return c.key === activeCategory; });
    if (!category) return;

    searchCards(category.query).then(function(result) {
      if (result && result.data) {
        // Take first 10, filter to unique names
        var seen = {};
        var unique = [];
        result.data.forEach(function(card) {
          if (!seen[card.name] && unique.length < 10) {
            seen[card.name] = true;
            unique.push(card);
          }
        });
        setCards(unique);
      }
      setLoading(false);
    }).catch(function(err) {
      setError('Could not load market data. Please try again.');
      setLoading(false);
    });
  }, [activeCategory]);

  var activeCat = CATEGORIES.find(function(c) { return c.key === activeCategory; });

  return h('div', { className: 'container market-movers-view' },
    h('h1', null, h(TrendingIcon, null), ' Market Movers'),
    h('p', { className: 'market-subtitle' },
      'Real-time MTG card prices powered by Scryfall market data.'
    ),
    h('div', { className: 'market-period-tabs' },
      CATEGORIES.map(function(cat) {
        return h('button', {
          key: cat.key,
          className: 'period-btn' + (activeCategory === cat.key ? ' active' : ''),
          onClick: function() { setActiveCategory(cat.key); }
        }, cat.icon + ' ' + cat.title);
      })
    ),

    activeCat && h('p', { className: 'market-cat-desc' }, activeCat.description),

    error && h('div', { className: 'decklist-error' }, error),

    loading
      ? h('div', { className: 'market-list' },
          [1,2,3,4,5].map(function(i) {
            return h('div', { key: i, className: 'skeleton skeleton-text', style: { height: '64px', marginBottom: '8px' } });
          })
        )
      : h('div', { className: 'market-list' },
          cards.length > 0
            ? cards.map(function(card, i) {
                return h(MarketCard, { key: card.id, card: card, rank: i + 1 });
              })
            : h('p', { className: 'market-empty' }, 'No cards found for this category.')
        ),

    h('p', { className: 'market-source' },
      'Market data from ',
      h('a', { href: 'https://scryfall.com', target: '_blank', rel: 'noopener noreferrer' }, 'Scryfall'),
      '. Prices updated daily.'
    )
  );
}
