/* Header.js — 3-tier header: utility bar + main header + nav row */
import React from 'react';
import { SearchIcon, PortfolioIcon, ShoppingCartIcon, MoonIcon, SunIcon, MenuIcon, XIcon, SellerIcon, TrendingIcon, MapPinIcon, UserIcon, OrderIcon, ChevronRightIcon, LayersIcon, GridIcon } from './shared/Icons.js';
import { autocomplete } from '../utils/api.js';
import { storageGetRaw, storageSetRaw } from '../utils/storage.js';
var h = React.createElement;

/* ── tiny chevron-down icon for dropdown triggers ── */
function ChevronDownIcon() {
  return h('svg', { width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' },
    h('polyline', { points: '6 9 12 15 18 9' })
  );
}

/* ── nav dropdown groups ── */
var NAV_GROUPS = [
  {
    label: 'Market Data',
    items: [
      { hash: 'movers', label: 'Movers', desc: 'Price trends & top movers' },
      { hash: 'meta', label: 'cEDH Meta', desc: 'Commander metagame stats' },
      { hash: 'decks', label: 'Top Decks', desc: 'Popular decklists' }
    ]
  },
  {
    label: 'My Tools',
    items: [
      { hash: 'portfolio', label: 'Portfolio', desc: 'Track your collection value' },
      { hash: 'orders', label: 'My Orders', desc: 'Order history & status' }
    ]
  },
  {
    label: 'Community',
    items: [
      { hash: 'store', label: 'Local Stores', desc: 'Guam card shops & events' }
    ]
  }
];

export function Header(props) {
  var route = props.route;
  var cartCount = props.cartCount;
  var user = props.user;
  var onSignIn = props.onSignIn;
  var onSignOut = props.onSignOut;

  /* ── state ── */
  var ref1 = React.useState(false);
  var mobileOpen = ref1[0], setMobileOpen = ref1[1];

  var ref2 = React.useState(false);
  var userMenuOpen = ref2[0], setUserMenuOpen = ref2[1];

  var ref3 = React.useState(function() {
    return storageGetRaw('investmtg-theme', 'dark');
  });
  var theme = ref3[0], setTheme = ref3[1];

  var ref4 = React.useState('');
  var searchQuery = ref4[0], setSearchQuery = ref4[1];

  var ref5 = React.useState([]);
  var suggestions = ref5[0], setSuggestions = ref5[1];

  var ref6 = React.useState(false);
  var showSuggestions = ref6[0], setShowSuggestions = ref6[1];

  var ref7 = React.useState(null);
  var openDropdown = ref7[0], setOpenDropdown = ref7[1];

  var ref8 = React.useState(-1);
  var activeSuggestion = ref8[0], setActiveSuggestion = ref8[1];

  var searchInputRef = React.useRef(null);
  var debounceRef = React.useRef(null);

  /* ── theme toggle ── */
  React.useEffect(function() {
    document.documentElement.setAttribute('data-theme', theme);
    storageSetRaw('investmtg-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(function(t) { return t === 'dark' ? 'light' : 'dark'; });
  }

  /* ── close menus on outside click ── */
  React.useEffect(function() {
    if (!userMenuOpen && openDropdown === null) return;
    function close() {
      setUserMenuOpen(false);
      setOpenDropdown(null);
    }
    document.addEventListener('click', close);
    return function() { document.removeEventListener('click', close); };
  }, [userMenuOpen, openDropdown]);

  /* ── close mobile menu on route change ── */
  React.useEffect(function() {
    setMobileOpen(false);
  }, [route.page]);

  /* ── autocomplete debounce ── */
  function handleSearchInput(e) {
    var val = e.target.value;
    setSearchQuery(val);
    setActiveSuggestion(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(function() {
      autocomplete(val.trim()).then(function(res) {
        var list = res && res.data ? res.data : [];
        setSuggestions(list.slice(0, 6));
        setShowSuggestions(list.length > 0);
      }).catch(function() {
        setSuggestions([]);
      });
    }, 200);
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion(function(i) { return Math.min(i + 1, suggestions.length - 1); });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion(function(i) { return Math.max(i - 1, -1); });
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault();
      submitSearch(suggestions[activeSuggestion]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  function submitSearch(query) {
    var q = query || searchQuery;
    if (!q.trim()) return;
    setShowSuggestions(false);
    setSearchQuery(q);
    window.location.hash = 'search';
    setTimeout(function() {
      var ev = new CustomEvent('investmtg-search', { detail: q });
      window.dispatchEvent(ev);
    }, 50);
    if (searchInputRef.current) searchInputRef.current.blur();
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    submitSearch();
  }

  function handleSuggestionClick(name) {
    submitSearch(name);
  }

  /* ── navigation helper ── */
  function nav(hash) {
    if (window.location.hash === '#' + hash || (hash === '' && (window.location.hash === '' || window.location.hash === '#'))) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = hash;
    }
    setMobileOpen(false);
    setOpenDropdown(null);
  }

  function isActive(page) {
    return route.page === page;
  }

  function isGroupActive(group) {
    for (var i = 0; i < group.items.length; i++) {
      if (route.page === group.items[i].hash) return true;
    }
    return false;
  }

  /* ──────────────── RENDER ──────────────── */

  /* Tier 1: Utility bar (ticker is separate component, this just holds sign-in + theme on mobile) */
  /* Tier 2: Main header — logo + search bar + sell + cart + account */
  /* Tier 3: Nav row with dropdown groups */

  return h('header', { className: 'site-header', role: 'banner' },

    /* ── TIER 2: Main header ── */
    h('div', { className: 'hdr-main' },
      h('div', { className: 'hdr-main-inner' },

        /* Logo */
        h('a', {
          className: 'logo-link',
          onClick: function() { nav(''); },
          href: '#',
          'aria-label': 'investMTG home'
        },
          h('span', { className: 'logo-text' },
            'invest', h('span', null, 'MTG')
          )
        ),

        /* Search bar */
        h('form', { className: 'hdr-search', onSubmit: handleSearchSubmit },
          h('div', { className: 'hdr-search-wrap' },
            h(SearchIcon, null),
            h('input', {
              ref: searchInputRef,
              type: 'text',
              placeholder: 'Search cards\u2026',
              value: searchQuery,
              onChange: handleSearchInput,
              onFocus: function() { if (suggestions.length > 0) setShowSuggestions(true); },
              onBlur: function() { setTimeout(function() { setShowSuggestions(false); }, 150); },
              onKeyDown: handleSearchKeyDown,
              'aria-label': 'Search cards',
              autoComplete: 'off'
            }),
            searchQuery && h('button', {
              type: 'button',
              className: 'hdr-search-clear',
              onClick: function() { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); if (searchInputRef.current) searchInputRef.current.focus(); },
              'aria-label': 'Clear search'
            }, h(XIcon, null))
          ),
          /* Autocomplete dropdown */
          showSuggestions && suggestions.length > 0 && h('div', { className: 'hdr-autocomplete' },
            suggestions.map(function(name, i) {
              return h('button', {
                key: name,
                type: 'button',
                className: 'hdr-autocomplete-item' + (i === activeSuggestion ? ' hdr-autocomplete-item--active' : ''),
                onMouseDown: function() { handleSuggestionClick(name); }
              },
                h(SearchIcon, null),
                h('span', null, name)
              );
            })
          )
        ),

        /* Action cluster */
        h('div', { className: 'hdr-actions' },

          /* Sell CTA */
          h('button', {
            className: 'hdr-sell-btn' + (isActive('seller') ? ' hdr-sell-btn--active' : ''),
            onClick: function() { nav('seller'); },
            'aria-label': 'Sell your cards'
          }, h(SellerIcon, null), h('span', { className: 'hdr-sell-label' }, 'Sell')),

          /* Cart */
          h('div', { className: 'cart-badge' },
            h('button', {
              className: 'icon-btn' + (isActive('cart') ? ' icon-btn--active' : ''),
              onClick: function() { nav('cart'); },
              'aria-label': 'Shopping cart' + (cartCount > 0 ? ' (' + cartCount + ' items)' : '')
            },
              h(ShoppingCartIcon, null)
            ),
            cartCount > 0 && h('span', { className: 'cart-count', 'aria-hidden': 'true' }, cartCount)
          ),

          /* Theme toggle */
          h('button', {
            className: 'icon-btn',
            onClick: toggleTheme,
            'aria-label': 'Toggle theme',
            title: 'Toggle light/dark mode'
          },
            theme === 'dark' ? h(SunIcon, null) : h(MoonIcon, null)
          ),

          /* User / Sign in */
          user
            ? h('div', {
                className: 'user-menu-wrap',
                onClick: function(e) { e.stopPropagation(); setUserMenuOpen(function(o) { return !o; }); }
              },
                h('button', {
                  className: 'user-avatar-btn',
                  'aria-label': 'Account menu',
                  'aria-expanded': userMenuOpen,
                  title: user.name
                },
                  user.picture
                    ? h('img', { src: user.picture, alt: '', className: 'user-avatar', referrerPolicy: 'no-referrer' })
                    : h('span', { className: 'user-avatar user-avatar-fallback' }, user.name.charAt(0).toUpperCase())
                ),
                userMenuOpen && h('div', { className: 'user-dropdown' },
                  h('div', { className: 'user-dropdown-header' },
                    h('span', { className: 'user-dropdown-name' }, user.name),
                    h('span', { className: 'user-dropdown-email' }, user.email)
                  ),
                  h('hr', { className: 'user-dropdown-divider' }),
                  h('button', { className: 'user-dropdown-item', onClick: function() { nav('portfolio'); setUserMenuOpen(false); } }, 'My Portfolio'),
                  h('button', { className: 'user-dropdown-item', onClick: function() { nav('seller'); setUserMenuOpen(false); } }, 'Seller Dashboard'),
                  h('button', { className: 'user-dropdown-item', onClick: function() { nav('orders'); setUserMenuOpen(false); } }, 'My Orders'),
                  h('hr', { className: 'user-dropdown-divider' }),
                  h('button', { className: 'user-dropdown-item user-dropdown-signout', onClick: function(e) { e.stopPropagation(); onSignOut && onSignOut(); } }, 'Sign Out')
                )
              )
            : h('button', {
                className: 'btn btn-sm btn-sign-in',
                onClick: function() { onSignIn && onSignIn(); },
                'aria-label': 'Sign in with Google'
              }, 'Sign In'),

          /* Mobile hamburger */
          h('button', {
            className: 'icon-btn mobile-menu-btn',
            onClick: function() { setMobileOpen(function(o) { return !o; }); },
            'aria-label': 'Toggle menu',
            'aria-expanded': mobileOpen
          },
            mobileOpen ? h(XIcon, null) : h(MenuIcon, null)
          )
        )
      )
    ),

    /* ── TIER 3: Nav row (desktop) ── */
    h('div', { className: 'hdr-nav' + (mobileOpen ? ' hdr-nav--open' : '') },
      h('div', { className: 'hdr-nav-inner' },

        /* Dropdown groups */
        NAV_GROUPS.map(function(group, gi) {
          var isOpen = openDropdown === gi;
          return h('div', {
            key: group.label,
            className: 'hdr-nav-group' + (isGroupActive(group) ? ' hdr-nav-group--active' : ''),
            onClick: function(e) { e.stopPropagation(); }
          },
            /* Trigger button */
            h('button', {
              className: 'hdr-nav-trigger',
              onClick: function() { setOpenDropdown(function(cur) { return cur === gi ? null : gi; }); },
              'aria-expanded': isOpen
            },
              h('span', null, group.label),
              h(ChevronDownIcon, null)
            ),
            /* Dropdown panel */
            isOpen && h('div', { className: 'hdr-dropdown' },
              group.items.map(function(item) {
                return h('a', {
                  key: item.hash,
                  href: '#' + item.hash,
                  className: 'hdr-dropdown-item' + (isActive(item.hash) ? ' hdr-dropdown-item--active' : ''),
                  onClick: function(e) { e.preventDefault(); nav(item.hash); }
                },
                  h('span', { className: 'hdr-dropdown-label' }, item.label),
                  h('span', { className: 'hdr-dropdown-desc' }, item.desc)
                );
              })
            )
          );
        }),

        /* Direct links */
        h('a', {
          href: '#search',
          className: 'hdr-nav-link' + (isActive('search') ? ' hdr-nav-link--active' : ''),
          onClick: function(e) { e.preventDefault(); nav('search'); }
        }, 'Search'),

        h('a', {
          href: '#portfolio',
          className: 'hdr-nav-link' + (isActive('portfolio') ? ' hdr-nav-link--active' : ''),
          onClick: function(e) { e.preventDefault(); nav('portfolio'); }
        }, 'Portfolio'),

        /* Sell CTA in nav */
        h('a', {
          href: '#seller',
          className: 'hdr-nav-sell' + (isActive('seller') ? ' hdr-nav-sell--active' : ''),
          onClick: function(e) { e.preventDefault(); nav('seller'); }
        }, h(SellerIcon, null), 'Sell')
      )
    ),

    /* ── Mobile slide-out nav ── */
    mobileOpen && h('div', { className: 'hdr-mobile-nav' },
      /* Mobile search */
      h('form', { className: 'hdr-mobile-search', onSubmit: handleSearchSubmit },
        h(SearchIcon, null),
        h('input', {
          type: 'text',
          placeholder: 'Search cards\u2026',
          value: searchQuery,
          onChange: handleSearchInput,
          autoComplete: 'off'
        })
      ),

      /* Mobile nav groups */
      NAV_GROUPS.map(function(group) {
        return h('div', { key: group.label, className: 'hdr-mobile-group' },
          h('div', { className: 'hdr-mobile-group-label' }, group.label),
          group.items.map(function(item) {
            return h('a', {
              key: item.hash,
              href: '#' + item.hash,
              className: 'hdr-mobile-item' + (isActive(item.hash) ? ' hdr-mobile-item--active' : ''),
              onClick: function(e) { e.preventDefault(); nav(item.hash); }
            },
              h('span', null, item.label),
              h(ChevronRightIcon, null)
            );
          })
        );
      }),

      /* Mobile direct links */
      h('div', { className: 'hdr-mobile-group' },
        h('div', { className: 'hdr-mobile-group-label' }, 'Quick Links'),
        h('a', { href: '#search', className: 'hdr-mobile-item' + (isActive('search') ? ' hdr-mobile-item--active' : ''), onClick: function(e) { e.preventDefault(); nav('search'); } },
          h('span', null, 'Advanced Search'), h(ChevronRightIcon, null)),
        h('a', { href: '#portfolio', className: 'hdr-mobile-item' + (isActive('portfolio') ? ' hdr-mobile-item--active' : ''), onClick: function(e) { e.preventDefault(); nav('portfolio'); } },
          h('span', null, 'Portfolio'), h(ChevronRightIcon, null)),
        h('a', { href: '#pricing', className: 'hdr-mobile-item' + (isActive('pricing') ? ' hdr-mobile-item--active' : ''), onClick: function(e) { e.preventDefault(); nav('pricing'); } },
          h('span', null, 'Pricing & Sources'), h(ChevronRightIcon, null))
      ),

      /* Sell CTA mobile */
      h('div', { className: 'hdr-mobile-sell' },
        h('button', {
          className: 'btn btn-primary btn-block',
          onClick: function() { nav('seller'); }
        }, h(SellerIcon, null), ' Sell Your Cards')
      ),

      /* Sign in / user info mobile */
      !user && h('div', { className: 'hdr-mobile-auth' },
        h('button', {
          className: 'btn btn-sm btn-sign-in btn-block',
          onClick: function() { onSignIn && onSignIn(); setMobileOpen(false); }
        }, 'Sign In')
      )
    )
  );
}
