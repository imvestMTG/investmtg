/* SearchView.js */
import React from 'react';
import { searchCards, autocomplete, fetchPage } from '../utils/api.js';
import { formatUSD, getCardPrice, generateMockChange, getTypeCategory, debounce } from '../utils/helpers.js';
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

var RARITIES = ['common', 'uncommon', 'rare', 'mythic', 'special', 'bonus'];

var CARD_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'creature', label: 'Creature' },
  { value: 'instant', label: 'Instant' },
  { value: 'sorcery', label: 'Sorcery' },
  { value: 'enchantment', label: 'Enchantment' },
  { value: 'artifact', label: 'Artifact' },
  { value: 'planeswalker', label: 'Planeswalker' },
  { value: 'land', label: 'Land' },
  { value: 'battle', label: 'Battle' },
];

var FORMATS = [
  { value: '', label: 'All Formats' },
  { value: 'standard', label: 'Standard' },
  { value: 'pioneer', label: 'Pioneer' },
  { value: 'modern', label: 'Modern' },
  { value: 'legacy', label: 'Legacy' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'commander', label: 'Commander' },
  { value: 'pauper', label: 'Pauper' },
];

var FINISHES = [
  { value: '', label: 'All Finishes' },
  { value: 'nonfoil', label: 'Non-Foil' },
  { value: 'foil', label: 'Foil' },
  { value: 'etched', label: 'Etched' },
];

var SORT_OPTIONS = [
  { value: 'usd-desc', label: 'Price: High → Low' },
  { value: 'usd-asc', label: 'Price: Low → High' },
  { value: 'name-asc', label: 'Name: A → Z' },
  { value: 'name-desc', label: 'Name: Z → A' },
  { value: 'released-desc', label: 'Newest First' },
  { value: 'released-asc', label: 'Oldest First' },
  { value: 'rarity-desc', label: 'Rarity: Mythic → Common' },
];

var RARITY_ORDER = { mythic: 4, rare: 3, uncommon: 2, common: 1, special: 5, bonus: 0 };

export function SearchView({ state, updateCart, updatePortfolio, updateWatchlist, onOpenListing }) {
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
  var ref9 = React.useState('usd-desc');
  var sortBy = ref9[0], setSortBy = ref9[1];
  var ref10 = React.useState([0, 10000]);
  var priceRange = ref10[0], setPriceRange = ref10[1];
  var ref11 = React.useState('');
  var selectedType = ref11[0], setSelectedType = ref11[1];
  var ref12 = React.useState('');
  var selectedFormat = ref12[0], setSelectedFormat = ref12[1];
  var ref13 = React.useState('');
  var selectedFinish = ref13[0], setSelectedFinish = ref13[1];
  var ref14 = React.useState(false);
  var showFilters = ref14[0], setShowFilters = ref14[1];
  var ref15 = React.useState(null);
  var nextPageUrl = ref15[0], setNextPageUrl = ref15[1];
  var ref16 = React.useState(false);
  var loadingMore = ref16[0], setLoadingMore = ref16[1];
  var ref17 = React.useState(0);
  var totalResults = ref17[0], setTotalResults = ref17[1];
  var ref18 = React.useState('prints');
  var uniqueMode = ref18[0], setUniqueMode = ref18[1];

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
      }).catch(function() {});
    }, 300);
  }, []);

  function buildSearchQuery(q) {
    // Build Scryfall query with filters baked in for better server-side results
    var parts = [q];
    if (selectedColors.length > 0) {
      parts.push('c:' + selectedColors.join(''));
    }
    if (selectedType) {
      parts.push('t:' + selectedType);
    }
    if (selectedFormat) {
      parts.push('f:' + selectedFormat);
    }
    if (selectedRarity) {
      parts.push('r:' + selectedRarity);
    }
    return parts.join(' ');
  }

  function doSearch(q) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    var fullQuery = buildSearchQuery(q);
    var sortParts = sortBy.split('-');
    var order = sortParts[0];
    var dir = sortParts[1];

    searchCards(fullQuery, { unique: uniqueMode, order: order, dir: dir }).then(function(data) {
      setResults(data && data.data ? data.data : []);
      setTotalResults(data.total_cards || 0);
      setNextPageUrl(data.has_more ? data.next_page : null);
      setLoading(false);
    }).catch(function(err) {
      setError('No results found. Try a different search.');
      setResults([]);
      setTotalResults(0);
      setNextPageUrl(null);
      setLoading(false);
    });
  }

  function loadMore() {
    if (!nextPageUrl || loadingMore) return;
    setLoadingMore(true);
    fetchPage(nextPageUrl).then(function(data) {
      setResults(function(prev) { return prev.concat(data && data.data ? data.data : []); });
      setNextPageUrl(data.has_more ? data.next_page : null);
      setLoadingMore(false);
    }).catch(function() {
      setLoadingMore(false);
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

  function clearFilters() {
    setSelectedColors([]);
    setSelectedRarity('');
    setSelectedType('');
    setSelectedFormat('');
    setSelectedFinish('');
    setPriceRange([0, 10000]);
    setSortBy('usd-desc');
    setUniqueMode('prints');
  }

  var activeFilterCount = (selectedColors.length > 0 ? 1 : 0)
    + (selectedRarity ? 1 : 0)
    + (selectedType ? 1 : 0)
    + (selectedFormat ? 1 : 0)
    + (selectedFinish ? 1 : 0)
    + (priceRange[0] > 0 || priceRange[1] < 10000 ? 1 : 0);

  // Client-side filtering for finish and price (other filters go to Scryfall)
  var filteredResults = results.filter(function(card) {
    var price = getCardPrice(card);
    if (priceRange[0] > 0 && price < priceRange[0]) return false;
    if (priceRange[1] < 10000 && price > priceRange[1]) return false;
    if (selectedFinish) {
      var finishes = card.finishes || [];
      if (finishes.indexOf(selectedFinish) === -1) return false;
    }
    return true;
  });

  // Client-side sort (Scryfall also sorts, this handles re-sorting after filter)
  var sortedResults = filteredResults.slice().sort(function(a, b) {
    var parts = sortBy.split('-');
    var field = parts[0];
    var dir = parts[1];
    var mult = dir === 'asc' ? 1 : -1;
    if (field === 'usd') {
      return mult * (getCardPrice(a) - getCardPrice(b));
    }
    if (field === 'name') {
      return mult * a.name.localeCompare(b.name);
    }
    if (field === 'released') {
      var da = a.released_at || '';
      var db = b.released_at || '';
      return mult * da.localeCompare(db);
    }
    if (field === 'rarity') {
      return mult * ((RARITY_ORDER[a.rarity] || 0) - (RARITY_ORDER[b.rarity] || 0));
    }
    return 0;
  });

  return h('div', { className: 'container' },
    h('div', { className: 'search-page' },
      // Filter sidebar
      h('aside', { className: 'filter-sidebar' + (showFilters ? ' filter-sidebar-open' : '') },
        h('div', { className: 'filter-sidebar-header' },
          h('h2', null, 'Filters'),
          activeFilterCount > 0 && h('button', {
            className: 'btn btn-ghost btn-sm clear-filters-btn',
            onClick: clearFilters
          }, 'Clear All (' + activeFilterCount + ')')
        ),

        // Unique mode toggle
        h('div', { className: 'filter-group' },
          h('h3', null, 'View Mode'),
          h('div', { className: 'unique-toggle' },
            h('button', {
              className: 'btn btn-sm ' + (uniqueMode === 'prints' ? 'btn-primary' : 'btn-ghost'),
              onClick: function() { setUniqueMode('prints'); }
            }, 'All Printings'),
            h('button', {
              className: 'btn btn-sm ' + (uniqueMode === 'cards' ? 'btn-primary' : 'btn-ghost'),
              onClick: function() { setUniqueMode('cards'); }
            }, 'Unique Cards')
          )
        ),

        // Colors
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

        // Card Type
        h('div', { className: 'filter-group' },
          h('h3', null, 'Card Type'),
          h('select', {
            className: 'filter-select',
            value: selectedType,
            onChange: function(e) { setSelectedType(e.target.value); }
          },
            CARD_TYPES.map(function(t) { return h('option', { key: t.value, value: t.value }, t.label); })
          )
        ),

        // Rarity
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

        // Format
        h('div', { className: 'filter-group' },
          h('h3', null, 'Format'),
          h('select', {
            className: 'filter-select',
            value: selectedFormat,
            onChange: function(e) { setSelectedFormat(e.target.value); }
          },
            FORMATS.map(function(f) { return h('option', { key: f.value, value: f.value }, f.label); })
          )
        ),

        // Finish
        h('div', { className: 'filter-group' },
          h('h3', null, 'Finish'),
          h('select', {
            className: 'filter-select',
            value: selectedFinish,
            onChange: function(e) { setSelectedFinish(e.target.value); }
          },
            FINISHES.map(function(f) { return h('option', { key: f.value, value: f.value }, f.label); })
          )
        ),

        // Sort
        h('div', { className: 'filter-group' },
          h('h3', null, 'Sort By'),
          h('select', {
            className: 'filter-select',
            value: sortBy,
            onChange: function(e) { setSortBy(e.target.value); }
          },
            SORT_OPTIONS.map(function(s) { return h('option', { key: s.value, value: s.value }, s.label); })
          )
        ),

        // Price Range
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
              value: priceRange[1] === 10000 ? '' : priceRange[1],
              onChange: function(e) { setPriceRange([priceRange[0], Number(e.target.value) || 10000]); }
            })
          )
        ),

        // Apply Filters button (re-runs search with new server-side filters)
        results.length > 0 && h('button', {
          className: 'btn btn-primary filter-apply-btn',
          onClick: function() { doSearch(query); }
        }, 'Apply Filters')
      ),

      // Main content
      h('div', { className: 'search-main' },
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
          ),
          // Mobile filter toggle
          h('button', {
            className: 'btn btn-ghost filter-toggle-btn',
            onClick: function() { setShowFilters(!showFilters); }
          }, 'Filters', activeFilterCount > 0 ? ' (' + activeFilterCount + ')' : '')
        ),

        // Results count
        !loading && results.length > 0 && h('div', { className: 'results-meta' },
          h('span', null, totalResults > 0 ? totalResults.toLocaleString() + ' results' : sortedResults.length + ' results'),
          uniqueMode === 'prints' && h('span', { className: 'results-meta-hint' }, ' · Showing all printings')
        ),

        loading && h('div', { className: 'card-grid' }, [1,2,3,4,5,6].map(function(i) { return h(SkeletonCard, { key: i }); })),
        error && h('div', { className: 'empty-state' },
          h('p', null, error)
        ),
        !loading && !error && sortedResults.length === 0 && results.length > 0 && h('div', { className: 'empty-state' },
          h('p', null, 'No cards match the current filters.')
        ),
        !loading && !error && results.length === 0 && query && h('div', { className: 'empty-state' },
          h('p', null, 'Search for Magic cards above.')
        ),
        !loading && !error && h(CardGrid, {
          cards: sortedResults,
          state: state,
          updateCart: updateCart,
          updatePortfolio: updatePortfolio,
          updateWatchlist: updateWatchlist,
          onOpenListing: onOpenListing
        }),

        // Load More button
        !loading && nextPageUrl && h('div', { className: 'load-more-wrapper' },
          h('button', {
            className: 'btn btn-secondary load-more-btn',
            onClick: loadMore,
            disabled: loadingMore
          }, loadingMore ? 'Loading...' : 'Load More Results')
        )
      )
    )
  );
}
