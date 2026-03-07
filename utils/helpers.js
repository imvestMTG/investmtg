/* helpers.js — Utility functions for investMTG */

export function formatUSD(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
  return '$' + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function getCardPrice(card) {
  if (!card || !card.prices) return 0;
  return parseFloat(card.prices.usd) || parseFloat(card.prices.usd_foil) || parseFloat(card.prices.usd_etched) || 0;
}

// Get all available prices for a card as { label, value } pairs
export function getAllPrices(card) {
  if (!card || !card.prices) return [];
  var result = [];
  if (card.prices.usd) result.push({ label: 'Market', value: parseFloat(card.prices.usd) });
  if (card.prices.usd_foil) result.push({ label: 'Foil', value: parseFloat(card.prices.usd_foil) });
  if (card.prices.usd_etched) result.push({ label: 'Etched', value: parseFloat(card.prices.usd_etched) });
  if (card.prices.tix) result.push({ label: 'MTGO', value: parseFloat(card.prices.tix), isTix: true });
  return result;
}

// Get finish tags for a card (foil, etched, nonfoil)
export function getFinishTags(card) {
  if (!card || !card.finishes) return [];
  return card.finishes;
}

// Get a human-readable finish label
export function getFinishLabel(finish) {
  if (finish === 'foil') return 'Foil';
  if (finish === 'etched') return 'Etched';
  if (finish === 'nonfoil') return 'Non-Foil';
  if (finish === 'glossy') return 'Glossy';
  return finish || '';
}

// Get variant descriptor for display (e.g., "Borderless", "Extended Art", "Showcase")
export function getVariantLabel(card) {
  if (!card) return '';
  var labels = [];
  if (card.full_art) labels.push('Full Art');
  if (card.textless) labels.push('Textless');
  if (card.promo) labels.push('Promo');
  if (card.border_color === 'borderless') labels.push('Borderless');
  if (card.frame_effects && card.frame_effects.length > 0) {
    card.frame_effects.forEach(function(fx) {
      if (fx === 'showcase') labels.push('Showcase');
      if (fx === 'extendedart') labels.push('Extended Art');
      if (fx === 'inverted') labels.push('Inverted');
      if (fx === 'etched') labels.push('Etched');
      if (fx === 'snow') labels.push('Snow');
      if (fx === 'miracle') labels.push('Miracle');
      if (fx === 'nyxtouched') labels.push('Nyx');
      if (fx === 'draft') labels.push('Draft');
      if (fx === 'devoid') labels.push('Devoid');
      if (fx === 'colorshifted') labels.push('Colorshifted');
      if (fx === 'companion') labels.push('Companion');
      if (fx === 'waxingandwaningmoondfc') labels.push('Moon DFC');
      if (fx === 'legendary') labels.push('Legendary Frame');
    });
  }
  return labels.join(' · ');
}

// Get the type line category for filtering
export function getTypeCategory(card) {
  if (!card || !card.type_line) return 'other';
  var t = card.type_line.toLowerCase();
  if (t.indexOf('creature') !== -1) return 'creature';
  if (t.indexOf('instant') !== -1) return 'instant';
  if (t.indexOf('sorcery') !== -1) return 'sorcery';
  if (t.indexOf('enchantment') !== -1) return 'enchantment';
  if (t.indexOf('artifact') !== -1) return 'artifact';
  if (t.indexOf('planeswalker') !== -1) return 'planeswalker';
  if (t.indexOf('land') !== -1) return 'land';
  if (t.indexOf('battle') !== -1) return 'battle';
  return 'other';
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
