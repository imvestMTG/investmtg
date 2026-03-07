/* CheckoutView.js — Full checkout with SumUp Swift Checkout + Card Widget */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { PICKUP_STORES } from '../utils/stores.js';
import { CreditCardIcon, TruckIcon, StorePickupIcon, MapPinIcon, UserIcon } from './shared/Icons.js';
import { SUMUP_PUBLIC_KEY, GUAM_GRT_RATE, SHIPPING_FLAT_RATE, RESERVE_PROCESSING_DELAY } from '../utils/config.js';
import { sanitizeInput, isValidEmail } from '../utils/sanitize.js';
import { groupBySeller } from '../utils/group-by-seller.js';
var h = React.createElement;

// merchant code moved server-side to Cloudflare Worker

function generateOrderId() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var id = 'INV-';
  for (var i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// Load SumUp Swift Checkout SDK dynamically
function loadSwiftCheckoutSDK() {
  return new Promise(function(resolve) {
    if (window.SumUp && window.SumUp.SwiftCheckout) {
      resolve(window.SumUp);
      return;
    }
    var existing = document.querySelector('script[src*="js.sumup.com/swift-checkout"]');
    if (existing) {
      existing.addEventListener('load', function() { resolve(window.SumUp); });
      return;
    }
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://js.sumup.com/swift-checkout/v1/sdk.js';
    script.onload = function() { resolve(window.SumUp); };
    script.onerror = function() { resolve(null); };
    document.body.appendChild(script);
  });
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

  // SumUp state
  var ref8 = React.useState(null);
  var paymentError = ref8[0], setPaymentError = ref8[1];

  var ref9 = React.useState(false);
  var walletAvailable = ref9[0], setWalletAvailable = ref9[1];

  var ref10 = React.useState(false);
  var sdkLoaded = ref10[0], setSdkLoaded = ref10[1];

  var ref11 = React.useState('card');
  var paymentMethod = ref11[0], setPaymentMethod = ref11[1];

  var ref12 = React.useState(null);
  var cardWidgetReady = ref12[0], setCardWidgetReady = ref12[1];

  var ref13 = React.useState(false);
  var cardMounted = ref13[0], setCardMounted = ref13[1];

  var sdkInitRef = React.useRef(false);

  var subtotal = cart.reduce(function(sum, item) {
    return sum + (item.price || 0) * (item.qty || 1);
  }, 0);
  var tax = subtotal * GUAM_GRT_RATE;
  var shipping = fulfillment === 'ship' ? SHIPPING_FLAT_RATE : 0;
  var total = subtotal + tax + shipping;

  var sellerGroups = groupBySeller(cart);

  // Load Swift Checkout SDK when reaching payment step
  React.useEffect(function() {
    if (step !== 4 || sdkInitRef.current) return;
    sdkInitRef.current = true;

    loadSwiftCheckoutSDK().then(function(SumUp) {
      if (SumUp && SumUp.SwiftCheckout) {
        setSdkLoaded(true);
        try {
          var client = new SumUp.SwiftCheckout(SUMUP_PUBLIC_KEY);
          var paymentRequest = client.paymentRequest({
            countryCode: 'US',
            locale: 'en-US',
            total: {
              label: 'investMTG Order',
              amount: {
                currency: 'USD',
                value: total.toFixed(2)
              }
            }
          });
          paymentRequest.canMakePayment().then(function(result) {
            if (result) {
              setWalletAvailable(true);
            }
          }).catch(function() {
            // Wallet not available in this browser
          });
        } catch(e) {
          // Swift Checkout init failed — wallet payments unavailable
        }
      }
    });

    // Also try to mount card widget if SumUpCard is available
    if (window.SumUpCard) {
      setCardWidgetReady(true);
    }
  }, [step]);

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
    var orderId = generateOrderId();
    var store = PICKUP_STORES.find(function(s) { return s.id === pickupStore; });
    var order = {
      id: orderId,
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
      paymentMethod: paymentMethod
    };
    var orders = JSON.parse(localStorage.getItem('investmtg-orders') || '[]');
    orders.unshift(order);
    localStorage.setItem('investmtg-orders', JSON.stringify(orders));
    updateCart([]);
    setPaymentProcessing(false);
    setCompletedOrder(order);
    window.location.hash = 'order/' + orderId;
  }

  function handleWalletPayment() {
    setPaymentProcessing(true);
    setPaymentError(null);

    loadSwiftCheckoutSDK().then(function(SumUp) {
      if (!SumUp || !SumUp.SwiftCheckout) {
        setPaymentError('Payment SDK not available. Please try card payment.');
        setPaymentProcessing(false);
        return;
      }

      try {
        var client = new SumUp.SwiftCheckout(SUMUP_PUBLIC_KEY);
        var paymentRequest = client.paymentRequest({
          countryCode: 'US',
          locale: 'en-US',
          total: {
            label: 'investMTG Order',
            amount: {
              currency: 'USD',
              value: total.toFixed(2)
            }
          }
        });

        var buttons = client.elements();
        var container = document.querySelector('#sumup-wallet-container');
        if (container) {
          container.innerHTML = '';
          buttons
            .onSubmit(function(paymentMethodEvent) {
              paymentRequest
                .show(paymentMethodEvent)
                .then(function(paymentResponse) {
                  // Payment authorized by wallet — complete the order
                  completeOrder();
                })
                .catch(function(err) {
                  setPaymentError('Payment was cancelled or failed. Please try again.');
                  setPaymentProcessing(false);
                });
            })
            .mount({
              paymentMethods: [
                { id: 'apple_pay' },
                { id: 'google_pay' }
              ],
              container: container
            });
        }
        setPaymentProcessing(false);
      } catch(e) {
        setPaymentError('Could not initialize wallet payment: ' + e.message);
        setPaymentProcessing(false);
      }
    });
  }

  // Card payment via SumUp Card Widget
  function handleCardPayment() {
    setPaymentProcessing(true);
    setPaymentError(null);

    // The card widget needs a checkoutId from the SumUp API
    // Since we don't have a backend, we create the checkout via the API directly
    // This requires the secret API key — for now, show the manual payment flow
    // Once a Cloudflare Worker is set up, this will create real checkouts

    // Online card payment requires a backend to create SumUp checkouts.
    // Coming soon — for now, redirect to reserve flow.
    setPaymentError('Online card payment is coming soon. Please use Reserve & Pay at Pickup for now.');
    setPaymentProcessing(false);
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

        // Payment method selection
        h('div', { className: 'payment-method-selector' },
          h('h3', { className: 'payment-method-title' }, 'Choose Payment Method'),

          h('div', { className: 'payment-method-options' },
            // Reserve order option (primary for launch)
            h('label', {
              className: 'payment-method-option' + (paymentMethod === 'reserve' ? ' selected' : ''),
              onClick: function() { setPaymentMethod('reserve'); }
            },
              h('input', { type: 'radio', name: 'payment-method', value: 'reserve',
                checked: paymentMethod === 'reserve', onChange: function() { setPaymentMethod('reserve'); } }),
              h('div', { className: 'payment-method-content' },
                h('div', { className: 'payment-method-header' },
                  h('div', { className: 'payment-method-icon' }, '\uD83D\uDD12'),
                  h('div', null,
                    h('div', { className: 'payment-method-label' }, 'Reserve & Pay at Pickup'),
                    h('div', { className: 'payment-method-desc' }, 'Reserve your cards now. Pay the seller directly when you pick up \u2014 cash, card reader, or Venmo.')
                  )
                )
              )
            ),

            // SumUp card payment
            h('label', {
              className: 'payment-method-option' + (paymentMethod === 'card' ? ' selected' : ''),
              onClick: function() { setPaymentMethod('card'); }
            },
              h('input', { type: 'radio', name: 'payment-method', value: 'card',
                checked: paymentMethod === 'card', onChange: function() { setPaymentMethod('card'); } }),
              h('div', { className: 'payment-method-content' },
                h('div', { className: 'payment-method-header' },
                  h(CreditCardIcon, null),
                  h('div', null,
                    h('div', { className: 'payment-method-label' }, 'Pay with Card Online'),
                    h('div', { className: 'payment-method-desc' }, 'Secure payment via SumUp. Visa, Mastercard, AMEX accepted.')
                  )
                ),
                h('div', { className: 'payment-method-badge' },
                  h('img', { src: 'https://static.sumup.com/badges/sumup-badge-dark.svg', alt: 'Powered by SumUp',
                    style: { height: '20px' },
                    onError: function(e) { e.target.style.display = 'none'; }
                  }),
                  h('span', { className: 'payment-method-badge-text' }, 'Powered by SumUp')
                )
              )
            ),

            // Wallet payments (Apple Pay / Google Pay) if available
            walletAvailable && h('label', {
              className: 'payment-method-option' + (paymentMethod === 'wallet' ? ' selected' : ''),
              onClick: function() { setPaymentMethod('wallet'); }
            },
              h('input', { type: 'radio', name: 'payment-method', value: 'wallet',
                checked: paymentMethod === 'wallet', onChange: function() { setPaymentMethod('wallet'); } }),
              h('div', { className: 'payment-method-content' },
                h('div', { className: 'payment-method-header' },
                  h('div', { className: 'payment-method-icon' }, '\uD83D\uDCF1'),
                  h('div', null,
                    h('div', { className: 'payment-method-label' }, 'Apple Pay / Google Pay'),
                    h('div', { className: 'payment-method-desc' }, 'Fast checkout with your digital wallet.')
                  )
                )
              )
            )
          )
        ),

        // Payment error message
        paymentError && h('div', { className: 'payment-error' },
          h('span', null, '\u26A0\uFE0F '), paymentError
        ),

        // Wallet container for Apple/Google Pay buttons
        paymentMethod === 'wallet' && h('div', {
          id: 'sumup-wallet-container',
          className: 'sumup-wallet-container'
        }),

        // SumUp card widget mount point
        paymentMethod === 'card' && h('div', { id: 'sumup-card', className: 'sumup-card-container' }),

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

          paymentMethod === 'reserve' && h('button', {
            className: 'btn btn-primary btn-lg' + (paymentProcessing ? ' loading' : ''),
            onClick: function() {
              setPaymentProcessing(true);
              setTimeout(function() { completeOrder(); }, RESERVE_PROCESSING_DELAY);
            },
            disabled: paymentProcessing
          },
            paymentProcessing
              ? h('span', null, h('span', { className: 'spinner' }), ' Reserving\u2026')
              : h('span', null, '\uD83D\uDD12 Reserve Order \u2014 ', formatUSD(total))
          ),

          paymentMethod === 'card' && h('button', {
            className: 'btn btn-primary btn-lg' + (paymentProcessing ? ' loading' : ''),
            onClick: handleCardPayment,
            disabled: paymentProcessing
          },
            paymentProcessing
              ? h('span', null, h('span', { className: 'spinner' }), ' Processing\u2026')
              : h('span', null, h(CreditCardIcon, null), ' Pay ', formatUSD(total))
          ),

          paymentMethod === 'wallet' && h('button', {
            className: 'btn btn-primary btn-lg' + (paymentProcessing ? ' loading' : ''),
            onClick: handleWalletPayment,
            disabled: paymentProcessing
          },
            paymentProcessing
              ? h('span', null, h('span', { className: 'spinner' }), ' Processing\u2026')
              : h('span', null, '\uD83D\uDCF1 Pay with Wallet \u2014 ', formatUSD(total))
          )
        ),

        // Payment info note
        h('div', { className: 'checkout-payment-info' },
          paymentMethod === 'reserve' && h('p', { className: 'checkout-payment-note' },
            '\uD83D\uDD12 Your order will be reserved. The seller will be notified and you\'ll coordinate payment at pickup. No charge until you receive your cards.'
          ),
          paymentMethod === 'card' && h('p', { className: 'checkout-payment-note' },
            '\uD83D\uDD10 Your payment is processed securely by SumUp. Card details never touch our servers. Merchant: investMTG.'
          ),
          paymentMethod === 'wallet' && h('p', { className: 'checkout-payment-note' },
            '\uD83D\uDCF1 Your digital wallet handles authentication. Payment processed via SumUp.'
          ),
          h('div', { className: 'payment-security-badges' },
            h('span', { className: 'security-badge' }, '\uD83D\uDD12 SSL Encrypted'),
            h('span', { className: 'security-badge' }, '\uD83D\uDEE1\uFE0F PCI Compliant'),
            h('span', { className: 'security-badge' }, '\u2705 SumUp Verified')
          )
        )
      )
    )
  );
}
