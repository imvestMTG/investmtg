/* OrderConfirmation.js — Shown after successful payment */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { CheckCircleIcon, StorePickupIcon, TruckIcon, MapPinIcon, PhoneIcon, OrderIcon } from './shared/Icons.js';
var h = React.createElement;

export function OrderConfirmation({ orderId }) {
  var ref1 = React.useState(null);
  var order = ref1[0], setOrder = ref1[1];

  var ref2 = React.useState(false);
  var loaded = ref2[0], setLoaded = ref2[1];

  React.useEffect(function() {
    // Load the order from localStorage
    var orders = JSON.parse(localStorage.getItem('investmtg-orders') || '[]');
    var found = orders.find(function(o) { return o.id === orderId; });
    setOrder(found || null);
    setLoaded(true);
  }, [orderId]);

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
        h('a', { href: '#store', className: 'btn btn-primary' }, 'Browse Marketplace')
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

    // Success banner
    h('div', { className: 'order-success-banner' },
      h('div', { className: 'order-success-icon' },
        h(CheckCircleIcon, null)
      ),
      h('div', null,
        h('h1', { className: 'order-success-title' }, 'Order Confirmed!'),
        h('p', { className: 'order-success-sub' },
          'Thank you, ', h('strong', null, order.contact.name), '. Your order has been placed.'
        )
      )
    ),

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
            h('span', { className: 'order-status-badge' }, '✓ Confirmed')
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
              h('div', { className: 'order-info-row' },
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
                h('strong', null, order.contact.phone), ' within 1–2 business days to confirm shipping details.'
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
                  : h('div', { className: 'order-item-img-placeholder' }, '🃏')
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
                h('div', { className: 'order-item-qty' }, '× ' + (item.qty || 1)),
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
          h('div', { className: 'order-total-row' },
            h('span', null, 'Guam GRT (4%)'), h('span', null, formatUSD(order.tax))
          ),
          order.shipping > 0 && h('div', { className: 'order-total-row' },
            h('span', null, 'Shipping'), h('span', null, formatUSD(order.shipping))
          ),
          h('div', { className: 'order-total-row order-grand-total' },
            h('span', null, 'Total Paid'), h('span', null, formatUSD(order.total))
          )
        )
      )
    ),

    // Actions
    h('div', { className: 'order-confirmation-actions' },
      h('a', { href: '#store', className: 'btn btn-primary' }, 'Continue Shopping'),
      h('a', { href: '#portfolio', className: 'btn btn-secondary' }, 'View Portfolio')
    ),

    h('p', { className: 'order-save-note' },
      'Your order details are saved locally in your browser. Order ID: ',
      h('strong', null, order.id)
    )
  );
}
