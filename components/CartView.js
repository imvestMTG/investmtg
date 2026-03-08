/* CartView.js — Cart with JustTCG condition pricing & interactive condition selector */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { getJustTCGPricing } from '../utils/justtcg-api.js';
import { TrashIcon, MapPinIcon, TruckIcon, ChevronRightIcon } from './shared/Icons.js';
import { CART_MAX_QUANTITY } from '../utils/config.js';
import { groupBySeller } from '../utils/group-by-seller.js';
var h = React.createElement;

/* ConditionOption — selectable condition button */
function ConditionOption(props) {
  var abbr = props.abbr;
  var fullLabel = props.fullLabel;
  var price = props.price;
  var isSelected = props.isSelected;
  var onSelect = props.onSelect;

  /* Condition accent colors */
  var condColor = abbr === 'NM'  ? '#22c55e' :
                  abbr === 'LP'  ? '#3b82f6' :
                  abbr === 'MP'  ? '#f59e0b' :
                  abbr === 'HP'  ? '#f97316' :
                  abbr === 'DMG' ? '#ef4444' : '#888';

  var style = {};
  if (isSelected) {
    style.borderColor = condColor;
    style.boxShadow = '0 0 0 2px ' + condColor + '40';
    style.background = condColor + '14';
  }

  return h('button', {
    className: 'cond-option' + (isSelected ? ' cond-option--selected' : ''),
    style: style,
    onClick: onSelect,
    type: 'button',
    'aria-label': 'Select ' + fullLabel + ' condition at ' + formatUSD(price),
    'aria-pressed': isSelected ? 'true' : 'false',
    title: fullLabel + ' — ' + formatUSD(price)
  },
    h('span', { className: 'cond-option__dot', style: { background: condColor } }),
    h('span', { className: 'cond-option__abbr' }, abbr),
    h('span', { className: 'cond-option__name' }, fullLabel),
    h('span', { className: 'cond-option__price' }, formatUSD(price))
  );
}

/* WarningIcon — small inline SVG for alerts */
function WarningIcon() {
  return h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true', style: { flexShrink: 0 } },
    h('path', { d: 'M8 1.5L1 14h14L8 1.5z', stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round', fill: 'none' }),
    h('path', { d: 'M8 6v3.5', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
    h('circle', { cx: 8, cy: 12, r: 0.75, fill: 'currentColor' })
  );
}

/* CartItem — single item card with condition selector */
function CartItem(props) {
  var item = props.item;
  var jtcg = props.jtcg;
  var onUpdateQty = props.onUpdateQty;
  var onRemove = props.onRemove;
  var onSelectCondition = props.onSelectCondition;

  var hasConditions = jtcg && jtcg.conditionPrices && Object.keys(jtcg.conditionPrices).length > 0;
  var needsCondition = hasConditions && !item.condition;

  var condOrder = ['Damaged', 'Heavily Played', 'Moderately Played', 'Lightly Played', 'Near Mint'];

  function getAbbr(label) {
    if (label === 'Near Mint') return 'NM';
    if (label === 'Lightly Played') return 'LP';
    if (label === 'Moderately Played') return 'MP';
    if (label === 'Heavily Played') return 'HP';
    if (label === 'Damaged') return 'DMG';
    return label;
  }

  return h('div', { className: 'cart-card' + (needsCondition ? ' cart-card--alert' : '') },

    /* ── Row: thumbnail + details + actions ── */
    h('div', { className: 'cart-card__row' },

      /* Thumbnail */
      h('a', {
        className: 'cart-card__thumb',
        href: '#card/' + item.id,
        'aria-label': 'View ' + item.name + ' details'
      },
        item.image
          ? h('img', { src: item.image, alt: item.name, loading: 'lazy' })
          : h('div', { className: 'cart-card__thumb-empty' }, '\uD83C\uDCCF')
      ),

      /* Info */
      h('div', { className: 'cart-card__info' },
        h('a', { className: 'cart-card__name', href: '#card/' + item.id }, item.name),
        h('div', { className: 'cart-card__meta' },
          item.set && h('span', { className: 'cart-card__set' }, item.set),
          item.condition && h('span', { className: 'cart-card__badge cond-' + (item.condition || '').toLowerCase() }, item.condition)
        ),
        h('span', { className: 'cart-card__unit' }, formatUSD(item.price || 0) + ' each')
      ),

      /* Quantity */
      h('div', { className: 'cart-card__qty' },
        h('button', {
          className: 'cart-card__qty-btn',
          type: 'button',
          onClick: function() { onUpdateQty(item.id, (item.qty || 1) - 1); },
          'aria-label': 'Decrease quantity'
        }, '\u2212'),
        h('span', { className: 'cart-card__qty-val' }, item.qty || 1),
        h('button', {
          className: 'cart-card__qty-btn',
          type: 'button',
          onClick: function() { onUpdateQty(item.id, (item.qty || 1) + 1); },
          'aria-label': 'Increase quantity',
          disabled: (item.qty || 1) >= CART_MAX_QUANTITY
        }, '+')
      ),

      /* Line price */
      h('span', { className: 'cart-card__total' }, formatUSD((item.price || 0) * (item.qty || 1))),

      /* Remove */
      h('button', {
        className: 'cart-card__remove',
        type: 'button',
        onClick: function() { onRemove(item.id); },
        'aria-label': 'Remove ' + item.name
      }, h(TrashIcon, null))
    ),

    /* ── Condition selector ── */
    hasConditions
      ? h('div', { className: 'cart-card__cond' + (needsCondition ? ' cart-card__cond--alert' : '') },
          h('div', { className: 'cart-card__cond-head' },
            needsCondition
              ? h('span', { className: 'cart-card__cond-prompt' },
                  h(WarningIcon, null),
                  ' Select a condition'
                )
              : h('span', { className: 'cart-card__cond-chosen' },
                  'Condition: ',
                  h('strong', null, item.condition)
                )
          ),
          h('div', { className: 'cart-card__cond-grid' },
            (function() {
              var entries = Object.entries(jtcg.conditionPrices);
              entries.sort(function(a, b) {
                var ai = condOrder.indexOf(a[0]); if (ai < 0) ai = 99;
                var bi = condOrder.indexOf(b[0]); if (bi < 0) bi = 99;
                return ai - bi;
              });
              return entries;
            })().map(function(entry) {
              var condLabel = entry[0];
              var condPrice = entry[1];
              var abbr = getAbbr(condLabel);
              var isSelected = (item.condition || '').toUpperCase() === abbr ||
                               (item.condition || '') === condLabel;
              return h(ConditionOption, {
                key: condLabel,
                abbr: abbr,
                fullLabel: condLabel,
                price: condPrice,
                isSelected: isSelected,
                onSelect: function() { onSelectCondition(item.id, abbr, condPrice); }
              });
            })
          )
        )
      : null
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

  /* Fetch JustTCG condition prices for cart items that have tcgplayerId */
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
        .catch(function(err) { console.warn('[Cart] condition price fetch failed:', err); });
    });

    Promise.all(fetches).then(function() {
      setJtcgLoading(false);
    });
  }, [cart.length]);

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

  function selectCondition(id, abbr, condPrice) {
    updateCart(cart.map(function(ci) {
      if (ci.id !== id) return ci;
      return Object.assign({}, ci, { condition: abbr, price: condPrice });
    }));
  }

  function clearCart() {
    if (window.confirm('Remove all items from cart?')) {
      updateCart([]);
    }
  }

  /* ── Empty state ── */
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

  /* ── Cart with items ── */
  return h('div', { className: 'container cart-page' },
    h('div', { className: 'cart-page__head' },
      h('h1', { className: 'page-heading' }, 'Your Cart'),
      h('button', {
        className: 'btn btn-secondary btn-sm cart-page__clear',
        type: 'button',
        onClick: clearCart
      }, 'Clear Cart')
    ),

    h('div', { className: 'cart-layout' },

      /* ── Left: items ── */
      h('div', { className: 'cart-layout__items' },
        Object.keys(sellerGroups).map(function(seller) {
          var items = sellerGroups[seller];
          return h('div', { key: seller, className: 'cart-group' },
            h('div', { className: 'cart-group__head' },
              h('span', { className: 'cart-group__label' }, 'From: ' + seller)
            ),
            items.map(function(item) {
              return h(CartItem, {
                key: item.id,
                item: item,
                jtcg: jtcgPrices[item.id],
                onUpdateQty: updateQty,
                onRemove: removeItem,
                onSelectCondition: selectCondition
              });
            })
          );
        })
      ),

      /* ── Right: summary ── */
      h('aside', { className: 'cart-summary' },
        h('h3', { className: 'cart-summary__title' }, 'Order Summary'),

        h('div', { className: 'cart-summary__rows' },
          h('div', { className: 'cart-summary__row' },
            h('span', null, cart.length + ' item' + (cart.length !== 1 ? 's' : '')),
            h('span', null, formatUSD(subtotal))
          ),
          h('div', { className: 'cart-summary__row' },
            h('span', null, 'Shipping'),
            h('span', { className: 'cart-summary__muted' }, 'Calc at checkout')
          ),
          h('div', { className: 'cart-summary__row cart-summary__row--total' },
            h('span', null, 'Subtotal'),
            h('span', null, formatUSD(subtotal))
          )
        ),

        /* JustTCG attribution */
        jtcgLoading
          ? h('p', { className: 'cart-summary__note cart-summary__note--loading' }, 'Fetching condition prices\u2026')
          : Object.keys(jtcgPrices).length > 0
            ? h('p', { className: 'cart-summary__note' },
                'Condition prices from ',
                h('a', { href: 'https://justtcg.com', target: '_blank', rel: 'noopener noreferrer' }, 'JustTCG')
              )
            : null,

        /* Fulfillment info */
        h('div', { className: 'cart-summary__shipping' },
          h('div', { className: 'cart-summary__ship-row' },
            h(MapPinIcon, null),
            h('span', null, 'Local Pickup \u2014 Free')
          ),
          h('div', { className: 'cart-summary__ship-row' },
            h(TruckIcon, null),
            h('span', null, 'Ship to Guam \u2014 $5 flat')
          )
        ),

        /* Checkout gate */
        jtcgLoading
          ? h('div', { className: 'cart-summary__gate cart-summary__gate--loading' },
              h('span', null, 'Loading condition prices\u2026')
            )
          : itemsMissingCondition.length > 0
            ? h('div', { className: 'cart-summary__gate' },
                h(WarningIcon, null),
                h('span', null, itemsMissingCondition.length === 1
                  ? 'Select a condition for 1 item before checkout'
                  : 'Select conditions for ' + itemsMissingCondition.length + ' items before checkout'
                )
              )
            : null,

        /* Checkout button */
        h('a', {
          href: allConditionsChosen ? '#checkout' : undefined,
          className: 'btn btn-primary btn-lg cart-summary__cta' + (!allConditionsChosen ? ' cart-summary__cta--disabled' : ''),
          onClick: function(e) {
            if (!allConditionsChosen) {
              e.preventDefault();
              var el = document.querySelector('.cart-card--alert');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          },
          'aria-disabled': !allConditionsChosen ? 'true' : undefined
        },
          'Proceed to Checkout ', h(ChevronRightIcon, null)
        ),

        h('a', { href: '#store', className: 'btn btn-secondary cart-summary__continue' },
          'Continue Shopping'
        ),

        h('div', { className: 'cart-summary__local' },
          h(MapPinIcon, null),
          h('span', null, 'All orders fulfilled through Guam local sellers.')
        )
      )
    )
  );
}
