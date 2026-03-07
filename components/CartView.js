/* CartView.js — Cart with JustTCG condition pricing & interactive elements */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { getJustTCGPricing } from '../utils/justtcg-api.js';
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
  var ref1 = React.useState({});
  var jtcgPrices = ref1[0], setJtcgPrices = ref1[1];
  var ref2 = React.useState(false);
  var jtcgLoading = ref2[0], setJtcgLoading = ref2[1];

  // Fetch JustTCG condition prices for cart items that have tcgplayerId
  React.useEffect(function() {
    if (cart.length === 0) return;
    var itemsWithTcg = cart.filter(function(item) { return item.tcgplayerId; });
    if (itemsWithTcg.length === 0) return;

    setJtcgLoading(true);
    var fetches = itemsWithTcg.map(function(item) {
      return getJustTCGPricing(item.tcgplayerId, { historyDuration: '7d' })
        .then(function(data) {
          if (data) {
            setJtcgPrices(function(prev) {
              var next = Object.assign({}, prev);
              next[item.id] = data;
              return next;
            });
          }
        })
        .catch(function() {});
    });

    Promise.all(fetches).then(function() {
      setJtcgLoading(false);
    });
  }, [cart.length]);

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
              var jtcg = jtcgPrices[item.id];
              return h('div', { key: item.id, className: 'cart-item' },
                h('a', {
                  className: 'cart-item-image',
                  href: '#card/' + item.id,
                  'aria-label': 'View ' + item.name + ' details'
                },
                  item.image
                    ? h('img', { src: item.image, alt: item.name, loading: 'lazy' })
                    : h('div', { className: 'cart-item-img-placeholder' }, '\uD83C\uDCCF')
                ),
                h('div', { className: 'cart-item-details' },
                  /* Card name — clickable, links to card detail */
                  h('a', {
                    className: 'cart-item-name cart-item-link',
                    href: '#card/' + item.id
                  }, item.name),

                  h('div', { className: 'cart-item-meta' },
                    /* Set name — clickable, links to set search */
                    item.set && h('a', {
                      className: 'cart-item-set cart-item-link',
                      href: '#search',
                      onClick: function(e) {
                        e.preventDefault();
                        window.location.hash = 'search';
                        setTimeout(function() {
                          var setQuery = item.setCode ? 'e:' + item.setCode : item.set;
                          var ev = new CustomEvent('investmtg-search', { detail: setQuery });
                          window.dispatchEvent(ev);
                        }, 50);
                      }
                    }, item.set),
                    item.condition && h('span', {
                      className: 'cart-item-cond-badge cond-' + (item.condition || '').toLowerCase()
                    }, item.condition)
                  ),

                  h('div', { className: 'cart-item-unit-price' }, formatUSD(item.price || 0), ' each'),

                  /* JustTCG condition breakdown — clickable to select condition & price */
                  jtcg && jtcg.conditionPrices && Object.keys(jtcg.conditionPrices).length > 0
                    ? h('div', { className: 'cart-condition-row' },
                        Object.entries(jtcg.conditionPrices).slice(0, 5).map(function(entry) {
                          var condLabel = entry[0];
                          var condPrice = entry[1];
                          var abbr = condLabel === 'Near Mint' ? 'NM' :
                                     condLabel === 'Lightly Played' ? 'LP' :
                                     condLabel === 'Moderately Played' ? 'MP' :
                                     condLabel === 'Heavily Played' ? 'HP' :
                                     condLabel === 'Damaged' ? 'DMG' : condLabel;
                          var isSelected = (item.condition || '').toUpperCase() === abbr ||
                                           (item.condition || '') === condLabel;
                          return h('button', {
                            key: condLabel,
                            className: 'cart-cond-chip' + (isSelected ? ' cart-cond-chip--active' : ''),
                            onClick: function() {
                              updateCart(cart.map(function(ci) {
                                if (ci.id !== item.id) return ci;
                                return Object.assign({}, ci, {
                                  condition: abbr,
                                  price: condPrice
                                });
                              }));
                            },
                            'aria-label': 'Select ' + condLabel + ' condition at ' + formatUSD(condPrice),
                            title: condLabel
                          }, abbr + ' ' + formatUSD(condPrice));
                        })
                      )
                    : null
                ),
                h('div', { className: 'cart-item-controls' },
                  h('button', {
                    className: 'qty-btn',
                    onClick: function() { updateQty(item.id, (item.qty || 1) - 1); },
                    'aria-label': 'Decrease quantity'
                  }, '\u2212'),
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

        jtcgLoading
          ? h('div', { className: 'cart-jtcg-note loading' },
              'Fetching condition prices...'
            )
          : Object.keys(jtcgPrices).length > 0
            ? h('div', { className: 'cart-jtcg-note' },
                'Condition prices from ',
                h('a', { href: 'https://justtcg.com', target: '_blank', rel: 'noopener noreferrer' }, 'JustTCG')
              )
            : null,

        h('div', { className: 'cart-fulfillment-preview' },
          h('div', { className: 'cart-fulfillment-row' },
            h(MapPinIcon, null),
            h('span', null, 'Local Pickup \u2014 Free')
          ),
          h('div', { className: 'cart-fulfillment-row' },
            h(TruckIcon, null),
            h('span', null, 'Ship to Guam \u2014 $5 flat')
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
