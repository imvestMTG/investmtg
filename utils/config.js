/* config.js — Centralized configuration constants for investMTG */

/* ── External URLs ── */
export var PROXY_BASE = 'https://api.investmtg.com';
export var SCRYFALL_API_BASE = 'https://api.scryfall.com';
export var SCRYFALL_IMAGE_BASE = 'https://cards.scryfall.io';
export var SITE_BASE = 'https://www.investmtg.com';

/* ── API ── */
export var SCRYFALL_RATE_LIMIT_MS = 100; // min ms between Scryfall requests
export var BACKEND_FETCH_TIMEOUT = 15000; // ms — abort stale backend requests

/* ── Shipping ── */
export var SHIPPING_FLAT_RATE = 5.00; // USD

/* ── Cart ── */
export var CART_MAX_QUANTITY = 4; // Max qty per card (tournament playset)

/* ── Chatbot ── */
export var CHATBOT_RATE_WINDOW = 60000; // 1 minute
export var CHATBOT_RATE_MAX = 8; // max messages per window
export var CHATBOT_COOLDOWN = 2000; // min ms between messages
export var CHATBOT_MAX_INPUT = 500; // max chars per message
export var CHATBOT_MAX_TOKENS = 512;
export var CHATBOT_TEMPERATURE = 0.7;
export var CHATBOT_CONTEXT_LIMIT = 10; // max message history entries

/* ── Listing ── */
export var LISTING_MAX_PRICE = 99999; // max listing price in USD

/* ── Timeouts (UI) ── */
export var TOAST_DURATION = 3000; // ms
export var FLASH_DURATION = 3000; // ms
export var CART_ADDED_FEEDBACK = 1500; // ms
export var RESERVE_PROCESSING_DELAY = 1500; // ms

/* ── Polling ── */
export var PAYMENT_POLL_FAST = 2000; // ms — initial fast poll
export var PAYMENT_POLL_NORMAL = 5000; // ms — standard poll
export var PAYMENT_POLL_SLOW = 10000; // ms — slow poll after timeout
export var PAYMENT_POLL_MAX_TIME = 300000; // ms — 5 min max polling

/* ── Cache TTLs (client-side, ms) ── */
export var CACHE_TTL_SHORT = 5 * 60 * 1000; // 5 min — ticker, search, portfolio prices
export var CACHE_TTL_PRICE = 10 * 60 * 1000; // 10 min — justtcg, topdeck, price-resolver
export var CACHE_TTL_MEDIUM = 15 * 60 * 1000; // 15 min — edhtop16, moxfield, echomtg
export var CACHE_TTL_LONG = 60 * 60 * 1000; // 1 hr — carousels, events, mtgstocks

/* ── SumUp — public key stays client-side (designed for browser use) ── */
export var SUMUP_PUBLIC_KEY = 'sup_pk_qRhf6eGzMipB9IwxFFKpsqe0w15FXo4Jk';

/* ── localStorage Key Registry ──
 * Single source of truth for all storage keys.
 * Using these constants prevents silent breakage from typos. */
export var STORAGE_KEYS = {
  AUTH_TOKEN: 'investmtg_auth_token',
  CART: 'investmtg-cart',
  ORDERS: 'investmtg-orders',
  PORTFOLIO: 'investmtg-portfolio',
  WATCHLIST: 'investmtg-watchlist',
  SEARCH_HISTORY: 'investmtg-search-history',
  TICKER_CACHE: 'investmtg-ticker-cache',
  TICKER_PREV: 'investmtg-ticker-prev',
  THEME: 'investmtg-theme',
  TERMS_ACCEPTED: 'investmtg-terms-accepted',
  COOKIE_ACCEPTED: 'investmtg-cookie-accepted',
  SCANNER_HISTORY: 'investmtg-scanner-history',
};

/* ── Custom Event Names ── */
export var EVENTS = {
  SEARCH: 'investmtg-search',
  CART_UPDATE: 'investmtg-cart-update',
  AUTH_CHANGE: 'investmtg-auth-change',
};

/* ── Condition Codes ── */
export var CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];
export var CONDITION_LABELS = {
  NM: 'Near Mint',
  LP: 'Lightly Played',
  MP: 'Moderately Played',
  HP: 'Heavily Played',
  DMG: 'Damaged'
};
export var CONDITION_MULTIPLIERS = {
  NM: 1.00,
  LP: 0.85,
  MP: 0.70,
  HP: 0.50,
  DMG: 0.30
};

/* ── Limits ── */
export var ORDERS_MAX_LOCAL = 50; // max orders kept in localStorage
export var RESOLVER_CACHE_MAX = 200; // max entries in price-resolver in-memory cache
export var SW_IMAGE_CACHE_MAX = 100; // max Scryfall images in SW cache
