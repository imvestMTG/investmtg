/* StoreView.js — Guam Marketplace */
import React from 'react';
import { filterMarketplace } from '../utils/marketplace-data.js';
import { formatUSD } from '../utils/helpers.js';
import { MapPinIcon, PhoneIcon, ClockIcon, GlobeIcon, PlusIcon, SellerIcon, ShoppingCartIcon } from './shared/Icons.js';
var h = React.createElement;

var GUAM_STORES = [
  {
    id: 's1',
    name: 'Geek Out',
    badge: 'Featured Store',
    address: 'Micronesia Mall, 1088 Marine Corps Dr, 2F Concourse, Dededo, GU 96929',
    phone: '(671) 969-4335',
    website: 'https://instagram.com/geekoutguam',
    hours: 'Mon–Sat 10am–9pm, Sun 10am–8pm',
    tags: ['MTG Singles', 'Sealed Product', 'Tournaments', 'Collectibles', 'Free Play Space'],
    description: 'Guam\'s premier locally-owned collectible store inside Micronesia Mall. Full selection of MTG singles, sealed product, and weekly events. Their Next Level area hosts tournaments, Commander nights, and casual play — tables are always free to use. Also carries Pokémon, anime figures, and more.',
    extra: 'Next Level events line: (671) 637-4335'
  },
  {
    id: 's2',
    name: 'The Inventory',
    badge: 'Tournament Store',
    address: '230 W Soledad Ave, Suite 204, Hagåtña, GU 96910',
    phone: '(671) 969-4263',
    website: 'https://instagram.com/theinventoryguam',
    hours: 'Wed–Sat 1–10pm, Sun 10am–5pm, Mon–Tue Closed',
    tags: ['MTG Singles', 'Tournaments', 'Commander Nights', 'Warhammer', 'TCGplayer Seller'],
    description: 'Guam\'s official tournament store, located on the 2nd floor across from Chamorro Village in Hagåtña. Hosts Commander nights on Thursdays, release events, and open tables for casual play. Also sells on TCGplayer for verified market pricing. Carries MTG, Pokémon, Yu-Gi-Oh!, Warhammer, and more.'
  },
  {
    id: 's3',
    name: 'My Wife Told Me To Sell It',
    badge: 'TCG & Collectibles',
    address: 'Compadres Mall Grand Bazaar, Unit K9, Dededo, GU 96929',
    phone: null,
    website: 'https://mywifetcg.com',
    hours: 'Mon/Wed/Thu 12–7pm, Tue/Fri 12–6pm, Sat 1–7pm, Sun Closed',
    tags: ['Sealed Product', 'MTG', 'Pokémon', 'One Piece TCG', 'Buy/Sell/Trade', 'Collectibles'],
    description: 'Family-run TCG and collectibles shop in Compadres Mall. Carries sealed MTG, Pokémon, One Piece, plus Pop Mart and Funko Pop! figures. Known for great prices and a welcoming, family-friendly atmosphere. Women-owned. Shop online with in-store pickup available.'
  },
  {
    id: 's4',
    name: 'ComicBook Guam',
    badge: 'Comics & Cards',
    address: 'Agaña Shopping Center, 302 S Route 4 #100, Hagåtña, GU 96910',
    phone: '(671) 688-7040',
    website: 'https://instagram.com/comicbook.guam',
    hours: 'Mon–Sat 10am–8pm, Sun 10am–6pm',
    tags: ['Comic Books', 'Trading Cards', 'Yu-Gi-Oh!', 'Pokémon'],
    description: 'Comic book store in Agaña Shopping Center carrying comics and a selection of trading cards including Pokémon and Yu-Gi-Oh! packs. Good for a quick visit to browse new releases and pick up packs.'
  }
];

export function StoreView({ state, updateCart, updateListings, onBuyLocal }) {
  var listings = state.listings;
  var ref1 = React.useState({ search: '', condition: '', type: '', sort: 'newest' });
  var filter = ref1[0], setFilter = ref1[1];
  var ref2 = React.useState('listings');
  var activeTab = ref2[0], setActiveTab = ref2[1];

  var ref3 = React.useState(null);
  var addedToCart = ref3[0], setAddedToCart = ref3[1];

  var filtered = filterMarketplace(listings, filter);

  function updateFilter(key, val) {
    setFilter(function(prev) { return Object.assign({}, prev, { [key]: val }); });
  }

  function handleAddToCart(listing) {
    var cart = state.cart || [];
    var existingIdx = cart.findIndex(function(i) { return i.id === listing.id; });
    var newCart;
    if (existingIdx >= 0) {
      newCart = cart.map(function(i, idx) {
        return idx === existingIdx ? Object.assign({}, i, { qty: (i.qty || 1) + 1 }) : i;
      });
    } else {
      newCart = cart.concat([{
        id: listing.id,
        name: listing.cardName,
        set: listing.setName,
        condition: listing.condition,
        price: listing.price,
        seller: listing.seller,
        image: listing.image || null,
        qty: 1
      }]);
    }
    updateCart(newCart);
    setAddedToCart(listing.id);
    setTimeout(function() { setAddedToCart(null); }, 1500);
  }

  return h('div', { className: 'container store-page' },

    // Page header
    h('div', { className: 'store-page-header' },
      h('h1', { className: 'store-page-title' }, 'Guam MTG Marketplace'),
      h('p', { className: 'store-page-intro' },
        'Buy, sell, and trade Magic cards with Guam\'s local community. All transactions happen in person at local stores or meetups.'
      ),
      h('div', { className: 'store-page-links' },
        h('button', {
          className: 'btn ' + (activeTab === 'listings' ? 'btn-primary' : 'btn-secondary'),
          onClick: function() { setActiveTab('listings'); }
        }, 'Marketplace Listings'),
        h('button', {
          className: 'btn ' + (activeTab === 'stores' ? 'btn-primary' : 'btn-secondary'),
          onClick: function() { setActiveTab('stores'); }
        }, 'Local Stores'),
        h('a', {
          href: '#seller',
          className: 'btn btn-seller-cta'
        },
          h(SellerIcon, null), ' Become a Seller'
        )
      )
    ),

    // Marketplace listings tab
    activeTab === 'listings' && h('div', null,
      // MP Header
      h('div', { className: 'mp-header' },
        h('p', { className: 'mp-subtitle' }, 'Community listings from Guam MTG players'),
        h('div', { className: 'mp-stats-bar' },
          h('span', null,
            h('span', { className: 'mp-stat-highlight' }, listings.length), ' active listings'
          ),
          h('span', null, '•'),
          h('span', null,
            h('span', { className: 'mp-stat-highlight' },
              listings.filter(function(l) { return l.type === 'sale'; }).length
            ), ' for sale'
          ),
          h('span', null, '•'),
          h('span', null,
            h('span', { className: 'mp-stat-highlight' },
              listings.filter(function(l) { return l.type === 'trade'; }).length
            ), ' trades'
          )
        )
      ),

      // Top actions
      h('div', { className: 'mp-top-actions' },
        h('p', { style: { fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' } },
          'Showing ', filtered.length, ' of ', listings.length, ' listings'
        ),
        h('button', {
          className: 'btn btn-primary btn-sm',
          onClick: function() {
            var mockCard = { id: 'new', name: 'Your Card', set_name: 'Your Set', prices: { usd: '0' } };
            if (onBuyLocal) onBuyLocal(mockCard);
          }
        }, h(PlusIcon, null), ' List a Card')
      ),

      // Filters
      h('div', { className: 'mp-filters' },
        h('input', {
          className: 'mp-filter-search',
          type: 'search',
          placeholder: 'Search listings...',
          value: filter.search,
          onChange: function(e) { updateFilter('search', e.target.value); }
        }),
        h('select', {
          className: 'mp-filter-select',
          value: filter.condition,
          onChange: function(e) { updateFilter('condition', e.target.value); }
        },
          h('option', { value: '' }, 'All Conditions'),
          ['NM', 'LP', 'MP', 'HP'].map(function(c) {
            return h('option', { key: c, value: c }, c);
          })
        ),
        h('select', {
          className: 'mp-filter-select',
          value: filter.sort,
          onChange: function(e) { updateFilter('sort', e.target.value); }
        },
          h('option', { value: 'newest' }, 'Newest First'),
          h('option', { value: 'price_asc' }, 'Price: Low to High'),
          h('option', { value: 'price_desc' }, 'Price: High to Low')
        ),
        h('div', { className: 'mp-type-toggles' },
          h('button', {
            className: 'mp-type-toggle' + (filter.type === '' ? ' active' : ''),
            onClick: function() { updateFilter('type', ''); }
          }, 'All'),
          h('button', {
            className: 'mp-type-toggle' + (filter.type === 'sale' ? ' active' : ''),
            onClick: function() { updateFilter('type', 'sale'); }
          }, 'For Sale'),
          h('button', {
            className: 'mp-type-toggle' + (filter.type === 'trade' ? ' active' : ''),
            onClick: function() { updateFilter('type', 'trade'); }
          }, 'Trades')
        )
      ),

      // Grid
      filtered.length === 0
        ? h('div', { className: 'empty-state' },
            h('p', null, 'No listings match your filters.')
          )
        : h('div', { className: 'mp-grid' },
            filtered.map(function(listing) {
              return h(ListingCard, {
                key: listing.id,
                listing: listing,
                onBuyLocal: onBuyLocal,
                onAddToCart: handleAddToCart,
                justAdded: addedToCart === listing.id
              });
            })
          )
    ),

    // Stores tab
    activeTab === 'stores' && h('div', null,
      h('div', { className: 'stores-grid', style: { marginBottom: 'var(--space-8)' } },
        GUAM_STORES.map(function(store) {
          return h(StoreCard, { key: store.id, store: store });
        })
      ),
      h('div', { className: 'store-community-note' },
        h('p', null,
          h('strong', null, 'Want your store listed?'),
          ' Contact us on ', h('a', { href: 'https://x.com/investMTG', target: '_blank', rel: 'noopener' }, 'Twitter/X'),
          ' or email ', h('a', { href: 'mailto:hello@investmtg.com' }, 'hello@investmtg.com'), '.'
        )
      ),

      // Become a seller CTA
      h('div', { className: 'store-seller-cta' },
        h('div', { className: 'store-seller-cta-inner' },
          h(SellerIcon, null),
          h('div', null,
            h('h3', null, 'Want to sell your cards?'),
            h('p', null, 'Create a free seller account and list your cards in the Guam MTG marketplace.')
          ),
          h('a', { href: '#seller', className: 'btn btn-primary' }, 'Become a Seller')
        )
      )
    )
  );
}

function ListingCard({ listing, onBuyLocal, onAddToCart, justAdded }) {
  var condClass = { NM: 'cond-nm', LP: 'cond-lp', MP: 'cond-mp', HP: 'cond-hp' }[listing.condition] || 'cond-nm';
  return h('div', { className: 'mp-listing-card' },
    h('div', { className: 'mp-listing-image' },
      listing.image
        ? h('img', { src: listing.image, alt: listing.cardName, loading: 'lazy' })
        : h('div', { style: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-faint)', fontSize: 'var(--text-xs)' } }, listing.cardName),
      h('div', { className: 'mp-listing-badges' },
        h('span', { className: 'mp-badge-condition ' + condClass }, listing.condition),
        h('span', { className: 'mp-badge-type type-' + listing.type }, listing.type === 'sale' ? 'For Sale' : 'Trade')
      )
    ),
    h('div', { className: 'mp-listing-info' },
      h('div', { className: 'mp-listing-name' }, listing.cardName),
      h('div', { className: 'mp-listing-set' }, listing.setName),
      h('div', { className: 'mp-listing-price-row' },
        h('span', { className: 'mp-listing-price' }, listing.type === 'sale' ? formatUSD(listing.price) : 'Trade'),
        h('span', { className: 'mp-listing-seller' },
          h('span', { className: 'mp-seller-badge' }, listing.seller)
        )
      ),
      listing.notes && h('p', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', lineHeight: '1.4' } }, listing.notes),
      h('div', { className: 'mp-listing-actions' },
        listing.type === 'sale' && h('button', {
          className: 'btn mp-btn-cart' + (justAdded ? ' added' : ''),
          onClick: function() {
            if (onAddToCart) onAddToCart(listing);
          }
        },
          justAdded
            ? '✓ Added'
            : h('span', null, h(ShoppingCartIcon, null), ' Add to Cart')
        ),
        listing.type === 'sale' && h('button', {
          className: 'btn mp-btn-buylocal',
          onClick: function() {
            if (onBuyLocal) {
              onBuyLocal({ id: listing.id, name: listing.cardName, set_name: listing.setName, prices: { usd: String(listing.price) } });
            }
          }
        }, 'Buy Local'),
        h('button', {
          className: 'btn mp-btn-msg',
          onClick: function() {
            var contact = listing.contact || listing.seller;
            alert('Contact: ' + contact + (listing.notes ? '\nNotes: ' + listing.notes : ''));
          }
        }, listing.type === 'trade' ? 'Trade Offer' : 'Message')
      )
    )
  );
}

function StoreCard({ store }) {
  return h('div', { className: 'store-card-detailed' },
    h('div', { className: 'store-card-header' },
      h('div', null,
        h('div', { className: 'store-name' }, store.name)
      ),
      h('span', { className: 'store-badge' }, store.badge)
    ),
    h('div', { className: 'store-description' }, store.description),
    h('div', { className: 'store-card-body' },
      h('div', { className: 'store-detail' },
        h(MapPinIcon, { className: 'store-icon' }),
        h('span', null, store.address)
      ),
      store.phone && h('div', { className: 'store-detail' },
        h(PhoneIcon, { className: 'store-icon' }),
        h('a', { href: 'tel:' + store.phone }, store.phone)
      ),
      h('div', { className: 'store-detail' },
        h(ClockIcon, { className: 'store-icon' }),
        h('span', null, store.hours)
      ),
      store.website && h('div', { className: 'store-detail' },
        h(GlobeIcon, { className: 'store-icon' }),
        h('a', { href: store.website, target: '_blank', rel: 'noopener' }, store.website.replace('https://', ''))
      ),
      store.extra && h('div', { className: 'store-detail' },
        h(PhoneIcon, { className: 'store-icon' }),
        h('span', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' } }, store.extra)
      )
    ),
    h('div', { className: 'store-card-footer' },
      store.tags.map(function(tag) {
        return h('span', { key: tag, className: 'store-tag' }, tag);
      })
    )
  );
}
