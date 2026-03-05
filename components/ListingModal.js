/* ListingModal.js */
import React from 'react';
import { XIcon } from './shared/Icons.js';
var h = React.createElement;

export function ListingModal({ card, listings, updateListings, onClose }) {
  var ref1 = React.useState(card ? card.name : '');
  var cardName = ref1[0], setCardName = ref1[1];
  var ref2 = React.useState(card ? (card.set_name || '') : '');
  var setName = ref2[0], setSetName = ref2[1];
  var ref3 = React.useState('NM');
  var condition = ref3[0], setCondition = ref3[1];
  var ref4 = React.useState(card && card.prices && card.prices.usd ? card.prices.usd : '');
  var price = ref4[0], setPrice = ref4[1];
  var ref5 = React.useState('sale');
  var listingType = ref5[0], setListingType = ref5[1];
  var ref6 = React.useState('');
  var contact = ref6[0], setContact = ref6[1];
  var ref7 = React.useState('');
  var notes = ref7[0], setNotes = ref7[1];
  var ref8 = React.useState(false);
  var submitted = ref8[0], setSubmitted = ref8[1];

  function handleSubmit(e) {
    e.preventDefault();
    var newListing = {
      id: 'm' + Date.now(),
      cardName: cardName,
      setName: setName,
      condition: condition,
      price: parseFloat(price) || 0,
      type: listingType,
      seller: contact || 'Anonymous',
      contact: contact,
      notes: notes,
      image: '',
      createdAt: Date.now()
    };
    updateListings([newListing].concat(listings));
    setSubmitted(true);
    setTimeout(onClose, 1500);
  }

  return h('div', { className: 'modal-overlay', onClick: function(e) { if (e.target === e.currentTarget) onClose(); } },
    h('div', { className: 'modal-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modal-title' },
      h('div', { className: 'modal-header' },
        h('h2', { id: 'modal-title' }, 'List a Card'),
        h('button', { className: 'modal-close', onClick: onClose, 'aria-label': 'Close dialog' }, h(XIcon, null))
      ),
      submitted
        ? h('div', { className: 'modal-body' },
            h('div', { className: 'empty-state', style: { padding: 'var(--space-8)' } },
              h('p', { style: { color: 'var(--color-success)', fontWeight: '600' } }, 'Listing posted successfully!')
            )
          )
        : h('form', { onSubmit: handleSubmit },
            h('div', { className: 'modal-body' },
              h('div', { className: 'form-row' },
                h('div', { className: 'form-group' },
                  h('label', { className: 'form-label' }, 'Card Name'),
                  h('input', {
                    className: 'form-input',
                    value: cardName,
                    onChange: function(e) { setCardName(e.target.value); },
                    required: true,
                    placeholder: 'e.g. Black Lotus'
                  })
                ),
                h('div', { className: 'form-group' },
                  h('label', { className: 'form-label' }, 'Set'),
                  h('input', {
                    className: 'form-input',
                    value: setName,
                    onChange: function(e) { setSetName(e.target.value); },
                    placeholder: 'e.g. Unlimited'
                  })
                )
              ),
              h('div', { className: 'form-row' },
                h('div', { className: 'form-group' },
                  h('label', { className: 'form-label' }, 'Condition'),
                  h('select', { className: 'form-select', value: condition, onChange: function(e) { setCondition(e.target.value); } },
                    ['NM','LP','MP','HP'].map(function(c) { return h('option', { key: c, value: c }, c); })
                  )
                ),
                h('div', { className: 'form-group' },
                  h('label', { className: 'form-label' }, 'Listing Type'),
                  h('select', { className: 'form-select', value: listingType, onChange: function(e) { setListingType(e.target.value); } },
                    h('option', { value: 'sale' }, 'For Sale'),
                    h('option', { value: 'trade' }, 'Trade')
                  )
                )
              ),
              listingType === 'sale' && h('div', { className: 'form-group' },
                h('label', { className: 'form-label' }, 'Price (USD)'),
                h('input', {
                  className: 'form-input',
                  type: 'number',
                  min: '0',
                  step: '0.01',
                  value: price,
                  onChange: function(e) { setPrice(e.target.value); },
                  placeholder: '0.00'
                })
              ),
              h('div', { className: 'form-group' },
                h('label', { className: 'form-label' }, 'Contact (username / phone)'),
                h('input', {
                  className: 'form-input',
                  value: contact,
                  onChange: function(e) { setContact(e.target.value); },
                  placeholder: '@yourusername or (671) 555-0000'
                })
              ),
              h('div', { className: 'form-group' },
                h('label', { className: 'form-label' }, 'Notes'),
                h('textarea', {
                  className: 'form-textarea',
                  value: notes,
                  onChange: function(e) { setNotes(e.target.value); },
                  placeholder: 'Condition details, pickup location, etc.'
                })
              )
            ),
            h('div', { className: 'modal-footer' },
              h('button', { type: 'button', className: 'btn btn-ghost', onClick: onClose }, 'Cancel'),
              h('button', { type: 'submit', className: 'btn btn-primary' }, 'Post Listing')
            )
          )
    )
  );
}
