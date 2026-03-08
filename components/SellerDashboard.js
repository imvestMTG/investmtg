/* SellerDashboard.js — Seller management portal */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { STORE_OPTIONS } from '../utils/stores.js';
import { getStoreOptionsAsync } from '../utils/stores.js';
import { PlusIcon, EditIcon, TrashIcon, UserIcon, TagIcon, OrderIcon, ShieldIcon, CheckCircleIcon } from './shared/Icons.js';
import { sanitizeInput } from '../utils/sanitize.js';
import { ConfirmModal } from './shared/ConfirmModal.js';
import { fetchSeller, registerSeller, createListing, deleteListing, fetchListings } from '../utils/api.js';
var h = React.createElement;

var CONDITIONS = ['NM', 'LP', 'MP', 'HP'];
var LISTING_TYPES = ['sale', 'trade'];

// Scryfall autocomplete — debounced fetch
function useScryfallAutocomplete(query) {
  var ref = React.useState([]);
  var results = ref[0], setResults = ref[1];

  var ref2 = React.useState(false);
  var loading = ref2[0], setLoading = ref2[1];

  React.useEffect(function() {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    var cancelled = false;
    var timerId = setTimeout(function() {
      var url = 'https://api.scryfall.com/cards/autocomplete?q=' + encodeURIComponent(query) + '&include_extras=false';
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!cancelled) {
            setResults(data.data || []);
            setLoading(false);
          }
        })
        .catch(function() {
          if (!cancelled) { setLoading(false); }
        });
    }, 100);
    return function() { cancelled = true; clearTimeout(timerId); };
  }, [query]);

  return { results: results, loading: loading };
}

// ===== REGISTRATION FORM =====
function RegistrationForm(props) {
  var onRegister = props.onRegister;
  var storeOptions = props.storeOptions || STORE_OPTIONS;

  var ref1 = React.useState({ name: '', contact: '', storeId: '', bio: '' });
  var form = ref1[0], setForm = ref1[1];
  var ref2 = React.useState({});
  var errors = ref2[0], setErrors = ref2[1];
  var ref3 = React.useState(false);
  var submitting = ref3[0], setSubmitting = ref3[1];
  var ref4 = React.useState(null);
  var submitError = ref4[0], setSubmitError = ref4[1];

  function update(key, val) {
    setForm(function(p) { return Object.assign({}, p, { [key]: val }); });
    setErrors(function(p) { return Object.assign({}, p, { [key]: '' }); });
  }

  function validate() {
    var e = {};
    if (!form.name.trim()) { e.name = 'Seller name is required'; }
    if (!form.contact.trim()) { e.contact = 'Contact info is required'; }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(evt) {
    evt.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    var data = {
      name: sanitizeInput(form.name.trim(), 100),
      contact: sanitizeInput(form.contact.trim(), 200),
      store_affiliation: form.storeId || null,
      bio: sanitizeInput(form.bio.trim(), 500) || null
    };
    registerSeller(data).then(function(response) {
      setSubmitting(false);
      var seller = response && response.seller ? response.seller : response;
      onRegister(seller);
    }).catch(function(err) {
      setSubmitting(false);
      setSubmitError('Registration failed. Please try again.');
    });
  }

  return h('div', { className: 'container seller-registration' },
    h('div', { className: 'seller-reg-card' },
      h('div', { className: 'seller-reg-icon' }, h(UserIcon, null)),
      h('h1', { className: 'seller-reg-title' }, 'Become a Seller'),
      h('p', { className: 'seller-reg-sub' },
        'Join Guam\'s MTG community marketplace. List your cards, connect with local buyers, and grow your collection.'
      ),
      submitError && h('p', { className: 'form-error', style: { marginBottom: 'var(--space-4)' } }, submitError),
      h('form', { onSubmit: handleSubmit, className: 'checkout-form' },
        h('div', { className: 'form-group' },
          h('label', { className: 'form-label', htmlFor: 'reg-name' }, 'Seller Name'),
          h('input', {
            id: 'reg-name',
            type: 'text',
            className: 'form-input' + (errors.name ? ' error' : ''),
            placeholder: 'Your name or handle (e.g. GuamMTGTrader)',
            value: form.name,
            onChange: function(e) { update('name', e.target.value); }
          }),
          errors.name && h('p', { className: 'form-error' }, errors.name)
        ),
        h('div', { className: 'form-group' },
          h('label', { className: 'form-label', htmlFor: 'reg-contact' }, 'Preferred Contact'),
          h('input', {
            id: 'reg-contact',
            type: 'text',
            className: 'form-input' + (errors.contact ? ' error' : ''),
            placeholder: 'Email, phone, or social handle',
            value: form.contact,
            onChange: function(e) { update('contact', e.target.value); }
          }),
          errors.contact && h('p', { className: 'form-error' }, errors.contact)
        ),
        h('div', { className: 'form-group' },
          h('label', { className: 'form-label', htmlFor: 'reg-store' }, 'Store Affiliation (optional)'),
          h('select', {
            id: 'reg-store',
            className: 'form-input',
            value: form.storeId,
            onChange: function(e) { update('storeId', e.target.value); }
          },
            storeOptions.map(function(s) {
              return h('option', { key: s.id, value: s.id }, s.name);
            })
          )
        ),
        h('div', { className: 'form-group' },
          h('label', { className: 'form-label', htmlFor: 'reg-bio' }, 'Bio (optional)'),
          h('textarea', {
            id: 'reg-bio',
            className: 'form-input',
            placeholder: 'Tell buyers about yourself — what formats you play, specialties, etc.',
            value: form.bio,
            rows: 3,
            onChange: function(e) { update('bio', e.target.value); }
          })
        ),
        h('button', { type: 'submit', className: 'btn btn-primary btn-lg', disabled: submitting },
          submitting ? 'Creating...' : 'Create Seller Account'
        )
      ),
      h('div', { className: 'seller-trust-row' },
        h(ShieldIcon, null),
        h('span', null, 'Your seller account is session-based. No password required.')
      )
    )
  );
}

// ===== ADD/EDIT LISTING FORM =====
function ListingForm(props) {
  var initial = props.initial;
  var onSave = props.onSave;
  var onCancel = props.onCancel;

  var defaultForm = {
    cardName: '',
    setName: '',
    condition: 'NM',
    price: '',
    type: 'sale',
    notes: '',
    contact: ''
  };
  var ref1 = React.useState(Object.assign({}, defaultForm, initial || {}));
  var form = ref1[0], setForm = ref1[1];

  var ref2 = React.useState('');
  var autocompleteQuery = ref2[0], setAutocompleteQuery = ref2[1];

  var ref3 = React.useState(false);
  var acOpen = ref3[0], setAcOpen = ref3[1];

  var ref4 = React.useState({});
  var errors = ref4[0], setErrors = ref4[1];

  var ref5 = React.useState(false);
  var submitting = ref5[0], setSubmitting = ref5[1];

  var ac = useScryfallAutocomplete(autocompleteQuery);

  function update(key, val) {
    setForm(function(p) { return Object.assign({}, p, { [key]: val }); });
    setErrors(function(p) { return Object.assign({}, p, { [key]: '' }); });
  }

  function handleCardNameChange(e) {
    var val = e.target.value;
    update('cardName', val);
    setAutocompleteQuery(val);
    setAcOpen(val.length >= 2);
  }

  function handleAcSelect(name) {
    update('cardName', name);
    setAutocompleteQuery('');
    setAcOpen(false);
  }

  function validate() {
    var e = {};
    if (!form.cardName.trim()) { e.cardName = 'Card name is required'; }
    if (!form.setName.trim()) { e.setName = 'Set name is required'; }
    if (form.type === 'sale' && (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0)) {
      e.price = 'Valid price is required for sale listings';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(evt) {
    evt.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    onSave(Object.assign({}, form, {
      id: (initial && initial.id) || null,
      price: parseFloat(form.price) || 0,
      image: null,
      createdAt: (initial && initial.createdAt) || new Date().toISOString()
    }), function() { setSubmitting(false); });
  }

  return h('form', { onSubmit: handleSubmit, className: 'listing-form' },
    h('h3', { className: 'listing-form-title' }, initial && initial.id ? 'Edit Listing' : 'Add New Listing'),

    h('div', { className: 'form-group listing-form-autocomplete' },
      h('label', { className: 'form-label', htmlFor: 'lf-card' }, 'Card Name'),
      h('input', {
        id: 'lf-card',
        type: 'text',
        className: 'form-input' + (errors.cardName ? ' error' : ''),
        placeholder: 'Type to search Scryfall…',
        value: form.cardName,
        onChange: handleCardNameChange,
        autoComplete: 'off',
        onBlur: function() { setTimeout(function() { setAcOpen(false); }, 150); }
      }),
      errors.cardName && h('p', { className: 'form-error' }, errors.cardName),
      acOpen && ac.results.length > 0 && h('div', { className: 'autocomplete-dropdown open' },
        ac.results.slice(0, 8).map(function(name) {
          return h('div', {
            key: name,
            className: 'autocomplete-item',
            onMouseDown: function() { handleAcSelect(name); }
          }, name);
        })
      ),
      acOpen && ac.loading && h('div', { className: 'autocomplete-dropdown open' },
        h('div', { className: 'autocomplete-item', style: { color: 'var(--color-text-muted)' } }, 'Searching…')
      )
    ),

    h('div', { className: 'form-group' },
      h('label', { className: 'form-label', htmlFor: 'lf-set' }, 'Set Name'),
      h('input', {
        id: 'lf-set',
        type: 'text',
        className: 'form-input' + (errors.setName ? ' error' : ''),
        placeholder: 'e.g. Modern Horizons 2',
        value: form.setName,
        onChange: function(e) { update('setName', e.target.value); }
      }),
      errors.setName && h('p', { className: 'form-error' }, errors.setName)
    ),

    h('div', { className: 'form-row-2col' },
      h('div', { className: 'form-group' },
        h('label', { className: 'form-label', htmlFor: 'lf-cond' }, 'Condition'),
        h('select', {
          id: 'lf-cond',
          className: 'form-input',
          value: form.condition,
          onChange: function(e) { update('condition', e.target.value); }
        },
          CONDITIONS.map(function(c) {
            return h('option', { key: c, value: c }, c + ' — ' + ({ NM: 'Near Mint', LP: 'Light Play', MP: 'Moderate Play', HP: 'Heavy Play' }[c] || c));
          })
        )
      ),

      h('div', { className: 'form-group' },
        h('label', { className: 'form-label', htmlFor: 'lf-type' }, 'Listing Type'),
        h('select', {
          id: 'lf-type',
          className: 'form-input',
          value: form.type,
          onChange: function(e) { update('type', e.target.value); }
        },
          h('option', { value: 'sale' }, 'For Sale'),
          h('option', { value: 'trade' }, 'Trade Only')
        )
      )
    ),

    form.type === 'sale' && h('div', { className: 'form-group' },
      h('label', { className: 'form-label', htmlFor: 'lf-price' }, 'Price (USD)'),
      h('div', { className: 'form-input-prefix' },
        h('span', { className: 'form-prefix-symbol' }, '$'),
        h('input', {
          id: 'lf-price',
          type: 'number',
          step: '0.01',
          min: '0.01',
          className: 'form-input form-input-prefixed' + (errors.price ? ' error' : ''),
          placeholder: '0.00',
          value: form.price,
          onChange: function(e) { update('price', e.target.value); }
        })
      ),
      errors.price && h('p', { className: 'form-error' }, errors.price)
    ),

    h('div', { className: 'form-group' },
      h('label', { className: 'form-label', htmlFor: 'lf-contact' }, 'Contact for This Listing'),
      h('input', {
        id: 'lf-contact',
        type: 'text',
        className: 'form-input',
        placeholder: 'How to reach you (email, phone, discord…)',
        value: form.contact,
        onChange: function(e) { update('contact', e.target.value); }
      })
    ),

    h('div', { className: 'form-group' },
      h('label', { className: 'form-label', htmlFor: 'lf-notes' }, 'Notes (optional)'),
      h('textarea', {
        id: 'lf-notes',
        className: 'form-input',
        placeholder: 'Any details about the card, trade wants, availability…',
        value: form.notes,
        rows: 2,
        onChange: function(e) { update('notes', e.target.value); }
      })
    ),

    h('div', { className: 'listing-form-actions' },
      h('button', { type: 'button', className: 'btn btn-secondary', onClick: onCancel }, 'Cancel'),
      h('button', { type: 'submit', className: 'btn btn-primary', disabled: submitting },
        submitting ? 'Saving...' : (initial && initial.id ? 'Save Changes' : 'Add Listing')
      )
    )
  );
}

// ===== MAIN SELLER DASHBOARD =====
export function SellerDashboard(props) {
  var refreshMarketplace = props && props.refreshMarketplace;

  var ref1 = React.useState(null);
  var seller = ref1[0], setSeller = ref1[1];

  var ref1b = React.useState(true); // loading seller check on mount
  var sellerLoading = ref1b[0], setSellerLoading = ref1b[1];

  var ref2 = React.useState('listings'); // 'listings' | 'add' | 'history' | 'profile'
  var activeTab = ref2[0], setActiveTab = ref2[1];

  var ref3 = React.useState(null); // listing being edited
  var editingListing = ref3[0], setEditingListing = ref3[1];

  var ref4 = React.useState(null); // success flash message
  var flashMsg = ref4[0], setFlashMsg = ref4[1];

  var ref5 = React.useState(null);
  var confirmAction = ref5[0], setConfirmAction = ref5[1];

  // Dynamic seller listings from backend
  var ref6 = React.useState([]);
  var sellerListings = ref6[0], setSellerListings = ref6[1];

  // Dynamic store options
  var ref7 = React.useState(STORE_OPTIONS);
  var storeOptions = ref7[0], setStoreOptions = ref7[1];

  // On mount: check if user is already registered via session cookie
  React.useEffect(function() {
    // Fetch store options async
    getStoreOptionsAsync().then(function(opts) {
      setStoreOptions(opts);
    });

    // Check seller session
    fetchSeller().then(function(data) {
      if (data && data.registered && data.seller) {
        setSeller(data.seller);
        setSellerListings(data.listings || []);
      }
      setSellerLoading(false);
    }).catch(function() {
      setSellerLoading(false);
    });
  }, []);

  function flash(msg) {
    setFlashMsg(msg);
    setTimeout(function() { setFlashMsg(null); }, 3000);
  }

  function handleRegister(newSeller) {
    setSeller(newSeller);
    flash('Seller account created! Welcome, ' + (newSeller.name || 'seller') + '.');
    if (refreshMarketplace) refreshMarketplace();
  }

  function refreshSellerListings() {
    fetchSeller().then(function(data) {
      if (data && data.listings) {
        setSellerListings(data.listings);
      }
    }).catch(function() {
      // silently ignore
    });
  }

  function handleAddListing(listingData, doneCallback) {
    var isEdit = !!(listingData.id);
    var backendData = {
      card_name: listingData.cardName || '',
      price: listingData.price || 0,
      condition: listingData.condition || 'NM',
      seller_name: seller.name || '',
      seller_contact: listingData.contact || seller.contact || '',
      set_name: listingData.setName || '',
      notes: listingData.notes || '',
      image_uri: listingData.image || null
    };

    createListing(backendData).then(function() {
      if (doneCallback) doneCallback();
      flash('Listing added to marketplace!');
      setEditingListing(null);
      setActiveTab('listings');
      refreshSellerListings();
      if (refreshMarketplace) refreshMarketplace();
    }).catch(function() {
      if (doneCallback) doneCallback();
      flash('Failed to add listing. Please try again.');
    });
  }

  function handleDeleteListing(id) {
    setConfirmAction({
      title: 'Delete Listing',
      message: 'Are you sure you want to delete this listing?',
      onConfirm: function() {
        deleteListing(id).then(function() {
          flash('Listing deleted.');
          setConfirmAction(null);
          refreshSellerListings();
          if (refreshMarketplace) refreshMarketplace();
        }).catch(function() {
          flash('Failed to delete listing.');
          setConfirmAction(null);
        });
      }
    });
  }

  function handleLogout() {
    setConfirmAction({
      title: 'Log Out',
      message: 'Are you sure you want to log out from your seller account?',
      onConfirm: function() {
        setSeller(null);
        setSellerListings([]);
        setConfirmAction(null);
        // Session cookie cleared on backend — nothing to do client-side
      }
    });
  }

  // Show loading while checking session
  if (sellerLoading) {
    return h('div', { className: 'container seller-dashboard' },
      h('p', { style: { textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' } },
        'Loading...'
      )
    );
  }

  if (!seller) {
    return h(RegistrationForm, { onRegister: handleRegister, storeOptions: storeOptions });
  }

  var listings = sellerListings;
  // Sales history from localStorage orders (kept as-is)
  var allOrders = JSON.parse(localStorage.getItem('investmtg-orders') || '[]');
  var sellerSales = allOrders.filter(function(o) {
    return o.items && o.items.some(function(i) { return i.seller === seller.name; });
  });
  var salesTotal = sellerSales.reduce(function(s, o) {
    return s + o.items.filter(function(i) { return i.seller === seller.name; })
      .reduce(function(sum, i) { return sum + (i.price || 0) * (i.qty || 1); }, 0);
  }, 0);
  var storeLabel = storeOptions.find(function(s) { return s.id === (seller.store_affiliation || seller.storeId); });
  storeLabel = storeLabel ? storeLabel.name : 'No affiliation';
  var joinDate = seller.created_at || seller.joinDate || new Date().toISOString();
  var reputationScore = seller.reputation_score || seller.reputationScore || 100;

  return h('div', { className: 'container seller-dashboard' },

    // Flash message
    flashMsg && h('div', { className: 'seller-flash' },
      h(CheckCircleIcon, null), ' ', flashMsg,
      flashMsg.indexOf('marketplace') !== -1
        ? h('a', { href: '#store', style: { marginLeft: 'var(--space-2)', color: 'inherit', textDecoration: 'underline' } }, 'View Marketplace →')
        : null
    ),

    // Profile header
    h('div', { className: 'seller-profile-header' },
      h('div', { className: 'seller-profile-left' },
        h('div', { className: 'seller-avatar' }, (seller.name || '?').charAt(0).toUpperCase()),
        h('div', null,
          h('h1', { className: 'seller-name-heading' }, seller.name),
          h('div', { className: 'seller-meta' },
            h('span', { className: 'seller-store-tag' }, storeLabel),
            h('span', { className: 'seller-since' }, 'Member since ' + new Date(joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }))
          )
        )
      ),
      h('div', { className: 'seller-rep-badge' },
        h(ShieldIcon, null),
        h('div', null,
          h('div', { className: 'seller-rep-score' }, reputationScore),
          h('div', { className: 'seller-rep-label' }, 'Rep Score')
        )
      )
    ),

    // Stats row
    h('div', { className: 'seller-stats-row' },
      h('div', { className: 'seller-stat-card' },
        h('div', { className: 'seller-stat-value' }, listings.length),
        h('div', { className: 'seller-stat-label' }, 'Active Listings')
      ),
      h('div', { className: 'seller-stat-card' },
        h('div', { className: 'seller-stat-value' }, listings.filter(function(l) { return l.type === 'sale'; }).length),
        h('div', { className: 'seller-stat-label' }, 'For Sale')
      ),
      h('div', { className: 'seller-stat-card' },
        h('div', { className: 'seller-stat-value' }, listings.filter(function(l) { return l.type === 'trade'; }).length),
        h('div', { className: 'seller-stat-label' }, 'For Trade')
      ),
      h('div', { className: 'seller-stat-card' },
        h('div', { className: 'seller-stat-value' }, formatUSD(salesTotal)),
        h('div', { className: 'seller-stat-label' }, 'Sales History')
      )
    ),

    // Tab nav
    h('div', { className: 'seller-tabs' },
      h('button', {
        className: 'seller-tab' + (activeTab === 'listings' ? ' active' : ''),
        onClick: function() { setActiveTab('listings'); setEditingListing(null); }
      }, h(TagIcon, null), ' My Listings'),
      h('button', {
        className: 'seller-tab' + (activeTab === 'add' ? ' active' : ''),
        onClick: function() { setActiveTab('add'); setEditingListing(null); }
      }, h(PlusIcon, null), ' Add Listing'),
      h('button', {
        className: 'seller-tab' + (activeTab === 'history' ? ' active' : ''),
        onClick: function() { setActiveTab('history'); }
      }, h(OrderIcon, null), ' Sales History'),
      h('button', {
        className: 'seller-tab' + (activeTab === 'profile' ? ' active' : ''),
        onClick: function() { setActiveTab('profile'); }
      }, h(UserIcon, null), ' Profile')
    ),

    // ===== LISTINGS TAB =====
    activeTab === 'listings' && h('div', { className: 'seller-tab-content' },
      listings.length > 0 && h('p', {
        style: { fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }
      },
        'Your listings are live on the ',
        h('a', { href: '#store', style: { color: 'var(--color-primary)' } }, 'Marketplace'),
        '. Buyers can see them and reach out to you.'
      ),
      listings.length === 0
        ? h('div', { className: 'empty-state' },
            h('h3', null, 'No listings yet'),
            h('p', null, 'Add your first listing to appear in the marketplace.'),
            h('button', {
              className: 'btn btn-primary',
              onClick: function() { setActiveTab('add'); }
            }, h(PlusIcon, null), ' Add Your First Listing')
          )
        : h('div', { className: 'seller-listings-grid' },
            listings.map(function(listing) {
              // Normalize backend listing field names
              var cardName = listing.card_name || listing.cardName || '';
              var setName = listing.set_name || listing.setName || '';
              var listingType = listing.type || 'sale';
              var listingId = listing.id;
              var listingPrice = listing.price || 0;
              var listingCondition = listing.condition || 'NM';
              var listingNotes = listing.notes || '';

              return h('div', { key: listingId, className: 'seller-listing-card' },
                h('div', { className: 'seller-listing-top' },
                  h('div', null,
                    h('div', { className: 'seller-listing-name' }, cardName),
                    h('div', { className: 'seller-listing-set' }, setName)
                  ),
                  h('div', { className: 'seller-listing-badges' },
                    h('span', {
                      className: 'mp-badge-condition cond-' + listingCondition.toLowerCase()
                    }, listingCondition),
                    h('span', { className: 'mp-badge-type type-' + listingType },
                      listingType === 'sale' ? 'Sale' : 'Trade'
                    )
                  )
                ),
                listingType === 'sale' && h('div', { className: 'seller-listing-price' },
                  formatUSD(listingPrice)
                ),
                listingNotes && h('p', {
                  style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 'var(--space-2) 0' }
                }, listingNotes),
                h('div', { className: 'seller-listing-actions' },
                  h('button', {
                    className: 'btn btn-sm seller-delete-btn',
                    onClick: function() { handleDeleteListing(listingId); }
                  }, h(TrashIcon, null), ' Delete')
                )
              );
            })
          ),

      editingListing && h('div', { className: 'seller-form-overlay' },
        h(ListingForm, {
          initial: editingListing,
          onSave: handleAddListing,
          onCancel: function() { setEditingListing(null); }
        })
      )
    ),

    // ===== ADD LISTING TAB =====
    activeTab === 'add' && h('div', { className: 'seller-tab-content' },
      h(ListingForm, {
        initial: editingListing,
        onSave: handleAddListing,
        onCancel: function() { setActiveTab('listings'); setEditingListing(null); }
      })
    ),

    // ===== SALES HISTORY TAB =====
    activeTab === 'history' && h('div', { className: 'seller-tab-content' },
      h('h2', { className: 'seller-section-title' }, 'Sales History'),
      sellerSales.length === 0
        ? h('div', { className: 'empty-state' },
            h('h3', null, 'No sales yet'),
            h('p', null, 'Your completed sales will appear here once buyers place orders for your listings.')
          )
        : h('div', { className: 'sales-history-table' },
            h('div', { className: 'sales-history-header' },
              h('span', null, 'Order'),
              h('span', null, 'Items'),
              h('span', null, 'Total'),
              h('span', null, 'Date')
            ),
            sellerSales.map(function(order) {
              var myItems = order.items.filter(function(i) { return i.seller === seller.name; });
              var orderTotal = myItems.reduce(function(sum, i) { return sum + (i.price || 0) * (i.qty || 1); }, 0);
              return h('div', { key: order.id, className: 'sales-history-row' },
                h('span', null, order.id),
                h('span', null, myItems.length + ' card' + (myItems.length !== 1 ? 's' : '')),
                h('span', { className: 'sales-price' }, formatUSD(orderTotal)),
                h('span', { style: { color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' } },
                  new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                )
              );
            }),
            h('div', { className: 'sales-history-total-row' },
              h('span', null, 'Total Sales'),
              h('span', null),
              h('span', { className: 'sales-price sales-grand-total' }, formatUSD(salesTotal)),
              h('span', null)
            )
          )
    ),

    // ===== CONFIRM MODAL =====
    confirmAction && h(ConfirmModal, {
      title: confirmAction.title,
      message: confirmAction.message,
      onConfirm: confirmAction.onConfirm,
      onCancel: function() { setConfirmAction(null); }
    }),

    // ===== PROFILE TAB =====
    activeTab === 'profile' && h('div', { className: 'seller-tab-content' },
      h('h2', { className: 'seller-section-title' }, 'Your Profile'),
      h('div', { className: 'seller-profile-card' },
        h('div', { className: 'order-info-table' },
          h('div', { className: 'order-info-row' },
            h('span', { className: 'order-info-label' }, 'Seller Name'),
            h('span', { className: 'order-info-value' }, seller.name)
          ),
          h('div', { className: 'order-info-row' },
            h('span', { className: 'order-info-label' }, 'Contact'),
            h('span', { className: 'order-info-value' }, seller.contact)
          ),
          h('div', { className: 'order-info-row' },
            h('span', { className: 'order-info-label' }, 'Store'),
            h('span', { className: 'order-info-value' }, storeLabel)
          ),
          (seller.bio) && h('div', { className: 'order-info-row' },
            h('span', { className: 'order-info-label' }, 'Bio'),
            h('span', { className: 'order-info-value' }, seller.bio)
          ),
          h('div', { className: 'order-info-row' },
            h('span', { className: 'order-info-label' }, 'Reputation Score'),
            h('span', { className: 'order-info-value' },
              h('span', { className: 'seller-rep-inline' },
                h(ShieldIcon, null), ' ', reputationScore, ' / 100'
              )
            )
          ),
          h('div', { className: 'order-info-row' },
            h('span', { className: 'order-info-label' }, 'Seller ID'),
            h('span', { className: 'order-info-value', style: { fontFamily: 'monospace', fontSize: 'var(--text-xs)' } },
              seller.id
            )
          )
        ),
        h('div', { className: 'seller-profile-actions' },
          h('button', { className: 'btn btn-secondary btn-sm', onClick: handleLogout },
            'Log Out'
          )
        )
      )
    )
  );
}
