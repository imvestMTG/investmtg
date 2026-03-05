/* marketplace-data.js — Mock marketplace listings */

export function getInitialMarketplaceData() {
  return [
    { id: 'm1', cardName: 'Black Lotus', setName: 'Unlimited', condition: 'HP', price: 18500, type: 'sale', seller: 'IslandVintage671', contact: '@islandvintage671', notes: 'Iconic piece. Serious inquiries only. Meet at Geek Out.', image: '', createdAt: Date.now() - 86400000 * 10 },
    { id: 'm2', cardName: 'Force of Will', setName: 'Alliances', condition: 'LP', price: 75, type: 'sale', seller: 'GuamMTGTrader', contact: '(671) 555-0142', notes: 'Clean borders, minor edge wear.', image: '', createdAt: Date.now() - 86400000 * 8 },
    { id: 'm3', cardName: 'Ragavan, Nimble Pilferer', setName: 'Modern Horizons 2', condition: 'NM', price: 58, type: 'sale', seller: 'ChamorroCards', contact: '@chamorrocards', notes: 'Pack fresh, double sleeved.', image: '', createdAt: Date.now() - 86400000 * 7 },
    { id: 'm4', cardName: 'The One Ring', setName: 'Lord of the Rings', condition: 'NM', price: 42, type: 'sale', seller: 'PacificPlayables', contact: '@pacificplayables', notes: 'Pulled at Geek Out prerelease.', image: '', createdAt: Date.now() - 86400000 * 6 },
    { id: 'm5', cardName: 'Mana Crypt', setName: 'Eternal Masters', condition: 'LP', price: 165, type: 'sale', seller: 'IslandVintage671', contact: '@islandvintage671', notes: 'Commander staple. Slight corner wear.', image: '', createdAt: Date.now() - 86400000 * 5 },
    { id: 'm6', cardName: 'Scalding Tarn', setName: 'Zendikar Rising Expeditions', condition: 'NM', price: 28, type: 'trade', seller: 'GuamMTGTrader', contact: '(671) 555-0142', notes: 'Looking for Verdant Catacombs or equivalent fetches.', image: '', createdAt: Date.now() - 86400000 * 4 },
    { id: 'm7', cardName: 'Liliana of the Veil', setName: 'Innistrad', condition: 'MP', price: 22, type: 'sale', seller: 'TamuningTCG', contact: '@tamunungtcg', notes: 'Surface scratches, plays fine in sleeves.', image: '', createdAt: Date.now() - 86400000 * 3 },
    { id: 'm8', cardName: 'Wrenn and Six', setName: 'Modern Horizons', condition: 'NM', price: 52, type: 'sale', seller: 'PacificPlayables', contact: '@pacificplayables', notes: 'From my Jund collection. Mint condition.', image: '', createdAt: Date.now() - 86400000 * 2 },
    { id: 'm9', cardName: 'Doubling Season', setName: 'Battlebond', condition: 'NM', price: 38, type: 'trade', seller: 'ChamorroCards', contact: '@chamorrocards', notes: 'Want Rhystic Study or Smothering Tithe.', image: '', createdAt: Date.now() - 86400000 * 1.5 },
    { id: 'm10', cardName: 'Underground Sea', setName: 'Revised', condition: 'HP', price: 420, type: 'sale', seller: 'IslandVintage671', contact: '@islandvintage671', notes: 'Played condition but iconic dual land. Price firm.', image: '', createdAt: Date.now() - 86400000 },
    { id: 'm11', cardName: 'Jace, the Mind Sculptor', setName: 'Worldwake', condition: 'LP', price: 32, type: 'sale', seller: 'TamuningTCG', contact: '@tamunungtcg', notes: 'Original printing. Pickup at Inventory preferred.', image: '', createdAt: Date.now() - 86400000 * 0.5 },
    { id: 'm12', cardName: 'Arid Mesa', setName: 'Zendikar', condition: 'NM', price: 18, type: 'trade', seller: 'GuamMTGTrader', contact: '(671) 555-0142', notes: 'Looking for Misty Rainforest 1:1.', image: '', createdAt: Date.now() }
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
