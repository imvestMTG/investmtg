/* Header.js */
import React from 'react';
import { SearchIcon, PortfolioIcon, ShoppingCartIcon, MoonIcon, SunIcon, MenuIcon, XIcon, SellerIcon } from './shared/Icons.js';
var h = React.createElement;

export function Header({ route, cartCount }) {
  var ref = React.useState(false);
  var mobileOpen = ref[0], setMobileOpen = ref[1];

  var ref2 = React.useState(function() {
    return localStorage.getItem('investmtg-theme') || 'dark';
  });
  var theme = ref2[0], setTheme = ref2[1];

  React.useEffect(function() {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('investmtg-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(function(t) { return t === 'dark' ? 'light' : 'dark'; });
  }

  function nav(hash) {
    window.location.hash = hash;
    setMobileOpen(false);
  }

  function isActive(page) {
    return route.page === page ? 'active' : '';
  }

  return h('header', { className: 'site-header' },
    h('div', { className: 'header-inner' },
      h('div', { className: 'header-left' },
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
        h('nav', { 'aria-label': 'Main navigation' },
          h('ul', {
            className: 'nav-links' + (mobileOpen ? ' open' : ''),
            role: 'list'
          },
            h('li', null, h('a', { href: '#', className: isActive('home'), onClick: function(e) { e.preventDefault(); nav(''); } },
              'Home'
            )),
            h('li', null, h('a', { href: '#search', className: isActive('search'), onClick: function(e) { e.preventDefault(); nav('search'); } },
              h(SearchIcon, null), 'Search'
            )),
            h('li', null, h('a', { href: '#portfolio', className: isActive('portfolio'), onClick: function(e) { e.preventDefault(); nav('portfolio'); } },
              h(PortfolioIcon, null), 'Portfolio'
            )),
            h('li', null, h('a', { href: '#store', className: isActive('store'), onClick: function(e) { e.preventDefault(); nav('store'); } },
              'Local Stores'
            )),
            h('li', null, h('a', {
              href: '#seller',
              className: isActive('seller') + ' nav-sell-link',
              onClick: function(e) { e.preventDefault(); nav('seller'); }
            },
              h(SellerIcon, null), 'Sell'
            ))
          )
        )
      ),
      h('div', { className: 'header-right' },
        h('button', {
          className: 'icon-btn',
          onClick: toggleTheme,
          'aria-label': 'Toggle theme',
          title: 'Toggle light/dark mode'
        },
          theme === 'dark' ? h(SunIcon, null) : h(MoonIcon, null)
        ),
        h('div', { className: 'cart-badge' },
          h('button', {
            className: 'icon-btn',
            onClick: function() { nav('cart'); },
            'aria-label': 'Shopping cart' + (cartCount > 0 ? ' (' + cartCount + ' items)' : '')
          },
            h(ShoppingCartIcon, null)
          ),
          cartCount > 0 && h('span', {
            className: 'cart-count',
            'aria-hidden': 'true'
          }, cartCount)
        ),
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
  );
}
