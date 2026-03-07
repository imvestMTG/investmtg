/* StoreView.js — Guam Marketplace */
import React from 'react';
import { filterMarketplace } from '../utils/marketplace-data.js';
import { formatUSD } from '../utils/helpers.js';
import { GUAM_STORES } from '../utils/stores.js';
import { MapPinIcon, PhoneIcon, ClockIcon, GlobeIcon, PlusIcon, SellerIcon, ShoppingCartIcon } from './shared/Icons.js';
import { ConfirmModal } from './shared/ConfirmModal.js';
var h = React.createElement;

export function StoreView(props) {
  var state = props.state;
  var updateCart = props.updateCart;
  var updateListings = props.updateListings;
  var onBuyLocal = props.onBuyLocal;
  var listings = state.listings;
  var ref1 = React.useState({ search: '', condition: '', type: '', sort: 'newest' });
  var filter = ref1[0], setFilter = ref1[1];
  var ref2 = React.useState('listings');
  var activeTab = ref2[0], setActiveTab = ref2[1];

  var ref3 = React.useState(null);
  var addedToCart = ref3[0], setAddedToCart = ref3[1];

  var ref4 = React.useState(null);
  var contactModal = ref4[0], setContactModal = ref4[1];

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

  function handleContact(listing) {
    setContactModal({ contact: listing.contact || listing.seller, notes: listing.notes });
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
          role: 'tab',
          'aria-selected': activeTab === 'listings' ? 'true' : 'false',
          onClick: function() { setActiveTab('listings'); },
          onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('listings'); } }
        }, 'Marketplace Listings'),
        h('button', {
          className: 'btn ' + (activeTab === 'stores' ? 'btn-primary' : 'btn-secondary'),
          role: 'tab',
          'aria-selected': activeTab === 'stores' ? 'true' : 'false',
          onClick: function() { setActiveTab('stores'); },
          onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('stores'); } }
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
        h('div', { className: 'mp-type-toggles', role: 'tablist' },
          h('button', {
            className: 'mp-type-toggle' + (filter.type === '' ? ' active' : ''),
            role: 'tab',
            'aria-selected': filter.type === '' ? 'true' : 'false',
            onClick: function() { updateFilter('type', ''); },
            onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateFilter('type', ''); } }
          }, 'All'),
          h('button', {
            className: 'mp-type-toggle' + (filter.type === 'sale' ? ' active' : ''),
            role: 'tab',
            'aria-selected': filter.type === 'sale' ? 'true' : 'false',
            onClick: function() { updateFilter('type', 'sale'); },
            onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateFilter('type', 'sale'); } }
          }, 'For Sale'),
          h('button', {
            className: 'mp-type-toggle' + (filter.type === 'trade' ? ' active' : ''),
            role: 'tab',
            'aria-selected': filter.type === 'trade' ? 'true' : 'false',
            onClick: function() { updateFilter('type', 'trade'); },
            onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateFilter('type', 'trade'); } }
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
                onContact: handleContact,
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
    ),

    // Contact modal
    contactModal && h(ConfirmModal, {
      title: 'Seller Contact',
      message: 'Contact: ' + contactModal.contact + (contactModal.notes ? '\nNotes: ' + contactModal.notes : ''),
      isAlert: true,
      onConfirm: function() { setContactModal(null); },
      onCancel: function() { setContactModal(null); }
    })
  );
}

function ListingCard(props) {
  var listing = props.listing;
  var onBuyLocal = props.onBuyLocal;
  var onAddToCart = props.onAddToCart;
  var onContact = props.onContact;
  var justAdded = props.justAdded;
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
            if (onContact) onContact(listing);
          }
        }, listing.type === 'trade' ? 'Trade Offer' : 'Message')
      )
    )
  );
}

function StoreCard(props) {
  var store = props.store;
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
      store.hours && h('div', { className: 'store-detail' },
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
