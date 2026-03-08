/* marketplace-data.js — Marketplace listings via backend API */
import { backendFetch } from './api.js';

/**
 * Load all marketplace listings from the backend API.
 * Returns a Promise that resolves to the listings array.
 */
export function getInitialMarketplaceData() {
  return backendFetch('/api/listings?status=active').then(function(data) {
    return data.listings || [];
  });
}

export function filterMarketplace(marketplace, filter) {
  var results = marketplace.slice();
  var f = filter;

  if (f.search) {
    var q = f.search.toLowerCase();
    results = results.filter(function(l) {
      return (l.cardName || '').toLowerCase().indexOf(q) !== -1 ||
             (l.seller || '').toLowerCase().indexOf(q) !== -1 ||
             (l.setName || '').toLowerCase().indexOf(q) !== -1;
    });
  }
  if (f.condition) {
    results = results.filter(function(l) { return l.condition === f.condition; });
  }
  if (f.type) {
    results = results.filter(function(l) { return l.type === f.type; });
  }

  if (f.sort === 'price_asc') results.sort(function(a, b) { return (a.price || 0) - (b.price || 0); });
  else if (f.sort === 'price_desc') results.sort(function(a, b) { return (b.price || 0) - (a.price || 0); });
  else {
    /* newest first — handle both ISO strings and timestamps */
    results.sort(function(a, b) {
      var ta = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt || 0);
      var tb = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt || 0);
      return tb - ta;
    });
  }

  return results;
}
