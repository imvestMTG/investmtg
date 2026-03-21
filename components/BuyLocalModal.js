/* BuyLocalModal.js */
import React from 'react';
import { XIcon, MapPinIcon } from './shared/Icons.js';
import { formatUSD } from '../utils/helpers.js';
import { GUAM_STORES_SIMPLE } from '../utils/stores.js';
var h = React.createElement;

export function BuyLocalModal(props) {
  var card = props.card;
  var listings = props.listings;
  var updateCart = props.updateCart;
  var onClose = props.onClose;
  var ref1 = React.useState(null);
  var selectedStore = ref1[0], setSelectedStore = ref1[1];
  var ref2 = React.useState(false);
  var confirmed = ref2[0], setConfirmed = ref2[1];

  var cardListings = listings
    ? listings.filter(function(l) { return l.cardName === card.name && l.type === 'sale'; })
    : [];

  /* Require selecting a real listing with a seller */
  var ref3 = React.useState(null);
  var selectedListing = ref3[0], setSelectedListing = ref3[1];

  function handleConfirm() {
    if (!selectedStore) return;
    if (!selectedListing) return;
    updateCart(function(prev) {
      var cartId = selectedListing.id;
      var existing = prev.find(function(i) { return i.id === cartId; });
      if (existing) {
        return prev.map(function(i) {
          return i.id === cartId ? Object.assign({}, i, { qty: (i.qty || 1) + 1 }) : i;
        });
      }
      return prev.concat([{
        id: cartId,
        name: selectedListing.cardName || card.name,
        set: selectedListing.setName || card.set_name || '',
        condition: selectedListing.condition,
        finish: selectedListing.finish || 'nonfoil',
        language: selectedListing.language || 'English',
        price: selectedListing.price,
        seller: selectedListing.seller,
        image: selectedListing.image || '',
        qty: 1,
        store: selectedStore.name
      }]);
    });
    setConfirmed(true);
    setTimeout(onClose, 1800);
  }

  return h('div', { className: 'modal-overlay', onClick: function(e) { if (e.target === e.currentTarget) onClose(); } },
    h('div', { className: 'modal-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'buy-modal-title' },
      h('div', { className: 'modal-header' },
        h('h2', { id: 'buy-modal-title' }, 'Buy Local'),
        h('button', { className: 'modal-close', onClick: onClose, 'aria-label': 'Close' }, h(XIcon, null))
      ),
      confirmed
        ? h('div', { className: 'modal-body' },
            h('div', { className: 'empty-state', style: { padding: 'var(--space-8)' } },
              h('p', { style: { color: 'var(--color-success)', fontWeight: '600' } },
                'Added to cart! Visit ', selectedStore.name, ' to pick up.'
              )
            )
          )
        : cardListings.length === 0
          ? h('div', { className: 'modal-body' },
              h('div', { className: 'empty-state', style: { padding: 'var(--space-8)' } },
                h('p', { style: { fontWeight: '600', marginBottom: 'var(--space-2)' } },
                  'No sellers have listed ', h('strong', null, card.name), ' yet.'
                ),
                h('p', { style: { fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' } },
                  'Cards can only be purchased from community sellers with active listings.'
                ),
                h('a', { href: '#seller', className: 'btn btn-primary', onClick: onClose }, 'List This Card for Sale')
              )
            )
          : h('div', { className: 'modal-body' },
              h('p', { style: { fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' } },
                'Select a listing and a store to pick up ', h('strong', null, card.name), '.'
              ),
              h('p', { style: { fontSize: 'var(--text-xs)', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' } }, 'Choose a Listing'),
              h('div', { style: { marginBottom: 'var(--space-4)' } },
                cardListings.map(function(l) {
                  var isListingSel = selectedListing && selectedListing.id === l.id;
                  return h('button', {
                    key: l.id,
                    className: 'btn ' + (isListingSel ? 'btn-primary' : 'btn-secondary'),
                    style: {
                      width: '100%',
                      padding: 'var(--space-3)',
                      marginBottom: 'var(--space-2)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    },
                    onClick: function() { setSelectedListing(l); }
                  },
                    h('span', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' } },
                      l.seller, ' \u2014 ', l.condition,
                      l.finish && l.finish !== 'nonfoil' && h('span', { className: 'finish-badge finish-' + l.finish }, l.finish === 'foil' ? '\u2728 Foil' : '\u25C6 Etched'),
                      l.language && l.language !== 'English' && h('span', { className: 'language-badge' }, l.language)
                    ),
                    h('span', { style: { fontWeight: '700' } }, formatUSD(l.price))
                  );
                })
              ),
              h('p', { style: { fontSize: 'var(--text-xs)', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' } }, 'Choose a Store'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' } },
                GUAM_STORES_SIMPLE.map(function(store) {
                  var isSelected = selectedStore && selectedStore.id === store.id;
                  return h('button', {
                    key: store.id,
                    className: 'btn ' + (isSelected ? 'btn-primary' : 'btn-secondary'),
                    style: { justifyContent: 'flex-start', gap: 'var(--space-3)' },
                    onClick: function() { setSelectedStore(store); }
                  },
                    h(MapPinIcon, null),
                    h('div', { style: { textAlign: 'left' } },
                      h('div', { style: { fontWeight: '600' } }, store.name),
                      h('div', { style: { fontSize: 'var(--text-xs)', opacity: 0.8 } }, store.address, ' \u2022 ', store.hours)
                    )
                  );
                })
              ),
              h('div', { className: 'modal-footer' },
                h('button', { type: 'button', className: 'btn btn-ghost', onClick: onClose }, 'Cancel'),
                h('button', {
                  type: 'button',
                  className: 'btn btn-primary',
                  onClick: handleConfirm,
                  disabled: !selectedStore || !selectedListing
                }, 'Confirm Pickup')
              )
            )
    )
  );
}
