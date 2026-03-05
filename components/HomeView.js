/* HomeView.js */
import React from 'react';
import { searchCards, randomCard } from '../utils/api.js';
import { getCardPrice, formatUSD, generateMockChange, getCardImageSmall, getScryfallImageUrl } from '../utils/helpers.js';
import { CardGrid } from './shared/CardGrid.js';
import { SkeletonCard } from './shared/SkeletonCard.js';
import { SearchIcon, TrendingIcon, StarIcon, SparkleIcon } from './shared/Icons.js';
var h = React.createElement;

var FEATURED_QUERIES = ['black lotus', 'mox pearl', 'ancestral recall'];
var TRENDING_QUERIES = ['ragavan nimble pilferer', 'the one ring', 'wrenn and six'];
var BUDGET_QUERIES = ['lightning bolt', 'counterspell', 'path to exile'];

export function HomeView({ state, updateCart, updatePortfolio, updateWatchlist, onOpenListing }) {
  var ref1 = React.useState([]);
  var featured = ref1[0], setFeatured = ref1[1];
  var ref2 = React.useState([]);
  var trending = ref2[0], setTrending = ref2[1];
  var ref3 = React.useState([]);
  var budget = ref3[0], setBudget = ref3[1];
  var ref4 = React.useState(true);
  var loading = ref4[0], setLoading = ref4[1];
  var ref5 = React.useState('');
  var heroSearch = ref5[0], setHeroSearch = ref5[1];

  React.useEffect(function() {
    var cancelled = false;
    var searches = FEATURED_QUERIES.concat(TRENDING_QUERIES).concat(BUDGET_QUERIES);
    var results = {};

    Promise.all(searches.map(function(q) {
      return searchCards(q).then(function(data) {
        if (!cancelled && data && data.data && data.data.length > 0) {
          results[q] = data.data[0];
        }
      }).catch(function() {});
    })).then(function() {
      if (!cancelled) {
        setFeatured(FEATURED_QUERIES.map(function(q) { return results[q]; }).filter(Boolean));
        setTrending(TRENDING_QUERIES.map(function(q) { return results[q]; }).filter(Boolean));
        setBudget(BUDGET_QUERIES.map(function(q) { return results[q]; }).filter(Boolean));
        setLoading(false);
      }
    });

    return function() { cancelled = true; };
  }, []);

  function handleHeroSearch(e) {
    e.preventDefault();
    if (heroSearch.trim()) {
      window.location.hash = 'search';
      setTimeout(function() {
        var ev = new CustomEvent('investmtg-search', { detail: heroSearch });
        window.dispatchEvent(ev);
      }, 50);
    }
  }

  var stats = [
    { value: '25,000+', label: 'Cards Tracked' },
    { value: '4', label: 'Local Guam Stores' },
    { value: 'Live', label: 'Price Updates' },
    { value: 'Free', label: 'Forever' },
  ];

  return h('div', null,
    h('section', { className: 'hero' },
      h('h1', { className: 'hero-tagline' }, 'MTG Price Intelligence'),
      h('p', { className: 'hero-sub' }, 'Track prices, manage your portfolio, and find cards from Guam\'s local MTG stores.'),
      h('form', { className: 'hero-search', onSubmit: handleHeroSearch },
        h('div', { className: 'search-icon' }, h(SearchIcon, null)),
        h('input', {
          type: 'search',
          placeholder: 'Search 25,000+ Magic cards...',
          value: heroSearch,
          onChange: function(e) { setHeroSearch(e.target.value); },
          'aria-label': 'Search cards'
        })
      ),
      h('div', { className: 'hero-stats' },
        stats.map(function(s) {
          return h('div', { key: s.label, className: 'hero-stat' },
            h('div', { className: 'hero-stat-value' }, s.value),
            h('div', { className: 'hero-stat-label' }, s.label)
          );
        })
      )
    ),
    h('div', { className: 'container' },
      h('section', { className: 'watchlist-section' },
        h('h2', null, h(SparkleIcon, null), ' Featured Cards'),
        loading
          ? h('div', { className: 'card-grid' }, [1,2,3].map(function(i) { return h(SkeletonCard, { key: i }); }))
          : h(CardGrid, {
              cards: featured,
              state: state,
              updateCart: updateCart,
              updatePortfolio: updatePortfolio,
              updateWatchlist: updateWatchlist,
              onOpenListing: onOpenListing
            })
      ),
      h('section', { className: 'watchlist-section' },
        h('h2', null, h(TrendingIcon, null), ' Trending Now'),
        loading
          ? h('div', { className: 'card-grid' }, [1,2,3].map(function(i) { return h(SkeletonCard, { key: i }); }))
          : h(CardGrid, {
              cards: trending,
              state: state,
              updateCart: updateCart,
              updatePortfolio: updatePortfolio,
              updateWatchlist: updateWatchlist,
              onOpenListing: onOpenListing
            })
      ),
      h('section', { className: 'watchlist-section' },
        h('h2', null, h(StarIcon, null), ' Budget Staples'),
        loading
          ? h('div', { className: 'card-grid' }, [1,2,3].map(function(i) { return h(SkeletonCard, { key: i }); }))
          : h(CardGrid, {
              cards: budget,
              state: state,
              updateCart: updateCart,
              updatePortfolio: updatePortfolio,
              updateWatchlist: updateWatchlist,
              onOpenListing: onOpenListing
            })
      )
    )
  );
}
