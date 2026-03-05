/* CartView.js */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { TrashIcon, MapPinIcon } from './shared/Icons.js';
var h = React.createElement;

export function CartView({ state, updateCart }) {
  var cart = state.cart;

  var subtotal = cart.reduce(function(sum, item) { return sum + (item.price || 0) * (item.qty || 1); }, 0);
  var tax = subtotal * 0.04;
  var total = subtotal + tax;

  function updateQty(id, qty) {
    if (qty < 1) {
      updateCart(cart.filter(function(item) { return item.id !== id; }));
    } else {
      updateCart(cart.map(function(item) {
        return item.id === id ? Object.assign({}, item, { qty: qty }) : item;
      }));
    }
  }

  function removeItem(id) {
    updateCart(cart.filter(function(item) { return item.id !== id; }));
  }

  if (cart.length === 0) {
    return h('div', { className: 'container cart-page' },
      h('h1', { className: 'page-heading' }, 'Your Cart'),
      h('div', { className: 'empty-state' },
        h('h3', null, 'Your cart is empty'),
        h('p', null, 'Search for cards and add them to your cart.'),
        h('a', { href: '#search', className: 'btn btn-primary' }, 'Browse Cards')
      )
    );
  }

  return h('div', { className: 'container cart-page' },
    h('h1', { className: 'page-heading' }, 'Your Cart'),
    h('div', { className: 'cart-grid' },
      h('div', { className: 'cart-items' },
        cart.map(function(item) {
          return h('div', { key: item.id, className: 'cart-item' },
            h('div', { className: 'cart-item-image' },
              item.image && h('img', { src: item.image, alt: item.name, loading: 'lazy' })
            ),
            h('div', { className: 'cart-item-details' },
              h('div', { className: 'cart-item-name' }, item.name),
              h('div', { className: 'cart-item-set' }, item.set)
            ),
            h('div', { className: 'cart-item-controls' },
              h('button', { className: 'qty-btn', onClick: function() { updateQty(item.id, (item.qty || 1) - 1); }, 'aria-label': 'Decrease quantity' }, '−'),
              h('span', { className: 'qty-value' }, item.qty || 1),
              h('button', { className: 'qty-btn', onClick: function() { updateQty(item.id, (item.qty || 1) + 1); }, 'aria-label': 'Increase quantity' }, '+')
            ),
            h('div', { className: 'cart-item-price' }, formatUSD((item.price || 0) * (item.qty || 1))),
            h('button', {
              className: 'cart-item-remove icon-btn',
              onClick: function() { removeItem(item.id); },
              'aria-label': 'Remove ' + item.name
            }, h(TrashIcon, null))
          );
        })
      ),
      h('div', { className: 'order-summary' },
        h('h3', null, 'Order Summary'),
        h('div', { className: 'summary-row' },
          h('span', null, 'Subtotal'), h('span', null, formatUSD(subtotal))
        ),
        h('div', { className: 'summary-row' },
          h('span', null, 'Guam GRT (4%)'), h('span', null, formatUSD(tax))
        ),
        h('div', { className: 'summary-row total' },
          h('span', null, 'Total'), h('span', null, formatUSD(total))
        ),
        h('div', { className: 'cart-local-pickup-note' },
          h(MapPinIcon, null),
          h('span', null, 'Online checkout coming soon. Visit a local Guam store for pickup.')
        )
      )
    )
  );
}
