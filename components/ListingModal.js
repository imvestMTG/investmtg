/* ListingModal.js */
import React from 'react';
import { CloseIcon } from './shared/Icons.js';
import { showToast } from './shared/Toast.js';
import { getCardPrice, formatUSD, getScryfallImageUrl } from '../utils/helpers.js';
var h = React.createElement;

/* Input sanitization for marketplace listings */
function sanitize(str, maxLen) {
  if (!str) return '';
  var s = str.trim().slice(0, maxLen || 200);
  /* Strip HTML tags */
  s = s.replace(/<[^>]*>/g, '');
  /* Remove null bytes and control characters */
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  /* Remove javascript: and data: URIs */
  s = s.replace(/javascript\s*:/gi, '').replace(/data\s*:/gi, '');
  return s;
}

function sanitizePrice(val) {
  var p = parseFloat(val);
  if (isNaN(p) || p < 0) return NaN;
  /* Cap at $99,999 to prevent absurd listings */
  return Math.min(p, 99999);
}

export function ListingModal(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var onSubmit = props.onSubmit;
  var prefillCard = props.prefillCard;
  var prefillCardName = props.prefillCardName;

  /* Extract prefill data from full card object */
  var cardData = React.useMemo(function() {
    if (!prefillCard || typeof prefillCard === 'string') return null;
    var price = getCardPrice(prefillCard);
    return {
      name: prefillCard.name || '',
      setName: prefillCard.set_name || '',
      price: price > 0 ? price.toFixed(2) : '',
      cardId: prefillCard.id || null,
      setCode: prefillCard.set || '',
      image: getScryfallImageUrl(prefillCard, 'small') || '',
      imageNormal: getScryfallImageUrl(prefillCard, 'normal') || ''
    };
  }, [prefillCard]);

  /* Controlled state for prefilled fields — reliable across lazy-load & re-renders */
  var ref1 = React.useState(cardData ? cardData.name : (prefillCardName || ''));
  var cardName = ref1[0], setCardName = ref1[1];
  var ref2 = React.useState(cardData ? cardData.setName : '');
  var setName = ref2[0], setSetName = ref2[1];
  var ref3 = React.useState(cardData ? cardData.price : '');
  var price = ref3[0], setPrice = ref3[1];

  /* Sync state if prefillCard changes while modal is open */
  React.useEffect(function() {
    if (cardData) {
      setCardName(cardData.name);
      setSetName(cardData.setName);
      setPrice(cardData.price);
    } else if (prefillCardName) {
      setCardName(prefillCardName);
      setSetName('');
      setPrice('');
    }
  }, [cardData, prefillCardName]);

  var formRef = React.useRef(null);

  if (!isOpen) return null;

  var handleSubmit = function(e) {
    e.preventDefault();
    var form = formRef.current;
    if (!form) return;

    var cleanName = sanitize(cardName, 100);
    var cleanSet = sanitize(setName, 100);
    var condition = form.querySelector('#listing-condition').value;
    var cleanPrice = sanitizePrice(price);
    var typeRadio = form.querySelector('input[name="listing-type"]:checked');
    var type = typeRadio ? typeRadio.value : 'sale';
    var seller = sanitize(form.querySelector('#listing-seller').value, 60);
    var contact = sanitize(form.querySelector('#listing-contact').value, 100);
    var notes = sanitize(form.querySelector('#listing-notes').value, 500);

    if (!cleanName || !cleanSet || !condition || isNaN(cleanPrice) || !seller || !contact) return;

    onSubmit({
      id: 'm' + Date.now(),
      cardName: cleanName,
      setName: cleanSet,
      condition: condition,
      price: cleanPrice,
      type: type,
      seller: seller,
      contact: contact,
      notes: notes,
      card_id: cardData ? cardData.cardId : null,
      set_name: cleanSet,
      image: cardData ? cardData.image : '',
      image_uri: cardData ? cardData.image : '',
      createdAt: Date.now()
    });

    /* Reset non-prefilled fields */
    if (form) form.reset();
    setCardName('');
    setSetName('');
    setPrice('');
    onClose();
    showToast('Listing added!');
  };

  var handleOverlayClick = function(e) {
    if (e.target === e.currentTarget) onClose();
  };

  return h('div', { className: 'mp-modal-overlay open', onClick: handleOverlayClick },
    h('div', { className: 'mp-modal' },
      h('div', { className: 'mp-modal-header' },
        h('h3', null, 'List Your Card'),
        h('button', { className: 'mp-modal-close', onClick: onClose, 'aria-label': 'Close' },
          h(CloseIcon)
        )
      ),

      /* Card preview when prefill data is available */
      cardData && cardData.image && h('div', { className: 'listing-card-preview' },
        h('img', {
          src: cardData.image,
          alt: cardData.name,
          className: 'listing-preview-img',
          loading: 'lazy'
        })
      ),

      h('form', { className: 'mp-listing-form', ref: formRef, onSubmit: handleSubmit },
        h('div', { className: 'mp-form-row' },
          h('label', { htmlFor: 'listing-card-name' }, 'Card Name *'),
          h('input', {
            type: 'text',
            id: 'listing-card-name',
            value: cardName,
            onChange: function(e) { if (!cardData) setCardName(e.target.value); },
            placeholder: 'e.g. Black Lotus',
            required: true,
            maxLength: 100,
            readOnly: !!cardData
          })
        ),
        h('div', { className: 'mp-form-row' },
          h('label', { htmlFor: 'listing-set-name' }, 'Set Name *'),
          h('input', {
            type: 'text',
            id: 'listing-set-name',
            value: setName,
            onChange: function(e) { if (!cardData) setSetName(e.target.value); },
            placeholder: 'e.g. Unlimited',
            required: true,
            maxLength: 100,
            readOnly: !!cardData
          })
        ),
        h('div', { className: 'mp-form-grid-2' },
          h('div', { className: 'mp-form-row' },
            h('label', { htmlFor: 'listing-condition' }, 'Condition *'),
            h('select', { id: 'listing-condition', required: true },
              h('option', { value: 'NM' }, 'Near Mint (NM)'),
              h('option', { value: 'LP' }, 'Lightly Played (LP)'),
              h('option', { value: 'MP' }, 'Moderately Played (MP)'),
              h('option', { value: 'HP' }, 'Heavily Played (HP)')
            )
          ),
          h('div', { className: 'mp-form-row' },
            h('label', { htmlFor: 'listing-price' }, 'Price (USD) *'),
            h('input', {
              type: 'number',
              id: 'listing-price',
              value: price,
              onChange: function(e) { setPrice(e.target.value); },
              min: '0',
              max: '99999',
              step: '0.01',
              placeholder: '0.00',
              required: true
            })
          )
        ),

        /* Market reference when price is known */
        cardData && cardData.price && h('p', {
          style: {
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            marginTop: 'calc(-1 * var(--space-2))',
            marginBottom: 'var(--space-3)'
          }
        }, 'Market reference: ' + formatUSD(parseFloat(cardData.price)) + ' — adjust to your asking price'),

        h('div', { className: 'mp-form-row' },
          h('label', null, 'Listing Type *'),
          h('div', { className: 'mp-radio-group' },
            h('label', { className: 'mp-radio-label' },
              h('input', { type: 'radio', name: 'listing-type', value: 'sale', defaultChecked: true }),
              ' For Sale'
            ),
            h('label', { className: 'mp-radio-label' },
              h('input', { type: 'radio', name: 'listing-type', value: 'trade' }),
              ' For Trade'
            )
          )
        ),
        h('div', { className: 'mp-form-grid-2' },
          h('div', { className: 'mp-form-row' },
            h('label', { htmlFor: 'listing-seller' }, 'Seller Name *'),
            h('input', { type: 'text', id: 'listing-seller', placeholder: 'Your name or handle', required: true, maxLength: 60 })
          ),
          h('div', { className: 'mp-form-row' },
            h('label', { htmlFor: 'listing-contact' }, 'Contact Info *'),
            h('input', { type: 'text', id: 'listing-contact', placeholder: '@instagram, phone, etc.', required: true, maxLength: 100 })
          )
        ),
        h('div', { className: 'mp-form-row' },
          h('label', { htmlFor: 'listing-notes' }, 'Notes (optional)'),
          h('textarea', { id: 'listing-notes', rows: '3', placeholder: 'Any additional details...', maxLength: 500 })
        ),
        h('button', { type: 'submit', className: 'btn btn-primary', style: { width: '100%', padding: 'var(--space-3)' } }, 'Add Listing')
      )
    )
  );
}
