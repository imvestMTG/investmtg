/* SellerDashboard.js — Seller management portal */
import React from 'react';
import { formatUSD, getCardImageSmall, getScryfallImageUrl, handleImageError } from '../utils/helpers.js';
import { STORE_OPTIONS } from '../utils/stores.js';
import { getStoreOptionsAsync } from '../utils/stores.js';
import { PlusIcon, EditIcon, TrashIcon, UserIcon, TagIcon, OrderIcon, ShieldIcon, CheckCircleIcon, UploadIcon, FileTextIcon, AlertCircleIcon, LayersIcon, GridIcon, ListIcon } from './shared/Icons.js';
import { sanitizeInput } from '../utils/sanitize.js';
import { ConfirmModal } from './shared/ConfirmModal.js';
import { fetchSeller, registerSeller, updateSeller, deleteSeller, createListing, createListingsBatch, deleteListing, fetchListings } from '../utils/api.js';
import { parseManaboxCSV, parseTextList } from '../utils/import-parser.js';
import { storageGet } from '../utils/storage.js';
import { TermsCheckbox } from './TermsGate.js';
var h = React.createElement;

var CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];
var FINISHES = ['nonfoil', 'foil', 'etched'];
var FINISH_LABELS = { nonfoil: 'Non-Foil', foil: '\u2728 Foil', etched: '\u25C6 Etched' };
var LANGUAGES = ['English', 'Japanese', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Korean', 'German', 'French', 'Italian', 'Spanish', 'Portuguese', 'Russian', 'Phyrexian'];
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
      var url = 'https://api.scryfall.com/cards/search?q=!' + encodeURIComponent('"' + cardName + '"') + '+-is%3Adigital&unique=prints&order=released&dir=desc';
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
                finishes: card.finishes || ['nonfoil'],
                imageSmall: getCardImageSmall(card),
                imageNormal: getScryfallImageUrl(card, 'normal'),
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
  var refTos = React.useState(false);
  var tosAccepted = refTos[0], setTosAccepted = refTos[1];

  function update(key, val) {
    setForm(function(p) { return Object.assign({}, p, { [key]: val }); });
    setErrors(function(p) { return Object.assign({}, p, { [key]: '' }); });
  }

  function validate() {
    var e = {};
    if (!form.name.trim()) { e.name = 'Seller name is required'; }
    if (!form.contact.trim()) { e.contact = 'Contact info is required'; }
    if (!tosAccepted) { e.tos = 'You must agree to the Terms of Service'; }
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
        h(TermsCheckbox, {
          checked: tosAccepted,
          onChange: function(val) {
            setTosAccepted(val);
            setErrors(function(p) { return Object.assign({}, p, { tos: '' }); });
          },
          error: errors.tos
        }),
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

// ===== ADD/EDIT LISTING FORM — STEP-BASED LAYOUT =====
// Step 1: Search card name → autocomplete or type and press Enter
// Step 2: Pick a printing from the visual grid (auto-shown)
// Step 3: Fill listing details (condition, price, contact)
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
    finish: 'nonfoil',
    language: 'English',
    price: '',
    type: 'sale',
    notes: '',
    contact: '',
    imageUri: '',
    imageNormal: '',
    scryfallId: ''
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

  // Card name confirmed for printings fetch
  var ref6 = React.useState('');
  var confirmedCardName = ref6[0], setConfirmedCardName = ref6[1];

  // View mode: 'grid' or 'list'
  var ref7 = React.useState('grid');
  var viewMode = ref7[0], setViewMode = ref7[1];

  var ac = useScryfallAutocomplete(autocompleteQuery);
  var printingsData = useScryfallPrintings(confirmedCardName);

  function update(key, val) {
    setForm(function(p) { return Object.assign({}, p, { [key]: val }); });
    setErrors(function(p) { return Object.assign({}, p, { [key]: '' }); });
  }

  function confirmCard(name) {
    update('cardName', name);
    setAutocompleteQuery('');
    setAcOpen(false);
    setConfirmedCardName(name);
    // Clear previous printing selection
    update('setName', '');
    update('setCode', '');
    update('collectorNumber', '');
    update('imageUri', '');
    update('imageNormal', '');
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
      update('imageNormal', '');
    }
  }

  // Confirm on Enter key or blur with valid text
  function handleCardNameKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If autocomplete has results, pick the first one; else use typed text
      if (ac.results.length > 0) {
        confirmCard(ac.results[0]);
      } else if (form.cardName.trim().length >= 2) {
        confirmCard(form.cardName.trim());
      }
    }
  }

  function handleCardNameBlur() {
    setTimeout(function() {
      setAcOpen(false);
      // Auto-confirm if user typed a name but never selected from dropdown
      if (form.cardName.trim().length >= 3 && !confirmedCardName) {
        // If autocomplete has an exact match, use it
        var typed = form.cardName.trim().toLowerCase();
        var exactMatch = ac.results.find(function(name) {
          return name.toLowerCase() === typed;
        });
        if (exactMatch) {
          confirmCard(exactMatch);
        } else if (ac.results.length > 0) {
          // Use first autocomplete result if close
          confirmCard(ac.results[0]);
        } else if (form.cardName.trim().length >= 3) {
          // Last resort: confirm the typed text to trigger Scryfall search
          confirmCard(form.cardName.trim());
        }
      }
    }, 200);
  }

  function handleAcSelect(name) {
    confirmCard(name);
  }

  function handleSetSelect(printing) {
    update('setName', printing.setName);
    update('setCode', printing.setCode);
    update('collectorNumber', printing.collectorNumber || '');
    update('imageUri', printing.imageSmall || '');
    update('imageNormal', printing.imageNormal || '');
    update('scryfallId', printing.scryfallId || '');
    // Store available finishes from Scryfall for this printing
    var avail = printing.finishes || ['nonfoil'];
    // Default finish to first available (nonfoil if available, else foil, etc.)
    if (avail.indexOf(form.finish) === -1) {
      update('finish', avail[0] || 'nonfoil');
    }
    if (!form.price) {
      var suggestedPrice = (form.finish === 'foil' || form.finish === 'etched')
        ? (printing.priceUsdFoil || printing.priceUsd)
        : (printing.priceUsd || printing.priceUsdFoil);
      if (suggestedPrice) update('price', suggestedPrice);
    }
  }

  function handleClearCard() {
    setForm(function(p) { return Object.assign({}, p, defaultForm); });
    setConfirmedCardName('');
    setAutocompleteQuery('');
  }

  function validate() {
    var e = {};
    if (!form.cardName.trim()) { e.cardName = 'Card name is required'; }
    if (!form.setName.trim()) { e.setName = 'Select a printing below'; }
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

  var hasPrintings = confirmedCardName && printingsData.printings.length > 0;
  var isPrintingsLoading = confirmedCardName && printingsData.loading;
  var selectedKey = form.setCode
    ? form.setCode + '-' + (form.collectorNumber || '')
    : '';

  return h('div', { className: 'lf' },

    // ========== STEP 1: CARD SEARCH ==========
    h('div', { className: 'lf-section' },
      h('div', { className: 'lf-step-header' },
        h('span', { className: 'lf-step-num' }, '1'),
        h('div', null,
          h('h3', { className: 'lf-step-title' }, 'Find Your Card'),
          h('p', { className: 'lf-step-desc' }, 'Start typing to search Scryfall. Press Enter or select a result.')
        )
      ),
      h('div', { className: 'lf-search-row' },
        h('div', { className: 'form-group listing-form-autocomplete', style: { flex: 1, marginBottom: 0 } },
          h('input', {
            id: 'lf-card',
            type: 'text',
            className: 'form-input lf-search-input' + (errors.cardName ? ' error' : ''),
            placeholder: 'Search card name\u2026',
            value: form.cardName,
            onChange: handleCardNameChange,
            onKeyDown: handleCardNameKeyDown,
            onBlur: handleCardNameBlur,
            autoComplete: 'off'
          }),
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
        confirmedCardName && h('button', {
          type: 'button',
          className: 'btn btn-ghost btn-sm',
          onClick: handleClearCard,
          title: 'Clear and search again'
        }, '\u2715 Clear')
      ),
      errors.cardName && h('p', { className: 'form-error' }, errors.cardName),

      // Confirmed card indicator
      confirmedCardName && h('div', { className: 'lf-confirmed-card' },
        h('span', { className: 'lf-confirmed-check' }, '\u2713'),
        h('span', null, 'Searching printings for: '),
        h('strong', null, confirmedCardName)
      )
    ),

    // ========== STEP 2: SELECT PRINTING ==========
    (confirmedCardName || form.setName) && h('div', { className: 'lf-section' },
      h('div', { className: 'lf-step-header' },
        h('span', { className: 'lf-step-num' + (form.setName ? ' done' : '') }, form.setName ? '\u2713' : '2'),
        h('div', null,
          h('h3', { className: 'lf-step-title' }, 'Choose Printing'),
          h('p', { className: 'lf-step-desc' },
            form.setName
              ? 'Selected: ' + form.setName + (form.setCode ? ' (' + form.setCode.toUpperCase() + ')' : '')
              : 'Pick the exact set and variant you have.'
          )
        )
      ),
      errors.setName && h('p', { className: 'form-error', style: { marginLeft: '44px' } }, errors.setName),

      // Loading skeleton
      isPrintingsLoading && h('div', { className: 'lf-printings-loading' },
        h('div', { className: 'skeleton', style: { width: '100%', height: '200px', borderRadius: 'var(--radius-lg)' } }),
        h('p', { className: 'lf-loading-text' }, 'Fetching printings from Scryfall\u2026')
      ),

      // Printings grid/list
      hasPrintings && h('div', { className: 'lf-printings-wrap' },
        // View controls
        h('div', { className: 'lf-printings-controls' },
          h('span', { className: 'lf-printings-count' },
            printingsData.printings.length + ' printing' + (printingsData.printings.length !== 1 ? 's' : '') + ' found'
          ),
          h('div', { className: 'lf-view-toggle' },
            h('button', {
              type: 'button',
              className: 'lf-view-btn' + (viewMode === 'grid' ? ' active' : ''),
              onClick: function() { setViewMode('grid'); }
            }, h(GridIcon, null)),
            h('button', {
              type: 'button',
              className: 'lf-view-btn' + (viewMode === 'list' ? ' active' : ''),
              onClick: function() { setViewMode('list'); }
            }, h(ListIcon, null))
          )
        ),

        // GRID VIEW
        viewMode === 'grid' && h('div', { className: 'lf-pgrid' },
          printingsData.printings.map(function(p) {
            var key = p.setCode + '-' + (p.collectorNumber || '');
            var isSel = selectedKey === key;
            return h('div', {
              key: key,
              className: 'lf-pgrid-card' + (isSel ? ' selected' : ''),
              onClick: function() { handleSetSelect(p); }
            },
              p.imageSmall
                ? h('img', {
                    src: p.imageSmall,
                    alt: p.setName,
                    className: 'lf-pgrid-img',
                    loading: 'lazy',
                    onError: function(e) { handleImageError(e, p.scryfallId, 'small'); }
                  })
                : h('div', { className: 'lf-pgrid-img-ph' }, h('span', null, p.setCode.toUpperCase())),
              h('div', { className: 'lf-pgrid-body' },
                h('div', { className: 'lf-pgrid-set' }, p.setName),
                h('div', { className: 'lf-pgrid-meta' },
                  h('span', { className: 'set-code-badge' }, p.setCode.toUpperCase()),
                  p.collectorNumber && h('span', null, '#' + p.collectorNumber),
                  p.rarity && h('span', { className: 'rarity-' + p.rarity }, p.rarity.charAt(0).toUpperCase() + p.rarity.slice(1))
                ),
                h('div', { className: 'lf-pgrid-price' },
                  p.priceUsd ? '$' + p.priceUsd : (p.priceUsdFoil ? '\u2728$' + p.priceUsdFoil : 'N/A')
                )
              ),
              isSel && h('div', { className: 'lf-pgrid-check' }, '\u2713')
            );
          })
        ),

        // LIST VIEW
        viewMode === 'list' && h('div', { className: 'lf-plist' },
          printingsData.printings.map(function(p) {
            var key = p.setCode + '-' + (p.collectorNumber || '');
            var isSel = selectedKey === key;
            return h('div', {
              key: key,
              className: 'lf-plist-row' + (isSel ? ' selected' : ''),
              onClick: function() { handleSetSelect(p); }
            },
              p.imageSmall && h('img', {
                src: p.imageSmall,
                alt: '',
                className: 'lf-plist-thumb',
                loading: 'lazy',
                onError: function(e) { handleImageError(e, p.scryfallId, 'small'); }
              }),
              h('div', { className: 'lf-plist-info' },
                h('div', { className: 'lf-plist-name' }, p.setName),
                h('div', { className: 'lf-plist-meta' },
                  h('span', { className: 'set-code-badge' }, p.setCode.toUpperCase()),
                  p.collectorNumber && h('span', null, '#' + p.collectorNumber),
                  p.rarity && h('span', { className: 'rarity-' + p.rarity }, p.rarity.charAt(0).toUpperCase() + p.rarity.slice(1))
                )
              ),
              h('div', { className: 'lf-plist-prices' },
                p.priceUsd && h('span', { className: 'set-price-usd' }, '$' + p.priceUsd),
                p.priceUsdFoil && h('span', { className: 'set-price-foil' }, '\u2728$' + p.priceUsdFoil),
                !p.priceUsd && !p.priceUsdFoil && h('span', { className: 'set-price-na' }, 'N/A')
              ),
              isSel && h('div', { className: 'lf-plist-check' }, '\u2713')
            );
          })
        )
      ),

      // Error
      printingsData.error && h('div', { className: 'lf-printings-error' },
        h(AlertCircleIcon, null),
        h('span', null, 'Could not load printings. You can type a set name manually below.')
      )
    ),

    // ========== STEP 3: LISTING DETAILS ==========
    (form.setName || (confirmedCardName && printingsData.error)) && h('form', { onSubmit: handleSubmit, className: 'lf-section' },
      h('div', { className: 'lf-step-header' },
        h('span', { className: 'lf-step-num' }, '3'),
        h('div', null,
          h('h3', { className: 'lf-step-title' }, 'Listing Details'),
          h('p', { className: 'lf-step-desc' }, 'Set condition, price, and contact info.')
        )
      ),

      // Selected card summary
      form.imageUri && h('div', { className: 'lf-selected-card' },
        h('img', {
          src: form.imageNormal || form.imageUri,
          alt: form.cardName,
          className: 'lf-selected-img',
          loading: 'lazy',
          onError: function(e) { handleImageError(e, form.scryfallId, 'normal'); }
        }),
        h('div', { className: 'lf-selected-info' },
          h('div', { className: 'lf-selected-name' }, form.cardName),
          h('div', { className: 'lf-selected-set' },
            form.setName,
            form.setCode && h('span', { className: 'set-code-badge', style: { marginLeft: 'var(--space-2)' } }, form.setCode.toUpperCase()),
            form.collectorNumber && h('span', { style: { marginLeft: 'var(--space-1)' } }, '#' + form.collectorNumber)
          )
        )
      ),

      // Condition + Type row
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
              return h('option', { key: c, value: c }, c + ' \u2014 ' + ({ NM: 'Near Mint', LP: 'Light Play', MP: 'Moderate Play', HP: 'Heavy Play', DMG: 'Damaged' }[c] || c));
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

      // Finish + Language row
      h('div', { className: 'form-row-2col' },
        h('div', { className: 'form-group' },
          h('label', { className: 'form-label' }, 'Finish'),
          h('div', { className: 'finish-selector' },
            FINISHES.map(function(f) {
              // Get available finishes from selected printing
              var selectedPrinting = printingsData.printings.find(function(p) {
                return p.setCode === form.setCode && p.collectorNumber === form.collectorNumber;
              });
              var availFinishes = selectedPrinting ? (selectedPrinting.finishes || ['nonfoil']) : FINISHES;
              var isAvailable = availFinishes.indexOf(f) !== -1;
              return h('button', {
                key: f,
                type: 'button',
                className: 'finish-chip' + (form.finish === f ? ' finish-chip--active' : '') + (f === 'foil' ? ' finish-chip--foil' : '') + (f === 'etched' ? ' finish-chip--etched' : '') + (!isAvailable ? ' finish-chip--disabled' : ''),
                disabled: !isAvailable,
                onClick: function() {
                  update('finish', f);
                  // Update suggested price when switching finish
                  if (selectedPrinting) {
                    if (f === 'foil' || f === 'etched') {
                      if (selectedPrinting.priceUsdFoil) update('price', selectedPrinting.priceUsdFoil);
                    } else {
                      if (selectedPrinting.priceUsd) update('price', selectedPrinting.priceUsd);
                    }
                  }
                }
              }, FINISH_LABELS[f] || f);
            })
          )
        ),
        h('div', { className: 'form-group' },
          h('label', { className: 'form-label', htmlFor: 'lf-lang' }, 'Language'),
          h('select', {
            id: 'lf-lang',
            className: 'form-input',
            value: form.language,
            onChange: function(e) { update('language', e.target.value); }
          },
            LANGUAGES.map(function(lang) {
              return h('option', { key: lang, value: lang }, lang);
            })
          )
        )
      ),

      // Price
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

      // Contact
      h('div', { className: 'form-group' },
        h('label', { className: 'form-label', htmlFor: 'lf-contact' }, 'Contact'),
        h('input', {
          id: 'lf-contact',
          type: 'text',
          className: 'form-input',
          placeholder: 'Email, phone, or Discord handle',
          value: form.contact,
          onChange: function(e) { update('contact', e.target.value); }
        })
      ),

      // Notes
      h('div', { className: 'form-group' },
        h('label', { className: 'form-label', htmlFor: 'lf-notes' }, 'Notes (optional)'),
        h('textarea', {
          id: 'lf-notes',
          className: 'form-input',
          placeholder: 'Trade wants, availability, meetup preferences\u2026',
          value: form.notes,
          rows: 2,
          onChange: function(e) { update('notes', e.target.value); }
        })
      ),

      // Actions
      h('div', { className: 'lf-actions' },
        h('button', { type: 'button', className: 'btn btn-secondary', onClick: onCancel }, 'Cancel'),
        h('button', { type: 'submit', className: 'btn btn-primary', disabled: submitting },
          submitting ? 'Creating\u2026' : (initial && initial.id ? 'Save Changes' : 'Create Listing')
        )
      )
    ),

    // Cancel-only when form hasn't progressed past step 1
    !confirmedCardName && !form.setName && h('div', { className: 'lf-actions', style: { marginTop: 'var(--space-4)' } },
      h('button', { type: 'button', className: 'btn btn-secondary', onClick: onCancel }, 'Cancel')
    )
  );
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

  var ref8 = React.useState('csv');
  var importTab = ref8[0], setImportTab = ref8[1];

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
    var result = importTab === 'text' ? parseTextList(csvText) : parseManaboxCSV(csvText);
    setParsedResult(result);
  }

  function handleSubmitBulk() {
    if (!parsedResult || parsedResult.cards.length === 0) return;
    setSubmitting(true);
    setProgress({ done: 0, total: parsedResult.cards.length, failed: 0 });

    var cards = parsedResult.cards.map(function(card) {
      return {
        card_name: card.cardName || '',
        price: card.price > 0 ? card.price : (parseFloat(defaultPrice) || 0),
        condition: card.condition || 'NM',
        finish: card.foil ? 'foil' : 'nonfoil',
        language: card.language || 'English',
        seller_name: seller.name || '',
        seller_contact: contact || seller.contact || '',
        set_name: card.setName || '',
        notes: card.notes || ''
      };
    });

    createListingsBatch(cards).then(function(result) {
      setSubmitting(false);
      setProgress({ done: result.created || cards.length, total: cards.length, failed: result.failed || 0 });
      onBulkSave(result.created || cards.length);
    }).catch(function(err) {
      setSubmitting(false);
      setProgress(function(p) { return Object.assign({}, p, { done: p.total, failed: p.total }); });
    });
  }

  var cardCount = parsedResult ? parsedResult.cards.length : 0;

  return h('div', { className: 'bulk-import-form' },
    h('h3', { className: 'listing-form-title' },
      h(LayersIcon, null), ' Bulk Import'
    ),
    // Import format tabs
    h('div', { className: 'import-tabs' },
      h('button', {
        type: 'button',
        className: 'import-tab' + (importTab === 'csv' ? ' import-tab--active' : ''),
        onClick: function() { setImportTab('csv'); setParsedResult(null); }
      }, 'CSV Import'),
      h('button', {
        type: 'button',
        className: 'import-tab' + (importTab === 'text' ? ' import-tab--active' : ''),
        onClick: function() { setImportTab('text'); setParsedResult(null); }
      }, 'Text / MTGA')
    ),

    importTab === 'csv'
      ? h('p', { className: 'bulk-import-desc' },
          'Import multiple cards from a CSV file. Supports ',
          h('strong', null, 'Manabox'), ', ', h('strong', null, 'DragonShield'), ', ',
          h('strong', null, 'Deckbox'), ', and ', h('strong', null, 'TCGplayer'), ' exports.'
        )
      : h('p', { className: 'bulk-import-desc' },
          'Paste a card list in MTGA format, simple names, or quantity-prefixed lines.'
        ),

    // File upload (CSV tab only)
    importTab === 'csv' && h('div', { className: 'form-group' },
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

    // Or paste CSV text (CSV tab only)
    importTab === 'csv' && h('div', { className: 'bulk-divider' },
      h('span', null, 'or paste CSV text below')
    ),

    importTab === 'csv' && h('div', { className: 'form-group' },
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

    // Text tab textarea
    importTab === 'text' && h('div', { className: 'form-group' },
      h('textarea', {
        className: 'form-input bulk-csv-textarea',
        rows: 6,
        placeholder: '4 Lightning Bolt (LEA) 123\n1 Counterspell (ICE)\nSol Ring\n3x Swords to Plowshares',
        value: csvText,
        onChange: function(e) { setCsvText(e.target.value); setParsedResult(null); }
      }),
      !parsedResult && csvText.trim() && h('button', {
        type: 'button',
        className: 'btn btn-secondary btn-sm',
        onClick: handleParseText,
        style: { marginTop: 'var(--space-2)' }
      }, 'Parse')
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

      cardCount > 500 && h('div', { className: 'bulk-warnings' },
        h(AlertCircleIcon, null),
        h('p', { className: 'bulk-warning-text' }, 'Maximum 500 cards per import. Only the first 500 will be imported.')
      ),

      cardCount > 0 && h('div', { className: 'bulk-preview-table-wrap' },
        h('table', { className: 'bulk-preview-table' },
          h('thead', null,
            h('tr', null,
              h('th', null, 'Card Name'),
              h('th', null, 'Set'),
              h('th', null, 'Cond'),
              h('th', null, 'Finish'),
              h('th', null, 'Price')
            )
          ),
          h('tbody', null,
            parsedResult.cards.slice(0, 20).map(function(card, i) {
              return h('tr', { key: i },
                h('td', null, card.cardName),
                h('td', null, card.setName || card.setCode || '\u2014'),
                h('td', null, h('span', { className: 'mp-badge-condition cond-' + card.condition.toLowerCase() }, card.condition)),
                h('td', null, card.foil ? h('span', { className: 'finish-badge finish-foil' }, '\u2728 Foil') : h('span', { className: 'finish-badge' }, 'Non-Foil')),
                h('td', null, card.price > 0 ? '$' + card.price.toFixed(2) : '\u2014')
              );
            }),
            cardCount > 20 && h('tr', null,
              h('td', { colSpan: 5, style: { textAlign: 'center', color: 'var(--color-text-muted)' } },
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

// ===== EDITABLE FIELD =====
// Inline-editable field: click to edit, Enter/blur to save, Esc to cancel
function EditableField(props) {
  var label = props.label;
  var value = props.value;
  var placeholder = props.placeholder || 'Not set';
  var onSave = props.onSave;
  var fieldType = props.fieldType || 'text'; // 'text' | 'textarea' | 'select'
  var selectOptions = props.selectOptions;
  var maxLength = props.maxLength || 200;
  var required = props.required;
  var description = props.description;

  var ref1 = React.useState(false);
  var editing = ref1[0], setEditing = ref1[1];
  var ref2 = React.useState(value || '');
  var draft = ref2[0], setDraft = ref2[1];
  var ref3 = React.useState(false);
  var saving = ref3[0], setSaving = ref3[1];
  var ref4 = React.useState(null);
  var error = ref4[0], setError = ref4[1];
  var inputRef = React.useRef(null);

  React.useEffect(function() {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.select && fieldType !== 'select') {
        inputRef.current.select();
      }
    }
  }, [editing]);

  // Sync external value changes
  React.useEffect(function() {
    if (!editing) setDraft(value || '');
  }, [value]);

  function startEdit() {
    setDraft(value || '');
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(value || '');
    setError(null);
    setEditing(false);
  }

  function commitEdit() {
    var trimmed = draft.trim();
    if (required && !trimmed) {
      setError(label + ' is required');
      return;
    }
    if (trimmed === (value || '')) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    onSave(trimmed).then(function() {
      setEditing(false);
    }).catch(function() {
      setError('Failed to save. Please try again.');
    }).finally(function() {
      setSaving(false);
    });
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      cancelEdit();
    } else if (e.key === 'Enter' && fieldType !== 'textarea') {
      e.preventDefault();
      commitEdit();
    }
  }

  if (editing) {
    var inputEl;
    if (fieldType === 'textarea') {
      inputEl = h('textarea', {
        ref: inputRef,
        className: 'pf-edit-input pf-edit-textarea',
        value: draft,
        maxLength: maxLength,
        rows: 3,
        placeholder: placeholder,
        disabled: saving,
        onChange: function(e) { setDraft(e.target.value); },
        onKeyDown: handleKeyDown
      });
    } else if (fieldType === 'select') {
      inputEl = h('select', {
        ref: inputRef,
        className: 'pf-edit-input',
        value: draft,
        disabled: saving,
        onChange: function(e) { setDraft(e.target.value); }
      },
        h('option', { value: '' }, 'No affiliation'),
        (selectOptions || []).map(function(s) {
          return h('option', { key: s.id, value: s.id }, s.name);
        })
      );
    } else {
      inputEl = h('input', {
        ref: inputRef,
        type: 'text',
        className: 'pf-edit-input',
        value: draft,
        maxLength: maxLength,
        placeholder: placeholder,
        disabled: saving,
        onChange: function(e) { setDraft(e.target.value); },
        onKeyDown: handleKeyDown
      });
    }

    return h('div', { className: 'pf-field pf-field--editing' },
      h('div', { className: 'pf-field-label' }, label),
      inputEl,
      error && h('p', { className: 'pf-field-error' }, error),
      h('div', { className: 'pf-field-actions' },
        h('button', {
          type: 'button',
          className: 'btn btn-primary btn-sm',
          disabled: saving,
          onClick: commitEdit
        }, saving ? 'Saving\u2026' : 'Save'),
        h('button', {
          type: 'button',
          className: 'btn btn-ghost btn-sm',
          disabled: saving,
          onClick: cancelEdit
        }, 'Cancel')
      )
    );
  }

  // Read-only view
  var displayValue = value || '';
  if (fieldType === 'select' && selectOptions) {
    var match = selectOptions.find(function(s) { return s.id === value; });
    displayValue = match ? match.name : 'No affiliation';
  }

  return h('div', {
    className: 'pf-field',
    onClick: startEdit,
    tabIndex: 0,
    role: 'button',
    onKeyDown: function(e) { if (e.key === 'Enter') startEdit(); }
  },
    h('div', { className: 'pf-field-label' },
      label,
      required && h('span', { className: 'pf-required' }, '*')
    ),
    h('div', { className: 'pf-field-value' + (!displayValue ? ' pf-field-value--empty' : '') },
      displayValue || placeholder
    ),
    description && h('div', { className: 'pf-field-desc' }, description),
    h('div', { className: 'pf-field-edit-hint' },
      h(EditIcon, null)
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

  var refDelConfirm = React.useState('');
  var deleteConfirmText = refDelConfirm[0], setDeleteConfirmText = refDelConfirm[1];

  var refShowDelete = React.useState(false);
  var showDeleteExpanded = refShowDelete[0], setShowDeleteExpanded = refShowDelete[1];

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
    }).catch(function() { /* store options non-critical */ });

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
      finish: listingData.finish || 'nonfoil',
      language: listingData.language || 'English',
      seller_name: seller.name || '',
      seller_contact: listingData.contact || seller.contact || '',
      set_name: listingData.setName || '',
      notes: listingData.notes || '',
      image_uri: listingData.image || listingData.imageUri || null,
      card_id: listingData.scryfallId || ''
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
      }
    });
  }

  // Save a single field: merges into current seller and PUTs to backend
  function handleSaveField(fieldName, newValue) {
    var data = {};
    data[fieldName] = fieldName === 'store_affiliation' ? (newValue || null) : sanitizeInput(newValue, fieldName === 'bio' ? 500 : fieldName === 'name' ? 100 : 200);
    return updateSeller(data).then(function(result) {
      var updated = result && result.seller ? result.seller : result;
      setSeller(updated);
      flash('Profile updated.');
    });
  }

  function handleDeleteAccount() {
    deleteSeller().then(function() {
      setSeller(null);
      setSellerListings([]);
      setDeleteConfirmText('');
      setShowDeleteExpanded(false);
      flash('Seller account deleted.');
      if (refreshMarketplace) refreshMarketplace();
    }).catch(function() {
      flash('Failed to delete account. Please try again.');
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
              var listingFinish = listing.finish || 'nonfoil';
              var listingLanguage = listing.language || 'English';
              var listingNotes = listing.notes || '';
              var cardId = listing.cardId || listing.card_id || '';
              var imageUri = listing.image_uri || listing.imageUri || '';
              var thumbSrc = imageUri
                || (cardId ? 'https://api.scryfall.com/cards/' + cardId + '?format=image&version=small' : '')
                || (cardName ? 'https://api.scryfall.com/cards/named?format=image&version=small&exact=' + encodeURIComponent(cardName) : '');

              return h('div', { key: listingId, className: 'seller-listing-card' },
                thumbSrc && h('img', {
                  src: thumbSrc,
                  className: 'seller-listing-thumb',
                  alt: cardName,
                  loading: 'lazy',
                  onError: function(e) { handleImageError(e, cardId, 'small'); }
                }),
                h('div', { className: 'seller-listing-top' },
                  h('div', null,
                    h('div', { className: 'seller-listing-name' }, cardName),
                    h('div', { className: 'seller-listing-set' }, setName)
                  ),
                  h('div', { className: 'seller-listing-badges' },
                    h('span', {
                      className: 'mp-badge-condition cond-' + listingCondition.toLowerCase()
                    }, listingCondition),
                    listingFinish !== 'nonfoil' && h('span', {
                      className: 'finish-badge finish-' + listingFinish
                    }, FINISH_LABELS[listingFinish] || listingFinish),
                    listingLanguage !== 'English' && h('span', {
                      className: 'language-badge'
                    }, listingLanguage),
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
    activeTab === 'profile' && h('div', { className: 'seller-tab-content pf-page' },

      // ---- Personal Information section ----
      h('div', { className: 'pf-section' },
        h('div', { className: 'pf-section-header' },
          h(UserIcon, null),
          h('div', null,
            h('h3', { className: 'pf-section-title' }, 'Personal Information'),
            h('p', { className: 'pf-section-desc' }, 'Click any field to edit. Changes save individually.')
          )
        ),
        h('div', { className: 'pf-fields' },
          h(EditableField, {
            label: 'Seller Name',
            value: seller.name,
            placeholder: 'Enter your display name',
            required: true,
            maxLength: 100,
            description: 'Visible to buyers on your listings.',
            onSave: function(v) { return handleSaveField('name', v); }
          }),
          h(EditableField, {
            label: 'Bio',
            value: seller.bio || '',
            placeholder: 'Tell buyers about yourself\u2026',
            fieldType: 'textarea',
            maxLength: 500,
            description: 'A short intro shown on your seller profile.',
            onSave: function(v) { return handleSaveField('bio', v); }
          })
        )
      ),

      // ---- Contact & Store section ----
      h('div', { className: 'pf-section' },
        h('div', { className: 'pf-section-header' },
          h(TagIcon, null),
          h('div', null,
            h('h3', { className: 'pf-section-title' }, 'Contact & Store'),
            h('p', { className: 'pf-section-desc' }, 'How buyers reach you and your store affiliation.')
          )
        ),
        h('div', { className: 'pf-fields' },
          h(EditableField, {
            label: 'Preferred Contact',
            value: seller.contact || '',
            placeholder: 'Instagram, email, or phone',
            maxLength: 200,
            description: 'Shared with buyers when they purchase your cards.',
            onSave: function(v) { return handleSaveField('contact', v); }
          }),
          h(EditableField, {
            label: 'Store Affiliation',
            value: seller.store_affiliation || '',
            fieldType: 'select',
            selectOptions: storeOptions,
            placeholder: 'No affiliation',
            description: 'Link your profile to a local game store.',
            onSave: function(v) { return handleSaveField('store_affiliation', v); }
          })
        )
      ),

      // ---- Account Details section (read-only) ----
      h('div', { className: 'pf-section' },
        h('div', { className: 'pf-section-header' },
          h(ShieldIcon, null),
          h('div', null,
            h('h3', { className: 'pf-section-title' }, 'Account Details')
          )
        ),
        h('div', { className: 'pf-readonly-fields' },
          h('div', { className: 'pf-readonly-field' },
            h('div', { className: 'pf-field-label' }, 'Reputation Score'),
            h('div', { className: 'pf-field-value' },
              h('span', { className: 'seller-rep-inline' },
                h(ShieldIcon, null), ' ', reputationScore, ' / 100'
              )
            )
          ),
          h('div', { className: 'pf-readonly-field' },
            h('div', { className: 'pf-field-label' }, 'Seller ID'),
            h('div', { className: 'pf-field-value', style: { fontFamily: 'monospace', fontSize: 'var(--text-xs)' } },
              seller.id
            )
          ),
          h('div', { className: 'pf-readonly-field' },
            h('div', { className: 'pf-field-label' }, 'Member Since'),
            h('div', { className: 'pf-field-value' },
              new Date(joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            )
          )
        )
      ),

      // ---- Session section ----
      h('div', { className: 'pf-section' },
        h('div', { className: 'pf-section-header' },
          h(AlertCircleIcon, null),
          h('div', null,
            h('h3', { className: 'pf-section-title' }, 'Session')
          )
        ),
        h('div', { className: 'pf-session-row' },
          h('div', null,
            h('div', { className: 'pf-field-label' }, 'Seller Session'),
            h('div', { className: 'pf-field-desc' }, 'Log out to end your current seller session.')
          ),
          h('button', { className: 'btn btn-secondary btn-sm', onClick: handleLogout },
            'Log Out'
          )
        )
      ),

      // ---- Danger Zone ----
      h('div', { className: 'pf-danger' },
        h('div', { className: 'pf-danger-header', onClick: function() { setShowDeleteExpanded(!showDeleteExpanded); setDeleteConfirmText(''); } },
          h('div', null,
            h('h3', { className: 'seller-danger-title' }, 'Danger Zone'),
            h('p', { className: 'seller-danger-text' }, 'Irreversible actions for your seller account.')
          ),
          h('span', { className: 'pf-danger-chevron' + (showDeleteExpanded ? ' pf-danger-chevron--open' : '') }, '\u25BC')
        ),
        showDeleteExpanded && h('div', { className: 'pf-danger-body' },
          h('p', { className: 'pf-danger-warning' },
            'This will permanently delete your seller profile and all ',
            h('strong', null, sellerListings.length),
            ' listing' + (sellerListings.length !== 1 ? 's' : '') + '. This action cannot be undone.'
          ),
          h('label', { className: 'pf-field-label', htmlFor: 'delete-confirm', style: { marginBottom: 'var(--space-2)' } },
            'Type "DELETE" to confirm:'
          ),
          h('input', {
            id: 'delete-confirm',
            type: 'text',
            className: 'pf-edit-input',
            placeholder: 'DELETE',
            value: deleteConfirmText,
            onChange: function(e) { setDeleteConfirmText(e.target.value); },
            style: { maxWidth: '200px' }
          }),
          h('button', {
            className: 'btn btn-danger btn-sm',
            disabled: deleteConfirmText !== 'DELETE',
            onClick: handleDeleteAccount,
            style: { marginTop: 'var(--space-3)' }
          },
            h(TrashIcon, null), ' Delete Seller Account'
          )
        )
      )
    )
  );
}
