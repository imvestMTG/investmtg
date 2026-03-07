/* CheckoutView.js — Checkout page (payment integration coming soon) */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { CreditCardIcon, TruckIcon, StorePickupIcon, MapPinIcon, UserIcon } from './shared/Icons.js';
var h = React.createElement;

// Verified Guam stores for pickup selection (Google Maps verified, March 2026)
var PICKUP_STORES = [
  { id: 's1', name: 'Geek Out', address: 'Micronesia Mall, 1088 Marine Corps Dr, 2F Concourse, Dededo, GU 96929', phone: '(671) 969-4335' },
  { id: 's2', name: 'The Inventory', address: '230 W Soledad Ave, Suite 204, Hagåtña, GU 96910', phone: '(671) 969-4263' },
  { id: 's3', name: 'My Wife Told Me To Sell It', address: 'Compadres Mall Grand Bazaar, Unit K9, Dededo, GU 96929', phone: null },
  { id: 's4', name: 'ComicBook Guam', address: 'Agaña Shopping Center, 302 S Route 4 #100, Hagåtña, GU 96910', phone: '(671) 688-7040' }
];

// SumUp integration notes (for future activation):
// To activate SumUp payments:
// 1. Get your merchant_code from https://me.sumup.com/developers
// 2. Create an API key at https://developer.sumup.com
// 3. Create checkout via API: POST https://api.sumup.com/v0.1/checkouts
// 4. Mount widget: SumUpCard.mount({ checkoutId: '...', id: 'sumup-card', ... })
//
// Widget options to use when activating:
// SumUpCard.mount({
//   checkoutId: checkoutId,        // from POST /v0.1/checkouts
//   id: 'sumup-card',              // DOM element id
//   locale: 'en-US',
//   currency: 'USD',
//   country: 'US',
//   showZipCode: true,
//   showEmail: true,
//   onResponse: function(type, body) {
//     if (type === 'success') { handlePaymentSuccess(body); }
//     if (type === 'error')   { handlePaymentError(body); }
//   }
// });

function groupBySeller(cart) {
  var groups = {};
  cart.forEach(function(item) {
    var seller = item.seller || 'Unknown Seller';
    if (!groups[seller]) { groups[seller] = []; }
    groups[seller].push(item);
  });
  return groups;
}

export function CheckoutView({ state, updateCart }) {
  var cart = state.cart;

  // Step: 1=review, 2=fulfillment, 3=contact
  var ref1 = React.useState(1);
  var step = ref1[0], setStep = ref1[1];

  var ref2 = React.useState('pickup'); // 'pickup' | 'ship'
  var fulfillment = ref2[0], setFulfillment = ref2[1];

  var ref3 = React.useState('s1');
  var pickupStore = ref3[0], setPickupStore = ref3[1];

  var ref4 = React.useState({ name: '', email: '', phone: '' });
  var contact = ref4[0], setContact = ref4[1];

  var ref7 = React.useState({});
  var fieldErrors = ref7[0], setFieldErrors = ref7[1];

  var subtotal = cart.reduce(function(sum, item) {
    return sum + (item.price || 0) * (item.qty || 1);
  }, 0);
  var tax = subtotal * 0.04;
  var shipping = fulfillment === 'ship' ? 5.00 : 0;
  var total = subtotal + tax + shipping;

  var sellerGroups = groupBySeller(cart);

  function updateContact(key, val) {
    setContact(function(prev) { return Object.assign({}, prev, { [key]: val }); });
    setFieldErrors(function(prev) { return Object.assign({}, prev, { [key]: '' }); });
  }

  function validateContact() {
    var errors = {};
    if (!contact.name.trim()) { errors.name = 'Name is required'; }
    if (!contact.email.trim() || !contact.email.includes('@')) { errors.email = 'Valid email is required'; }
    if (!contact.phone.trim()) { errors.phone = 'Phone number is required'; }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // Empty cart
  if (cart.length === 0) {
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
            h('div', { className: 'checkout-step-num' }, step > num ? '✓' : num),
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
                    : h('div', { className: 'checkout-item-img-placeholder' }, '🃏')
                ),
                h('div', { className: 'checkout-item-details' },
                  h('div', { className: 'checkout-item-name' }, item.name),
                  h('div', { className: 'checkout-item-meta' },
                    item.set && h('span', null, item.set),
                    item.condition && h('span', { className: 'checkout-item-cond' }, item.condition)
                  )
                ),
                h('div', { className: 'checkout-item-right' },
                  h('div', { className: 'checkout-item-qty' }, '× ' + (item.qty || 1)),
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
          h('a', { href: '#cart', className: 'btn btn-secondary' }, '← Back to Cart'),
          h('button', {
            className: 'btn btn-primary',
            onClick: function() { setStep(2); }
          }, 'Continue to Fulfillment →')
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
                  h('div', { className: 'fulfillment-option-price' }, '$5.00 flat rate')
                )
              ),
              h('p', { className: 'fulfillment-option-desc' },
                'Flat-rate shipping anywhere on Guam. Seller will ship within 2–3 business days of order confirmation.'
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
          h('strong', null, ' ' + formatUSD(subtotal + tax + (fulfillment === 'ship' ? 5 : 0)))
        ),

        h('div', { className: 'checkout-actions' },
          h('button', { className: 'btn btn-secondary', onClick: function() { setStep(1); } }, '← Back'),
          h('button', {
            className: 'btn btn-primary',
            onClick: function() { setStep(3); }
          }, 'Continue to Contact →')
        )
      ),

      // ===== STEP 3: CONTACT INFO =====
      step === 3 && h('div', { className: 'checkout-section' },
        h('h2', { className: 'checkout-section-title' }, 'Contact Information'),
        h('p', { className: 'checkout-section-sub' },
          'We\'ll share your details with the seller so they can coordinate pickup or shipping.'
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
              placeholder: '(671) 123-4567',
              value: contact.phone,
              onChange: function(e) { updateContact('phone', e.target.value); }
            }),
            fieldErrors.phone && h('p', { className: 'form-error' }, fieldErrors.phone)
          )
        ),

        h('div', { className: 'checkout-actions' },
          h('button', { className: 'btn btn-secondary', onClick: function() { setStep(2); } }, '← Back'),
          h('button', {
            className: 'btn btn-primary',
            onClick: function() {
              if (validateContact()) { setStep(4); }
            }
          }, 'Continue →')
        )
      ),

      // ===== STEP 4: PAYMENT (Coming Soon) =====
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

        // Order total
        h('div', { className: 'checkout-order-summary' },
          h('div', { className: 'checkout-summary-row' },
            h('span', null, 'Subtotal'), h('span', null, formatUSD(subtotal))
          ),
          h('div', { className: 'checkout-summary-row' },
            h('span', null, 'Guam GRT (4%)'), h('span', null, formatUSD(tax))
          ),
          fulfillment === 'ship' && h('div', { className: 'checkout-summary-row' },
            h('span', null, 'Shipping'), h('span', null, formatUSD(5))
          ),
          h('div', { className: 'checkout-summary-row checkout-summary-total' },
            h('span', null, 'Total'), h('span', null, formatUSD(total))
          )
        ),

        // Coming Soon payment notice
        h('div', { className: 'sumup-payment-area' },
          h('div', { className: 'sumup-coming-soon' },
            h(CreditCardIcon, null),
            h('h3', null, 'Online Payment — Coming Soon'),
            h('p', null,
              'Secure payment processing via SumUp is being integrated. ',
              'For now, coordinate payment directly with the seller when you pick up or receive your cards.'
            ),
            h('p', { style: { fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)' } },
              'The investmtg.com marketplace operates on trust and transparency. ',
              'All transactions are between real community members.'
            )
          )
        ),

        h('div', { className: 'checkout-actions' },
          h('button', { className: 'btn btn-secondary', onClick: function() { setStep(3); } }, '← Back'),
          h('a', { href: '#store', className: 'btn btn-primary' }, 'Back to Marketplace')
        )
      )
    )
  );
}
