/* marketplace-data.js — Real marketplace listings (user-submitted only) */

export function getInitialMarketplaceData() {
  // No seed data — marketplace starts empty per SOUL.md principles.
  // All listings come from real sellers via the Seller Dashboard.
  return [];
}

export function filterMarketplace(marketplace, filter) {
  var results = marketplace.slice();
  var f = filter;

  if (f.search) {
    var q = f.search.toLowerCase();
    results = results.filter(function(l) {
      return l.cardName.toLowerCase().indexOf(q) !== -1 || l.seller.toLowerCase().indexOf(q) !== -1;
    });
  }
  if (f.condition) {
    results = results.filter(function(l) { return l.condition === f.condition; });
  }
  if (f.type) {
    results = results.filter(function(l) { return l.type === f.type; });
  }

  if (f.sort === 'price_asc') results.sort(function(a, b) { return a.price - b.price; });
  else if (f.sort === 'price_desc') results.sort(function(a, b) { return b.price - a.price; });
  else results.sort(function(a, b) { return b.createdAt - a.createdAt; });

  return results;
}
