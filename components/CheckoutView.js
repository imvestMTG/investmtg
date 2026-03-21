/* CheckoutView.js — Checkout with Stripe Payment Element + Reserve & Pay at Pickup */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { PICKUP_STORES } from '../utils/stores.js';
import { TruckIcon, StorePickupIcon, MapPinIcon, UserIcon } from './shared/Icons.js';
import { SHIPPING_FLAT_RATE, PROXY_BASE, BACKEND_FETCH_TIMEOUT, STORAGE_KEYS } from '../utils/config.js';
import { sanitizeInput, isValidEmail } from '../utils/sanitize.js';
import { groupBySeller } from '../utils/group-by-seller.js';
import { storageGet, storageSet, storageGetRaw } from '../utils/storage.js';
import { stripeCreatePaymentIntent } from '../utils/api.js';
import { TermsCheckbox } from './TermsGate.js';
var h = React.createElement;

/* Lazy-load Stripe.js v3 */
var stripePromise = null;
function loadStripe() {
  if (stripePromise) return stripePromise;
  if (window.Stripe) return Promise.resolve(window.Stripe);
  stripePromise = new Promise(function(resolve, reject) {
    var script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = function() {
      if (window.Stripe) { resolve(window.Stripe); }
      else { reject(new Error('Stripe.js loaded but Stripe not found')); }
    };
    script.onerror = function() { reject(new Error('Failed to load Stripe.js')); };
    document.head.appendChild(script);
  });
  return stripePromise;
}

export function CheckoutView(props) {
  var state = props.state;
  var updateCart = props.updateCart;
  var cart = state.cart;

  // Step: 1=review, 2=fulfillment, 3=contact, 4=payment
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

  // Payment method: 'stripe' or 'reserve'
  var ref9 = React.useState('stripe');
  var paymentMethod = ref9[0], setPaymentMethod = ref9[1];

  // Stripe state
  var ref10 = React.useState(null);
  var stripeError = ref10[0], setStripeError = ref10[1];

  var ref11 = React.useState(false);
  var stripeLoading = ref11[0], setStripeLoading = ref11[1];

  var ref12 = React.useState(false);
  var stripeMounted = ref12[0], setStripeMounted = ref12[1];

  var refTos = React.useState(false);
  var tosAccepted = refTos[0], setTosAccepted = refTos[1];
  var refTosErr = React.useState('');
  var tosError = refTosErr[0], setTosError = refTosErr[1];

  // Refs for Stripe instances
  var stripeRef = React.useRef(null);       // Stripe instance
  var elementsRef = React.useRef(null);     // Stripe Elements instance
  var orderIdRef = React.useRef(null);      // Server order ID for payment completion

  var subtotal = cart.reduce(function(sum, item) {
    return sum + (item.price || 0) * (item.qty || 1);
  }, 0);
  var shipping = fulfillment === 'ship' ? SHIPPING_FLAT_RATE : 0;
  var total = subtotal + shipping;

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

  /* ── Create order on server, get order ID ── */
  function createServerOrder(method) {
    var store = PICKUP_STORES.find(function(s) { return s.id === pickupStore; });
    var authToken = storageGetRaw(STORAGE_KEYS.AUTH_TOKEN, null);
    var headers = { 'Content-Type': 'application/json' };
    if (authToken) { headers['Authorization'] = 'Bearer ' + authToken; }

    var apiBody = {
      items: cart.slice(),
      subtotal: subtotal,
      shipping: shipping,
      total: total,
      fulfillment: fulfillment,
      pickup_store: store || null,
      contact_name: sanitizeInput(contact.name, 100),
      contact_email: sanitizeInput(contact.email, 200),
      contact_phone: sanitizeInput(contact.phone, 20),
      payment_method: method
    };

    var ac = new AbortController();
    var tid = setTimeout(function() { ac.abort(); }, BACKEND_FETCH_TIMEOUT);
    return fetch(PROXY_BASE + '/api/orders', {
      method: 'POST',
      credentials: 'include',
      headers: headers,
      signal: ac.signal,
      body: JSON.stringify(apiBody)
    }).then(function(res) {
      clearTimeout(tid);
      return res.json();
    }).then(function(data) {
      var serverId = (data && data.order && data.order.id) ? data.order.id : null;
      return serverId || ('GUM-LOCAL-' + Math.random().toString(36).slice(2, 10).toUpperCase());
    }).catch(function() {
      clearTimeout(tid);
      return 'GUM-LOCAL-' + Math.random().toString(36).slice(2, 10).toUpperCase();
    });
  }

  /* ── Save completed order locally + redirect ── */
  function finishOrder(orderId, method) {
    var store = PICKUP_STORES.find(function(s) { return s.id === pickupStore; });
    var savedOrder = {
      id: orderId,
      items: cart.slice(),
      subtotal: subtotal,
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
      paymentMethod: method,
      status: method === 'stripe' ? 'paid' : 'reserved'
    };

    var orders = storageGet(STORAGE_KEYS.ORDERS, []);
    if (!Array.isArray(orders)) orders = [];
    orders.unshift(savedOrder);
    /* Cap localStorage orders to prevent unbounded growth */
    if (orders.length > 50) orders = orders.slice(0, 50);
    storageSet(STORAGE_KEYS.ORDERS, orders);
    updateCart([]);
    setPaymentProcessing(false);
    setCompletedOrder(savedOrder);
    window.location.hash = 'order/' + orderId;
  }

  /* ── Reserve order (no payment taken) ── */
  function completeReserveOrder() {
    setPaymentProcessing(true);
    createServerOrder('reserve').then(function(orderId) {
      finishOrder(orderId, 'reserve');
    }).catch(function(err) {
      console.error('Reserve order failed:', err);
      setPaymentProcessing(false);
    });
  }

  /* ── Initialize Stripe Payment Element ── */
  function initStripeCheckout() {
    if (stripeMounted) return;
    setStripeLoading(true);
    setStripeError(null);

    // 1. Create order on server first
    createServerOrder('stripe').then(function(orderId) {
      orderIdRef.current = orderId;

      // 2. Get the first seller's Stripe account info from cart items (if available)
      var firstItem = cart[0];
      var sellerStripeAccount = (firstItem && firstItem.stripe_account_id) || null;
      var sellerId = (firstItem && firstItem.seller_id) || null;
      var amountCents = Math.round(total * 100);

      // 3. Create PaymentIntent via backend
      return stripeCreatePaymentIntent(
        orderId,
        amountCents,
        sellerStripeAccount,
        sellerId,
        'investMTG Order ' + orderId,
        contact.email
      );
    }).then(function(result) {
      if (!result || !result.client_secret) {
        throw new Error(result.error || result.detail || 'Failed to create payment');
      }

      // 4. Load Stripe.js and mount Payment Element
      return loadStripe().then(function(StripeFn) {
        var stripe = StripeFn(result.publishable_key);
        stripeRef.current = stripe;

        var elements = stripe.elements({
          clientSecret: result.client_secret,
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#d4a843',
              colorBackground: '#1a1a2e',
              colorText: '#e0e0e0',
              colorDanger: '#ff6b6b',
              fontFamily: '"Satoshi", system-ui, sans-serif',
              borderRadius: '8px'
            }
          }
        });
        elementsRef.current = elements;

        var paymentElement = elements.create('payment', {
          layout: 'tabs'
        });

        var container = document.getElementById('stripe-payment-element');
        if (container) {
          paymentElement.mount('#stripe-payment-element');
          setStripeMounted(true);
          setStripeLoading(false);
        } else {
          throw new Error('Payment container not found');
        }
      });
    }).catch(function(err) {
      setStripeError(err.message || 'Could not initialize payment. Please try Reserve & Pay at Pickup.');
      setStripeLoading(false);
    });
  }

  /* ── Confirm Stripe payment ── */
  function handleStripeSubmit() {
    if (!stripeRef.current || !elementsRef.current) {
      setStripeError('Payment not ready. Please wait or try another method.');
      return;
    }
    setPaymentProcessing(true);
    setStripeError(null);

    var orderId = orderIdRef.current;
    stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: {
        return_url: 'https://www.investmtg.com/#order/' + orderId,
        receipt_email: contact.email
      },
      redirect: 'if_required'
    }).then(function(result) {
      if (result.error) {
        setStripeError(result.error.message || 'Payment failed. Please try again.');
        setPaymentProcessing(false);
      } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
        // Payment succeeded without redirect
        finishOrder(orderId, 'stripe');
      } else {
        // Payment may still be processing (3D Secure redirect, etc.)
        // The return_url will handle completion
        setPaymentProcessing(false);
      }
    }).catch(function(err) {
      setStripeError(err.message || 'An unexpected error occurred.');
      setPaymentProcessing(false);
    });
  }

  // When step changes to 4 and paymentMethod is 'stripe', init checkout
  React.useEffect(function() {
    if (step === 4 && paymentMethod === 'stripe' && !stripeMounted && !stripeLoading) {
      initStripeCheckout();
    }
  }, [step, paymentMethod]);

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

    // ===== CONFIRMATION MODAL (for reserve only) =====
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
              completeReserveOrder();
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
          h('div', { className: 'checkout-summary-row checkout-summary-total' },
            h('span', null, 'Est. Total'), h('span', null, formatUSD(subtotal))
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
          h('strong', null, ' ' + formatUSD(subtotal + (fulfillment === 'ship' ? SHIPPING_FLAT_RATE : 0)))
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
          'We\'ll send your order confirmation to your email address and share your contact details with the seller to coordinate pickup or delivery.'
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

        h(TermsCheckbox, {
          checked: tosAccepted,
          onChange: function(val) {
            setTosAccepted(val);
            setTosError('');
          },
          error: tosError
        }),

        h('div', { className: 'checkout-actions' },
          h('button', { className: 'btn btn-secondary', onClick: function() { setStep(2); } }, '\u2190 Back'),
          h('button', {
            className: 'btn btn-primary',
            onClick: function() {
              var contactValid = validateContact();
              if (!tosAccepted) {
                setTosError('You must agree to the Terms of Service');
              }
              if (contactValid && tosAccepted) { setStep(4); }
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

        // ── Payment method selector ──
        h('div', { className: 'checkout-payment-methods' },
          h('h3', { className: 'checkout-payment-methods-title' }, 'Choose Payment Method'),

          h('label', {
            className: 'fulfillment-option' + (paymentMethod === 'stripe' ? ' selected' : ''),
            onClick: function() { setPaymentMethod('stripe'); }
          },
            h('input', {
              type: 'radio',
              name: 'payment-method',
              value: 'stripe',
              checked: paymentMethod === 'stripe',
              onChange: function() { setPaymentMethod('stripe'); }
            }),
            h('div', { className: 'fulfillment-option-content' },
              h('div', { className: 'fulfillment-option-header' },
                h('span', { style: { fontSize: '1.4em' } }, '\uD83D\uDCB3'),
                h('div', null,
                  h('div', { className: 'fulfillment-option-title' }, 'Pay Online'),
                  h('div', { className: 'fulfillment-option-price' }, 'Card, Apple Pay, Google Pay')
                )
              ),
              h('p', { className: 'fulfillment-option-desc' },
                'Pay securely now with your credit card, debit card, Apple Pay, or Google Pay. Your payment details are handled entirely by Stripe \u2014 we never see them.'
              )
            )
          ),

          h('label', {
            className: 'fulfillment-option' + (paymentMethod === 'reserve' ? ' selected' : ''),
            onClick: function() { setPaymentMethod('reserve'); }
          },
            h('input', {
              type: 'radio',
              name: 'payment-method',
              value: 'reserve',
              checked: paymentMethod === 'reserve',
              onChange: function() { setPaymentMethod('reserve'); }
            }),
            h('div', { className: 'fulfillment-option-content' },
              h('div', { className: 'fulfillment-option-header' },
                h('span', { style: { fontSize: '1.4em' } }, '\uD83D\uDD12'),
                h('div', null,
                  h('div', { className: 'fulfillment-option-title' }, 'Reserve & Pay at Pickup'),
                  h('div', { className: 'fulfillment-option-price' }, 'No charge now')
                )
              ),
              h('p', { className: 'fulfillment-option-desc' },
                'Reserve your cards now. Pay the seller directly when you pick up \u2014 cash, card, or Venmo.'
              )
            )
          )
        ),

        // ── Stripe Payment Element (shown when paymentMethod === 'stripe') ──
        paymentMethod === 'stripe' && h('div', { className: 'checkout-stripe-section' },
          stripeLoading && h('div', { className: 'checkout-stripe-loading' },
            h('span', { className: 'spinner' }),
            h('span', null, ' Preparing secure payment\u2026')
          ),

          stripeError && h('div', { className: 'checkout-stripe-error' },
            h('p', null, stripeError),
            h('button', {
              className: 'btn btn-secondary btn-sm',
              onClick: function() {
                setStripeError(null);
                setStripeMounted(false);
                setStripeLoading(false);
                stripeRef.current = null;
                elementsRef.current = null;
                orderIdRef.current = null;
                stripePromise = null;
                initStripeCheckout();
              }
            }, 'Retry Payment')
          ),

          // The Stripe Payment Element mounts here
          h('div', {
            id: 'stripe-payment-element',
            style: {
              minHeight: stripeMounted ? '280px' : '0',
              transition: 'min-height 0.3s ease'
            }
          }),

          stripeMounted && h('button', {
            className: 'btn btn-primary btn-lg checkout-stripe-submit' + (paymentProcessing ? ' loading' : ''),
            onClick: handleStripeSubmit,
            disabled: paymentProcessing
          },
            paymentProcessing
              ? h('span', null, h('span', { className: 'spinner spinner-light' }), ' Processing\u2026')
              : h('span', null, '\uD83D\uDCB3 Pay ', formatUSD(total))
          ),

          stripeMounted && h('div', { className: 'payment-security-badges' },
            h('span', { className: 'security-badge' }, '\uD83D\uDD12 PCI Compliant'),
            h('span', { className: 'security-badge' }, '\uD83D\uDEE1\uFE0F 3D Secure'),
            h('span', { className: 'security-badge' }, '\u2705 Powered by Stripe')
          )
        ),

        // ── Reserve info (shown when paymentMethod === 'reserve') ──
        paymentMethod === 'reserve' && h('div', { className: 'checkout-reserve-info' },
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

          // For reserve: show reserve button
          // For Stripe: the submit button is above the Payment Element
          paymentMethod === 'reserve'
            ? h('button', {
                className: 'btn btn-primary btn-lg' + (paymentProcessing ? ' loading' : ''),
                onClick: function() { setShowConfirm(true); },
                disabled: paymentProcessing
              },
                paymentProcessing
                  ? h('span', null, h('span', { className: 'spinner' }), ' Reserving\u2026')
                  : h('span', null, '\uD83D\uDD12 Reserve Order \u2014 ', formatUSD(total))
              )
            : null
        ),

        h('div', { className: 'checkout-dispute-notice' },
          h('p', null,
            'By completing this order, you agree to our ',
            h('a', { href: '#terms' }, 'Terms of Service'),
            '. For payment disputes, contact your card issuer or Stripe. investMTG facilitates connections between buyers and sellers and is not a party to transactions. See our ',
            h('a', { href: '#terms', onClick: function(e) { e.preventDefault(); window.open('#terms', '_blank'); } }, 'Refund Policy'),
            ' for details.'
          )
        ),

        h('div', { className: 'checkout-payment-info' },
          paymentMethod === 'reserve'
            ? h('p', { className: 'checkout-payment-note' },
                '\uD83D\uDD12 Your order will be reserved. The seller will be notified and you\'ll coordinate payment at pickup. No charge until you receive your cards.'
              )
            : h('p', { className: 'checkout-payment-note' },
                '\uD83D\uDCB3 Your payment is processed securely by Stripe. investMTG never sees your card details.'
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
