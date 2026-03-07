/* investMTG — React SPA */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { getCardPrice, getCardImageSmall, getScryfallImageUrl } from './utils/helpers.js';
import { getInitialMarketplaceData } from './utils/marketplace-data.js';
import { Ticker } from './components/Ticker.js';
import { Header } from './components/Header.js';
import { HomeView } from './components/HomeView.js';
import { SearchView } from './components/SearchView.js';
import { CardDetailView } from './components/CardDetailView.js';
import { PortfolioView } from './components/PortfolioView.js';
import { CartView } from './components/CartView.js';
import { StoreView } from './components/StoreView.js';
import { ListingModal } from './components/ListingModal.js';
import { BuyLocalModal } from './components/BuyLocalModal.js';
import { Chatbot } from './components/Chatbot.js';
import { Footer } from './components/Footer.js';
import { BackToTop } from './components/shared/BackToTop.js';
import { ToastContainer, showToast } from './components/shared/Toast.js';
import { CheckoutView } from './components/CheckoutView.js';
import { SellerDashboard } from './components/SellerDashboard.js';
import { OrderConfirmation } from './components/OrderConfirmation.js';
import { DecklistView } from './components/DecklistView.js';
import { MarketMoversView } from './components/MarketMoversView.js';
import { MetaView } from './components/MetaView.js';

var h = React.createElement;

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
      route.page === 'meta' && h(MetaView, null)
    ),
    h(Footer, null),
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
