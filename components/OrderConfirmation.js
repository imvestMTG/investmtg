/* OrderConfirmation.js — Shown after successful reservation */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { CheckCircleIcon, StorePickupIcon, TruckIcon, MapPinIcon, OrderIcon } from './shared/Icons.js';
import { storageGet } from '../utils/storage.js';
import { STORAGE_KEYS } from '../utils/config.js';
import { backendFetch } from '../utils/api.js';
var h = React.createElement;

/* ── Status configuration ── */
var STATUS_MAP = {
  reserved:        { label: 'Reserved',        icon: '\uD83D\uDD12', cls: 'order-status--reserved' },
  pending_payment: { label: 'Payment Pending',  icon: '\u23F3',       cls: 'order-status--pending' },
  confirmed:       { label: 'Payment Confirmed', icon: '\u2705',       cls: 'order-status--paid' },
  paid:            { label: 'Paid',              icon: '\u2705',       cls: 'order-status--paid' },
  payment_failed:  { label: 'Payment Failed',    icon: '\u274C',       cls: 'order-status--failed' },
  expired:         { label: 'Expired',           icon: '\u23F0',       cls: 'order-status--expired' },
  fulfilled:       { label: 'Fulfilled',         icon: '\uD83D\uDCE6', cls: 'order-status--fulfilled' }
};

function getStatusInfo(status) {
  return STATUS_MAP[status] || { label: status || 'Unknown', icon: '\u2753', cls: 'order-status--reserved' };
}

export function OrderConfirmation(props) {
  var orderId = props.orderId;

  var ref1 = React.useState(null);
  var order = ref1[0], setOrder = ref1[1];

  var ref2 = React.useState(false);
  var loaded = ref2[0], setLoaded = ref2[1];

  var ref3 = React.useState(null);
  var paymentStatus = ref3[0], setPaymentStatus = ref3[1];

  React.useEffect(function() {
    if (!orderId) {
      setLoaded(true);
      return;
    }

    // Try server first, fall back to localStorage
    backendFetch('/api/orders/' + encodeURIComponent(orderId))
      .then(function(data) {
        if (data && data.order) {
          // Normalize server order shape to match localStorage shape
          var o = data.order;
          var normalized = {
            id: o.id,
            items: o.items || [],
            subtotal: o.subtotal,
            tax: o.tax,
            shipping: o.shipping || 0,
            total: o.total,
            fulfillment: o.fulfillment || 'pickup',
            pickupStore: o.pickup_store || null,
            contact: {
              name: o.contact_name || '',
              email: o.contact_email || '',
              phone: o.contact_phone || ''
            },
            date: o.created_at || new Date().toISOString(),
            paymentMethod: o.payment_method || 'reserve',
            status: o.status || 'reserved',
            paymentStatus: o.payment_status || null,
            checkoutId: o.checkout_id || null
          };
          setOrder(normalized);
        } else {
          loadFromLocal();
        }
        setLoaded(true);
      })
      .catch(function() {
        loadFromLocal();
        setLoaded(true);
      });

    function loadFromLocal() {
      var orders = storageGet(STORAGE_KEYS.ORDERS, []);
      if (!Array.isArray(orders)) orders = [];
      var found = orders.find(function(o) { return o.id === orderId; });
      setOrder(found || null);
    }
  }, [orderId]);

  /* ── Payment status polling for Stripe orders ── */
  React.useEffect(function() {
    if (!order || !orderId) return;
    // Poll if this is a Stripe payment and status isn't finalized
    var shouldPoll = (order.paymentMethod === 'stripe' || order.paymentMethod === 'sumup') &&
      order.status !== 'confirmed' &&
      order.status !== 'payment_failed' &&
      order.status !== 'expired' &&
      order.status !== 'fulfilled';
    if (!shouldPoll) return;

    var pollCount = 0;
    var maxPolls = 60; // 5 min at 5s intervals
    var timer = null;

    function pollStatus() {
      if (pollCount >= maxPolls) return;
      pollCount++;
      backendFetch('/api/orders/' + encodeURIComponent(orderId) + '/payment-status')
        .then(function(data) {
          if (data && data.payment_status) {
            setPaymentStatus(data.payment_status);
            // Update order status in local state
            if (data.status && data.status !== order.status) {
              setOrder(function(prev) {
                if (!prev) return prev;
                var updated = {};
                for (var k in prev) { updated[k] = prev[k]; }
                updated.status = data.status;
                updated.paymentStatus = data.payment_status;
                return updated;
              });
            }
            // Stop polling if finalized
            if (data.payment_status === 'paid' || data.payment_status === 'failed' || data.payment_status === 'expired') {
              return;
            }
          }
          timer = setTimeout(pollStatus, 5000);
        })
        .catch(function() {
          timer = setTimeout(pollStatus, 10000); // Slower retry on error
        });
    }

    // Start polling after 2s initial delay
    timer = setTimeout(pollStatus, 2000);

    return function() {
      if (timer) clearTimeout(timer);
    };
  }, [order && order.paymentMethod, order && order.status, orderId]);

  if (!loaded) {
    return h('div', { className: 'container order-confirmation-page' },
      h('div', { className: 'empty-state' },
        h('div', { className: 'skeleton skeleton-heading', style: { margin: '0 auto var(--space-4)' } }),
        h('div', { className: 'skeleton skeleton-text' })
      )
    );
  }

  if (!order) {
    return h('div', { className: 'container order-confirmation-page' },
      h('div', { className: 'empty-state' },
        h('h3', null, 'Order not found'),
        h('p', null, 'We couldn\'t find order ' + (orderId || '') + '. It may have been cleared.'),
        h('a', { href: '#orders', className: 'btn btn-primary' }, 'My Orders'),
        h('a', { href: '#store', className: 'btn btn-secondary', style: { marginLeft: '8px' } }, 'Browse Marketplace')
      )
    );
  }

  var orderDate = new Date(order.date);
  var dateStr = orderDate.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  var timeStr = orderDate.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  });

  return h('div', { className: 'container order-confirmation-page' },

    // Success banner — adapts to payment status
    (function() {
      var si = getStatusInfo(order.status);
      var isPaid = order.status === 'confirmed' || order.paymentStatus === 'paid';
      var isFailed = order.status === 'payment_failed' || order.paymentStatus === 'failed';
      var isPending = order.status === 'pending_payment' || order.paymentStatus === 'pending';
      var bannerCls = 'order-success-banner';
      if (isFailed) bannerCls += ' order-success-banner--failed';
      if (isPending) bannerCls += ' order-success-banner--pending';

      var title = 'Order Reserved!';
      var subtitle = 'Your order has been reserved.';
      if (isPaid) {
        title = 'Payment Confirmed!';
        subtitle = 'Your payment has been received.';
      } else if (isFailed) {
        title = 'Payment Failed';
        subtitle = 'There was an issue processing your payment. Please try again.';
      } else if (isPending) {
        title = 'Processing Payment\u2026';
        subtitle = 'We\u2019re waiting for payment confirmation.';
      }

      return h('div', { className: bannerCls },
        h('div', { className: 'order-success-icon' },
          isPaid ? h(CheckCircleIcon, null) : h('span', { style: { fontSize: '28px' } }, si.icon)
        ),
        h('div', null,
          h('h1', { className: 'order-success-title' }, title),
          h('p', { className: 'order-success-sub' },
            'Thank you, ', h('strong', null, order.contact.name), '. ', subtitle
          )
        )
      );
    })(),

    h('div', { className: 'order-details-grid' },

      // Order info card
      h('div', { className: 'order-card' },
        h('div', { className: 'order-card-header' },
          h(OrderIcon, null),
          h('h2', null, 'Order Details')
        ),
        h('div', { className: 'order-info-table' },
          h('div', { className: 'order-info-row' },
            h('span', { className: 'order-info-label' }, 'Order Number'),
            h('span', { className: 'order-info-value order-id' }, order.id)
          ),
          h('div', { className: 'order-info-row' },
            h('span', { className: 'order-info-label' }, 'Date'),
            h('span', { className: 'order-info-value' }, dateStr + ' at ' + timeStr)
          ),
          h('div', { className: 'order-info-row' },
            h('span', { className: 'order-info-label' }, 'Status'),
            (function() {
              var si = getStatusInfo(order.status);
              return h('span', { className: 'order-status-badge ' + si.cls },
                si.icon + ' ' + si.label
              );
            })()
          )
        )
      ),

      // Contact card
      h('div', { className: 'order-card' },
        h('div', { className: 'order-card-header' },
          h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 18, height: 18, viewBox: '0 0 24 24',
            fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round',
            strokeLinejoin: 'round', 'aria-hidden': 'true' },
            h('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
            h('circle', { cx: 12, cy: 7, r: 4 })
          ),
          h('h2', null, 'Your Contact')
        ),
        h('div', { className: 'order-info-table' },
          h('div', { className: 'order-info-row' },
            h('span', { className: 'order-info-label' }, 'Name'),
            h('span', { className: 'order-info-value' }, order.contact.name)
          ),
          h('div', { className: 'order-info-row' },
            h('span', { className: 'order-info-label' }, 'Email'),
            h('span', { className: 'order-info-value' }, order.contact.email)
          ),
          h('div', { className: 'order-info-row' },
            h('span', { className: 'order-info-label' }, 'Phone'),
            h('span', { className: 'order-info-value' }, order.contact.phone)
          )
        )
      ),

      // Fulfillment card
      h('div', { className: 'order-card' },
        h('div', { className: 'order-card-header' },
          order.fulfillment === 'pickup' ? h(StorePickupIcon, null) : h(TruckIcon, null),
          h('h2', null, order.fulfillment === 'pickup' ? 'Local Pickup' : 'Shipping')
        ),
        order.fulfillment === 'pickup' && order.pickupStore
          ? h('div', { className: 'order-info-table' },
              h('div', { className: 'order-info-row' },
                h('span', { className: 'order-info-label' }, 'Store'),
                h('span', { className: 'order-info-value' }, order.pickupStore.name)
              ),
              h('div', { className: 'order-info-row' },
                h('span', { className: 'order-info-label' }, 'Address'),
                h('span', { className: 'order-info-value' }, order.pickupStore.address)
              ),
              order.pickupStore.phone && h('div', { className: 'order-info-row' },
                h('span', { className: 'order-info-label' }, 'Phone'),
                h('a', { href: 'tel:' + order.pickupStore.phone, className: 'order-info-value order-link' },
                  order.pickupStore.phone
                )
              ),
              h('p', { className: 'order-fulfillment-note' },
                'Contact the seller to arrange your pickup time. Bring your order number (',
                h('strong', null, order.id), ').'
              )
            )
          : h('div', null,
              h('p', { className: 'order-fulfillment-note' },
                'Your order will be shipped to your address on Guam. The seller will contact you at ',
                h('strong', null, order.contact.email), ' or ',
                h('strong', null, order.contact.phone), ' within 1\u20132 business days to confirm shipping details.'
              )
            )
      ),

      // Items card
      h('div', { className: 'order-card order-items-card' },
        h('div', { className: 'order-card-header' },
          h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 18, height: 18, viewBox: '0 0 24 24',
            fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round',
            strokeLinejoin: 'round', 'aria-hidden': 'true' },
            h('circle', { cx: 9, cy: 21, r: 1 }),
            h('circle', { cx: 20, cy: 21, r: 1 }),
            h('path', { d: 'M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6' })
          ),
          h('h2', null, 'Items Ordered')
        ),
        h('div', { className: 'order-items-list' },
          order.items.map(function(item) {
            return h('div', { key: item.id, className: 'order-item-row' },
              h('div', { className: 'order-item-img' },
                item.image
                  ? h('img', { src: item.image, alt: item.name, loading: 'lazy' })
                  : h('div', { className: 'order-item-img-placeholder' }, '\uD83C\uDCCF')
              ),
              h('div', { className: 'order-item-details' },
                h('div', { className: 'order-item-name' }, item.name),
                h('div', { className: 'order-item-meta' },
                  item.set && h('span', null, item.set),
                  item.condition && h('span', { className: 'order-item-cond' }, item.condition),
                  item.seller && h('span', null, 'Seller: ' + item.seller)
                )
              ),
              h('div', { className: 'order-item-right' },
                h('div', { className: 'order-item-qty' }, '\u00D7 ' + (item.qty || 1)),
                h('div', { className: 'order-item-price' }, formatUSD((item.price || 0) * (item.qty || 1)))
              )
            );
          })
        ),

        // Totals
        h('div', { className: 'order-totals' },
          h('div', { className: 'order-total-row' },
            h('span', null, 'Subtotal'), h('span', null, formatUSD(order.subtotal))
          ),
          order.shipping > 0 && h('div', { className: 'order-total-row' },
            h('span', null, 'Shipping'), h('span', null, formatUSD(order.shipping))
          ),
          h('div', { className: 'order-total-row order-grand-total' },
            h('span', null,
              (order.status === 'confirmed' || order.paymentStatus === 'paid')
                ? 'Total Paid'
                : 'Total Due'
            ),
            h('span', null, formatUSD(order.total))
          )
        )
      )
    ),

    // Actions
    h('div', { className: 'order-confirmation-actions' },
      h('a', { href: '#orders', className: 'btn btn-primary' }, 'View All Orders'),
      h('a', { href: '#store', className: 'btn btn-secondary' }, 'Continue Shopping')
    ),

    h('p', { className: 'order-save-note' },
      'Your order details are saved. Order ID: ',
      h('strong', null, order.id)
    )
  );
}
