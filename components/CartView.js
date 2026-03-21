/* CartView.js — Cart with JustTCG condition pricing & interactive condition selector */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { getJustTCGPricing } from '../utils/justtcg-api.js';
import { TrashIcon, MapPinIcon, TruckIcon, ChevronRightIcon } from './shared/Icons.js';
import { CART_MAX_QUANTITY } from '../utils/config.js';
import { groupBySeller } from '../utils/group-by-seller.js';
import { EmptyState } from './shared/EmptyState.js';
var h = React.createElement;

/* LockIcon — small inline SVG for trust badges */
function LockIcon() {
  return h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true', className: 'u-flex-shrink-0' },
    h('rect', { x: 5, y: 11, width: 14, height: 10, rx: 2, stroke: 'currentColor', strokeWidth: 2 }),
    h('path', { d: 'M8 11V7a4 4 0 018 0v4', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' })
  );
}

/* ShieldIcon — small inline SVG for buyer protection */
function ShieldIcon() {
  return h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'truclassName: 'u-flex-shrink-0' 0 } },
    h('path', { d: 'M12 2l8 4v6c0 5.25-3.38 10.13-8 12-4.62-1.87-8-6.75-8-12V6l8-4z', stroke: 'currentColor', strokeWidth: 2, strokeLinejoin: 'round' }),
    h('path', { d: 'M9 12l2 2 4-4', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
  );
}

/* CardPayIcon — small inline SVG for accepted cards */
function CardPayIcon() {
  return h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': className: 'u-flex-shrink-0'ink: 0 } },
    h('rect', { x: 2, y: 5, width: 20, height: 14, rx: 2, stroke: 'currentColor', strokeWidth: 2 }),
    h('path', { d: 'M2 10h20', stroke: 'currentColor', strokeWidth: 2 })
  );
}

/* ConditionChip — card-style button for selecting card condition */
function ConditionChip(_ref) {
  var abbr = _ref.abbr;
  var fullLabel = _ref.fullLabel;
  var price = _ref.price;
  var isSelected = _ref.isSelected;
  var onSelect = _ref.onSelect;
  var savings = _ref.savings;

  /* Condition-specific accent colors */
  var condColor = abbr === 'NM'  ? '#22c55e' :
                  abbr === 'LP'  ? '#3b82f6' :
                  abbr === 'MP'  ? '#f59e0b' :
                  abbr === 'HP'  ? '#f97316' :
                  abbr === 'DMG' ? '#ef4444' : '#888';

  var cardStyle = {};
  if (isSelected) {
    cardStyle.borderColor = condColor;
    cardStyle.boxShadow = '0 0 0 2px ' + condColor + '40';
  }

  var dotStyle = { background: condColor };

  return h('button', {
    className: 'cart-cond-card' + (isSelected ? ' cart-cond-card--active' : ''),
    style: cardStyle,
    onClick: onSelect,
    type: 'button',
    'aria-label': 'Select ' + fullLabel + ' condition at ' + formatUSD(price),
    'aria-pressed': isSelected ? 'true' : 'false',
    title: fullLabel + ' — ' + formatUSD(price)
  },
    h('span', { className: 'cond-card-dot', style: dotStyle }),
    h('span', { className: 'cond-card-label' },
      h('span', { className: 'cond-card-abbr' }, abbr),
      h('span', { className: 'cond-card-full' }, fullLabel)
    ),
    h('span', { className: 'cond-card-price' }, formatUSD(price)),
    savings > 0 ? h('span', { className: 'cond-card-save' }, 'Save ' + formatUSD(savings)) : null
  );
}

/* WarningIcon — small inline SVG for alerts */
function WarningIcon() {
  return h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hiddeclassName: 'u-flex-shrink-0'xShrink: 0 } },
    h('path', { d: 'M8 1.5L1 14h14L8 1.5z', stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round', fill: 'none' }),
    h('path', { d: 'M8 6v3.5', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
    h('circle', { cx: 8, cy: 12, r: 0.75, fill: 'currentColor' })
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

  /* Stable key: re-fetch only when the set of cart tcgplayerIds changes */
  var cartTcgKey = cart
    .filter(function(item) { return item.tcgplayerId; })
    .map(function(item) { return item.tcgplayerId; })
    .sort()
    .join(',');

  /* Fetch JustTCG condition prices for cart items that have tcgplayerId */
  React.useEffect(function() {
    if (!cartTcgKey) return;
    var itemsWithTcg = cart.filter(function(item) { return item.tcgplayerId; });

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
        .catch(function(err) { console.warn('[Cart] condition price fetch failed:', err); });
    });

    Promise.all(fetches).then(function() {
      setJtcgLoading(false);
    }).catch(function() {
      setJtcgLoading(false);
    });
  }, [cartTcgKey]);

  var subtotal = cart.reduce(function(sum, item) { return sum + (item.price || 0) * (item.qty || 1); }, 0);

  var sellerGroups = groupBySeller(cart);

  /* Check if any items are missing a condition selection */
  var itemsMissingCondition = cart.filter(function(item) {
    return !item.condition && jtcgPrices[item.id] && jtcgPrices[item.id].conditionPrices && Object.keys(jtcgPrices[item.id].conditionPrices).length > 0;
  });
  var allConditionsChosen = itemsMissingCondition.length === 0 && !jtcgLoading;

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
    return h('main', { className: 'container cart-page', role: 'main' },
      h('h1', { className: 'page-heading' }, 'Your Cart'),
      h(EmptyState, {
        icon: '\uD83D\uDED2',
        title: 'Your cart is empty',
        message: 'Search for cards and add them to your cart.',
        onAction: function() { window.location.hash = 'search'; },
        actionLabel: 'Browse Cards'
      })
    );
  }

  return h('main', { className: 'container cart-page', role: 'main' },
    h('div', { className: 'cart-page-header' },
      h('h1', { className: 'page-heading' }, 'Your Cart'),
      h('button', {
        className: 'btn btn-secondary btn-sm cart-clear-btn',
        type: 'button',
        onClick: clearCart
      }, 'Clear Cart')
    ),

    h('div', { className: 'cart-grid' },
      h('div', { className: 'cart-items' },

        /* Group items by seller */
        Object.keys(sellerGroups).map(function(seller) {
          var items = sellerGroups[seller];
          return h('div', { key: seller, className: 'cart-seller-group' },
            h('div', { className: 'cart-seller-header' },
              h('span', { className: 'cart-seller-label' }, 'From: ' + seller)
            ),
            items.map(function(item) {
              var jtcg = jtcgPrices[item.id];
              var hasConditions = jtcg && jtcg.conditionPrices && Object.keys(jtcg.conditionPrices).length > 0;
              var needsCondition = hasConditions && !item.condition;

              return h('div', { key: item.id, className: 'cart-item' + (needsCondition ? ' cart-item--needs-condition' : '') },

                /* Top row: image + info + qty + price + remove */
                h('div', { className: 'cart-item-top' },
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
                    h('a', {
                      className: 'cart-item-name cart-item-link',
                      href: '#card/' + item.id
                    }, item.name),
                    h('div', { className: 'cart-item-meta' },
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
                      }, item.condition),
                      item.finish && item.finish !== 'nonfoil' && h('span', {
                        className: 'finish-badge finish-' + item.finish
                      }, item.finish === 'foil' ? '\u2728 Foil' : '\u25C6 Etched'),
                      item.language && item.language !== 'English' && h('span', {
                        className: 'language-badge'
                      }, item.language)
                    ),
                    h('div', { className: 'cart-item-unit-price' }, formatUSD(item.price || 0), ' each')
                  ),
                  h('div', { className: 'cart-item-controls' },
                    h('button', {
                      className: 'qty-btn',
                      type: 'button',
                      onClick: function() { updateQty(item.id, (item.qty || 1) - 1); },
                      'aria-label': 'Decrease quantity'
                    }, '\u2212'),
                    h('span', { className: 'qty-value' }, item.qty || 1),
                    h('button', {
                      className: 'qty-btn',
                      type: 'button',
                      onClick: function() { updateQty(item.id, (item.qty || 1) + 1); },
                      'aria-label': 'Increase quantity',
                      disabled: (item.qty || 1) >= CART_MAX_QUANTITY
                    }, '+')
                  ),
                  h('div', { className: 'cart-item-price' }, formatUSD((item.price || 0) * (item.qty || 1))),
                  h('button', {
                    className: 'cart-item-remove icon-btn',
                    type: 'button',
                    onClick: function() { removeItem(item.id); },
                    'aria-label': 'Remove ' + item.name
                  }, h(TrashIcon, null))
                ),

                /* Condition selector section — full-width below the item row */
                hasConditions
                  ? h('div', { className: 'cart-condition-section' + (needsCondition ? ' cart-condition-section--alert' : '') },
                      h('div', { className: 'cart-condition-header' },
                        needsCondition
                          ? h('span', { className: 'cart-condition-prompt' },
                              h(WarningIcon, null),
                              'Select a condition to continue'
                            )
                          : h('span', { className: 'cart-condition-chosen' },
                              'Condition: ',
                              h('strong', null, item.condition)
                            )
                      ),
                      h('div', { className: 'cart-condition-chips' },
                        (function() {
                          var condOrder = ['Damaged', 'Heavily Played', 'Moderately Played', 'Lightly Played', 'Near Mint'];
                          var entries = Object.entries(jtcg.conditionPrices);
                          entries.sort(function(a, b) {
                            var ai = condOrder.indexOf(a[0]); if (ai < 0) ai = 99;
                            var bi = condOrder.indexOf(b[0]); if (bi < 0) bi = 99;
                            return ai - bi;
                          });
                          /* Find NM price for savings calculation */
                          var nmPrice = jtcg.conditionPrices['Near Mint'] || 0;
                          return entries;
                        })().map(function(entry) {
                          var condLabel = entry[0];
                          var condPrice = entry[1];
                          var nmPrice = jtcg.conditionPrices['Near Mint'] || 0;
                          var abbr = condLabel === 'Near Mint' ? 'NM' :
                                     condLabel === 'Lightly Played' ? 'LP' :
                                     condLabel === 'Moderately Played' ? 'MP' :
                                     condLabel === 'Heavily Played' ? 'HP' :
                                     condLabel === 'Damaged' ? 'DMG' : condLabel;
                          var isSelected = (item.condition || '').toUpperCase() === abbr ||
                                           (item.condition || '') === condLabel;
                          var savings = nmPrice > 0 && condPrice < nmPrice ? nmPrice - condPrice : 0;
                          return h(ConditionChip, {
                            key: condLabel,
                            abbr: abbr,
                            fullLabel: condLabel,
                            price: condPrice,
                            isSelected: isSelected,
                            savings: savings,
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
                    )
                  : null
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
        h('div', { className: 'summary-row shipping-estimate' },
          h('span', null, 'Shipping'),
          h('span', { style: { color: 'var(--color-text-muted)' } }, 'Calc at checkout')
        ),
        h('div', { className: 'summary-row total' },
          h('span', null, 'Subtotal'), h('span', null, formatUSD(subtotal))
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

        /* Checkout gate message */
        jtcgLoading
          ? h('div', { className: 'cart-checkout-blocked cart-checkout-blocked--loading' },
              h('span', null, 'Loading condition prices\u2026')
            )
          : itemsMissingCondition.length > 0
            ? h('div', { className: 'cart-checkout-blocked' },
                h(WarningIcon, null),
                h('span', null, itemsMissingCondition.length === 1
                  ? 'Select a condition for 1 item before checkout'
                  : 'Select conditions for ' + itemsMissingCondition.length + ' items before checkout'
                )
              )
            : null,

        /* Checkout button — disabled if conditions not selected or still loading */
        h('a', {
          href: allConditionsChosen ? '#checkout' : undefined,
          className: 'btn btn-primary btn-lg cart-checkout-btn' + (!allConditionsChosen ? ' cart-checkout-btn--disabled' : ''),
          onClick: function(e) {
            if (!allConditionsChosen) {
              e.preventDefault();
              /* Scroll to the first item missing a condition */
              var el = document.querySelector('.cart-item--needs-condition');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          },
          'aria-disabled': !allConditionsChosen ? 'true' : undefined
        },
          'Proceed to Checkout ', h(ChevronRightIcon, null)
        ),

        h('a', { href: '#store', className: 'btn btn-secondary cart-continue-btn' },
          'Continue Shopping'
        ),

        /* Trust & security badges (v32) */
        h('div', { className: 'cart-trust-badges' },
          h('div', { className: 'cart-trust-row' },
            h(LockIcon, null),
            h('span', null, 'Secure checkout via SumUp')
          ),
          h('div', { className: 'cart-trust-row' },
            h(ShieldIcon, null),
            h('span', null, 'Buyer protection on all orders')
          ),
          h('div', { className: 'cart-trust-row' },
            h(CardPayIcon, null),
            h('span', null, 'Visa, Mastercard, Amex, Discover')
          )
        ),

        /* Package count (v32) */
        h('div', { className: 'cart-packages-info' },
          h(TruckIcon, null),
          h('span', null,
            Object.keys(sellerGroups).length === 1
              ? '1 package'
              : Object.keys(sellerGroups).length + ' packages (from ' + Object.keys(sellerGroups).length + ' sellers)'
          )
        ),

        h('div', { className: 'cart-local-pickup-note' },
          h(MapPinIcon, null),
          h('span', null, 'All orders fulfilled through Guam local sellers.')
        )
      )
    )
  );
}
