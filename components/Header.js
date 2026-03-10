/* Header.js */
import React from 'react';
import { SearchIcon, PortfolioIcon, ShoppingCartIcon, MoonIcon, SunIcon, MenuIcon, XIcon, SellerIcon } from './shared/Icons.js';
import { storageGetRaw, storageSetRaw } from '../utils/storage.js';
var h = React.createElement;

export function Header(props) {
  var route = props.route;
  var cartCount = props.cartCount;
  var user = props.user;
  var onSignIn = props.onSignIn;
  var onSignOut = props.onSignOut;

  var ref = React.useState(false);
  var mobileOpen = ref[0], setMobileOpen = ref[1];

  var ref2 = React.useState(false);
  var userMenuOpen = ref2[0], setUserMenuOpen = ref2[1];

  var ref3 = React.useState(function() {
    return storageGetRaw('investmtg-theme', 'dark');
  });
  var theme = ref3[0], setTheme = ref3[1];

  React.useEffect(function() {
    document.documentElement.setAttribute('data-theme', theme);
    storageSetRaw('investmtg-theme', theme);
  }, [theme]);

  // Close user menu on outside click
  React.useEffect(function() {
    if (!userMenuOpen) return;
    function close() { setUserMenuOpen(false); }
    document.addEventListener('click', close);
    return function() { document.removeEventListener('click', close); };
  }, [userMenuOpen]);

  function toggleTheme() {
    setTheme(function(t) { return t === 'dark' ? 'light' : 'dark'; });
  }

  function nav(hash) {
    if (window.location.hash === '#' + hash || (hash === '' && (window.location.hash === '' || window.location.hash === '#'))) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = hash;
    }
    setMobileOpen(false);
  }

  function isActive(page) {
    return route.page === page ? 'active' : '';
  }

  return h('header', { className: 'site-header', role: 'banner' },
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
            h('li', null, h('a', { href: '#movers', className: isActive('movers'), onClick: function(e) { e.preventDefault(); nav('movers'); } },
              'Movers'
            )),
            h('li', null, h('a', { href: '#decks', className: isActive('decks'), onClick: function(e) { e.preventDefault(); nav('decks'); } },
              'Decks'
            )),
            h('li', null, h('a', { href: '#meta', className: isActive('meta'), onClick: function(e) { e.preventDefault(); nav('meta'); } },
              'cEDH Meta'
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
        /* Auth: sign-in button or user avatar */
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
                h('button', {
                  className: 'user-dropdown-item',
                  onClick: function() { nav('portfolio'); setUserMenuOpen(false); }
                }, 'My Portfolio'),
                h('button', {
                  className: 'user-dropdown-item',
                  onClick: function() { nav('seller'); setUserMenuOpen(false); }
                }, 'Seller Dashboard'),
                h('button', {
                  className: 'user-dropdown-item',
                  onClick: function() { nav('orders'); setUserMenuOpen(false); }
                }, 'My Orders'),
                h('hr', { className: 'user-dropdown-divider' }),
                h('button', {
                  className: 'user-dropdown-item user-dropdown-signout',
                  onClick: function(e) { e.stopPropagation(); onSignOut && onSignOut(); }
                }, 'Sign Out')
              )
            )
          : h('button', {
              className: 'btn btn-sm btn-sign-in',
              onClick: function() { onSignIn && onSignIn(); },
              'aria-label': 'Sign in with Google'
            }, 'Sign In'),
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
