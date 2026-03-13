/* helpers.js — Utility functions for investMTG */

export function formatUSD(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
  return '$' + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function getCardPrice(card) {
  if (!card || !card.prices) return 0;
  return parseFloat(card.prices.usd) || parseFloat(card.prices.usd_foil) || 0;
}

export function getCardImageSmall(card) {
  if (!card) return '';
  if (card.image_uris && card.image_uris.small) return card.image_uris.small;
  if (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris) {
    return card.card_faces[0].image_uris.small;
  }
  // Fallback: use direct Scryfall API image endpoint (always works)
  if (card.id) return 'https://api.scryfall.com/cards/' + card.id + '?format=image&version=small';
  return '';
}

export function getScryfallImageUrl(card, size) {
  if (!size) size = 'normal';
  if (!card) return '';
  if (card.image_uris && card.image_uris[size]) return card.image_uris[size];
  if (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris) {
    return card.card_faces[0].image_uris[size];
  }
  // Fallback: use direct Scryfall API image endpoint (always works)
  if (card.id) return 'https://api.scryfall.com/cards/' + card.id + '?format=image&version=' + size;
  return '';
}

/* Direct Scryfall image URL by card ID — reliable fallback when CDN URLs 404 */
export function scryfallImageFallback(scryfallId, size) {
  if (!scryfallId) return '';
  if (!size) size = 'small';
  return 'https://api.scryfall.com/cards/' + scryfallId + '?format=image&version=' + size;
}

/* onError handler for card images — switches to direct API endpoint */
export function handleImageError(e, scryfallId, size) {
  if (!scryfallId) return;
  if (!size) size = 'small';
  var fallback = 'https://api.scryfall.com/cards/' + scryfallId + '?format=image&version=' + size;
  if (e.target.src !== fallback) {
    e.target.src = fallback;
  }
}

export function debounce(fn, ms) {
  var timer;
  return function() {
    var args = arguments;
    var ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function() { fn.apply(ctx, args); }, ms);
  };
}
