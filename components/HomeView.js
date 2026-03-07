/* HomeView.js — Daily-rotating homepage with live Scryfall prices */
import React from 'react';
import { searchCards, searchCardsCheapest } from '../utils/api.js';
import { getCardPrice, formatUSD, getCardImageSmall, getScryfallImageUrl } from '../utils/helpers.js';
import { CardGrid } from './shared/CardGrid.js';
import { SkeletonCard } from './shared/SkeletonCard.js';
import { SearchIcon, TrendingIcon, StarIcon, SparkleIcon } from './shared/Icons.js';
var h = React.createElement;

/* ── Card pools for daily rotation ── */
/* Featured: High-value staples that reliably have Scryfall USD prices */
var FEATURED_POOL = [
  'underground sea', 'volcanic island', 'tropical island', 'bayou',
  'tundra', 'savannah', 'scrubland', 'badlands', 'taiga', 'plateau',
  'gaea\'s cradle', 'serra\'s sanctum', 'city of traitors', 'ancient tomb',
  'lion\'s eye diamond', 'mox diamond', 'chrome mox', 'mox opal',
  'force of negation', 'jeweled lotus'
];

var TRENDING_POOL = [
  'ragavan nimble pilferer', 'the one ring', 'wrenn and six',
  'orcish bowmasters', 'sheoldred the apocalypse', 'atraxa grand unifier',
  'fury', 'grief', 'solitude', 'endurance', 'subtlety',
  'bowmasters', 'up the beanstalk', 'not dead after all',
  'preordain', 'fatal push', 'thoughtseize', 'collected company'
];

var BUDGET_POOL = [
  'lightning bolt', 'counterspell', 'path to exile', 'swords to plowshares',
  'cultivate', 'sol ring', 'arcane signet', 'command tower',
  'chaos warp', 'beast within', 'nature claim', 'rampant growth',
  'farseek', 'brainstorm', 'ponder', 'opt', 'consider',
  'go for the throat', 'doom blade', 'terminate'
];

/* Simple seeded shuffle so the same day shows the same cards everywhere */
function seededShuffle(arr, seed) {
  var shuffled = arr.slice();
  var s = seed;
  for (var i = shuffled.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    var j = s % (i + 1);
    var tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }
  return shuffled;
}

function getDaySeed() {
  var d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function getDailyPicks(pool, count) {
  var seed = getDaySeed();
  var shuffled = seededShuffle(pool, seed);
  return shuffled.slice(0, count);
}

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

    var featuredPicks = getDailyPicks(FEATURED_POOL, 3);
    var trendingPicks = getDailyPicks(TRENDING_POOL, 3);
    var budgetPicks = getDailyPicks(BUDGET_POOL, 3);

    var results = {};

    // Featured & Trending: search for the most expensive physical printing
    var namedSearches = featuredPicks.concat(trendingPicks).map(function(q) {
      return searchCards(q).then(function(data) {
        if (!cancelled && data && data.data && data.data.length > 0) {
          results[q] = data.data[0];
        }
      }).catch(function() {});
    });

    // Budget uses cheapest printing search
    var budgetSearches = budgetPicks.map(function(q) {
      return searchCardsCheapest(q).then(function(data) {
        if (!cancelled && data && data.data && data.data.length > 0) {
          results[q] = data.data[0];
        }
      }).catch(function() {});
    });

    Promise.all(namedSearches.concat(budgetSearches)).then(function() {
      if (!cancelled) {
        setFeatured(featuredPicks.map(function(q) { return results[q]; }).filter(Boolean));
        setTrending(trendingPicks.map(function(q) { return results[q]; }).filter(Boolean));
        setBudget(budgetPicks.map(function(q) { return results[q]; }).filter(Boolean));
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
    { value: 'Thousands', label: 'Printed Cards' },
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
          placeholder: 'Search printed Magic cards...',
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
