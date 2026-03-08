/* SellerDashboard.js — Seller management portal */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { STORE_OPTIONS } from '../utils/stores.js';
import { getStoreOptionsAsync } from '../utils/stores.js';
import { PlusIcon, EditIcon, TrashIcon, UserIcon, TagIcon, OrderIcon, ShieldIcon, CheckCircleIcon, UploadIcon, FileTextIcon, AlertCircleIcon, LayersIcon, GridIcon, ListIcon } from './shared/Icons.js';
import { sanitizeInput } from '../utils/sanitize.js';
import { ConfirmModal } from './shared/ConfirmModal.js';
import { fetchSeller, registerSeller, createListing, deleteListing, fetchListings } from '../utils/api.js';
import { storageGet } from '../utils/storage.js';
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

// ===== SCRYFALL SET PRINTINGS HOOK =====
// Fetches all printings for a given exact card name, returns set options
function useScryfallPrintings(cardName) {
  var ref = React.useState([]);
  var printings = ref[0], setPrintings = ref[1];

  var ref2 = React.useState(false);
  var loading = ref2[0], setLoading = ref2[1];

  var ref3 = React.useState(null);
  var error = ref3[0], setError = ref3[1];

  React.useEffect(function() {
    if (!cardName || cardName.length < 2) {
      setPrintings([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    var cancelled = false;
    // Small delay to respect Scryfall rate limits
    var timerId = setTimeout(function() {
      var url = 'https://api.scryfall.com/cards/search?q=!' + encodeURIComponent('"' + cardName + '"') + '&unique=prints&order=released&dir=desc';
      fetch(url)
        .then(function(r) {
          if (!r.ok) throw new Error('Not found');
          return r.json();
        })
        .then(function(data) {
          if (cancelled) return;
          var cards = data.data || [];
          // Build unique set options with prices and images
          var setMap = {};
          var setList = [];
          cards.forEach(function(card) {
            var key = card.set + '-' + (card.collector_number || '');
            if (!setMap[key]) {
              setMap[key] = true;
              setList.push({
                setCode: card.set,
                setName: card.set_name,
                collectorNumber: card.collector_number,
                rarity: card.rarity,
                priceUsd: card.prices && card.prices.usd,
                priceUsdFoil: card.prices && card.prices.usd_foil,
                imageSmall: card.image_uris && card.image_uris.small,
                imageNormal: card.image_uris && card.image_uris.normal,
                scryfallId: card.id
              });
            }
          });
          setPrintings(setList);
          setLoading(false);
        })
        .catch(function() {
          if (!cancelled) {
            setPrintings([]);
            setError('Could not fetch printings');
            setLoading(false);
          }
        });
    }, 150);
    return function() { cancelled = true; clearTimeout(timerId); };
  }, [cardName]);

  return { printings: printings, loading: loading, error: error };
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
        h('span', null, 'Your seller account is linked to your Google sign-in. Your listings stay safe.')
      )
    )
  );
}

// ===== ADD/EDIT LISTING FORM WITH SET AUTOCOMPLETE + PRINTINGS PANEL =====
function ListingForm(props) {
  var initial = props.initial;
  var onSave = props.onSave;
  var onCancel = props.onCancel;

  var defaultForm = {
    cardName: '',
    setName: '',
    setCode: '',
    collectorNumber: '',
    condition: 'NM',
    price: '',
    type: 'sale',
    notes: '',
    contact: '',
    imageUri: ''
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

  // Card name for which we should fetch printings
  var ref6 = React.useState('');
  var confirmedCardName = ref6[0], setConfirmedCardName = ref6[1];

  // View mode for printings panel: 'grid' or 'list'
  var ref7 = React.useState('grid');
  var viewMode = ref7[0], setViewMode = ref7[1];

  var ac = useScryfallAutocomplete(autocompleteQuery);
  var printingsData = useScryfallPrintings(confirmedCardName);

  function update(key, val) {
    setForm(function(p) { return Object.assign({}, p, { [key]: val }); });
    setErrors(function(p) { return Object.assign({}, p, { [key]: '' }); });
  }

  function handleCardNameChange(e) {
    var val = e.target.value;
    update('cardName', val);
    setAutocompleteQuery(val);
    setAcOpen(val.length >= 2);
    if (val !== confirmedCardName) {
      setConfirmedCardName('');
      update('setName', '');
      update('setCode', '');
      update('collectorNumber', '');
      update('imageUri', '');
    }
  }

  function handleAcSelect(name) {
    update('cardName', name);
    setAutocompleteQuery('');
    setAcOpen(false);
    setConfirmedCardName(name);
    update('setName', '');
    update('setCode', '');
    update('collectorNumber', '');
    update('imageUri', '');
  }

  function handleSetSelect(printing) {
    update('setName', printing.setName);
    update('setCode', printing.setCode);
    update('collectorNumber', printing.collectorNumber || '');
    update('imageUri', printing.imageSmall || '');
    if (!form.price && printing.priceUsd) {
      update('price', printing.priceUsd);
    }
  }

  function validate() {
    var e = {};
    if (!form.cardName.trim()) { e.cardName = 'Card name is required'; }
    if (!form.setName.trim()) { e.setName = 'Please select a printing from the right panel (or type a set name)'; }
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
      image: form.imageUri || null,
      createdAt: (initial && initial.createdAt) || new Date().toISOString()
    }), function() { setSubmitting(false); });
  }

  // Check if we have printings to show
  var hasPrintings = confirmedCardName && printingsData.printings.length > 0;
  var isPrintingsLoading = confirmedCardName && printingsData.loading;

  // The currently selected printing key
  var selectedKey = form.setCode && form.collectorNumber
    ? form.setCode + '-' + form.collectorNumber
    : form.setCode || '';

  // ===== PRINTINGS PANEL (right side) =====
  function renderPrintingsPanel() {
    if (!confirmedCardName) {
      return h('div', { className: 'printings-panel-empty' },
        h('div', { className: 'printings-panel-empty-icon' },
          h(LayersIcon, null)
        ),
        h('p', null, 'Search for a card name to browse all available printings and variants.'),
        h('p', { className: 'printings-panel-hint' }, 'Each printing shows set, rarity, collector number, and market price.')
      );
    }

    if (isPrintingsLoading) {
      return h('div', { className: 'printings-panel-loading' },
        h('div', { className: 'skeleton skeleton-text', style: { width: '60%' } }),
        h('div', { className: 'skeleton skeleton-text', style: { width: '80%' } }),
        h('div', { className: 'skeleton skeleton-text', style: { width: '40%' } }),
        h('p', { style: { color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' } }, 'Loading printings from Scryfall\u2026')
      );
    }

    if (printingsData.error) {
      return h('div', { className: 'printings-panel-error' },
        h(AlertCircleIcon, null),
        h('p', null, 'Could not load printings for this card.')
      );
    }

    if (printingsData.printings.length === 0) {
      return h('div', { className: 'printings-panel-empty' },
        h('p', null, 'No printings found for "' + confirmedCardName + '".')
      );
    }

    var printings = printingsData.printings;

    return h('div', null,
      // Header with count and view toggle
      h('div', { className: 'printings-panel-header' },
        h('span', { className: 'printings-panel-count' },
          printings.length + ' printing' + (printings.length !== 1 ? 's' : '')
        ),
        h('div', { className: 'printings-view-toggle' },
          h('button', {
            type: 'button',
            className: 'printings-view-btn' + (viewMode === 'grid' ? ' active' : ''),
            onClick: function() { setViewMode('grid'); },
            title: 'Grid view'
          }, h(GridIcon, null)),
          h('button', {
            type: 'button',
            className: 'printings-view-btn' + (viewMode === 'list' ? ' active' : ''),
            onClick: function() { setViewMode('list'); },
            title: 'List view'
          }, h(ListIcon, null))
        )
      ),

      // Grid view
      viewMode === 'grid' && h('div', { className: 'printings-grid' },
        printings.map(function(p) {
          var key = p.setCode + '-' + (p.collectorNumber || '');
          var isSelected = selectedKey === key;
          return h('div', {
            key: key,
            className: 'printings-grid-item' + (isSelected ? ' selected' : ''),
            onClick: function() { handleSetSelect(p); }
          },
            p.imageSmall
              ? h('img', {
                  src: p.imageSmall,
                  alt: p.setName,
                  className: 'printings-grid-img',
                  loading: 'lazy'
                })
              : h('div', { className: 'printings-grid-img-placeholder' },
                  h('span', null, p.setCode.toUpperCase())
                ),
            h('div', { className: 'printings-grid-info' },
              h('div', { className: 'printings-grid-set' }, p.setName),
              h('div', { className: 'printings-grid-meta' },
                h('span', { className: 'set-code-badge' }, p.setCode.toUpperCase()),
                p.collectorNumber && h('span', null, '#' + p.collectorNumber),
                p.rarity && h('span', { className: 'rarity-' + p.rarity }, p.rarity.charAt(0).toUpperCase() + p.rarity.slice(1))
              ),
              h('div', { className: 'printings-grid-price' },
                p.priceUsd ? '$' + p.priceUsd : (p.priceUsdFoil ? '\u2728$' + p.priceUsdFoil : 'N/A')
              )
            ),
            isSelected && h('div', { className: 'printings-selected-badge' }, '\u2713 Selected')
          );
        })
      ),

      // List view
      viewMode === 'list' && h('div', { className: 'printings-list' },
        printings.map(function(p) {
          var key = p.setCode + '-' + (p.collectorNumber || '');
          var isSelected = selectedKey === key;
          return h('div', {
            key: key,
            className: 'printings-list-item' + (isSelected ? ' selected' : ''),
            onClick: function() { handleSetSelect(p); }
          },
            p.imageSmall && h('img', {
              src: p.imageSmall,
              alt: '',
              className: 'printings-list-thumb',
              loading: 'lazy'
            }),
            h('div', { className: 'printings-list-info' },
              h('div', { className: 'printings-list-name' }, p.setName),
              h('div', { className: 'printings-list-meta' },
                h('span', { className: 'set-code-badge' }, p.setCode.toUpperCase()),
                p.collectorNumber && h('span', null, '#' + p.collectorNumber),
                p.rarity && h('span', { className: 'rarity-' + p.rarity }, p.rarity.charAt(0).toUpperCase() + p.rarity.slice(1))
              )
            ),
            h('div', { className: 'printings-list-prices' },
              p.priceUsd && h('span', { className: 'set-price-usd' }, '$' + p.priceUsd),
              p.priceUsdFoil && h('span', { className: 'set-price-foil' }, '\u2728$' + p.priceUsdFoil),
              !p.priceUsd && !p.priceUsdFoil && h('span', { className: 'set-price-na' }, 'N/A')
            ),
            isSelected && h('div', { className: 'printings-list-check' }, '\u2713')
          );
        })
      )
    );
  }

  // ===== FORM (left side) =====
  function renderFormSide() {
    return h('form', { onSubmit: handleSubmit, className: 'listing-form-left' },

      // Card Name with Scryfall autocomplete
      h('div', { className: 'form-group listing-form-autocomplete' },
        h('label', { className: 'form-label', htmlFor: 'lf-card' }, 'Card Name'),
        h('input', {
          id: 'lf-card',
          type: 'text',
          className: 'form-input' + (errors.cardName ? ' error' : ''),
          placeholder: 'Type to search Scryfall\u2026',
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
          h('div', { className: 'autocomplete-item', style: { color: 'var(--color-text-muted)' } }, 'Searching\u2026')
        )
      ),

      // Selected set display (read-only summary of what was picked from panel)
      h('div', { className: 'form-group' },
        h('label', { className: 'form-label' },
          'Selected Printing',
          isPrintingsLoading && h('span', { className: 'set-loading-hint' }, ' \u2014 loading\u2026')
        ),
        form.setName
          ? h('div', { className: 'selected-printing-display' },
              form.imageUri && h('img', {
                src: form.imageUri,
                alt: '',
                className: 'selected-printing-thumb'
              }),
              h('div', { className: 'selected-printing-info' },
                h('div', { className: 'selected-printing-name' }, form.setName),
                h('div', { className: 'selected-printing-meta' },
                  form.setCode && h('span', { className: 'set-code-badge' }, form.setCode.toUpperCase()),
                  form.collectorNumber && h('span', null, '#' + form.collectorNumber)
                )
              )
            )
          : h('div', { className: 'selected-printing-placeholder' },
              hasPrintings
                ? 'Click a printing from the panel on the right \u2192'
                : (confirmedCardName ? 'Loading printings\u2026' : 'Search a card name first')
            ),
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
              return h('option', { key: c, value: c }, c + ' \u2014 ' + ({ NM: 'Near Mint', LP: 'Light Play', MP: 'Moderate Play', HP: 'Heavy Play' }[c] || c));
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
          placeholder: 'How to reach you (email, phone, discord\u2026)',
          value: form.contact,
          onChange: function(e) { update('contact', e.target.value); }
        })
      ),

      h('div', { className: 'form-group' },
        h('label', { className: 'form-label', htmlFor: 'lf-notes' }, 'Notes (optional)'),
        h('textarea', {
          id: 'lf-notes',
          className: 'form-input',
          placeholder: 'Any details about the card, trade wants, availability\u2026',
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

  // ===== 2-COLUMN LAYOUT =====
  return h('div', { className: 'listing-form-layout' },
    h('h3', { className: 'listing-form-title' }, initial && initial.id ? 'Edit Listing' : 'Add New Listing'),
    h('div', { className: 'listing-form-columns' },
      // Left column: the form
      renderFormSide(),
      // Right column: printings browser panel
      h('div', { className: 'printings-panel' },
        h('h4', { className: 'printings-panel-title' }, 'Printings & Variants'),
        renderPrintingsPanel()
      )
    )
  );
}

// ===== CSV / MANABOX BULK IMPORT =====
function parseManaboxCSV(csvText) {
  var lines = csvText.split(/\r?\n/).filter(function(l) { return l.trim(); });
  if (lines.length < 2) return { cards: [], errors: ['CSV must have a header row and at least one data row'] };

  // Parse header — Manabox uses comma-separated with possible quoted fields
  var header = parseCSVLine(lines[0]).map(function(h) { return h.toLowerCase().trim(); });

  // Find column indices — support Manabox column names
  var nameIdx = findCol(header, ['name', 'card name', 'card_name', 'cardname']);
  var setIdx = findCol(header, ['set name', 'set_name', 'setname', 'set', 'edition']);
  var setCodeIdx = findCol(header, ['set code', 'set_code', 'setcode']);
  var qtyIdx = findCol(header, ['quantity', 'qty', 'count']);
  var condIdx = findCol(header, ['condition', 'cond']);
  var foilIdx = findCol(header, ['foil']);
  var priceIdx = findCol(header, ['purchase price', 'price', 'purchase_price', 'cost']);
  var scryfallIdx = findCol(header, ['scryfall id', 'scryfall_id', 'scryfallid']);

  if (nameIdx === -1) {
    return { cards: [], errors: ['Could not find a "Name" or "Card Name" column in CSV header. Found columns: ' + header.join(', ')] };
  }

  var cards = [];
  var parseErrors = [];

  for (var i = 1; i < lines.length; i++) {
    var cols = parseCSVLine(lines[i]);
    var name = (cols[nameIdx] || '').trim();
    if (!name) {
      parseErrors.push('Row ' + (i + 1) + ': empty card name, skipped');
      continue;
    }

    var qty = 1;
    if (qtyIdx !== -1 && cols[qtyIdx]) {
      var parsedQty = parseInt(cols[qtyIdx], 10);
      if (!isNaN(parsedQty) && parsedQty > 0) qty = parsedQty;
    }

    var condition = 'NM';
    if (condIdx !== -1 && cols[condIdx]) {
      var rawCond = cols[condIdx].trim().toUpperCase();
      if (['NM', 'LP', 'MP', 'HP'].indexOf(rawCond) !== -1) {
        condition = rawCond;
      } else if (rawCond === 'NEAR MINT' || rawCond === 'MINT') {
        condition = 'NM';
      } else if (rawCond === 'LIGHTLY PLAYED' || rawCond === 'LIGHT PLAY') {
        condition = 'LP';
      } else if (rawCond === 'MODERATELY PLAYED' || rawCond === 'MODERATE PLAY') {
        condition = 'MP';
      } else if (rawCond === 'HEAVILY PLAYED' || rawCond === 'HEAVY PLAY' || rawCond === 'DAMAGED') {
        condition = 'HP';
      }
    }

    var price = 0;
    if (priceIdx !== -1 && cols[priceIdx]) {
      var rawPrice = cols[priceIdx].replace(/[^0-9.]/g, '');
      var parsedPrice = parseFloat(rawPrice);
      if (!isNaN(parsedPrice) && parsedPrice > 0) price = parsedPrice;
    }

    var setName = '';
    if (setIdx !== -1 && cols[setIdx]) setName = cols[setIdx].trim();

    var setCode = '';
    if (setCodeIdx !== -1 && cols[setCodeIdx]) setCode = cols[setCodeIdx].trim();

    var foil = false;
    if (foilIdx !== -1 && cols[foilIdx]) {
      var rawFoil = cols[foilIdx].trim().toLowerCase();
      foil = rawFoil === 'true' || rawFoil === 'yes' || rawFoil === '1' || rawFoil === 'foil';
    }

    var scryfallId = '';
    if (scryfallIdx !== -1 && cols[scryfallIdx]) scryfallId = cols[scryfallIdx].trim();

    // Expand quantity into individual cards for bulk creation
    for (var q = 0; q < qty; q++) {
      cards.push({
        cardName: name,
        setName: setName,
        setCode: setCode,
        condition: condition,
        price: price,
        foil: foil,
        scryfallId: scryfallId,
        notes: foil ? 'Foil' : ''
      });
    }
  }

  return { cards: cards, errors: parseErrors };
}

function findCol(header, aliases) {
  for (var i = 0; i < aliases.length; i++) {
    var idx = header.indexOf(aliases[i]);
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseCSVLine(line) {
  var cols = [];
  var current = '';
  var inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        cols.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  cols.push(current);
  return cols;
}

function BulkImportForm(props) {
  var onBulkSave = props.onBulkSave;
  var onCancel = props.onCancel;
  var seller = props.seller;

  var ref1 = React.useState('');
  var csvText = ref1[0], setCsvText = ref1[1];

  var ref2 = React.useState(null);
  var parsedResult = ref2[0], setParsedResult = ref2[1];

  var ref3 = React.useState(false);
  var submitting = ref3[0], setSubmitting = ref3[1];

  var ref4 = React.useState('');
  var defaultPrice = ref4[0], setDefaultPrice = ref4[1];

  var ref5 = React.useState('sale');
  var listingType = ref5[0], setListingType = ref5[1];

  var ref6 = React.useState('');
  var contact = ref6[0], setContact = ref6[1];

  var ref7 = React.useState(null);
  var progress = ref7[0], setProgress = ref7[1];

  function handleFileUpload(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
      var text = evt.target.result;
      setCsvText(text);
      var result = parseManaboxCSV(text);
      setParsedResult(result);
    };
    reader.readAsText(file);
  }

  function handleParseText() {
    if (!csvText.trim()) return;
    var result = parseManaboxCSV(csvText);
    setParsedResult(result);
  }

  function handleSubmitBulk() {
    if (!parsedResult || parsedResult.cards.length === 0) return;
    setSubmitting(true);
    setProgress({ done: 0, total: parsedResult.cards.length, failed: 0 });

    var cards = parsedResult.cards.map(function(card) {
      return Object.assign({}, card, {
        type: listingType,
        price: card.price > 0 ? card.price : (parseFloat(defaultPrice) || 0),
        contact: contact || seller.contact || ''
      });
    });

    // Submit cards sequentially to respect rate limits
    var idx = 0;
    var failedCount = 0;

    function submitNext() {
      if (idx >= cards.length) {
        setSubmitting(false);
        setProgress(function(p) { return Object.assign({}, p, { done: cards.length, failed: failedCount }); });
        onBulkSave(cards.length - failedCount);
        return;
      }
      var card = cards[idx];
      var backendData = {
        card_name: card.cardName || '',
        price: card.price || 0,
        condition: card.condition || 'NM',
        seller_name: seller.name || '',
        seller_contact: card.contact || seller.contact || '',
        set_name: card.setName || '',
        notes: card.notes || '',
        image_uri: null
      };

      createListing(backendData).then(function() {
        idx++;
        setProgress(function(p) { return Object.assign({}, p, { done: idx }); });
        // Small delay between submissions
        setTimeout(submitNext, 200);
      }).catch(function() {
        failedCount++;
        idx++;
        setProgress(function(p) { return Object.assign({}, p, { done: idx, failed: failedCount }); });
        setTimeout(submitNext, 200);
      });
    }

    submitNext();
  }

  var cardCount = parsedResult ? parsedResult.cards.length : 0;

  return h('div', { className: 'bulk-import-form' },
    h('h3', { className: 'listing-form-title' },
      h(LayersIcon, null), ' Bulk Import'
    ),
    h('p', { className: 'bulk-import-desc' },
      'Import multiple cards at once from a CSV file. Supports ',
      h('strong', null, 'Manabox'),
      ' export format and standard CSV with columns like Name, Set, Quantity, Condition, Price.'
    ),

    // File upload
    h('div', { className: 'form-group' },
      h('label', { className: 'form-label' }, 'Upload CSV File'),
      h('div', { className: 'bulk-upload-zone' },
        h('input', {
          type: 'file',
          accept: '.csv,.txt',
          onChange: handleFileUpload,
          className: 'bulk-file-input',
          id: 'bulk-file-input'
        }),
        h('label', { htmlFor: 'bulk-file-input', className: 'bulk-upload-label' },
          h(UploadIcon, null),
          h('span', null, 'Choose CSV file or drag & drop'),
          h('span', { className: 'bulk-upload-hint' }, 'Manabox, Deckbox, or custom CSV')
        )
      )
    ),

    // Or paste CSV text
    h('div', { className: 'bulk-divider' },
      h('span', null, 'or paste CSV text below')
    ),

    h('div', { className: 'form-group' },
      h('textarea', {
        className: 'form-input bulk-csv-textarea',
        rows: 6,
        placeholder: 'Name,Set Name,Set Code,Quantity,Condition,Purchase Price\nLightning Bolt,Alpha,LEA,1,NM,450.00\nCounterspell,Ice Age,ICE,4,LP,2.50',
        value: csvText,
        onChange: function(e) { setCsvText(e.target.value); setParsedResult(null); }
      }),
      !parsedResult && csvText.trim() && h('button', {
        type: 'button',
        className: 'btn btn-secondary btn-sm',
        onClick: handleParseText,
        style: { marginTop: 'var(--space-2)' }
      }, 'Parse CSV')
    ),

    // Parse results preview
    parsedResult && h('div', { className: 'bulk-preview' },
      parsedResult.errors.length > 0 && h('div', { className: 'bulk-warnings' },
        h(AlertCircleIcon, null),
        h('div', null,
          parsedResult.errors.map(function(err, i) {
            return h('p', { key: i, className: 'bulk-warning-text' }, err);
          })
        )
      ),

      cardCount > 0 && h('div', { className: 'bulk-preview-summary' },
        h(CheckCircleIcon, null),
        h('span', null, cardCount + ' card' + (cardCount !== 1 ? 's' : '') + ' ready to import')
      ),

      cardCount > 0 && h('div', { className: 'bulk-preview-table-wrap' },
        h('table', { className: 'bulk-preview-table' },
          h('thead', null,
            h('tr', null,
              h('th', null, 'Card Name'),
              h('th', null, 'Set'),
              h('th', null, 'Cond'),
              h('th', null, 'Price')
            )
          ),
          h('tbody', null,
            parsedResult.cards.slice(0, 20).map(function(card, i) {
              return h('tr', { key: i },
                h('td', null, card.cardName),
                h('td', null, card.setName || card.setCode || '\u2014'),
                h('td', null, h('span', { className: 'mp-badge-condition cond-' + card.condition.toLowerCase() }, card.condition)),
                h('td', null, card.price > 0 ? '$' + card.price.toFixed(2) : '\u2014')
              );
            }),
            cardCount > 20 && h('tr', null,
              h('td', { colSpan: 4, style: { textAlign: 'center', color: 'var(--color-text-muted)' } },
                '\u2026 and ' + (cardCount - 20) + ' more'
              )
            )
          )
        )
      ),

      // Bulk settings
      cardCount > 0 && h('div', { className: 'bulk-settings' },
        h('h4', null, 'Bulk Settings'),
        h('div', { className: 'form-row-2col' },
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Default Price (for cards without price)'),
            h('div', { className: 'form-input-prefix' },
              h('span', { className: 'form-prefix-symbol' }, '$'),
              h('input', {
                type: 'number',
                step: '0.01',
                min: '0',
                className: 'form-input form-input-prefixed',
                placeholder: '0.00',
                value: defaultPrice,
                onChange: function(e) { setDefaultPrice(e.target.value); }
              })
            )
          ),
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label' }, 'Listing Type'),
            h('select', {
              className: 'form-input',
              value: listingType,
              onChange: function(e) { setListingType(e.target.value); }
            },
              h('option', { value: 'sale' }, 'For Sale'),
              h('option', { value: 'trade' }, 'Trade Only')
            )
          )
        ),
        h('div', { className: 'form-group' },
          h('label', { className: 'form-label' }, 'Contact'),
          h('input', {
            type: 'text',
            className: 'form-input',
            placeholder: seller.contact || 'How buyers can reach you',
            value: contact,
            onChange: function(e) { setContact(e.target.value); }
          })
        )
      ),

      // Progress bar
      progress && h('div', { className: 'bulk-progress' },
        h('div', { className: 'bulk-progress-bar' },
          h('div', {
            className: 'bulk-progress-fill',
            style: { width: Math.round((progress.done / progress.total) * 100) + '%' }
          })
        ),
        h('p', { className: 'bulk-progress-text' },
          progress.done + ' / ' + progress.total + ' listings created' +
          (progress.failed > 0 ? ' (' + progress.failed + ' failed)' : '')
        )
      )
    ),

    // Actions
    h('div', { className: 'listing-form-actions' },
      h('button', { type: 'button', className: 'btn btn-secondary', onClick: onCancel }, 'Cancel'),
      cardCount > 0 && h('button', {
        type: 'button',
        className: 'btn btn-primary',
        disabled: submitting,
        onClick: handleSubmitBulk
      },
        submitting
          ? ('Importing' + (progress ? ' ' + progress.done + '/' + progress.total : '\u2026'))
          : ('Import ' + cardCount + ' Card' + (cardCount !== 1 ? 's' : ''))
      )
    )
  );
}

// ===== AUTH PROMPT (shown when not signed in) =====
function AuthPrompt(props) {
  var onSignIn = props.onSignIn;
  return h('div', { className: 'container' },
    h('div', { className: 'seller-auth-prompt' },
      h(UserIcon, null),
      h('h2', null, 'Sign In to Sell'),
      h('p', null,
        'Sign in with your Google account to list cards on Guam\'s MTG marketplace. Your listings are tied to your account so you never lose them.'
      ),
      h('button', {
        className: 'btn-google',
        onClick: function() { onSignIn && onSignIn(); }
      },
        h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' },
          h('path', { d: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z', fill: '#4285F4' }),
          h('path', { d: 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z', fill: '#34A853' }),
          h('path', { d: 'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z', fill: '#FBBC05' }),
          h('path', { d: 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z', fill: '#EA4335' })
        ),
        'Sign in with Google'
      )
    )
  );
}

// ===== MAIN SELLER DASHBOARD =====
export function SellerDashboard(props) {
  var refreshMarketplace = props && props.refreshMarketplace;
  var authUser = props && props.user;
  var onSignIn = props && props.onSignIn;

  var ref1 = React.useState(null);
  var seller = ref1[0], setSeller = ref1[1];

  var ref1b = React.useState(true); // loading seller check on mount
  var sellerLoading = ref1b[0], setSellerLoading = ref1b[1];

  var ref2 = React.useState('listings'); // 'listings' | 'add' | 'bulk' | 'history' | 'profile'
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
    var backendData = {
      card_name: listingData.cardName || '',
      price: listingData.price || 0,
      condition: listingData.condition || 'NM',
      seller_name: seller.name || '',
      seller_contact: listingData.contact || seller.contact || '',
      set_name: listingData.setName || '',
      notes: listingData.notes || '',
      image_uri: listingData.image || listingData.imageUri || null
    };

    createListing(backendData).then(function(result) {
      if (doneCallback) doneCallback();
      flash('Listing added to marketplace!');
      setEditingListing(null);
      setActiveTab('listings');
      refreshSellerListings();
      if (refreshMarketplace) refreshMarketplace();
    }).catch(function(err) {
      if (doneCallback) doneCallback();
      var msg = 'Failed to add listing.';
      if (err && err.message) {
        if (err.message.indexOf('401') !== -1) msg = 'Not authenticated. Please sign in again.';
        else if (err.message.indexOf('400') !== -1) msg = 'Missing required fields. Check card name, set, and price.';
        else msg = 'Error: ' + err.message;
      }
      flash(msg);
    });
  }

  function handleBulkComplete(successCount) {
    flash(successCount + ' listing' + (successCount !== 1 ? 's' : '') + ' imported to marketplace!');
    setActiveTab('listings');
    refreshSellerListings();
    if (refreshMarketplace) refreshMarketplace();
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

  // If not signed in via Google, show auth prompt
  if (!authUser) {
    return h(AuthPrompt, { onSignIn: onSignIn });
  }

  if (!seller) {
    return h(RegistrationForm, { onRegister: handleRegister, storeOptions: storeOptions });
  }

  var listings = sellerListings;
  // Sales history from localStorage orders
  var allOrders = storageGet('investmtg-orders', []);
  if (!Array.isArray(allOrders)) allOrders = [];
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
        ? h('a', { href: '#store', style: { marginLeft: 'var(--space-2)', color: 'inherit', textDecoration: 'underline' } }, 'View Marketplace \u2192')
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

    // Tab nav — now includes Bulk Import tab
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
        className: 'seller-tab' + (activeTab === 'bulk' ? ' active' : ''),
        onClick: function() { setActiveTab('bulk'); }
      }, h(LayersIcon, null), ' Bulk Import'),
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
            h('div', { className: 'empty-state-actions' },
              h('button', {
                className: 'btn btn-primary',
                onClick: function() { setActiveTab('add'); }
              }, h(PlusIcon, null), ' Add Single Listing'),
              h('button', {
                className: 'btn btn-secondary',
                onClick: function() { setActiveTab('bulk'); }
              }, h(LayersIcon, null), ' Bulk Import from CSV')
            )
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
              var imageUri = listing.image_uri || listing.imageUri || '';

              return h('div', { key: listingId, className: 'seller-listing-card' },
                imageUri && h('img', { src: imageUri, className: 'seller-listing-thumb', alt: cardName, loading: 'lazy' }),
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

    // ===== BULK IMPORT TAB =====
    activeTab === 'bulk' && h('div', { className: 'seller-tab-content' },
      h(BulkImportForm, {
        seller: seller,
        onBulkSave: handleBulkComplete,
        onCancel: function() { setActiveTab('listings'); }
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
