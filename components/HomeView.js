/* HomeView.js — Daily-rotating homepage with live Scryfall prices */
import React from 'react';
import { searchCards, searchCardsCheapest } from '../utils/api.js';
import { getCardPrice, formatUSD, getCardImageSmall, getScryfallImageUrl } from '../utils/helpers.js';
import { CardGrid } from './shared/CardGrid.js';
import { SkeletonCard } from './shared/SkeletonCard.js';
import { SearchIcon, TrendingIcon, StarIcon, SparkleIcon, MapPinIcon, ClockIcon } from './shared/Icons.js';
var h = React.createElement;

/* ── Community Events ── */
/* Real, verified events only — per SOUL.md */
var COMMUNITY_EVENTS = [
  {
    title: 'TCG Con 2026',
    date: '2026-03-21',
    dateLabel: 'Sat, March 21',
    time: '11:00 AM \u2014 7:00 PM',
    location: 'Don Don Donki, Guam',
    host: 'Littleroot Collectables',
    description: 'The ultimate trading card showdown \u2014 vendors, community vibes, and exciting finds. Pokemon, MTG, One Piece, and more.',
    admission: 'Pre-sold $10 / Door $15 / Kids 12 & under FREE',
    link: 'https://theguamguide.com/tcg-con-2026',
    tags: ['TCG', 'Convention', 'All Ages'],
    image: './images/event-tcgcon.jpg',
    featured: true
  },
  {
    title: 'MTG Commander Night',
    date: 'recurring',
    dateLabel: 'Every Thursday',
    time: 'Evening',
    location: 'The Inventory, Hag\u00e5t\u00f1a',
    host: 'The Inventory',
    description: 'Weekly Commander night. Bring your deck and play with the local community.',
    admission: 'Free',
    link: 'https://www.instagram.com/theinventoryguam/',
    tags: ['MTG', 'Commander', 'Weekly'],
    image: './images/event-commander.jpg',
    featured: false
  },
  {
    title: 'MTG Weekend Events',
    date: 'recurring',
    dateLabel: 'Saturdays & Sundays',
    time: 'Check store for times',
    location: 'Geek Out Next Level, Micronesia Mall',
    host: 'Geek Out Next Level (WPN Store)',
    description: 'Saturdays: Commander. Sundays: Limited/Draft. WPN-authorized Magic events.',
    admission: 'Varies by event',
    link: 'https://www.instagram.com/geekoutnextlevel/',
    tags: ['MTG', 'WPN', 'Tournament'],
    image: './images/event-weekend.jpg',
    featured: false
  }
];

function getUpcomingEvents() {
  var now = new Date();
  var todayStr = now.toISOString().slice(0, 10);
  return COMMUNITY_EVENTS.filter(function(evt) {
    return evt.date === 'recurring' || evt.date >= todayStr;
  });
}

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
    { value: 'Real Prices', label: 'No Guesswork' },
    { value: 'Guam Built', label: 'For The Island' },
    { value: 'Live Data', label: 'Every Visit' },
    { value: '100% Free', label: 'Always' },
  ];

  return h('div', null,
    h('section', { className: 'hero' },
      h('h1', { className: 'hero-tagline' }, 'Know What Your Cards Are Worth'),
      h('p', { className: 'hero-sub' }, 'Guam\'s MTG marketplace with live market pricing, portfolio tracking, and zero markup. Real cards. Real data. Fair play.'),
      h('form', { className: 'hero-search', onSubmit: handleHeroSearch },
        h('div', { className: 'search-icon' }, h(SearchIcon, null)),
        h('input', {
          type: 'search',
          placeholder: 'Search any printed Magic card...',
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
      getUpcomingEvents().length > 0 && (function() {
        var events = getUpcomingEvents();
        var featuredEvt = events.filter(function(e) { return e.featured; })[0] || events[0];
        var otherEvts = events.filter(function(e) { return e !== featuredEvt; });

        function renderEventCard(evt, isFeatured) {
          var isSpecial = evt.date !== 'recurring';
          return h('a', {
            key: evt.title,
            className: 'event-card scroll-reveal' + (isFeatured ? ' event-card--featured' : ' event-card--small'),
            href: evt.link,
            target: '_blank',
            rel: 'noopener'
          },
            h('div', { className: 'event-card-bg', style: { backgroundImage: 'url(' + evt.image + ')' } }),
            h('div', { className: 'event-card-overlay' }),
            h('div', { className: 'event-date-chip' }, evt.dateLabel),
            isSpecial && h('div', { className: 'event-badge' }, 'Upcoming'),
            h('h3', { className: 'event-title' }, evt.title),
            h('p', { className: 'event-desc' }, evt.description),
            h('div', { className: 'event-meta' },
              h('span', { className: 'event-meta-item' }, h(MapPinIcon, { className: 'event-icon' }), ' ', evt.location),
              h('span', { className: 'event-meta-item' }, h(ClockIcon, { className: 'event-icon' }), ' ', evt.time)
            ),
            h('div', { className: 'event-footer' },
              h('span', { className: 'event-host' }, 'Hosted by ', evt.host),
              h('span', { className: 'event-admission' }, evt.admission)
            ),
            h('div', { className: 'event-tags' },
              evt.tags.map(function(tag) {
                return h('span', { key: tag, className: 'event-tag' }, tag);
              })
            )
          );
        }

        return h('section', { className: 'events-section' },
          h('div', { className: 'events-section-header' },
            h('h2', null, 'Community Events'),
            h('p', { className: 'events-section-subtitle' }, "What's Happening on Guam")
          ),
          h('div', { className: 'events-grid' },
            renderEventCard(featuredEvt, true),
            otherEvts.length > 0 && h('div', { className: 'events-grid-sub' },
              otherEvts.map(function(evt) {
                return renderEventCard(evt, false);
              })
            )
          )
        );
      })(),
      h('section', { className: 'watchlist-section scroll-reveal' },
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
      h('section', { className: 'watchlist-section scroll-reveal' },
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
      h('section', { className: 'watchlist-section scroll-reveal' },
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
