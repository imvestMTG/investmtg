/* StoreView.js — Guam Marketplace */
import React from 'react';
import { filterMarketplace } from '../utils/marketplace-data.js';
import { formatUSD } from '../utils/helpers.js';
import { GUAM_STORES, getStoresAsync } from '../utils/stores.js';
import { MapPinIcon, PhoneIcon, ClockIcon, GlobeIcon, PlusIcon, SellerIcon, ShoppingCartIcon, EditIcon, TrashIcon } from './shared/Icons.js';
import { ShareButton } from './shared/ShareButton.js';
import { ConfirmModal } from './shared/ConfirmModal.js';
import { deleteListing, updateListing, joinWaitlist } from '../utils/api.js';
var h = React.createElement;

export function StoreView(props) {
  var state = props.state;
  var user = props.user;
  var updateCart = props.updateCart;
  var updateListings = props.updateListings;
  var refreshMarketplace = props.refreshMarketplace;
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

  var ref6 = React.useState(null);
  var removeConfirm = ref6[0], setRemoveConfirm = ref6[1];

  var ref7 = React.useState(null);
  var flashMsg = ref7[0], setFlashMsg = ref7[1];

  function flash(msg) {
    setFlashMsg(msg);
    setTimeout(function() { setFlashMsg(null); }, 2500);
  }

  function handleRemoveListing(listing) {
    setRemoveConfirm(listing);
  }

  function confirmRemove() {
    if (!removeConfirm) return;
    var id = removeConfirm.id;
    setRemoveConfirm(null);
    deleteListing(id).then(function() {
      flash('Listing removed.');
      if (refreshMarketplace) refreshMarketplace();
    }).catch(function() {
      flash('Failed to remove listing.');
    });
  }

  function handleEditListing(id, data) {
    return updateListing(id, data).then(function() {
      flash('Listing updated.');
      if (refreshMarketplace) refreshMarketplace();
    }).catch(function() {
      flash('Failed to update listing.');
    });
  }

  // Dynamic stores state — start with static fallback, fetch from backend
  var ref5 = React.useState(GUAM_STORES);
  var stores = ref5[0], setStores = ref5[1];

  React.useEffect(function() {
    getStoresAsync().then(function(backendStores) {
      setStores(backendStores);
    }).catch(function() { /* stores will use cached data */ });
  }, []);

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

  return h('main', { className: 'container store-page', role: 'main' },

    // Page header
    h('div', { className: 'store-page-header' },
      h('div', { className: 'page-header-row' },
        h('h1', { className: 'store-page-title' }, 'Guam MTG Marketplace'),
        h(ShareButton, {
          title: 'Guam MTG Marketplace | investMTG',
          text: 'Buy, sell, and trade Magic cards locally in Guam on investMTG',
          url: 'https://www.investmtg.com/#store',
          size: 'sm'
        })
      ),
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
        h('a', {
          href: '#seller',
          className: 'btn btn-primary btn-sm'
        }, h(PlusIcon, null), ' List a Card')
      ),

      // Filters
      h('div', { className: 'mp-filters' },
        h('input', {
          className: 'mp-filter-search',
          type: 'search',
          placeholder: 'Search listings...',
          value: filter.search,
          onChange: function(e) { updateFilter('search', e.target.value); },
          'aria-label': 'Search listings'
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
            listings.length === 0
              ? h('div', null,
                  h('h3', null, 'No listings yet'),
                  h('p', null, 'Be the first to list a card on the Guam MTG marketplace.'),
                  h('a', { href: '#seller', className: 'btn btn-primary', style: { marginTop: 'var(--space-4)', display: 'inline-flex' } },
                    h(PlusIcon, null), ' Become a Seller & List Cards'
                  )
                )
              : h('p', null, 'No listings match your filters.')
          )
        : h('div', { className: 'mp-grid' },
            filtered.map(function(listing) {
              var isOwner = user && listing.userId && user.id === listing.userId;
              return h(ListingCard, {
                key: listing.id,
                listing: listing,
                isOwner: isOwner,
                onBuyLocal: onBuyLocal,
                onAddToCart: handleAddToCart,
                onContact: handleContact,
                onRemove: handleRemoveListing,
                onEdit: handleEditListing,
                justAdded: addedToCart === listing.id
              });
            })
          )
    ),

    // Stores tab
    activeTab === 'stores' && h('div', null,
      h('div', { className: 'stores-grid', style: { marginBottom: 'var(--space-8)' } },
        stores.map(function(store) {
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
    }),

    // Remove confirmation modal
    removeConfirm && h(ConfirmModal, {
      title: 'Remove Listing',
      message: 'Remove "' + removeConfirm.cardName + '" from the marketplace? This cannot be undone.',
      confirmLabel: 'Remove',
      onConfirm: confirmRemove,
      onCancel: function() { setRemoveConfirm(null); }
    }),

    // Flash notification
    flashMsg && h('div', { className: 'mp-flash' }, flashMsg)
  );
}

function ListingCard(props) {
  var listing = props.listing;
  var isOwner = props.isOwner;
  var onBuyLocal = props.onBuyLocal;
  var onAddToCart = props.onAddToCart;
  var onContact = props.onContact;
  var onRemove = props.onRemove;
  var onEdit = props.onEdit;
  var justAdded = props.justAdded;

  var ref8 = React.useState(false);
  var editing = ref8[0], setEditing = ref8[1];

  var ref9 = React.useState(String(listing.price || '0'));
  var editPrice = ref9[0], setEditPrice = ref9[1];

  var ref10 = React.useState(listing.notes || '');
  var editNotes = ref10[0], setEditNotes = ref10[1];

  var ref11 = React.useState(listing.condition || 'NM');
  var editCondition = ref11[0], setEditCondition = ref11[1];

  var ref12 = React.useState(false);
  var saving = ref12[0], setSaving = ref12[1];

  // Waitlist state
  var refWlShow = React.useState(false);
  var showWaitlistForm = refWlShow[0], setShowWaitlistForm = refWlShow[1];

  var refWlEmail = React.useState('');
  var waitlistEmail = refWlEmail[0], setWaitlistEmail = refWlEmail[1];

  var refWlResult = React.useState(null);
  var waitlistResult = refWlResult[0], setWaitlistResult = refWlResult[1];

  var refWlLoading = React.useState(false);
  var waitlistLoading = refWlLoading[0], setWaitlistLoading = refWlLoading[1];

  var availStatus = listing.availability_status || 'available';
  var isSoldOut = availStatus === 'sold_out';

  function handleJoinWaitlist() {
    if (!waitlistEmail) return;
    setWaitlistLoading(true);
    joinWaitlist(listing.userId, waitlistEmail, listing.id, null).then(function(data) {
      setWaitlistLoading(false);
      setWaitlistResult(data);
      setShowWaitlistForm(false);
    }).catch(function() {
      setWaitlistLoading(false);
      setWaitlistResult({ error: 'Failed to join waitlist' });
    });
  }

  function startEdit() {
    setEditPrice(String(listing.price || '0'));
    setEditNotes(listing.notes || '');
    setEditCondition(listing.condition || 'NM');
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function saveEdit() {
    var parsed = parseFloat(editPrice);
    if (isNaN(parsed) || parsed < 0) return;
    setSaving(true);
    onEdit(listing.id, { price: parsed, notes: editNotes || null, condition: editCondition }).then(function() {
      setEditing(false);
      setSaving(false);
    }).catch(function() {
      setSaving(false);
    });
  }

  var condClass = { NM: 'cond-nm', LP: 'cond-lp', MP: 'cond-mp', HP: 'cond-hp' }[listing.condition] || 'cond-nm';

  return h('div', { className: 'mp-listing-card' + (isOwner ? ' mp-listing-owned' : '') },

    // Owner badge
    isOwner && h('div', { className: 'mp-owner-badge' }, 'Your Listing'),

    h('div', { className: 'mp-listing-image' },
      listing.image
        ? h('img', { src: listing.image, alt: listing.cardName, loading: 'lazy' })
        : h('div', { style: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-faint)', fontSize: 'var(--text-xs)' } }, listing.cardName),
      h('div', { className: 'mp-listing-badges' },
        h('span', { className: 'mp-badge-condition ' + condClass }, listing.condition),
        h('span', { className: 'mp-badge-type type-' + listing.type }, listing.type === 'sale' ? 'For Sale' : 'Trade'),
        h('span', {
          className: 'avail-badge avail-badge--' + (availStatus === 'low_stock' ? 'low-stock' : availStatus === 'sold_out' ? 'sold-out' : 'available')
        }, availStatus === 'low_stock' ? 'Low Stock' : availStatus === 'sold_out' ? 'Sold Out' : 'In Stock')
      )
    ),
    h('div', { className: 'mp-listing-info' },
      h('div', { className: 'mp-listing-name' }, listing.cardName),
      h('div', { className: 'mp-listing-set' }, listing.setName),

      // Edit mode
      editing
        ? h('div', { className: 'mp-edit-form' },
            h('label', { className: 'mp-edit-label' }, 'Price ($)'),
            h('input', {
              className: 'mp-edit-input',
              type: 'number',
              step: '0.01',
              min: '0',
              value: editPrice,
              onChange: function(e) { setEditPrice(e.target.value); }
            }),
            h('label', { className: 'mp-edit-label' }, 'Condition'),
            h('select', {
              className: 'mp-edit-input',
              value: editCondition,
              onChange: function(e) { setEditCondition(e.target.value); }
            },
              ['NM', 'LP', 'MP', 'HP'].map(function(c) {
                return h('option', { key: c, value: c }, c);
              })
            ),
            h('label', { className: 'mp-edit-label' }, 'Notes'),
            h('textarea', {
              className: 'mp-edit-input mp-edit-textarea',
              value: editNotes,
              rows: 2,
              onChange: function(e) { setEditNotes(e.target.value); }
            }),
            h('div', { className: 'mp-edit-actions' },
              h('button', {
                className: 'btn btn-primary btn-sm',
                disabled: saving,
                onClick: saveEdit
              }, saving ? 'Saving...' : 'Save'),
              h('button', {
                className: 'btn btn-secondary btn-sm',
                disabled: saving,
                onClick: cancelEdit
              }, 'Cancel')
            )
          )
        : h(React.Fragment, null,
            h('div', { className: 'mp-listing-price-row' },
              h('span', { className: 'mp-listing-price' }, listing.type === 'sale' ? formatUSD(listing.price) : 'Trade'),
              h('span', { className: 'mp-listing-seller' },
                h('span', { className: 'mp-seller-badge' }, listing.seller)
              )
            ),
            listing.notes && h('p', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', lineHeight: '1.4' } }, listing.notes),

            // Owner controls
            isOwner && h('div', { className: 'mp-owner-controls' },
              h('button', {
                className: 'btn btn-sm mp-btn-edit',
                onClick: startEdit
              }, h(EditIcon, null), ' Edit'),
              h('button', {
                className: 'btn btn-sm mp-btn-remove',
                onClick: function() { onRemove(listing); }
              }, h(TrashIcon, null), ' Remove')
            ),

            // Public actions (hide for owner to reduce clutter, they can still use seller dashboard)
            !isOwner && h('div', { className: 'mp-listing-actions' },
              isSoldOut
                ? h(React.Fragment, null,
                    waitlistResult && waitlistResult.joined !== undefined
                      ? h('div', { className: 'waitlist-success' },
                          waitlistResult.joined
                            ? 'On Waitlist \u2713 (Position #' + waitlistResult.position + ')'
                            : waitlistResult.message || 'Already on waitlist'
                        )
                      : waitlistResult && waitlistResult.error
                        ? h('div', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-error)', marginTop: 'var(--space-1)' } }, waitlistResult.error)
                        : showWaitlistForm
                          ? h('div', { className: 'waitlist-form' },
                              h('input', {
                                type: 'email',
                                placeholder: 'Your email',
                                value: waitlistEmail,
                                onChange: function(e) { setWaitlistEmail(e.target.value); },
                                onKeyDown: function(e) { if (e.key === 'Enter') handleJoinWaitlist(); }
                              }),
                              h('button', {
                                className: 'btn btn-primary btn-sm',
                                onClick: handleJoinWaitlist,
                                disabled: waitlistLoading || !waitlistEmail
                              }, waitlistLoading ? 'Joining...' : 'Join')
                            )
                          : h('button', {
                              className: 'btn btn-secondary',
                              onClick: function() { setShowWaitlistForm(true); }
                            }, 'Join Waitlist')
                  )
                : h(React.Fragment, null,
                    listing.type === 'sale' && h('button', {
                      className: 'btn mp-btn-buylocal',
                      onClick: function() {
                        if (onBuyLocal) {
                          onBuyLocal({ id: listing.id, name: listing.cardName, set_name: listing.setName, prices: { usd: String(listing.price) } });
                        }
                      }
                    }, h(ShoppingCartIcon, null), ' Buy')
                  ),
              !isSoldOut && h('button', {
                className: 'btn mp-btn-msg',
                onClick: function() {
                  if (onContact) onContact(listing);
                }
              }, listing.type === 'trade' ? 'Trade Offer' : 'Message')
            )
          )
    )
  );
}

function StoreCard(props) {
  var store = props.store;
  var tags = Array.isArray(store.tags) ? store.tags : [];
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
      tags.map(function(tag) {
        return h('span', { key: tag, className: 'store-tag' }, tag);
      })
    )
  );
}
