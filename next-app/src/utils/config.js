/**
 * config.js — Central configuration for investMTG (modern syntax)
 * Mirrors production config.js but uses const/modern patterns.
 */

export const PROXY_BASE = import.meta.env.DEV
  ? '' // Vite proxy handles /api/* in dev
  : 'https://api.investmtg.com';

export const SCRYFALL_API_BASE = 'https://api.scryfall.com';
export const SCRYFALL_IMAGE_BASE = 'https://cards.scryfall.io';
export const SITE_BASE = 'https://www.investmtg.com';
export const SCRYFALL_RATE_LIMIT_MS = 100;
export const BACKEND_FETCH_TIMEOUT = 15000;

// Commerce
export const SHIPPING_FLAT_RATE = 5.00;
export const CART_MAX_QUANTITY = 4;
export const LISTING_MAX_PRICE = 99999;
export const PLATFORM_FEE_PERCENT = 5;

// UI timing
export const TOAST_DURATION = 3000;
export const FLASH_DURATION = 3000;
export const CART_ADDED_FEEDBACK = 1500;
export const RESERVE_PROCESSING_DELAY = 1500;

// Payment polling
export const PAYMENT_POLL_FAST = 2000;
export const PAYMENT_POLL_NORMAL = 5000;
export const PAYMENT_POLL_SLOW = 10000;
export const PAYMENT_POLL_MAX_TIME = 300000;

// Cache TTLs (client-side, ms)
export const CACHE_TTL_SHORT = 5 * 60 * 1000;    // 5 min
export const CACHE_TTL_PRICE = 10 * 60 * 1000;   // 10 min
export const CACHE_TTL_MEDIUM = 15 * 60 * 1000;  // 15 min
export const CACHE_TTL_LONG = 60 * 60 * 1000;    // 1 hr

// Conditions
export const CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];
export const CONDITION_LABELS = {
  NM: 'Near Mint', LP: 'Lightly Played', MP: 'Moderately Played',
  HP: 'Heavily Played', DMG: 'Damaged',
};
export const CONDITION_MULTIPLIERS = {
  NM: 1.0, LP: 0.9, MP: 0.75, HP: 0.55, DMG: 0.35,
};

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'investmtg_auth_token',
  CART: 'investmtg_cart',
  PORTFOLIO: 'investmtg_portfolio',
  ORDERS: 'investmtg_orders',
  TICKER: 'investmtg_ticker',
  THEME: 'investmtg_theme',
  SEARCH_HISTORY: 'investmtg_search_history',
  COOKIE_CONSENT: 'investmtg_cookie_consent',
  TOS_ACCEPTED: 'investmtg_tos_accepted',
};

// Limits
export const ORDERS_MAX_LOCAL = 50;
export const RESOLVER_CACHE_MAX = 200;
