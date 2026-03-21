/* SearchView.js */
import React from 'react';
import { backendSearch, autocomplete } from '../utils/api.js';
import { formatUSD, getCardPrice, debounce } from '../utils/helpers.js';
import { CardGrid } from './shared/CardGrid.js';
import { SkeletonCard } from './shared/SkeletonCard.js';
import { SearchIcon } from './shared/Icons.js';
var h = React.createElement;

var COLORS = [
  { code: 'W', label: 'White', cls: 'white-btn' },
  { code: 'U', label: 'Blue',  cls: 'blue-btn' },
  { code: 'B', label: 'Black', cls: 'black-btn' },
  { code: 'R', label: 'Red',   cls: 'red-btn' },
  { code: 'G', label: 'Green', cls: 'green-btn' },
];

var RARITIES = ['common', 'uncommon', 'rare', 'mythic'];

/* ── Session-level search state persistence ── */
var SEARCH_CACHE_KEY = 'investmtg-search-state';

function saveSearchState(query, results, filters) {
  try {
    sessionStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify({
      query: query,
      results: results,
      filters: filters,
      ts: Date.now()
    }));
  } catch (e) { /* quota exceeded — ignore */ }
}

function loadSearchState() {
  try {
    var raw = sessionStorage.getItem(SEARCH_CACHE_KEY);
    if (!raw) return null;
    var data = JSON.parse(raw);
    // Expire after 10 minutes
    if (Date.now() - data.ts > 10 * 60 * 1000) {
      sessionStorage.removeItem(SEARCH_CACHE_KEY);
      return null;
    }
    return data;
  } catch (e) { return null; }
}

export function SearchView(props) {
  var state = props.state;
  var updateCart = props.updateCart;
  var updatePortfolio = props.updatePortfolio;
  var updateWatchlist = props.updateWatchlist;
  var onOpenListing = props.onOpenListing;

  /* Restore previous search state on mount */
  var cached = React.useMemo(function() { return loadSearchState(); }, []);

  var ref1 = React.useState(cached ? cached.query : '');
  var query = ref1[0], setQuery = ref1[1];
  var ref2 = React.useState(cached ? cached.results : []);
  var results = ref2[0], setResults = ref2[1];
  var ref3 = React.useState(false);
  var loading = ref3[0], setLoading = ref3[1];
  var ref4 = React.useState(null);
  var error = ref4[0], setError = ref4[1];
  var ref5 = React.useState([]);
  var suggestions = ref5[0], setSuggestions = ref5[1];
  var ref6 = React.useState(false);
  var showSuggestions = ref6[0], setShowSuggestions = ref6[1];

  // Filter state — restore from cache
  var cf = cached ? cached.filters : null;
  var ref7 = React.useState(cf ? cf.colors : []);
  var selectedColors = ref7[0], setSelectedColors = ref7[1];
  var ref8 = React.useState(cf ? cf.rarity : '');
  var selectedRarity = ref8[0], setSelectedRarity = ref8[1];
  var ref9 = React.useState(cf ? cf.sort : 'usd');
  var sortBy = ref9[0], setSortBy = ref9[1];
  var ref10 = React.useState(cf ? cf.price : [0, 1000]);
  var priceRange = ref10[0], setPriceRange = ref10[1];

  var inputRef = React.useRef(null);

  // Get marketplace listings from app state (already loaded at startup)
  var allListings = state && state.listings ? state.listings : [];
  var inStockListings = allListings.filter(function(l) {
    return l.availability_status !== 'sold_out' && l.type === 'sale';
  });

  // Listen for hero search events
  React.useEffect(function() {
    function onHeroSearch(e) {
      setQuery(e.detail);
      doSearch(e.detail);
    }
    window.addEventListener('investmtg-search', onHeroSearch);
    return function() { window.removeEventListener('investmtg-search', onHeroSearch); };
  }, []);

  var debouncedAutocomplete = React.useMemo(function() {
    return debounce(function(q) {
      if (q.length < 2) { setSuggestions([]); return; }
      autocomplete(q).then(function(data) {
        setSuggestions((data && data.data) ? data.data.slice(0, 8) : []);
      }).catch(function(err) { console.warn('[Search] autocomplete failed:', err); });
    }, 300);
  }, []);

  function doSearch(q) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setShowSuggestions(false);
    backendSearch(q, { order: sortBy, dir: 'desc' }).then(function(data) {
      var cards = data && data.data ? data.data : [];
      setResults(cards);
      setLoading(false);
      /* Persist search state for back-navigation */
      saveSearchState(q, cards, {
        colors: selectedColors,
        rarity: selectedRarity,
        sort: sortBy,
        price: priceRange
      });
    }).catch(function(err) {
      setError('No results found. Try a different search.');
      setResults([]);
      setLoading(false);
    });
  }

  function handleInput(e) {
    var val = e.target.value;
    setQuery(val);
    debouncedAutocomplete(val);
    setShowSuggestions(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSuggestions([]);
    setShowSuggestions(false);
    doSearch(query);
  }

  function toggleColor(code) {
    setSelectedColors(function(prev) {
      return prev.indexOf(code) !== -1
        ? prev.filter(function(c) { return c !== code; })
        : prev.concat(code);
    });
  }

  var filteredResults = results.filter(function(card) {
    var price = parseFloat(card.prices && card.prices.usd) || 0;
    if (price < priceRange[0] || price > priceRange[1]) return false;
    if (selectedColors.length > 0) {
      var cardColors = card.colors || [];
      if (!selectedColors.some(function(c) { return cardColors.indexOf(c) !== -1; })) return false;
    }
    if (selectedRarity && card.rarity !== selectedRarity) return false;
    return true;
  }).sort(function(a, b) {
    if (sortBy === 'usd') return (parseFloat(b.prices && b.prices.usd) || 0) - (parseFloat(a.prices && a.prices.usd) || 0);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  return h('div', { className: 'container' },
    h('main', { className: 'search-page', role: 'main' },
      h('aside', { className: 'filter-sidebar' },
        h('div', { className: 'filter-group' },
          h('h3', null, 'Colors'),
          h('div', { className: 'color-filters' },
            COLORS.map(function(c) {
              return h('button', {
                key: c.code,
                className: 'color-filter-btn ' + c.cls + (selectedColors.indexOf(c.code) !== -1 ? ' active' : ''),
                onClick: function() { toggleColor(c.code); },
                title: c.label,
                'aria-pressed': selectedColors.indexOf(c.code) !== -1
              }, c.code);
            })
          )
        ),
        h('div', { className: 'filter-group' },
          h('h3', null, 'Rarity'),
          h('select', {
            className: 'filter-select',
            value: selectedRarity,
            onChange: function(e) { setSelectedRarity(e.target.value); }
          },
            h('option', { value: '' }, 'All Rarities'),
            RARITIES.map(function(r) { return h('option', { key: r, value: r }, r.charAt(0).toUpperCase() + r.slice(1)); })
          )
        ),
        h('div', { className: 'filter-group' },
          h('h3', null, 'Sort By'),
          h('select', {
            className: 'filter-select',
            value: sortBy,
            onChange: function(e) { setSortBy(e.target.value); }
          },
            h('option', { value: 'usd' }, 'Price (High to Low)'),
            h('option', { value: 'name' }, 'Name (A-Z)')
          )
        ),
        h('div', { className: 'filter-group' },
          h('h3', null, 'Price Range'),
          h('div', { className: 'price-range-row' },
            h('input', {
              type: 'number',
              className: 'price-input',
              placeholder: 'Min',
              min: 0,
              value: priceRange[0] === 0 ? '' : priceRange[0],
              onChange: function(e) { setPriceRange([Number(e.target.value) || 0, priceRange[1]]); }
            }),
            h('span', null, '—'),
            h('input', {
              type: 'number',
              className: 'price-input',
              placeholder: 'Max',
              min: 0,
              value: priceRange[1] === 1000 ? '' : priceRange[1],
              onChange: function(e) { setPriceRange([priceRange[0], Number(e.target.value) || 1000]); }
            })
          )
        )
      ),
      h('div', null,
        h('div', { className: 'search-bar-wrapper' },
          h('form', { className: 'search-bar', onSubmit: handleSubmit },
            h('div', { className: 'search-icon' }, h(SearchIcon, null)),
            h('input', {
              ref: inputRef,
              type: 'search',
              placeholder: 'Search cards by name, set, type...',
              value: query,
              onChange: handleInput,
              onFocus: function() { if (suggestions.length > 0) setShowSuggestions(true); },
              onBlur: function() { setTimeout(function() { setShowSuggestions(false); }, 150); },
              'aria-label': 'Search Magic cards',
              autoComplete: 'off'
            }),
            showSuggestions && suggestions.length > 0 && h('div', { className: 'autocomplete-dropdown open' },
              suggestions.map(function(s) {
                return h('div', {
                  key: s,
                  className: 'autocomplete-item',
                  onMouseDown: function() {
                    setQuery(s);
                    setSuggestions([]);
                    setShowSuggestions(false);
                    doSearch(s);
                  }
                }, s);
              })
            )
          )
        ),
        loading && h('div', { className: 'card-grid' }, [1,2,3,4,5,6].map(function(i) { return h(SkeletonCard, { key: i }); })),
        error && h('div', { className: 'empty-state' },
          h('p', null, error)
        ),
        !loading && !error && filteredResults.length === 0 && results.length > 0 && h('div', { className: 'empty-state' },
          h('p', null, 'No cards match the current filters.')
        ),
        !loading && !error && results.length === 0 && query && h('div', { className: 'empty-state' },
          h('p', null, 'No results found. Try a different search.')
        ),
        // Show in-stock marketplace listings when no search query active
        !query && !loading && results.length === 0 && h('div', { className: 'search-instock' },
          h('h2', {
            style: { fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }
          }, 'In Stock Now'),
          h('p', { style: { fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' } },
            'Cards available from local Guam sellers.'
          ),
          inStockListings.length === 0 && h('div', { className: 'empty-state' },
            h('p', null, 'No listings available right now. Check back soon or search the full card database above.')
          ),
          inStockListings.length > 0 && h('div', { className: 'search-listings-grid' },
            inStockListings.map(function(listing) {
              var cardName = listing.card_name || listing.cardName || '';
              var setName = listing.set_name || listing.setName || '';
              var listingPrice = listing.price || 0;
              var condition = listing.condition || 'NM';
              var finish = listing.finish || 'nonfoil';
              var sellerName = listing.seller_name || 'Seller';
              var availStatus = listing.availability_status || 'available';
              var stockQty = listing.stock_quantity || 1;
              var imageUri = listing.image_uri || '';
              var cardId = listing.card_id || '';
              var thumbSrc = imageUri
                || (cardId ? 'https://api.scryfall.com/cards/' + cardId + '?format=image&version=small' : '')
                || (cardName ? 'https://api.scryfall.com/cards/named?format=image&version=small&exact=' + encodeURIComponent(cardName) : '');

              return h('a', {
                key: listing.id,
                className: 'search-listing-card',
                href: cardId ? '#card/' + cardId : '#search',
                style: { textDecoration: 'none', color: 'inherit' }
              },
                thumbSrc && h('img', {
                  src: thumbSrc,
                  className: 'search-listing-img',
                  alt: cardName,
                  loading: 'lazy'
                }),
                h('div', { className: 'search-listing-info' },
                  h('div', { className: 'search-listing-name' }, cardName),
                  h('div', { className: 'search-listing-set' }, setName),
                  h('div', { className: 'search-listing-meta' },
                    h('span', { className: 'mp-badge-condition cond-' + condition.toLowerCase() }, condition),
                    finish !== 'nonfoil' && h('span', { className: 'finish-badge finish-' + finish }, finish === 'foil' ? '\u2728 Foil' : '\u25C6 Etched'),
                    h('span', { className: 'avail-badge avail-badge--' + availStatus.replace('_', '-') },
                      availStatus === 'low_stock' ? 'Low Stock' : stockQty + ' avail'
                    )
                  ),
                  h('div', { className: 'search-listing-bottom' },
                    h('span', { className: 'search-listing-price' }, formatUSD(listingPrice)),
                    h('span', { className: 'search-listing-seller' }, sellerName)
                  )
                )
              );
            })
          )
        ),
        !loading && !error && filteredResults.length > 0 && h(CardGrid, {
          cards: filteredResults,
          state: state,
          updateCart: updateCart,
          updatePortfolio: updatePortfolio,
          updateWatchlist: updateWatchlist,
          onOpenListing: onOpenListing
        }),
        !loading && !error && filteredResults.length > 0 && h('p', { className: 'price-source', style: { marginTop: 'var(--space-4)' } },
          'Card data and prices from ',
          h('a', { href: 'https://scryfall.com', target: '_blank', rel: 'noopener noreferrer' }, 'Scryfall'),
          '. Physical cards only \u2014 no digital items.'
        )
      )
    )
  );
}
