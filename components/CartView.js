/* CartView.js */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { TrashIcon, MapPinIcon, TruckIcon, ChevronRightIcon } from './shared/Icons.js';
var h = React.createElement;

function groupBySeller(cart) {
  var groups = {};
  cart.forEach(function(item) {
    var seller = item.seller || 'Unknown Seller';
    if (!groups[seller]) { groups[seller] = []; }
    groups[seller].push(item);
  });
  return groups;
}

export function CartView({ state, updateCart }) {
  var cart = state.cart;

  var subtotal = cart.reduce(function(sum, item) { return sum + (item.price || 0) * (item.qty || 1); }, 0);
  var tax = subtotal * 0.04;
  var total = subtotal + tax;

  var sellerGroups = groupBySeller(cart);

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

  function clearCart() {
    if (window.confirm('Remove all items from cart?')) {
      updateCart([]);
    }
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
    h('div', { className: 'cart-page-header' },
      h('h1', { className: 'page-heading' }, 'Your Cart'),
      h('button', {
        className: 'btn btn-secondary btn-sm cart-clear-btn',
        onClick: clearCart
      }, 'Clear Cart')
    ),

    h('div', { className: 'cart-grid' },
      h('div', { className: 'cart-items' },

        // Group items by seller
        Object.keys(sellerGroups).map(function(seller) {
          var items = sellerGroups[seller];
          return h('div', { key: seller, className: 'cart-seller-group' },
            h('div', { className: 'cart-seller-header' },
              h('span', { className: 'cart-seller-label' }, 'From: ' + seller)
            ),
            items.map(function(item) {
              return h('div', { key: item.id, className: 'cart-item' },
                h('div', { className: 'cart-item-image' },
                  item.image
                    ? h('img', { src: item.image, alt: item.name, loading: 'lazy' })
                    : h('div', { className: 'cart-item-img-placeholder' }, '🃏')
                ),
                h('div', { className: 'cart-item-details' },
                  h('div', { className: 'cart-item-name' }, item.name),
                  h('div', { className: 'cart-item-meta' },
                    item.set && h('span', { className: 'cart-item-set' }, item.set),
                    item.condition && h('span', { className: 'cart-item-cond-badge cond-' + (item.condition || '').toLowerCase() }, item.condition)
                  ),
                  h('div', { className: 'cart-item-unit-price' }, formatUSD(item.price || 0), ' each')
                ),
                h('div', { className: 'cart-item-controls' },
                  h('button', {
                    className: 'qty-btn',
                    onClick: function() { updateQty(item.id, (item.qty || 1) - 1); },
                    'aria-label': 'Decrease quantity'
                  }, '−'),
                  h('span', { className: 'qty-value' }, item.qty || 1),
                  h('button', {
                    className: 'qty-btn',
                    onClick: function() { updateQty(item.id, (item.qty || 1) + 1); },
                    'aria-label': 'Increase quantity'
                  }, '+')
                ),
                h('div', { className: 'cart-item-price' }, formatUSD((item.price || 0) * (item.qty || 1))),
                h('button', {
                  className: 'cart-item-remove icon-btn',
                  onClick: function() { removeItem(item.id); },
                  'aria-label': 'Remove ' + item.name
                }, h(TrashIcon, null))
              );
            })
          );
        })
      ),

      h('div', { className: 'order-summary' },
        h('h3', null, 'Order Summary'),
        h('div', { className: 'summary-row' },
          h('span', null, cart.length + ' item' + (cart.length !== 1 ? 's' : '')),
          h('span', null, formatUSD(subtotal))
        ),
        h('div', { className: 'summary-row' },
          h('span', null, 'Guam GRT (4%)'), h('span', null, formatUSD(tax))
        ),
        h('div', { className: 'summary-row shipping-estimate' },
          h('span', null, 'Shipping'),
          h('span', { style: { color: 'var(--color-text-muted)' } }, 'Calc at checkout')
        ),
        h('div', { className: 'summary-row total' },
          h('span', null, 'Subtotal'), h('span', null, formatUSD(total))
        ),

        // Fulfillment options preview
        h('div', { className: 'cart-fulfillment-preview' },
          h('div', { className: 'cart-fulfillment-row' },
            h(MapPinIcon, null),
            h('span', null, 'Local Pickup — Free')
          ),
          h('div', { className: 'cart-fulfillment-row' },
            h(TruckIcon, null),
            h('span', null, 'Ship to Guam — $5 flat')
          )
        ),

        h('a', {
          href: '#checkout',
          className: 'btn btn-primary btn-lg cart-checkout-btn'
        },
          'Proceed to Checkout ', h(ChevronRightIcon, null)
        ),

        h('a', { href: '#store', className: 'btn btn-secondary cart-continue-btn' },
          'Continue Shopping'
        ),

        h('div', { className: 'cart-local-pickup-note' },
          h(MapPinIcon, null),
          h('span', null, 'All orders fulfilled through Guam local sellers.')
        )
      )
    )
  );
}
