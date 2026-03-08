/* OrdersView.js — My Orders page (#orders) */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { storageGet } from '../utils/storage.js';
var h = React.createElement;

function statusBadgeClass(status) {
  if (status === 'reserved') return 'order-status-badge order-status-reserved';
  if (status === 'confirmed') return 'order-status-badge order-status-confirmed';
  if (status === 'completed') return 'order-status-badge order-status-completed';
  if (status === 'cancelled') return 'order-status-badge order-status-cancelled';
  return 'order-status-badge';
}

function statusLabel(status) {
  if (status === 'reserved') return 'Reserved';
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Reserved';
}

function fulfillmentLabel(fulfillment) {
  if (fulfillment === 'ship') return 'Ship to Guam';
  return 'Local Pickup';
}

export function OrdersView() {
  var ref1 = React.useState([]);
  var orders = ref1[0], setOrders = ref1[1];

  var ref2 = React.useState(true);
  var loading = ref2[0], setLoading = ref2[1];

  React.useEffect(function() {
    var stored = storageGet('investmtg-orders', []);
    if (!Array.isArray(stored)) stored = [];
    // Sort by date descending (newest first)
    stored = stored.slice().sort(function(a, b) {
      var da = new Date(a.date || a.created_at || 0).getTime();
      var db = new Date(b.date || b.created_at || 0).getTime();
      return db - da;
    });
    setOrders(stored);
    setLoading(false);
  }, []);

  if (loading) {
    return h('div', { className: 'container orders-page' },
      h('div', { className: 'empty-state' },
        h('div', { className: 'skeleton skeleton-heading', style: { margin: '0 auto var(--space-4)' } }),
        h('div', { className: 'skeleton skeleton-text' })
      )
    );
  }

  return h('div', { className: 'container orders-page' },
    h('div', { className: 'orders-header' },
      h('h1', { className: 'page-heading' }, 'My Orders'),
      h('p', { className: 'orders-subheading' },
        orders.length > 0
          ? orders.length + ' order' + (orders.length === 1 ? '' : 's') + ' placed'
          : null
      )
    ),

    orders.length === 0
      ? h('div', { className: 'empty-state' },
          h('div', { className: 'empty-state-icon' }, '\uD83D\uDCE6'),
          h('h3', null, 'No orders yet'),
          h('p', null, 'No orders yet. Browse the marketplace to get started.'),
          h('a', { href: '#store', className: 'btn btn-primary' }, 'Browse Marketplace')
        )
      : h('div', { className: 'orders-list' },
          orders.map(function(order) {
            var orderDate = new Date(order.date || order.created_at || 0);
            var dateStr = orderDate.toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric'
            });
            var itemCount = Array.isArray(order.items) ? order.items.reduce(function(sum, item) {
              return sum + (item.qty || 1);
            }, 0) : 0;
            var status = order.status || 'reserved';

            return h('a', {
              key: order.id,
              href: '#order/' + order.id,
              className: 'order-list-card',
              style: { textDecoration: 'none', display: 'block' }
            },
              h('div', { className: 'order-list-card-inner' },
                h('div', { className: 'order-list-card-left' },
                  h('div', { className: 'order-list-card-id' },
                    h('span', { className: 'order-list-label' }, 'Order'),
                    h('span', { className: 'order-list-id-value' }, order.id)
                  ),
                  h('div', { className: 'order-list-card-date' }, dateStr)
                ),
                h('div', { className: 'order-list-card-meta' },
                  h('div', { className: 'order-list-card-items' },
                    itemCount + ' item' + (itemCount === 1 ? '' : 's')
                  ),
                  h('div', { className: 'order-list-card-fulfillment' },
                    fulfillmentLabel(order.fulfillment)
                  )
                ),
                h('div', { className: 'order-list-card-right' },
                  h('div', { className: 'order-list-card-total' },
                    formatUSD(order.total)
                  ),
                  h('span', { className: statusBadgeClass(status) },
                    statusLabel(status)
                  )
                ),
                h('div', { className: 'order-list-card-arrow' }, '\u203A')
              )
            );
          })
        )
  );
}
