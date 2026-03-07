/* BuyLocalModal.js */
import React from 'react';
import { XIcon, MapPinIcon } from './shared/Icons.js';
import { formatUSD } from '../utils/helpers.js';
import { GUAM_STORES_SIMPLE } from '../utils/stores.js';
var h = React.createElement;

export function BuyLocalModal({ card, listings, updateCart, onClose }) {
  var ref1 = React.useState(null);
  var selectedStore = ref1[0], setSelectedStore = ref1[1];
  var ref2 = React.useState(false);
  var confirmed = ref2[0], setConfirmed = ref2[1];

  var cardListings = listings
    ? listings.filter(function(l) { return l.cardName === card.name && l.type === 'sale'; })
    : [];

  function handleConfirm() {
    if (!selectedStore) return;
    var price = card.prices && card.prices.usd ? parseFloat(card.prices.usd) : 0;
    updateCart(function(prev) {
      var existing = prev.find(function(i) { return i.id === card.id; });
      if (existing) {
        return prev.map(function(i) {
          return i.id === card.id ? Object.assign({}, i, { qty: (i.qty || 1) + 1 }) : i;
        });
      }
      return prev.concat([{
        id: card.id,
        name: card.name,
        set: card.set_name || '',
        price: price,
        qty: 1,
        image: '',
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
        : h('div', { className: 'modal-body' },
            h('p', { style: { fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' } },
              'Select a local Guam store to pick up ', h('strong', null, card.name), '.'
            ),
            cardListings.length > 0 && h('div', { style: { marginBottom: 'var(--space-4)' } },
              h('p', { style: { fontSize: 'var(--text-xs)', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' } }, 'Community Listings'),
              cardListings.map(function(l) {
                return h('div', {
                  key: l.id,
                  style: {
                    padding: 'var(--space-3)',
                    background: 'var(--color-surface-offset)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-2)',
                    fontSize: 'var(--text-xs)',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }
                },
                  h('span', null, l.seller, ' — ', l.condition),
                  h('span', { style: { color: 'var(--color-primary)', fontWeight: '700' } }, formatUSD(l.price))
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
                    h('div', { style: { fontSize: 'var(--text-xs)', opacity: 0.8 } }, store.address, ' • ', store.hours)
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
                disabled: !selectedStore
              }, 'Confirm Pickup')
            )
          )
    )
  );
}
