/* investMTG — React SPA */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { getCardPrice, getCardImageSmall, getScryfallImageUrl } from './utils/helpers.js';
import { getInitialMarketplaceData } from './utils/marketplace-data.js';
import { Ticker } from './components/Ticker.js';
import { Header } from './components/Header.js';
import { HomeView } from './components/HomeView.js';
import { Footer } from './components/Footer.js';
import { BackToTop } from './components/shared/BackToTop.js';
import { ToastContainer, showToast } from './components/shared/Toast.js';
import { CookieNotice } from './components/CookieNotice.js';

var h = React.createElement;

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
        });
      }
      return null;
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
var globalState = {
  cart: JSON.parse(localStorage.getItem('investmtg-cart') || '[]'),
  portfolio: JSON.parse(localStorage.getItem('investmtg-portfolio') || '[]'),
  watchlist: JSON.parse(localStorage.getItem('investmtg-watchlist') || '[]'),
  listings: getInitialMarketplaceData(),
  priceCache: {}
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
  globalState.cart = newCart;
  localStorage.setItem('investmtg-cart', JSON.stringify(newCart));
  notify();
}

function updatePortfolio(newPortfolio) {
  globalState.portfolio = newPortfolio;
  localStorage.setItem('investmtg-portfolio', JSON.stringify(newPortfolio));
  notify();
}

function updateWatchlist(newWatchlist) {
  globalState.watchlist = newWatchlist;
  localStorage.setItem('investmtg-watchlist', JSON.stringify(newWatchlist));
  notify();
}

function updateListings(newListings) {
  globalState.listings = newListings;
  notify();
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
    updateListings: updateListings
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

  var cartCount = gs.state.cart.reduce(function(sum, item) { return sum + (item.qty || 1); }, 0);

  return h('div', { className: 'app-wrapper' },
    h(Ticker, null),
    h(Header, {
      route: route,
      cartCount: cartCount
    }),
    h('main', { className: 'main-content', id: 'main-content' },
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
        onOpenListing: setListingModalCard
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
      route.page === 'seller' && h(SellerDashboard, null),
      route.page === 'order' && h(OrderConfirmation, {
        orderId: route.id
      }),
      route.page === 'decks' && h(DecklistView, null),
      route.page === 'movers' && h(MarketMoversView, null),
      route.page === 'meta' && h(MetaView, null),
      route.page === 'privacy' && h(PrivacyPolicyView, null),
      route.page === 'terms' && h(TermsView, null)
    ),
    h(Footer, null),
    h(CookieNotice, null),
    h(Chatbot, null),
    h(BackToTop, null),
    h(ToastContainer, null),
    listingModalCard && h(ListingModal, {
      card: listingModalCard,
      listings: gs.state.listings,
      updateListings: gs.updateListings,
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
