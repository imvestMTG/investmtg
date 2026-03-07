/* marketplace-data.js — Real marketplace listings (user-submitted only) */

var MARKETPLACE_STORAGE_KEY = 'investmtg-marketplace';

/**
 * Load all marketplace listings from localStorage.
 * Aggregates listings from all registered sellers,
 * then merges any standalone marketplace listings.
 */
export function getInitialMarketplaceData() {
  // 1) Collect listings from all registered sellers
  var sellerListings = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.indexOf('investmtg-seller-') === 0) {
      try {
        var seller = JSON.parse(localStorage.getItem(key));
        if (seller && seller.listings && seller.listings.length) {
          seller.listings.forEach(function(listing) {
            /* Ensure every listing carries the seller name and contact */
            sellerListings.push(Object.assign({}, listing, {
              seller: listing.seller || seller.name,
              contact: listing.contact || seller.contact
            }));
          });
        }
      } catch (e) { /* skip corrupt entries */ }
    }
  }

  // 2) Load any standalone marketplace listings (from the old ListingModal flow)
  var standalone = [];
  try {
    standalone = JSON.parse(localStorage.getItem(MARKETPLACE_STORAGE_KEY) || '[]');
  } catch (e) { standalone = []; }

  // 3) Merge — deduplicate by id, seller listings take priority
  var idSet = {};
  var merged = [];
  sellerListings.forEach(function(l) { idSet[l.id] = true; merged.push(l); });
  standalone.forEach(function(l) {
    if (!idSet[l.id]) { merged.push(l); }
  });

  return merged;
}

/**
 * Persist standalone marketplace listings (from quick-list flow).
 * Seller-managed listings are persisted inside each seller's own storage.
 */
export function saveMarketplaceData(listings) {
  try {
    localStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(listings));
  } catch (e) { /* quota exceeded — degrade gracefully */ }
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
