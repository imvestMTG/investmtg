/* StoreView.js — Guam Marketplace */
import React from 'react';
import { filterMarketplace } from '../utils/marketplace-data.js';
import { formatUSD } from '../utils/helpers.js';
import { MapPinIcon, PhoneIcon, ClockIcon, GlobeIcon, PlusIcon } from './shared/Icons.js';
var h = React.createElement;

var GUAM_STORES = [
  {
    id: 's1',
    name: 'Geek Out Guam',
    badge: 'Featured Store',
    address: '404 W. O\'Brien Dr., Suite 101, Hagatna, GU 96910',
    phone: '(671) 477-4335',
    website: 'https://geekoutguam.com',
    hours: 'Mon–Sat 10am–7pm, Sun 12–5pm',
    tags: ['Single Cards', 'Sealed Packs', 'Tournaments', 'Commander Night'],
    description: 'Guam\'s premier hobby store. Full selection of MTG singles, sealed product, and weekly FNM events. Knowledgeable staff and competitive pricing.'
  },
  {
    id: 's2',
    name: 'Inventory Game Store',
    badge: 'Local Store',
    address: 'Tamuning, GU 96913',
    phone: '(671) 649-4263',
    website: null,
    hours: 'Mon–Fri 12–8pm, Sat–Sun 11am–7pm',
    tags: ['Singles', 'Casual Play', 'Trades Welcome'],
    description: 'Community-focused game store with a great selection of Magic singles. Trades welcome. Relaxed atmosphere for casual and competitive players alike.'
  },
  {
    id: 's3',
    name: 'Pacific Card Exchange',
    badge: 'Marketplace',
    address: 'Tumon, GU 96913',
    phone: '(671) 555-0198',
    website: null,
    hours: 'By appointment',
    tags: ['High-End Singles', 'Reserved List', 'By Appointment'],
    description: 'Specializing in high-value and reserved list cards. Competitive buylist prices. Ideal for collectors looking for Alpha/Beta/Unlimited power cards.'
  },
  {
    id: 's4',
    name: 'Island Hobby Center',
    badge: 'Multi-Game',
    address: 'Dededo, GU 96929',
    phone: '(671) 632-0044',
    website: null,
    hours: 'Tue–Sun 11am–6pm',
    tags: ['MTG', 'Pokemon', 'Yu-Gi-Oh!', 'Board Games'],
    description: 'Multi-game hobby center carrying Magic, Pokemon, Yu-Gi-Oh!, and board games. Regular MTG draft nights on Saturdays. Beginner-friendly environment.'
  }
];

export function StoreView({ state, updateCart, updateListings, onBuyLocal }) {
  var listings = state.listings;
  var ref1 = React.useState({ search: '', condition: '', type: '', sort: 'newest' });
  var filter = ref1[0], setFilter = ref1[1];
  var ref2 = React.useState('listings');
  var activeTab = ref2[0], setActiveTab = ref2[1];

  var filtered = filterMarketplace(listings, filter);

  function updateFilter(key, val) {
    setFilter(function(prev) { return Object.assign({}, prev, { [key]: val }); });
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
        }, 'Local Stores')
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
                onBuyLocal: onBuyLocal
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
      )
    )
  );
}

function ListingCard({ listing, onBuyLocal }) {
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
        h('span', { className: 'mp-listing-seller' }, listing.seller)
      ),
      listing.notes && h('p', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', lineHeight: '1.4' } }, listing.notes),
      h('div', { className: 'mp-listing-actions' },
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
      h('div', { className: 'store-detail' },
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
      )
    ),
    h('div', { className: 'store-card-footer' },
      store.tags.map(function(tag) {
        return h('span', { key: tag, className: 'store-tag' }, tag);
      })
    )
  );
}
