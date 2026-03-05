/* helpers.js — Utility functions for investMTG */

export function formatUSD(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
  return '$' + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function getCardPrice(card) {
  if (!card || !card.prices) return 0;
  return parseFloat(card.prices.usd) || parseFloat(card.prices.usd_foil) || 0;
}

export function generateMockPriceHistory(currentPrice, days) {
  if (!days) days = 30;
  var prices = [];
  var price = currentPrice * (0.85 + Math.random() * 0.15);
  for (var i = 0; i < days; i++) {
    var change = (Math.random() - 0.48) * currentPrice * 0.05;
    price = Math.max(price + change, currentPrice * 0.5);
    price = Math.min(price, currentPrice * 1.5);
    prices.push(Math.round(price * 100) / 100);
  }
  prices[days - 1] = currentPrice;
  return prices;
}

export function generateMockChange() {
  var change = (Math.random() - 0.45) * 15;
  return Math.round(change * 10) / 10;
}

export function getCardImageSmall(card) {
  if (!card) return '';
  if (card.image_uris && card.image_uris.small) return card.image_uris.small;
  if (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris) {
    return card.card_faces[0].image_uris.small;
  }
  return '';
}

export function getScryfallImageUrl(card, size) {
  if (!size) size = 'normal';
  if (!card) return '';
  if (card.image_uris && card.image_uris[size]) return card.image_uris[size];
  if (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris) {
    return card.card_faces[0].image_uris[size];
  }
  return '';
}

export function getSetName(card) {
  return card ? (card.set_name || card.set || '') : '';
}

export function getRarity(card) {
  return card ? (card.rarity || '') : '';
}

export function getColors(card) {
  if (!card) return [];
  return card.colors || (card.card_faces && card.card_faces[0] ? card.card_faces[0].colors : []) || [];
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
