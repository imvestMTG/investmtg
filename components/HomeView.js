/* HomeView.js — Homepage with live backend prices */
import React from 'react';
import { fetchFeatured, fetchTrending, fetchBudget, autocomplete } from '../utils/api.js';
import { getEventsAsync } from '../utils/events-config.js';
import { getCardPrice, formatUSD, getCardImageSmall, getScryfallImageUrl, debounce } from '../utils/helpers.js';
import { CardCarousel } from './shared/CardCarousel.js';
import { SkeletonCard } from './shared/SkeletonCard.js';
import { SearchIcon, TrendingIcon, StarIcon, SparkleIcon, MapPinIcon, ClockIcon } from './shared/Icons.js';
import { StatCard, StatGrid } from './shared/StatCard.js';
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
  var ref7 = React.useState([]);
  var suggestions = ref7[0], setSuggestions = ref7[1];
  var ref8 = React.useState(false);
  var showSuggestions = ref8[0], setShowSuggestions = ref8[1];

  var debouncedAutocomplete = React.useMemo(function() {
    return debounce(function(q) {
      if (q.length < 2) { setSuggestions([]); return; }
      autocomplete(q).then(function(data) {
        setSuggestions((data && data.data) ? data.data.slice(0, 6) : []);
      }).catch(function() { setSuggestions([]); });
    }, 250);
  }, []);

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
    setSuggestions([]);
    setShowSuggestions(false);
    if (heroSearch.trim()) {
      window.location.hash = 'search';
      setTimeout(function() {
        var ev = new CustomEvent('investmtg-search', { detail: heroSearch });
        window.dispatchEvent(ev);
      }, 50);
    }
  }

  function handleHeroInput(e) {
    var val = e.target.value;
    setHeroSearch(val);
    debouncedAutocomplete(val);
    if (val.length >= 2) setShowSuggestions(true);
    else setShowSuggestions(false);
  }

  function selectSuggestion(name) {
    setHeroSearch(name);
    setSuggestions([]);
    setShowSuggestions(false);
    window.location.hash = 'search';
    setTimeout(function() {
      var ev = new CustomEvent('investmtg-search', { detail: name });
      window.dispatchEvent(ev);
    }, 50);
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
      time: evt.recurring ? (evt.event_date || '') : (evt.subtitle || ''),
      location: evt.location || '',
      host: evt.host || '',
      description: evt.subtitle || '',
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
      h('p', { className: 'hero-sub' }, 'Real-time prices on every Magic card. Buy from local sellers, track your collection, or start selling \u2014 all on Guam\u2019s first MTG marketplace.'),
      h('div', { className: 'hero-search-wrapper' },
        h('form', { className: 'hero-search', onSubmit: handleHeroSearch },
          h('div', { className: 'search-icon' }, h(SearchIcon, null)),
          h('input', {
            type: 'text',
            role: 'combobox',
            placeholder: 'Search for Sheoldred, Black Lotus...',
            value: heroSearch,
            onChange: handleHeroInput,
            onFocus: function() { if (suggestions.length > 0) setShowSuggestions(true); },
            onBlur: function() { setTimeout(function() { setShowSuggestions(false); }, 300); },
            autoComplete: 'off',
            autoCorrect: 'off',
            autoCapitalize: 'off',
            spellCheck: 'false',
            'aria-label': 'Search cards',
            'aria-autocomplete': 'list',
            'aria-expanded': showSuggestions && suggestions.length > 0 ? 'true' : 'false'
          }),
          h('button', { type: 'submit', className: 'hero-search-btn' }, 'Search')
        ),
        showSuggestions && suggestions.length > 0 && h('div', { className: 'hero-autocomplete-dropdown' },
          suggestions.map(function(name) {
            return h('button', {
              key: name,
              type: 'button',
              className: 'hero-autocomplete-item',
              onMouseDown: function(e) { e.preventDefault(); },
              onClick: function() { selectSuggestion(name); }
            }, name);
          })
        )
      ),
      h(StatGrid, { className: 'hero-stats' },
        stats.map(function(s) {
          return h(StatCard, { key: s.label, label: s.label, value: s.value });
        })
      ),
      h('div', { className: 'hero-cta-row' },
        h('a', { href: '#search', className: 'hero-cta-card hero-cta-buyer' },
          h('div', { className: 'hero-cta-ghost-icon' }, '\uD83D\uDED2'),
          h('div', { className: 'hero-cta-body' },
            h('span', { className: 'hero-cta-badge hero-cta-badge--buy' }, 'BUY'),
            h('h3', { className: 'hero-cta-title' }, 'Browse & Buy'),
            h('p', { className: 'hero-cta-desc' }, 'Search 25,000+ cards with live market prices. Find deals from local Guam sellers and buy with confidence.')
          ),
          h('span', { className: 'hero-cta-link hero-cta-link--buy' }, 'Explore Market ', '\u2192')
        ),
        h('a', { href: '#seller', className: 'hero-cta-card hero-cta-seller' },
          h('div', { className: 'hero-cta-ghost-icon' }, '\uD83C\uDFF7\uFE0F'),
          h('div', { className: 'hero-cta-body' },
            h('span', { className: 'hero-cta-badge hero-cta-badge--sell' }, 'SELL'),
            h('h3', { className: 'hero-cta-title' }, 'Start Selling'),
            h('p', { className: 'hero-cta-desc' }, 'List your cards in minutes. Get paid via Stripe. Zero listing fees. Turn your collection into cash.')
          ),
          h('span', { className: 'hero-cta-link hero-cta-link--sell' }, 'List Cards ', '\u2192')
        )
      )
    ),
    h('div', { className: 'container' },
      h('section', { className: 'how-it-works' },
        h('div', { className: 'section-header' },
          h('h2', null, 'The Process'),
          h('p', { className: 'section-subtitle' }, 'From discovery to execution in four steps.')
        ),
        h('div', { className: 'hiw-grid' },
          h('div', { className: 'hiw-step' },
            h('div', { className: 'hiw-bg-number' }, '01'),
            h('div', { className: 'hiw-icon-box' }, h(SearchIcon, null)),
            h('h3', null, 'Search'),
            h('p', null, 'Find any card using real-time data. View live pricing from multiple market sources.')
          ),
          h('div', { className: 'hiw-step' },
            h('div', { className: 'hiw-bg-number' }, '02'),
            h('div', { className: 'hiw-icon-box' }, '\u2696\uFE0F'),
            h('h3', null, 'Compare'),
            h('p', null, 'See NM, LP, MP, HP condition prices side-by-side. Make data-backed decisions.')
          ),
          h('div', { className: 'hiw-step' },
            h('div', { className: 'hiw-bg-number' }, '03'),
            h('div', { className: 'hiw-icon-box' }, '\uD83D\uDED2'),
            h('h3', null, 'Buy or Reserve'),
            h('p', null, 'Pay online with Stripe or reserve for local pickup at a Guam store.')
          ),
          h('div', { className: 'hiw-step hiw-step--seller' },
            h('div', { className: 'hiw-bg-number' }, '04'),
            h('div', { className: 'hiw-icon-box' }, '\uD83D\uDCB0'),
            h('h3', null, 'Sell & Profit'),
            h('p', null, 'Connect Stripe, list cards, get paid automatically. Zero listing fees.'),
            h('a', { href: '#seller', className: 'hiw-seller-link' }, 'Start selling \u2192')
          )
        )
      ),
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
          h('h2', null, '\uD83C\uDFF7\uFE0F', ' Budget Staples'),
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
