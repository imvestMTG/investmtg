/* HomeView.js — Homepage with live backend prices */
import React from 'react';
import { fetchFeatured, fetchTrending, fetchBudget, backendFetch } from '../utils/api.js';
import { getEventsAsync } from '../utils/events-config.js';
import { getCardPrice, formatUSD, getCardImageSmall, getScryfallImageUrl } from '../utils/helpers.js';
import { CardCarousel } from './shared/CardCarousel.js';
import { SkeletonCard } from './shared/SkeletonCard.js';
import { SearchIcon, TrendingIcon, StarIcon, SparkleIcon, MapPinIcon, ClockIcon } from './shared/Icons.js';
var h = React.createElement;

export function HomeView(props) {
  var state = props.state;
  var updateCart = props.updateCart;
  var updatePortfolio = props.updatePortfolio;
  var updateWatchlist = props.updateWatchlist;
  var onOpenListing = props.onOpenListing;

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
  var ref6 = React.useState([]);
  var events = ref6[0], setEvents = ref6[1];
  var ref7 = React.useState(null);
  var liveStats = ref7[0], setLiveStats = ref7[1];

  React.useEffect(function() {
    var cancelled = false;

    Promise.all([fetchFeatured(), fetchTrending(), fetchBudget()]).then(function(results) {
      if (!cancelled) {
        setFeatured(results[0]);
        setTrending(results[1]);
        setBudget(results[2]);
        setLoading(false);
      }
    }).catch(function() {
      if (!cancelled) setLoading(false);
    });

    backendFetch('/api/health').then(function(data) {
      if (!cancelled && data && data.storage) {
        setLiveStats(data.storage);
      }
    }).catch(function() {});

    return function() { cancelled = true; };
  }, []);

  React.useEffect(function() {
    getEventsAsync().then(function(data) {
      setEvents(data || []);
    });
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

  var liveStatsData = [
    { value: liveStats ? (liveStats.listings || 0) : null, label: 'Marketplace Listings', icon: 'listing' },
    { value: liveStats ? (liveStats.prices || 0) : null, label: 'Cards Tracked', icon: 'chart' },
    { value: liveStats ? (liveStats.sellers || 0) : null, label: 'Active Sellers', icon: 'seller' },
    { value: liveStats ? (liveStats.users || 0) : null, label: 'Users', icon: 'user' },
  ];

  var features = [
    {
      icon: 'chart',
      title: 'Live Price Tracking',
      desc: 'Real-time pricing from multiple sources. Featured cards, trending movers, and budget picks updated daily.'
    },
    {
      icon: 'cart',
      title: 'Local Marketplace',
      desc: 'Buy and sell MTG cards locally in Guam. Zero markup, condition grading on every listing.'
    },
    {
      icon: 'portfolio',
      title: 'Portfolio Tracker',
      desc: 'Track your collection\'s value over time. Know exactly what your cards are worth at any moment.'
    },
    {
      icon: 'trophy',
      title: 'cEDH Meta & Events',
      desc: 'Commander meta analysis, tournament data, and local events. Never miss a game on Guam.'
    }
  ];

  function featureIconSvg(type) {
    if (type === 'chart') return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', width: '22', height: '22' }, h('polyline', { points: '22 12 18 12 15 21 9 3 6 12 2 12' }));
    if (type === 'cart') return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', width: '22', height: '22' }, h('circle', { cx: '9', cy: '21', r: '1' }), h('circle', { cx: '20', cy: '21', r: '1' }), h('path', { d: 'M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6' }));
    if (type === 'portfolio') return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', width: '22', height: '22' }, h('rect', { x: '2', y: '7', width: '20', height: '14', rx: '2', ry: '2' }), h('path', { d: 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' }));
    if (type === 'trophy') return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', width: '22', height: '22' }, h('path', { d: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6' }), h('path', { d: 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18' }), h('path', { d: 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22' }), h('path', { d: 'M18 2H6v7a6 6 0 0 0 12 0V2Z' }), h('path', { d: 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22' }), h('path', { d: 'M4 22h16' }));
    return null;
  }

  function statIconSvg(type) {
    if (type === 'listing') return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', width: '20', height: '20' }, h('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2' }), h('path', { d: 'M3 9h18' }), h('path', { d: 'M9 21V9' }));
    if (type === 'chart') return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', width: '20', height: '20' }, h('line', { x1: '18', y1: '20', x2: '18', y2: '10' }), h('line', { x1: '12', y1: '20', x2: '12', y2: '4' }), h('line', { x1: '6', y1: '20', x2: '6', y2: '14' }));
    if (type === 'seller') return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', width: '20', height: '20' }, h('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }), h('circle', { cx: '12', cy: '7', r: '4' }));
    if (type === 'user') return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', width: '20', height: '20' }, h('path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }), h('circle', { cx: '9', cy: '7', r: '4' }), h('path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }), h('path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }));
    return null;
  }

  /* Map backend event shape to render-compatible shape */
  function normalizeEvent(evt) {
    return {
      title: evt.title || '',
      date: evt.recurring ? 'recurring' : (evt.event_date || ''),
      dateLabel: evt.event_date || '',
      time: evt.subtitle || '',
      location: evt.location || '',
      host: evt.host || '',
      description: evt.subtitle || evt.title || '',
      admission: evt.cost || 'Free',
      link: null,
      tags: Array.isArray(evt.tags) ? evt.tags : [],
      image: evt.image_key || evt.image || '',
      featured: !evt.recurring
    };
  }

  var normalizedEvents = events.map(normalizeEvent);

  function getUpcomingEvents(evtList) {
    var now = new Date();
    var todayStr = now.toISOString().slice(0, 10);
    return evtList.filter(function(evt) {
      return evt.date === 'recurring' || evt.date >= todayStr || evt.date.length > 10;
    });
  }

  var upcomingEvents = getUpcomingEvents(normalizedEvents);

  return h('div', null,
    /* ── Hero Section ── */
    h('section', { className: 'hero' },
      h('div', { className: 'hero-eyebrow' }, 'Guam\'s #1 MTG Platform'),
      h('h1', { className: 'hero-tagline' }, 'Know What Your ', h('br', { className: 'hero-br' }), 'Cards Are Worth'),
      h('p', { className: 'hero-sub' }, 'Live market pricing, portfolio tracking, and a local marketplace with zero markup. Real cards. Real data. Fair play.'),
      h('form', { className: 'hero-search', onSubmit: handleHeroSearch },
        h('div', { className: 'search-icon' }, h(SearchIcon, null)),
        h('input', {
          type: 'search',
          placeholder: 'Search any printed Magic card...',
          value: heroSearch,
          onChange: function(e) { setHeroSearch(e.target.value); },
          'aria-label': 'Search cards'
        }),
        h('button', { type: 'submit', className: 'hero-search-btn' }, 'Search')
      )
    ),

    /* ── Live Stats Bar ── */
    h('section', { className: 'live-stats-bar' },
      h('div', { className: 'live-stats-inner' },
        liveStatsData.map(function(s) {
          return h('div', { key: s.label, className: 'live-stat' },
            h('div', { className: 'live-stat-icon' }, statIconSvg(s.icon)),
            h('div', { className: 'live-stat-content' },
              h('div', { className: 'live-stat-value' + (s.value === null ? ' live-stat-value--loading' : '') },
                s.value !== null ? s.value.toLocaleString() : '---'
              ),
              h('div', { className: 'live-stat-label' }, s.label)
            )
          );
        })
      )
    ),

    h('div', { className: 'container' },
      /* ── Feature Highlights ── */
      h('section', { className: 'features-grid-section' },
        h('div', { className: 'features-grid' },
          features.map(function(f) {
            return h('div', { key: f.title, className: 'feature-highlight' },
              h('div', { className: 'feature-highlight-icon' }, featureIconSvg(f.icon)),
              h('h3', { className: 'feature-highlight-title' }, f.title),
              h('p', { className: 'feature-highlight-desc' }, f.desc)
            );
          })
        )
      ),

      /* ── Events ── */
      upcomingEvents.length > 0 && (function() {
        var featuredEvt = upcomingEvents.filter(function(e) { return e.featured; })[0] || upcomingEvents[0];
        var otherEvts = upcomingEvents.filter(function(e) { return e !== featuredEvt; });

        function renderEventCard(evt, isFeatured) {
          var isSpecial = evt.date !== 'recurring';
          return h('a', {
            key: evt.title,
            className: 'event-card scroll-reveal' + (isFeatured ? ' event-card--featured' : ' event-card--small'),
            href: evt.link || '#',
            target: evt.link ? '_blank' : undefined,
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

      /* ── Card Carousels ── */
      h('section', { className: 'card-section scroll-reveal' },
        h('div', { className: 'card-section-header' },
          h('h2', null, h(SparkleIcon, null), ' Featured Cards'),
          h('p', { className: 'card-section-sub' }, 'High-value Reserved List and Legacy staples')
        ),
        loading
          ? h('div', { className: 'carousel-track carousel-track--skeleton' }, [1,2,3,4,5].map(function(i) { return h(SkeletonCard, { key: i }); }))
          : h(CardCarousel, {
              cards: featured,
              state: state,
              onOpenListing: onOpenListing
            })
      ),
      h('section', { className: 'card-section scroll-reveal' },
        h('div', { className: 'card-section-header' },
          h('h2', null, h(TrendingIcon, null), ' Trending Now'),
          h('p', { className: 'card-section-sub' }, 'Hot picks moving the market this week')
        ),
        loading
          ? h('div', { className: 'carousel-track carousel-track--skeleton' }, [1,2,3,4,5].map(function(i) { return h(SkeletonCard, { key: i }); }))
          : h(CardCarousel, {
              cards: trending,
              state: state,
              onOpenListing: onOpenListing
            })
      ),
      h('section', { className: 'card-section scroll-reveal' },
        h('div', { className: 'card-section-header' },
          h('h2', null, h(StarIcon, null), ' Budget Staples'),
          h('p', { className: 'card-section-sub' }, 'Powerful cards that won\u2019t break the bank')
        ),
        loading
          ? h('div', { className: 'carousel-track carousel-track--skeleton' }, [1,2,3,4,5].map(function(i) { return h(SkeletonCard, { key: i }); }))
          : h(CardCarousel, {
              cards: budget,
              state: state,
              onOpenListing: onOpenListing
            })
      ),

      /* ── CTA Section ── */
      h('section', { className: 'home-cta-section' },
        h('div', { className: 'home-cta-inner' },
          h('h2', { className: 'home-cta-title' }, 'Start Tracking Your Collection'),
          h('p', { className: 'home-cta-desc' }, 'Search cards, build your portfolio, and trade locally. Completely free, forever.'),
          h('div', { className: 'home-cta-actions' },
            h('a', { className: 'home-cta-btn home-cta-btn--primary', href: '#search' }, 'Browse Cards'),
            h('a', { className: 'home-cta-btn home-cta-btn--secondary', href: '#portfolio' }, 'My Portfolio')
          )
        )
      )
    )
  );
}
