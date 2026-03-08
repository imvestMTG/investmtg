/* ListingModal.js */
import React from 'react';
import { CloseIcon } from './shared/Icons.js';
import { showToast } from './shared/Toast.js';
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
  var prefillCardName = props.prefillCardName;
  var cardNameRef = React.useRef(null);
  var formRef = React.useRef(null);

  React.useEffect(function() {
    if (isOpen && prefillCardName && cardNameRef.current) {
      cardNameRef.current.value = prefillCardName;
    }
  }, [isOpen, prefillCardName]);

  if (!isOpen) return null;

  var handleSubmit = function(e) {
    e.preventDefault();
    var form = formRef.current;
    if (!form) return;

    var cardName = sanitize(form.querySelector('#listing-card-name').value, 100);
    var setName = sanitize(form.querySelector('#listing-set-name').value, 100);
    var condition = form.querySelector('#listing-condition').value;
    var price = sanitizePrice(form.querySelector('#listing-price').value);
    var typeRadio = form.querySelector('input[name="listing-type"]:checked');
    var type = typeRadio ? typeRadio.value : 'sale';
    var seller = sanitize(form.querySelector('#listing-seller').value, 60);
    var contact = sanitize(form.querySelector('#listing-contact').value, 100);
    var notes = sanitize(form.querySelector('#listing-notes').value, 500);

    if (!cardName || !setName || !condition || isNaN(price) || !seller || !contact) return;

    onSubmit({
      id: 'm' + Date.now(),
      cardName: cardName,
      setName: setName,
      condition: condition,
      price: price,
      type: type,
      seller: seller,
      contact: contact,
      notes: notes,
      image: '',
      createdAt: Date.now()
    });

    form.reset();
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
      h('form', { className: 'mp-listing-form', ref: formRef, onSubmit: handleSubmit },
        h('div', { className: 'mp-form-row' },
          h('label', { htmlFor: 'listing-card-name' }, 'Card Name *'),
          h('input', { type: 'text', id: 'listing-card-name', ref: cardNameRef, placeholder: 'e.g. Black Lotus', required: true, maxLength: 100 })
        ),
        h('div', { className: 'mp-form-row' },
          h('label', { htmlFor: 'listing-set-name' }, 'Set Name *'),
          h('input', { type: 'text', id: 'listing-set-name', placeholder: 'e.g. Unlimited', required: true, maxLength: 100 })
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
            h('input', { type: 'number', id: 'listing-price', min: '0', max: '99999', step: '0.01', placeholder: '0.00', required: true })
          )
        ),
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
