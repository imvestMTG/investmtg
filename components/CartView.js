/* CartView.js — Cart with JustTCG condition pricing & interactive elements */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { getJustTCGPricing } from '../utils/justtcg-api.js';
import { TrashIcon, MapPinIcon, TruckIcon, ChevronRightIcon } from './shared/Icons.js';
import { GUAM_GRT_RATE, CART_MAX_QUANTITY } from '../utils/config.js';
import { groupBySeller } from '../utils/group-by-seller.js';
var h = React.createElement;

/* ConditionChip — interactive React component with hover pop effect */
function ConditionChip(_ref) {
  var abbr = _ref.abbr;
  var fullLabel = _ref.fullLabel;
  var price = _ref.price;
  var isSelected = _ref.isSelected;
  var onSelect = _ref.onSelect;

  var ref = React.useState(false);
  var hovered = ref[0], setHovered = ref[1];
  var ref2 = React.useState(false);
  var pressed = ref2[0], setPressed = ref2[1];

  /* Condition-specific accent colors */
  var condColor = abbr === 'NM'  ? '#22c55e' :
                  abbr === 'LP'  ? '#3b82f6' :
                  abbr === 'MP'  ? '#f59e0b' :
                  abbr === 'HP'  ? '#f97316' :
                  abbr === 'DMG' ? '#ef4444' : '#888';

  /* Build inline style for hover/press micro-interactions */
  var chipStyle = {};
  if (isSelected) {
    chipStyle.background = condColor;
    chipStyle.borderColor = condColor;
    chipStyle.color = '#fff';
    chipStyle.boxShadow = '0 0 0 2px ' + condColor + '40';
    if (hovered) {
      chipStyle.transform = 'scale(1.08)';
      chipStyle.boxShadow = '0 4px 12px ' + condColor + '50, 0 0 0 2px ' + condColor + '40';
    }
    if (pressed) {
      chipStyle.transform = 'scale(0.97)';
    }
  } else if (hovered) {
    chipStyle.transform = 'translateY(-2px) scale(1.06)';
    chipStyle.borderColor = condColor + '80';
    chipStyle.color = condColor;
    chipStyle.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
    chipStyle.background = condColor + '15';
    if (pressed) {
      chipStyle.transform = 'scale(0.97)';
      chipStyle.boxShadow = '0 1px 3px rgba(0,0,0,0.15)';
    }
  }

  return h('button', {
    className: 'cart-cond-chip' + (isSelected ? ' cart-cond-chip--active' : ''),
    style: chipStyle,
    onClick: onSelect,
    onMouseEnter: function() { setHovered(true); },
    onMouseLeave: function() { setHovered(false); setPressed(false); },
    onMouseDown: function() { setPressed(true); },
    onMouseUp: function() { setPressed(false); },
    'aria-label': 'Select ' + fullLabel + ' condition at ' + formatUSD(price),
    'aria-pressed': isSelected ? 'true' : 'false',
    title: fullLabel + ' — ' + formatUSD(price)
  },
    h('span', { className: 'cond-chip-abbr' }, abbr),
    h('span', { className: 'cond-chip-price' }, formatUSD(price))
  );
}

export function CartView(props) {
  var state = props.state;
  var updateCart = props.updateCart;
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
  var tax = subtotal * GUAM_GRT_RATE;
  var total = subtotal + tax;

  var sellerGroups = groupBySeller(cart);

  function updateQty(id, qty) {
    if (qty < 1) {
      updateCart(cart.filter(function(item) { return item.id !== id; }));
    } else if (qty > CART_MAX_QUANTITY) {
      return;
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

                  /* JustTCG condition breakdown — interactive ConditionChip components */
                  jtcg && jtcg.conditionPrices && Object.keys(jtcg.conditionPrices).length > 0
                    ? h('div', { className: 'cart-condition-row' },
                        h('span', { className: 'cart-condition-label' }, 'Condition:'),
                        /* Order: HP, MP, LP, NM, DMG (damaged last) */
                        (function() {
                          var condOrder = ['Damaged', 'Heavily Played', 'Moderately Played', 'Lightly Played', 'Near Mint'];
                          var entries = Object.entries(jtcg.conditionPrices);
                          entries.sort(function(a, b) {
                            var ai = condOrder.indexOf(a[0]); if (ai < 0) ai = 99;
                            var bi = condOrder.indexOf(b[0]); if (bi < 0) bi = 99;
                            return ai - bi;
                          });
                          return entries;
                        })().slice(0, 5).map(function(entry) {
                          var condLabel = entry[0];
                          var condPrice = entry[1];
                          var abbr = condLabel === 'Near Mint' ? 'NM' :
                                     condLabel === 'Lightly Played' ? 'LP' :
                                     condLabel === 'Moderately Played' ? 'MP' :
                                     condLabel === 'Heavily Played' ? 'HP' :
                                     condLabel === 'Damaged' ? 'DMG' : condLabel;
                          var isSelected = (item.condition || '').toUpperCase() === abbr ||
                                           (item.condition || '') === condLabel;
                          return h(ConditionChip, {
                            key: condLabel,
                            abbr: abbr,
                            fullLabel: condLabel,
                            price: condPrice,
                            isSelected: isSelected,
                            onSelect: function() {
                              updateCart(cart.map(function(ci) {
                                if (ci.id !== item.id) return ci;
                                return Object.assign({}, ci, {
                                  condition: abbr,
                                  price: condPrice
                                });
                              }));
                            }
                          });
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
                    'aria-label': 'Increase quantity',
                    disabled: (item.qty || 1) >= CART_MAX_QUANTITY
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
