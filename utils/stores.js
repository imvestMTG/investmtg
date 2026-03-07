/* stores.js — Single source of truth for Guam store data.
   Import from here instead of duplicating store arrays across components. */

/**
 * Full store details — used by StoreView for the store directory.
 * Every other component derives its subset from this array.
 */
export var GUAM_STORES = [
  {
    id: 's1',
    name: 'The Inventory',
    badge: 'Game Store',
    address: 'Hag\u00e5t\u00f1a, GU 96910',
    phone: null,
    website: 'https://www.instagram.com/theinventoryguam/',
    hours: 'Check Instagram for hours',
    tags: ['MTG', 'Commander Night', 'Board Games', 'Community Hub'],
    description: 'Hag\u00e5t\u00f1a game store and community gathering spot. Hosts weekly Commander nights every Thursday. A staple in the Guam MTG community.'
  },
  {
    id: 's2',
    name: 'Geek Out Next Level',
    badge: 'WPN Store',
    address: 'Micronesia Mall, Dededo, GU 96929',
    phone: '(671) 477-4335',
    website: 'https://www.instagram.com/geekoutnextlevel/',
    hours: 'Mall hours \u2014 check store for event times',
    tags: ['MTG', 'WPN Authorized', 'Commander', 'Draft', 'Sealed Product'],
    description: 'WPN-authorized game store in Micronesia Mall. Hosts Saturday Commander and Sunday Limited/Draft events. Full selection of MTG singles and sealed product.'
  },
  {
    id: 's3',
    name: 'My Wife Told Me To Sell It',
    badge: 'TCG & Collectibles',
    address: 'Compadres Mall \u2013 Grand Bazaar Unit K9, 562 Harmon Loop Rd, Dededo, GU 96929',
    phone: '(671) 637-4335',
    website: 'https://www.mywifetcg.com',
    hours: 'Mon/Wed/Thu 12\u20137 PM \u2022 Tue/Fri 12\u20136 PM \u2022 Sat 1\u20137 PM \u2022 Sun Closed',
    tags: ['TCG', 'Pok\u00e9mon', 'MTG', 'One Piece', 'Buy/Sell/Trade', '5.0\u2605 Rating'],
    description: 'Family-run TCG and collectibles shop in Dededo with a perfect 5.0-star Google rating. Carries Pok\u00e9mon, MTG, One Piece, blind boxes, and more. Shop online with in-store pickup. Buy, sell, and trade welcome.'
  },
  {
    id: 's4',
    name: "Fraim's Collectibles",
    badge: 'Collectibles',
    address: 'Building across Mangilao Mobil, 2nd Floor (above Selfpix), Mangilao, GU 96913',
    phone: null,
    website: 'https://www.instagram.com/fraimscollectibles/',
    hours: 'Mon\u2013Sat 10 AM\u20136 PM',
    tags: ['TCG', 'Pok\u00e9mon', 'Diecast', 'Funko Pop', 'Buy/Sell/Trade'],
    description: 'Mangilao collectibles shop carrying Pok\u00e9mon TCG, sports cards, diecast, Funko Pops, and Pop Mart. Hosts community events including the Guam Collectors Convention. Buy, sell, and trade welcome.'
  },
  {
    id: 's5',
    name: 'Poke Violet 671',
    badge: 'TCG Shop',
    address: '238 Archbishop Flores St, Unit 303 (DNA Building), Hag\u00e5t\u00f1a, GU 96910',
    phone: null,
    website: 'https://www.pokeviolet671.com',
    hours: 'Evenings \u2014 check Instagram for daily hours',
    tags: ['TCG', 'Pok\u00e9mon', 'One Piece', 'Union Arena'],
    description: 'Hag\u00e5t\u00f1a TCG shop specializing in Pok\u00e9mon and One Piece trading cards. Located in the DNA Building. Active in the local convention scene including TCG Con and Guam Pok\u00e9 Con.'
  }
];

/**
 * Simplified store list — used by BuyLocalModal.
 * Derived from the full GUAM_STORES so data stays in sync.
 */
export var GUAM_STORES_SIMPLE = GUAM_STORES.map(function(s) {
  return {
    id: s.id,
    name: s.name,
    address: s.address.split(',').slice(0, 2).join(',').trim() || s.address,
    hours: s.badge === 'WPN Store' ? 'WPN Store'
      : s.id === 's3' ? 'Mon/Wed/Thu 12-7, Tue/Fri 12-6, Sat 1-7'
      : s.id === 's4' ? 'Mon-Sat 10AM-6PM'
      : s.id === 's5' ? 'Evenings \u2022 Pok\u00e9mon/One Piece/Union Arena'
      : s.hours
  };
});

/**
 * Pickup store list — used by CheckoutView.
 * Derived from the full GUAM_STORES so data stays in sync.
 */
export var PICKUP_STORES = GUAM_STORES.map(function(s) {
  return { id: s.id, name: s.name, address: s.address, phone: s.phone };
});

/**
 * Store dropdown options for seller affiliation — used by SellerDashboard.
 * Includes a "No affiliation" option at the top.
 */
export var STORE_OPTIONS = [{ id: '', name: 'No affiliation' }].concat(
  GUAM_STORES.map(function(s) {
    return { id: s.id, name: s.name };
  })
);
