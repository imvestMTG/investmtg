/* investMTG — React SPA */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { getInitialMarketplaceData } from './utils/marketplace-data.js';
import { fetchPortfolio, fetchListings, fetchCart, createListing } from './utils/api.js';
import { checkAuth, signIn, signOut, onAuthChange } from './utils/auth.js';
import { Ticker } from './components/Ticker.js';
import { Header } from './components/Header.js';
import { HomeView } from './components/HomeView.js';
import { Footer } from './components/Footer.js';
import { BackToTop } from './components/shared/BackToTop.js';
import { ToastContainer, showToast } from './components/shared/Toast.js';
import { CookieNotice } from './components/CookieNotice.js';
import { ErrorBoundary } from './components/shared/ErrorBoundary.js';

var h = React.createElement;

// Safe JSON parse for localStorage — guards against corrupted values like the string "undefined"
function safeParseJSON(raw, fallback) {
  if (!raw || raw === 'undefined' || raw === 'null') return fallback;
  try { return JSON.parse(raw); } catch(e) { return fallback; }
}

// ===== LAZY COMPONENT LOADER =====
function lazyComponent(importFn, exportName) {
  var cache = { C: null, p: null };
  return function(props) {
    var ref = React.useState(0);
    var setTick = ref[1];
    if (!cache.C) {
      if (!cache.p) {
        cache.p = importFn().then(function(mod) {
          cache.C = mod[exportName];
          setTick(function(n) { return n + 1; });
        }).catch(function() {
          /* Import failed — clear promise so next render retries */
          cache.p = null;
        });
      }
      return h('div', {
        style: {
          minHeight: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted, #8B8D94)',
          fontSize: '14px'
        }
      }, 'Loading\u2026');
    }
    return h(cache.C, props);
  };
}

// Lazy-loaded components (only fetched when navigated to)
var SearchView = lazyComponent(function() { return import('./components/SearchView.js'); }, 'SearchView');
var CardDetailView = lazyComponent(function() { return import('./components/CardDetailView.js'); }, 'CardDetailView');
var PortfolioView = lazyComponent(function() { return import('./components/PortfolioView.js'); }, 'PortfolioView');
var CartView = lazyComponent(function() { return import('./components/CartView.js'); }, 'CartView');
var StoreView = lazyComponent(function() { return import('./components/StoreView.js'); }, 'StoreView');
var CheckoutView = lazyComponent(function() { return import('./components/CheckoutView.js'); }, 'CheckoutView');
var SellerDashboard = lazyComponent(function() { return import('./components/SellerDashboard.js'); }, 'SellerDashboard');
var OrderConfirmation = lazyComponent(function() { return import('./components/OrderConfirmation.js'); }, 'OrderConfirmation');
var DecklistView = lazyComponent(function() { return import('./components/DecklistView.js'); }, 'DecklistView');
var MarketMoversView = lazyComponent(function() { return import('./components/MarketMoversView.js'); }, 'MarketMoversView');
var MetaView = lazyComponent(function() { return import('./components/MetaView.js'); }, 'MetaView');
var PrivacyPolicyView = lazyComponent(function() { return import('./components/PrivacyPolicyView.js'); }, 'PrivacyPolicyView');
var TermsView = lazyComponent(function() { return import('./components/TermsView.js'); }, 'TermsView');
var Chatbot = lazyComponent(function() { return import('./components/Chatbot.js'); }, 'Chatbot');
var ListingModal = lazyComponent(function() { return import('./components/ListingModal.js'); }, 'ListingModal');
var BuyLocalModal = lazyComponent(function() { return import('./components/BuyLocalModal.js'); }, 'BuyLocalModal');

// ===== ROUTER HOOK =====
function useRouter() {
  var ref = React.useState(parseHash());
  var route = ref[0], setRoute = ref[1];

  React.useEffect(function() {
    var onHash = function() {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return function() { window.removeEventListener('hashchange', onHash); };
  }, []);

  return route;
}

function parseHash() {
  var hash = window.location.hash.slice(1) || '';
  if (hash.startsWith('card/')) {
    return { page: 'card', id: hash.slice(5) };
  }
  if (hash.startsWith('order/')) {
    return { page: 'order', id: hash.slice(6) };
  }
  if (hash === 'search') return { page: 'search' };
  if (hash === 'portfolio') return { page: 'portfolio' };
  if (hash === 'cart') return { page: 'cart' };
  if (hash === 'store') return { page: 'store' };
  if (hash === 'checkout') return { page: 'checkout' };
  if (hash === 'seller') return { page: 'seller' };
  if (hash === 'decks') return { page: 'decks' };
  if (hash === 'movers') return { page: 'movers' };
  if (hash === 'meta') return { page: 'meta' };
  if (hash === 'privacy') return { page: 'privacy' };
  if (hash === 'terms') return { page: 'terms' };
  return { page: 'home' };
}

// ===== GLOBAL STATE =====
// Start with empty state + loading flag; populated async in App useEffect
var globalState = {
  cart: [],
  portfolio: [],
  watchlist: safeParseJSON(localStorage.getItem('investmtg-watchlist'), []),
  listings: [],
  priceCache: {},
  loading: true
};

var stateListeners = [];

function subscribe(fn) {
  stateListeners.push(fn);
  return function() { stateListeners = stateListeners.filter(function(l) { return l !== fn; }); };
}

function notify() {
  stateListeners.forEach(function(fn) { fn(globalState); });
}

function updateCart(newCart) {
  globalState.cart = Array.isArray(newCart) ? newCart : [];
  localStorage.setItem('investmtg-cart', JSON.stringify(globalState.cart));
  notify();
}

function updatePortfolio(newPortfolio) {
  globalState.portfolio = Array.isArray(newPortfolio) ? newPortfolio : [];
  localStorage.setItem('investmtg-portfolio', JSON.stringify(globalState.portfolio));
  notify();
}

function updateWatchlist(newWatchlist) {
  globalState.watchlist = Array.isArray(newWatchlist) ? newWatchlist : [];
  localStorage.setItem('investmtg-watchlist', JSON.stringify(globalState.watchlist));
  notify();
}

function updateListings(newListings) {
  // Backend is source of truth for listings — no localStorage write
  globalState.listings = newListings;
  notify();
}

/* Reload marketplace from backend — called after seller changes */
function refreshMarketplace() {
  fetchListings({ status: 'active' }).then(function(data) {
    globalState.listings = data.listings || [];
    notify();
  }).catch(function() {
    // Fall back to getInitialMarketplaceData (also hits backend)
    getInitialMarketplaceData().then(function(listings) {
      globalState.listings = listings;
      notify();
    }).catch(function() {
      // silently ignore — keep existing listings
    });
  });
}

// ===== GLOBAL STATE HOOK =====
function useGlobalState() {
  var ref = React.useState(globalState);
  var state = ref[0], setState = ref[1];

  React.useEffect(function() {
    return subscribe(function(newState) {
      setState(Object.assign({}, newState));
    });
  }, []);

  return {
    state: state,
    updateCart: updateCart,
    updatePortfolio: updatePortfolio,
    updateWatchlist: updateWatchlist,
    updateListings: updateListings,
    refreshMarketplace: refreshMarketplace
  };
}

// ===== ROOT APP =====
function App() {
  var route = useRouter();
  var gs = useGlobalState();
  var ref2 = React.useState(null);
  var listingModalCard = ref2[0], setListingModalCard = ref2[1];
  var ref3 = React.useState(null);
  var buyLocalCard = ref3[0], setBuyLocalCard = ref3[1];
  var viewCacheRef = React.useRef({});

  /* ── Auth state ── */
  var refAuth = React.useState(null);
  var authUser = refAuth[0], setAuthUser = refAuth[1];

  React.useEffect(function() {
    checkAuth().then(function(u) { setAuthUser(u); });
    return onAuthChange(function(u) { setAuthUser(u); });
  }, []);

  // ===== ASYNC STATE INITIALIZATION =====
  React.useEffect(function() {
    var portfolioFallback = safeParseJSON(localStorage.getItem('investmtg-portfolio'), []);
    var cartFallback = safeParseJSON(localStorage.getItem('investmtg-cart'), []);

    // Fetch portfolio from backend; fall back to localStorage
    var portfolioPromise = fetchPortfolio().then(function(data) {
      var items = (data && data.items) ? data.items : [];
      // Map backend portfolio shape to frontend shape
      return items.map(function(item) {
        return {
          id: item.card_id,
          name: item.card_name,
          set: item.set_name || '',
          qty: item.quantity || 1,
          buyPrice: item.added_price || 0,
          currentPrice: item.price_usd || 0,
          image: item.image_small || null
        };
      });
    }).catch(function() {
      return portfolioFallback;
    });

    // Fetch listings from backend (getInitialMarketplaceData returns Promise)
    var listingsPromise = getInitialMarketplaceData().catch(function() {
      return [];
    });

    // Fetch cart from backend; fall back to localStorage
    var cartPromise = fetchCart().then(function(data) {
      var items = (data && data.items) ? data.items : [];
      if (items.length > 0) {
        // Map backend cart items to frontend cart shape
        return items.map(function(item) {
          return {
            id: item.listing_id,
            name: item.card_name || '',
            set: item.set_name || '',
            condition: item.condition || '',
            price: item.price || 0,
            seller: item.seller_name || '',
            image: item.image_uri || null,
            qty: item.quantity || 1
          };
        });
      }
      return cartFallback;
    }).catch(function() {
      return cartFallback;
    });

    // Safety timeout — if backend is unreachable, clear loading after 6s
    var safetyTimer = setTimeout(function() {
      if (globalState.loading) {
        globalState.portfolio = portfolioFallback;
        globalState.listings = [];
        globalState.cart = cartFallback;
        globalState.loading = false;
        notify();
      }
    }, 6000);

    Promise.all([portfolioPromise, listingsPromise, cartPromise]).then(function(results) {
      clearTimeout(safetyTimer);
      globalState.portfolio = results[0];
      globalState.listings = results[1];
      globalState.cart = results[2];
      globalState.loading = false;
      notify();
    }).catch(function() {
      clearTimeout(safetyTimer);
      globalState.portfolio = portfolioFallback;
      globalState.listings = [];
      globalState.cart = cartFallback;
      globalState.loading = false;
      notify();
    });

    return function() { clearTimeout(safetyTimer); };
  }, []);

  // While loading, show a minimal loading indicator
  if (gs.state.loading) {
    return h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: 'var(--color-text-muted, #8B8D94)',
        fontFamily: 'var(--font-body, system-ui, sans-serif)',
        fontSize: '14px'
      }
    }, 'Loading…');
  }

  var cartCount = gs.state.cart.reduce(function(sum, item) { return sum + (item.qty || 1); }, 0);

  return h('div', { className: 'app-wrapper', 'data-app': 'true' },
    h(Ticker, null),
    h(Header, {
      route: route,
      cartCount: cartCount,
      user: authUser,
      onSignIn: signIn,
      onSignOut: signOut
    }),
    h('main', { className: 'main-content', id: 'main-content' },
      h(ErrorBoundary, null,
      route.page === 'home' && h(HomeView, {
        state: gs.state,
        updateCart: gs.updateCart,
        updatePortfolio: gs.updatePortfolio,
        updateWatchlist: gs.updateWatchlist,
        onOpenListing: setListingModalCard
      }),
      route.page === 'search' && h(SearchView, {
        state: gs.state,
        updateCart: gs.updateCart,
        updatePortfolio: gs.updatePortfolio,
        updateWatchlist: gs.updateWatchlist,
        onOpenListing: setListingModalCard,
        viewCache: viewCacheRef.current
      }),
      route.page === 'card' && h(CardDetailView, {
        cardId: route.id,
        state: gs.state,
        updateCart: gs.updateCart,
        updatePortfolio: gs.updatePortfolio,
        updateWatchlist: gs.updateWatchlist,
        onOpenListing: setListingModalCard
      }),
      route.page === 'portfolio' && h(PortfolioView, {
        state: gs.state,
        updatePortfolio: gs.updatePortfolio
      }),
      route.page === 'cart' && h(CartView, {
        state: gs.state,
        updateCart: gs.updateCart
      }),
      route.page === 'store' && h(StoreView, {
        state: gs.state,
        updateCart: gs.updateCart,
        updateListings: gs.updateListings,
        onBuyLocal: setBuyLocalCard
      }),
      route.page === 'checkout' && h(CheckoutView, {
        state: gs.state,
        updateCart: gs.updateCart
      }),
      route.page === 'seller' && h(SellerDashboard, {
        refreshMarketplace: gs.refreshMarketplace,
        user: authUser,
        onSignIn: signIn
      }),
      route.page === 'order' && h(OrderConfirmation, {
        orderId: route.id
      }),
      route.page === 'decks' && h(DecklistView, null),
      route.page === 'movers' && h(MarketMoversView, null),
      route.page === 'meta' && h(MetaView, { viewCache: viewCacheRef.current }),
      route.page === 'privacy' && h(PrivacyPolicyView, null),
      route.page === 'terms' && h(TermsView, null)
      )
    ),
    h(Footer, null),
    h(CookieNotice, null),
    h(Chatbot, null),
    h(BackToTop, null),
    h(ToastContainer, null),
    listingModalCard && h(ListingModal, {
      isOpen: true,
      prefillCardName: listingModalCard.name || listingModalCard,
      onSubmit: function(newListing) {
        // POST to backend via createListing, then refresh marketplace
        createListing({
          card_name: newListing.cardName || newListing.name || '',
          price: newListing.price || 0,
          condition: newListing.condition || 'NM',
          seller_name: newListing.seller || newListing.seller_name || '',
          seller_contact: newListing.contact || newListing.seller_contact || '',
          card_id: newListing.card_id || newListing.id || null,
          set_name: newListing.setName || newListing.set_name || '',
          language: newListing.language || null,
          image_uri: newListing.image || newListing.image_uri || null,
          notes: newListing.notes || ''
        }).then(function() {
          refreshMarketplace();
        }).catch(function() {
          // Fall back: add locally if backend fails
          var updated = gs.state.listings.concat([newListing]);
          updateListings(updated);
        });
      },
      onClose: function() { setListingModalCard(null); }
    }),
    buyLocalCard && h(BuyLocalModal, {
      card: buyLocalCard,
      listings: gs.state.listings,
      updateCart: gs.updateCart,
      onClose: function() { setBuyLocalCard(null); }
    })
  );
}

// ===== MOUNT =====
var root = createRoot(document.getElementById('root'));
root.render(h(App, null));

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(function() {
    // Service worker registration failed — non-critical
  });
}
