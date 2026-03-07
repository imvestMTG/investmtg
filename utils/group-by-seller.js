/* group-by-seller.js — Shared cart grouping utility */

/**
 * Group cart items by seller name
 * @param {Array} cart - array of cart items
 * @returns {Object} groups keyed by seller name
 */
export function groupBySeller(cart) {
  var groups = {};
  cart.forEach(function(item) {
    var seller = item.seller || 'Unknown Seller';
    if (!groups[seller]) { groups[seller] = []; }
    groups[seller].push(item);
  });
  return groups;
}
