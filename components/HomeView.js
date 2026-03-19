/* HomeView.js — Homepage with live backend prices */
import React from 'react';
import { fetchFeatured, fetchTrending, fetchBudget } from '../utils/api.js';
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

    return function() { cancelled = true; };
  }, []);

  React.useEffect(function() {
    getEventsAsync().then(function(data) {
      setEvents(data || []);
    }).catch(function() { /* events are non-critical */ });
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
      link: evt.link || null,
      tags: Array.isArray(evt.tags) ? evt.tags : (typeof evt.tags === 'string' ? (function() { try { var p = JSON.parse(evt.tags); return Array.isArray(p) ? p : []; } catch(e) { return []; } })() : []),
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
      )
    )
  );
}
