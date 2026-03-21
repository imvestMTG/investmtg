/**
 * api.js — Backend API client (modern syntax)
 * All API calls route through backendFetch → Worker at PROXY_BASE.
 */

import { PROXY_BASE, BACKEND_FETCH_TIMEOUT, SCRYFALL_API_BASE, STORAGE_KEYS } from './config.js';
import { storageGetRaw } from './storage.js';

/**
 * Fetch wrapper with auth token, timeout, and JSON parsing.
 */
export async function backendFetch(path, options = {}) {
  const token = storageGetRaw(STORAGE_KEYS.AUTH_TOKEN);
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BACKEND_FETCH_TIMEOUT);

  try {
    const res = await fetch(PROXY_BASE + path, {
      ...options,
      headers,
      signal: controller.signal,
      credentials: 'include',
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  }
}

// ── Card normalization ──
export function normalizeCard(raw) {
  if (!raw) return null;
  return {
    id: raw.id || raw.scryfallId,
    name: raw.name,
    set_name: raw.set_name || raw.setName,
    set: raw.set,
    prices: raw.prices || { usd: raw.price_usd },
    image_uris: raw.image_uris || {
      small: raw.image_small,
      normal: raw.image_normal,
      large: raw.image_large,
    },
    reserved: raw.reserved,
    legalities: raw.legalities,
    tcgplayerId: raw.tcgplayerId || raw.tcgplayer_id,
  };
}

// ── API functions ──
export const fetchTicker = () => backendFetch('/api/ticker');
export const fetchFeatured = () => backendFetch('/api/featured');
export const fetchTrending = () => backendFetch('/api/trending');
export const fetchBudget = () => backendFetch('/api/budget');
export const fetchStores = () => backendFetch('/api/stores');
export const fetchEvents = () => backendFetch('/api/events');
export const searchCards = (q, page = 1) => backendFetch(`/api/search?q=${encodeURIComponent(q)}&page=${page}`);
export const fetchCardDetail = (id) => backendFetch(`/api/card/${id}`);
export const fetchListings = () => backendFetch('/api/listings');

// ── Stripe API ──
export const stripeCreateConnectAccount = (sellerId) =>
  backendFetch('/api/stripe/connect/create-account', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seller_id: sellerId }),
  });

export const stripeGetAccountLink = (sellerId) =>
  backendFetch('/api/stripe/connect/account-link', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seller_id: sellerId }),
  });

export const stripeGetAccountStatus = (sellerId) =>
  backendFetch(`/api/stripe/connect/account-status?seller_id=${sellerId}`);

export const stripeCreatePaymentIntent = (orderId, amount, sellerStripeAccount, sellerId, description, email) =>
  backendFetch('/api/stripe/create-payment-intent', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id: orderId, amount,
      ...(sellerStripeAccount && { seller_stripe_account: sellerStripeAccount }),
      ...(sellerId && { seller_id: sellerId }),
      ...(description && { description }),
      ...(email && { customer_email: email }),
    }),
  });

export const stripeGetSellerSales = (sellerId) =>
  backendFetch(`/api/stripe/seller/sales?seller_id=${sellerId}`);

export const stripeGetSellerBalance = (sellerId) =>
  backendFetch(`/api/stripe/seller/balance?seller_id=${sellerId}`);

// ── Helpers ──
export function formatUSD(amount) {
  if (amount == null || isNaN(amount)) return 'N/A';
  return '$' + Number(amount).toFixed(2);
}
