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

export function SearchView(props) {
  var state = props.state;
  var updateCart = props.updateCart;
  var updatePortfolio = props.updatePortfolio;
  var updateWatchlist = props.updateWatchlist;
  var onOpenListing = props.onOpenListing;

  var ref1 = React.useState('');
  var query = ref1[0], setQuery = ref1[1];
  var ref2 = React.useState([]);
  var results = ref2[0], setResults = ref2[1];
  var ref3 = React.useState(false);
  var loading = ref3[0], setLoading = ref3[1];
  var ref4 = React.useState(null);
  var error = ref4[0], setError = ref4[1];
  var ref5 = React.useState([]);
  var suggestions = ref5[0], setSuggestions = ref5[1];
  var ref6 = React.useState(false);
  var showSuggestions = ref6[0], setShowSuggestions = ref6[1];

  // Filter state
  var ref7 = React.useState([]);
  var selectedColors = ref7[0], setSelectedColors = ref7[1];
  var ref8 = React.useState('');
  var selectedRarity = ref8[0], setSelectedRarity = ref8[1];
  var ref9 = React.useState('usd');
  var sortBy = ref9[0], setSortBy = ref9[1];
  var ref10 = React.useState([0, 1000]);
  var priceRange = ref10[0], setPriceRange = ref10[1];

  var inputRef = React.useRef(null);

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
      setResults(data && data.data ? data.data : []);
      setLoading(false);
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
    h('div', { className: 'search-page' },
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
          h('p', null, 'Search for Magic cards above.')
        ),
        !loading && !error && h(CardGrid, {
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
