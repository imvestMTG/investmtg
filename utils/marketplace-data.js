/* marketplace-data.js — Mock marketplace listings */

export function getInitialMarketplaceData() {
  return [
    { id: 'm1', cardName: 'Black Lotus', setName: 'Unlimited', condition: 'HP', price: 18500, type: 'sale', seller: 'IslandVintage671', contact: '@islandvintage671', notes: 'Iconic piece. Serious inquiries only. Meet at Geek Out.', image: 'https://cards.scryfall.io/small/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg?1614638838', createdAt: Date.now() - 86400000 * 10 },
    { id: 'm2', cardName: 'Force of Will', setName: 'Alliances', condition: 'LP', price: 75, type: 'sale', seller: 'GuamMTGTrader', contact: '(671) 555-0142', notes: 'Clean borders, minor edge wear.', image: 'https://cards.scryfall.io/small/front/8/9/89f612d6-7c59-4a7b-a87d-45f789e88ba5.jpg?1753711891', createdAt: Date.now() - 86400000 * 8 },
    { id: 'm3', cardName: 'Ragavan, Nimble Pilferer', setName: 'Modern Horizons 2', condition: 'NM', price: 58, type: 'sale', seller: 'ChamorroCards', contact: '@chamorrocards', notes: 'Pack fresh, double sleeved.', image: 'https://cards.scryfall.io/small/front/a/9/a9738cda-adb1-47fb-9f4c-ecd930228c4d.jpg?1681963138', createdAt: Date.now() - 86400000 * 7 },
    { id: 'm4', cardName: 'The One Ring', setName: 'Lord of the Rings', condition: 'NM', price: 42, type: 'sale', seller: 'PacificPlayables', contact: '@pacificplayables', notes: 'Pulled at Geek Out prerelease.', image: 'https://cards.scryfall.io/small/front/d/5/d5806e68-1054-458e-866d-1f2470f682b2.jpg?1763472900', createdAt: Date.now() - 86400000 * 6 },
    { id: 'm5', cardName: 'Mana Crypt', setName: 'Eternal Masters', condition: 'LP', price: 165, type: 'sale', seller: 'IslandVintage671', contact: '@islandvintage671', notes: 'Commander staple. Slight corner wear.', image: 'https://cards.scryfall.io/small/front/4/d/4d960186-4559-4af0-bd22-63baa15f8939.jpg?1727298349', createdAt: Date.now() - 86400000 * 5 },
    { id: 'm6', cardName: 'Scalding Tarn', setName: 'Zendikar Rising Expeditions', condition: 'NM', price: 28, type: 'trade', seller: 'GuamMTGTrader', contact: '(671) 555-0142', notes: 'Looking for Verdant Catacombs or equivalent fetches.', image: 'https://cards.scryfall.io/small/front/7/1/71e491c5-8c07-449b-b2f1-ffa052e6d311.jpg?1738703652', createdAt: Date.now() - 86400000 * 4 },
    { id: 'm7', cardName: 'Liliana of the Veil', setName: 'Innistrad', condition: 'MP', price: 22, type: 'sale', seller: 'TamuningTCG', contact: '@tamunungtcg', notes: 'Surface scratches, plays fine in sleeves.', image: 'https://cards.scryfall.io/small/front/d/1/d12c8c97-6491-452c-811d-943441a7ef9f.jpg?1673307126', createdAt: Date.now() - 86400000 * 3 },
    { id: 'm8', cardName: 'Wrenn and Six', setName: 'Modern Horizons', condition: 'NM', price: 52, type: 'sale', seller: 'PacificPlayables', contact: '@pacificplayables', notes: 'From my Jund collection. Mint condition.', image: 'https://cards.scryfall.io/small/front/5/b/5bd498cc-a609-4457-9325-6888d59ca36f.jpg?1673149294', createdAt: Date.now() - 86400000 * 2 },
    { id: 'm9', cardName: 'Doubling Season', setName: 'Battlebond', condition: 'NM', price: 38, type: 'trade', seller: 'ChamorroCards', contact: '@chamorrocards', notes: 'Want Rhystic Study or Smothering Tithe.', image: 'https://cards.scryfall.io/small/front/f/2/f2c4f80e-84a0-463b-82c3-5c6503809351.jpg?1730489400', createdAt: Date.now() - 86400000 * 1.5 },
    { id: 'm10', cardName: 'Underground Sea', setName: 'Revised', condition: 'HP', price: 420, type: 'sale', seller: 'IslandVintage671', contact: '@islandvintage671', notes: 'Played condition but iconic dual land. Price firm.', image: 'https://cards.scryfall.io/small/front/2/6/26cee543-6eab-494e-a803-33a5d48d7d74.jpg?1562902883', createdAt: Date.now() - 86400000 },
    { id: 'm11', cardName: 'Jace, the Mind Sculptor', setName: 'Worldwake', condition: 'LP', price: 32, type: 'sale', seller: 'TamuningTCG', contact: '@tamunungtcg', notes: 'Original printing. Pickup at Inventory preferred.', image: 'https://cards.scryfall.io/small/front/c/8/c8817585-0d32-4d56-9142-0d29512e86a9.jpg?1598304029', createdAt: Date.now() - 86400000 * 0.5 },
    { id: 'm12', cardName: 'Arid Mesa', setName: 'Zendikar', condition: 'NM', price: 18, type: 'trade', seller: 'GuamMTGTrader', contact: '(671) 555-0142', notes: 'Looking for Misty Rainforest 1:1.', image: 'https://cards.scryfall.io/small/front/2/5/25ac5405-df7b-4097-914a-022cb18e20d4.jpg?1738703645', createdAt: Date.now() }
  ];
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
