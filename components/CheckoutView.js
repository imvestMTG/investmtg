/* CheckoutView.js — Checkout with Reserve & Pay at Pickup only */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { PICKUP_STORES } from '../utils/stores.js';
import { TruckIcon, StorePickupIcon, MapPinIcon, UserIcon } from './shared/Icons.js';
import { GUAM_GRT_RATE, SHIPPING_FLAT_RATE, PROXY_BASE } from '../utils/config.js';
import { sanitizeInput, isValidEmail } from '../utils/sanitize.js';
import { groupBySeller } from '../utils/group-by-seller.js';
import { storageGet, storageSet, storageGetRaw } from '../utils/storage.js';
var h = React.createElement;

export function CheckoutView(props) {
  var state = props.state;
  var updateCart = props.updateCart;
  var cart = state.cart;

  // Step: 1=review, 2=fulfillment, 3=contact, 4=payment, 5=confirm-modal
  var ref1 = React.useState(1);
  var step = ref1[0], setStep = ref1[1];

  var ref2 = React.useState('pickup');
  var fulfillment = ref2[0], setFulfillment = ref2[1];

  var ref3 = React.useState('s1');
  var pickupStore = ref3[0], setPickupStore = ref3[1];

  var ref4 = React.useState({ name: '', email: '', phone: '' });
  var contact = ref4[0], setContact = ref4[1];

  var ref5 = React.useState(false);
  var paymentProcessing = ref5[0], setPaymentProcessing = ref5[1];

  var ref6 = React.useState(null);
  var completedOrder = ref6[0], setCompletedOrder = ref6[1];

  var ref7 = React.useState({});
  var fieldErrors = ref7[0], setFieldErrors = ref7[1];

  // Confirmation modal visibility
  var ref8 = React.useState(false);
  var showConfirm = ref8[0], setShowConfirm = ref8[1];

  var subtotal = cart.reduce(function(sum, item) {
    return sum + (item.price || 0) * (item.qty || 1);
  }, 0);
  var tax = subtotal * GUAM_GRT_RATE;
  var shipping = fulfillment === 'ship' ? SHIPPING_FLAT_RATE : 0;
  var total = subtotal + tax + shipping;

  var sellerGroups = groupBySeller(cart);

  function updateContact(key, val) {
    setContact(function(prev) { return Object.assign({}, prev, { [key]: val }); });
    setFieldErrors(function(prev) { return Object.assign({}, prev, { [key]: '' }); });
  }

  function validateContact() {
    var errors = {};
    if (!contact.name.trim()) { errors.name = 'Name is required'; }
    if (!contact.email.trim() || !isValidEmail(contact.email)) { errors.email = 'Valid email is required'; }
    if (!contact.phone.trim()) { errors.phone = 'Phone number is required'; }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function completeOrder() {
    setPaymentProcessing(true);

    var store = PICKUP_STORES.find(function(s) { return s.id === pickupStore; });
    var order = {
      id: null, // will be set by server response, or fallback to local ID
      items: cart.slice(),
      subtotal: subtotal,
      tax: tax,
      shipping: shipping,
      total: total,
      fulfillment: fulfillment,
      pickupStore: store || null,
      contact: {
        name: sanitizeInput(contact.name, 100),
        email: sanitizeInput(contact.email, 200),
        phone: sanitizeInput(contact.phone, 20)
      },
      date: new Date().toISOString(),
      paymentMethod: 'reserve',
      status: 'reserved'
    };

    // Save to localStorage first (guaranteed fallback)
    function saveLocalAndFinish(finalId) {
      var savedOrder = Object.assign({}, order, { id: finalId });
      var orders = storageGet('investmtg-orders', []);
      if (!Array.isArray(orders)) orders = [];
      orders.unshift(savedOrder);
      storageSet('investmtg-orders', orders);
      updateCart([]);
      setPaymentProcessing(false);
      setCompletedOrder(savedOrder);
      window.location.hash = 'order/' + finalId;
    }

    // POST to /api/orders — use server ID if available, else fallback to local
    var authToken = storageGetRaw('investmtg_auth_token', null);
    var headers = { 'Content-Type': 'application/json' };
    if (authToken) { headers['Authorization'] = 'Bearer ' + authToken; }

    var apiBody = {
      items: order.items,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      total: order.total,
      fulfillment: order.fulfillment,
      pickup_store: order.pickupStore,
      contact_name: order.contact.name,
      contact_email: order.contact.email,
      contact_phone: order.contact.phone,
      payment_method: 'reserve'
    };

    fetch(PROXY_BASE + '/api/orders', {
      method: 'POST',
      credentials: 'include',
      headers: headers,
      body: JSON.stringify(apiBody)
    }).then(function(res) {
      return res.json();
    }).then(function(data) {
      var serverId = (data && data.order && data.order.id) ? data.order.id : null;
      if (serverId) {
        // Use server-assigned ID
        saveLocalAndFinish(serverId);
      } else {
        // Server responded but no ID — fall back
        var fallbackId = 'GUM-LOCAL-' + Math.random().toString(36).slice(2, 10).toUpperCase();
        saveLocalAndFinish(fallbackId);
      }
    }).catch(function() {
      // API failed — complete order locally
      var fallbackId = 'GUM-LOCAL-' + Math.random().toString(36).slice(2, 10).toUpperCase();
      saveLocalAndFinish(fallbackId);
    });
  }

  // Empty cart
  if (cart.length === 0 && !completedOrder) {
    return h('div', { className: 'container checkout-page' },
      h('h1', { className: 'page-heading' }, 'Checkout'),
      h('div', { className: 'empty-state' },
        h('h3', null, 'Your cart is empty'),
        h('p', null, 'Add some cards before checking out.'),
        h('a', { href: '#store', className: 'btn btn-primary' }, 'Browse Marketplace')
      )
    );
  }

  return h('div', { className: 'container checkout-page' },

    // ===== CONFIRMATION MODAL =====
    showConfirm && h('div', { className: 'checkout-confirm-overlay' },
      h('div', { className: 'checkout-confirm-modal' },
        h('div', { className: 'checkout-confirm-icon' }, '\uD83D\uDD12'),
        h('h2', { className: 'checkout-confirm-title' }, 'Confirm Reservation'),
        h('p', { className: 'checkout-confirm-message' },
          'You are reserving these cards. The seller will be notified and you\u2019ll coordinate pickup.'
        ),
        h('p', { className: 'checkout-confirm-message' },
          'No payment is taken now \u2014 you\u2019ll pay the seller directly at pickup.'
        ),
        h('div', { className: 'checkout-confirm-total' },
          h('span', null, 'Order Total'),
          h('strong', null, formatUSD(total))
        ),
        h('div', { className: 'checkout-confirm-actions' },
          h('button', {
            className: 'btn btn-secondary',
            onClick: function() { setShowConfirm(false); },
            disabled: paymentProcessing
          }, 'Cancel'),
          h('button', {
            className: 'btn btn-primary' + (paymentProcessing ? ' loading' : ''),
            onClick: function() {
              setShowConfirm(false);
              completeOrder();
            },
            disabled: paymentProcessing
          },
            paymentProcessing
              ? h('span', null, h('span', { className: 'spinner' }), ' Reserving\u2026')
              : 'Confirm Reservation'
          )
        )
      )
    ),

    h('div', { className: 'checkout-header' },
      h('h1', { className: 'page-heading' }, 'Checkout'),
      h('div', { className: 'checkout-steps' },
        ['Review', 'Fulfillment', 'Contact', 'Payment'].map(function(label, idx) {
          var num = idx + 1;
          var cls = 'checkout-step' +
            (step === num ? ' active' : '') +
            (step > num ? ' done' : '');
          return h('div', { key: label, className: cls },
            h('div', { className: 'checkout-step-num' }, step > num ? '\u2713' : num),
            h('span', { className: 'checkout-step-label' }, label)
          );
        })
      )
    ),

    h('div', { className: 'checkout-body' },

      // ===== STEP 1: REVIEW CART =====
      step === 1 && h('div', { className: 'checkout-section' },
        h('h2', { className: 'checkout-section-title' }, 'Review Your Order'),

        Object.keys(sellerGroups).map(function(seller) {
          var items = sellerGroups[seller];
          return h('div', { key: seller, className: 'checkout-seller-group' },
            h('div', { className: 'checkout-seller-label' },
              h('span', { className: 'checkout-seller-badge' }, 'Seller: ' + seller)
            ),
            items.map(function(item) {
              return h('div', { key: item.id, className: 'checkout-item' },
                h('div', { className: 'checkout-item-img' },
                  item.image
                    ? h('img', { src: item.image, alt: item.name, loading: 'lazy' })
                    : h('div', { className: 'checkout-item-img-placeholder' }, '\uD83C\uDCCF')
                ),
                h('div', { className: 'checkout-item-details' },
                  h('div', { className: 'checkout-item-name' }, item.name),
                  h('div', { className: 'checkout-item-meta' },
                    item.set && h('span', null, item.set),
                    item.condition && h('span', { className: 'checkout-item-cond' }, item.condition)
                  )
                ),
                h('div', { className: 'checkout-item-right' },
                  h('div', { className: 'checkout-item-qty' }, '\u00D7 ' + (item.qty || 1)),
                  h('div', { className: 'checkout-item-price' }, formatUSD((item.price || 0) * (item.qty || 1)))
                )
              );
            })
          );
        }),

        h('div', { className: 'checkout-order-summary' },
          h('div', { className: 'checkout-summary-row' },
            h('span', null, 'Subtotal'), h('span', null, formatUSD(subtotal))
          ),
          h('div', { className: 'checkout-summary-row' },
            h('span', null, 'Guam GRT (4%)'), h('span', null, formatUSD(tax))
          ),
          h('div', { className: 'checkout-summary-row checkout-summary-total' },
            h('span', null, 'Est. Total'), h('span', null, formatUSD(subtotal + tax))
          )
        ),

        h('div', { className: 'checkout-actions' },
          h('a', { href: '#cart', className: 'btn btn-secondary' }, '\u2190 Back to Cart'),
          h('button', {
            className: 'btn btn-primary',
            onClick: function() { setStep(2); }
          }, 'Continue to Fulfillment \u2192')
        )
      ),

      // ===== STEP 2: FULFILLMENT =====
      step === 2 && h('div', { className: 'checkout-section' },
        h('h2', { className: 'checkout-section-title' }, 'Choose Fulfillment'),

        h('div', { className: 'fulfillment-options' },
          h('label', {
            className: 'fulfillment-option' + (fulfillment === 'pickup' ? ' selected' : ''),
            onClick: function() { setFulfillment('pickup'); }
          },
            h('input', {
              type: 'radio',
              name: 'fulfillment',
              value: 'pickup',
              checked: fulfillment === 'pickup',
              onChange: function() { setFulfillment('pickup'); }
            }),
            h('div', { className: 'fulfillment-option-content' },
              h('div', { className: 'fulfillment-option-header' },
                h(StorePickupIcon, null),
                h('div', null,
                  h('div', { className: 'fulfillment-option-title' }, 'Local Pickup'),
                  h('div', { className: 'fulfillment-option-price' }, 'FREE')
                )
              ),
              h('p', { className: 'fulfillment-option-desc' },
                'Pick up your order at a participating Guam store. Coordinate with the seller via their preferred contact method.'
              )
            )
          ),

          h('label', {
            className: 'fulfillment-option' + (fulfillment === 'ship' ? ' selected' : ''),
            onClick: function() { setFulfillment('ship'); }
          },
            h('input', {
              type: 'radio',
              name: 'fulfillment',
              value: 'ship',
              checked: fulfillment === 'ship',
              onChange: function() { setFulfillment('ship'); }
            }),
            h('div', { className: 'fulfillment-option-content' },
              h('div', { className: 'fulfillment-option-header' },
                h(TruckIcon, null),
                h('div', null,
                  h('div', { className: 'fulfillment-option-title' }, 'Ship to Guam'),
                  h('div', { className: 'fulfillment-option-price' }, '$' + SHIPPING_FLAT_RATE.toFixed(2) + ' flat rate')
                )
              ),
              h('p', { className: 'fulfillment-option-desc' },
                'Flat-rate shipping anywhere on Guam. Seller will ship within 2\u20133 business days of order confirmation.'
              )
            )
          )
        ),

        fulfillment === 'pickup' && h('div', { className: 'pickup-store-selector' },
          h('h3', { className: 'pickup-store-title' }, 'Select Pickup Location'),
          h('div', { className: 'pickup-store-list' },
            PICKUP_STORES.map(function(store) {
              return h('label', {
                key: store.id,
                className: 'pickup-store-option' + (pickupStore === store.id ? ' selected' : ''),
                onClick: function() { setPickupStore(store.id); }
              },
                h('input', {
                  type: 'radio',
                  name: 'pickup-store',
                  value: store.id,
                  checked: pickupStore === store.id,
                  onChange: function() { setPickupStore(store.id); }
                }),
                h('div', { className: 'pickup-store-info' },
                  h('div', { className: 'pickup-store-name' }, store.name),
                  h('div', { className: 'pickup-store-address' },
                    h(MapPinIcon, null), ' ', store.address
                  )
                )
              );
            })
          )
        ),

        h('div', { className: 'checkout-summary-mini' },
          h('span', null, 'Order total:'),
          h('strong', null, ' ' + formatUSD(subtotal + tax + (fulfillment === 'ship' ? SHIPPING_FLAT_RATE : 0)))
        ),

        h('div', { className: 'checkout-actions' },
          h('button', { className: 'btn btn-secondary', onClick: function() { setStep(1); } }, '\u2190 Back'),
          h('button', {
            className: 'btn btn-primary',
            onClick: function() { setStep(3); }
          }, 'Continue to Contact \u2192')
        )
      ),

      // ===== STEP 3: CONTACT INFO =====
      step === 3 && h('div', { className: 'checkout-section' },
        h('h2', { className: 'checkout-section-title' }, 'Contact Information'),
        h('p', { className: 'checkout-section-sub' },
          'We\'ll send your order confirmation here and share it with the seller for coordination.'
        ),

        h('div', { className: 'checkout-form' },
          h('div', { className: 'form-group' },
            h('label', { className: 'form-label', htmlFor: 'co-name' }, 'Full Name'),
            h('input', {
              id: 'co-name',
              type: 'text',
              className: 'form-input' + (fieldErrors.name ? ' error' : ''),
              placeholder: 'Your full name',
              value: contact.name,
              onChange: function(e) { updateContact('name', e.target.value); }
            }),
            fieldErrors.name && h('p', { className: 'form-error' }, fieldErrors.name)
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label', htmlFor: 'co-email' }, 'Email Address'),
            h('input', {
              id: 'co-email',
              type: 'email',
              className: 'form-input' + (fieldErrors.email ? ' error' : ''),
              placeholder: 'you@example.com',
              value: contact.email,
              onChange: function(e) { updateContact('email', e.target.value); }
            }),
            fieldErrors.email && h('p', { className: 'form-error' }, fieldErrors.email)
          ),

          h('div', { className: 'form-group' },
            h('label', { className: 'form-label', htmlFor: 'co-phone' }, 'Phone Number'),
            h('input', {
              id: 'co-phone',
              type: 'tel',
              className: 'form-input' + (fieldErrors.phone ? ' error' : ''),
              placeholder: '(671) 555-0100',
              value: contact.phone,
              onChange: function(e) { updateContact('phone', e.target.value); }
            }),
            fieldErrors.phone && h('p', { className: 'form-error' }, fieldErrors.phone)
          )
        ),

        h('div', { className: 'checkout-actions' },
          h('button', { className: 'btn btn-secondary', onClick: function() { setStep(2); } }, '\u2190 Back'),
          h('button', {
            className: 'btn btn-primary',
            onClick: function() {
              if (validateContact()) { setStep(4); }
            }
          }, 'Proceed to Payment \u2192')
        )
      ),

      // ===== STEP 4: PAYMENT =====
      step === 4 && h('div', { className: 'checkout-section' },
        h('h2', { className: 'checkout-section-title' }, 'Payment'),

        // Order summary recap
        h('div', { className: 'checkout-payment-recap' },
          h('div', { className: 'payment-recap-contact' },
            h(UserIcon, null),
            h('div', null,
              h('div', null, contact.name),
              h('div', { style: { color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' } }, contact.email),
              h('div', { style: { color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' } }, contact.phone)
            )
          ),
          h('div', { className: 'payment-recap-fulfillment' },
            fulfillment === 'pickup' ? h(StorePickupIcon, null) : h(TruckIcon, null),
            h('div', null,
              h('div', null, fulfillment === 'pickup' ? 'Local Pickup' : 'Ship to Guam'),
              fulfillment === 'pickup' && h('div', {
                style: { color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }
              }, PICKUP_STORES.find(function(s) { return s.id === pickupStore; }).name)
            )
          )
        ),

        // Reserve info box (only payment method)
        h('div', { className: 'checkout-reserve-info' },
          h('div', { className: 'checkout-reserve-info-header' },
            h('span', { className: 'checkout-reserve-icon' }, '\uD83D\uDD12'),
            h('div', null,
              h('div', { className: 'checkout-reserve-title' }, 'Reserve & Pay at Pickup'),
              h('div', { className: 'checkout-reserve-desc' },
                'Reserve your cards now. Pay the seller directly when you pick up \u2014 cash, card reader, or Venmo. No charge until you receive your cards.'
              )
            )
          )
        ),

        // Order total
        h('div', { className: 'checkout-order-summary' },
          h('div', { className: 'checkout-summary-row' },
            h('span', null, 'Subtotal'), h('span', null, formatUSD(subtotal))
          ),
          h('div', { className: 'checkout-summary-row' },
            h('span', null, 'Guam GRT (4%)'), h('span', null, formatUSD(tax))
          ),
          fulfillment === 'ship' && h('div', { className: 'checkout-summary-row' },
            h('span', null, 'Shipping'), h('span', null, formatUSD(SHIPPING_FLAT_RATE))
          ),
          h('div', { className: 'checkout-summary-row checkout-summary-total' },
            h('span', null, 'Total'), h('span', null, formatUSD(total))
          )
        ),

        h('div', { className: 'checkout-actions' },
          h('button', {
            className: 'btn btn-secondary',
            onClick: function() { setStep(3); },
            disabled: paymentProcessing
          }, '\u2190 Back'),

          h('button', {
            className: 'btn btn-primary btn-lg' + (paymentProcessing ? ' loading' : ''),
            onClick: function() { setShowConfirm(true); },
            disabled: paymentProcessing
          },
            paymentProcessing
              ? h('span', null, h('span', { className: 'spinner' }), ' Reserving\u2026')
              : h('span', null, '\uD83D\uDD12 Reserve Order \u2014 ', formatUSD(total))
          )
        ),

        h('div', { className: 'checkout-payment-info' },
          h('p', { className: 'checkout-payment-note' },
            '\uD83D\uDD12 Your order will be reserved. The seller will be notified and you\'ll coordinate payment at pickup. No charge until you receive your cards.'
          ),
          h('div', { className: 'payment-security-badges' },
            h('span', { className: 'security-badge' }, '\uD83D\uDD12 SSL Encrypted'),
            h('span', { className: 'security-badge' }, '\uD83D\uDEE1\uFE0F Secure Checkout'),
            h('span', { className: 'security-badge' }, '\u2705 Guam Local')
          )
        )
      )
    )
  );
}
