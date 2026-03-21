/* ShopView.js — Seller storefront for Stripe product checkout */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { stripeListProducts, stripeCreateCheckout } from '../utils/api.js';

var h = React.createElement;

/**
 * Buyer-facing storefront showing a seller's Stripe products.
 * Route: #shop/:sellerId
 *
 * Props:
 *   sellerId - the seller ID from the URL
 */
export function ShopView(props) {
  var sellerId = props.sellerId;

  var refProducts = React.useState([]);
  var products = refProducts[0], setProducts = refProducts[1];

  var refLoading = React.useState(true);
  var loading = refLoading[0], setLoading = refLoading[1];

  var refError = React.useState(null);
  var error = refError[0], setError = refError[1];

  var refCheckoutLoading = React.useState(null);
  var checkoutLoading = refCheckoutLoading[0], setCheckoutLoading = refCheckoutLoading[1];

  React.useEffect(function() {
    if (!sellerId) {
      setError('No seller specified.');
      setLoading(false);
      return;
    }
    setLoading(true);
    stripeListProducts(sellerId).then(function(data) {
      setLoading(false);
      if (data && data.products) {
        setProducts(data.products.filter(function(p) { return p.active !== false; }));
      } else if (data && Array.isArray(data)) {
        setProducts(data.filter(function(p) { return p.active !== false; }));
      } else if (data && data.error) {
        setError(data.error);
      }
    }).catch(function(err) {
      setLoading(false);
      setError(err.message || 'Failed to load products.');
    });
  }, [sellerId]);

  function handleBuy(product) {
    var priceId = product.default_price && product.default_price.id
      ? product.default_price.id
      : (product.price_id || null);

    if (!priceId) {
      setError('This product has no price configured.');
      return;
    }

    setCheckoutLoading(product.id);
    setError(null);

    stripeCreateCheckout(sellerId, priceId, 1).then(function(data) {
      setCheckoutLoading(null);
      if (data && (data.checkout_url || data.url)) {
        window.location.href = data.checkout_url || data.url;
      } else if (data && data.error) {
        setError(data.error);
      }
    }).catch(function(err) {
      setCheckoutLoading(null);
      setError(err.message || 'Failed to start checkout.');
    });
  }

  if (loading) {
    return h('div', { className: 'container shop-page' },
      h('p', { style: { textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' } },
        'Loading storefront\u2026'
      )
    );
  }

  return h('div', { className: 'container shop-page' },

    h('div', { className: 'shop-header' },
      h('h1', { className: 'shop-title' }, 'Seller Storefront'),
      h('p', { className: 'shop-subtitle' },
        'Browse and purchase items directly. Payments are processed securely via Stripe.'
      )
    ),

    error && h('div', { className: 'flash-message flash-error', style: { marginBottom: 'var(--space-4)' } }, error),

    products.length === 0 && !error
      ? h('div', { className: 'empty-state' },
          h('h3', null, 'No products available'),
          h('p', null, 'This seller has not listed any products yet.')
        )
      : h('div', { className: 'shop-grid' },
          products.map(function(prod) {
            var priceAmt = prod.default_price && prod.default_price.unit_amount
              ? prod.default_price.unit_amount
              : (prod.price_cents || 0);
            var priceDisplay = formatUSD(priceAmt / 100);
            var isBuying = checkoutLoading === prod.id;

            return h('div', { key: prod.id, className: 'shop-card' },
              h('div', { className: 'shop-card-body' },
                h('h3', { className: 'shop-card-name' }, prod.name || 'Untitled'),
                prod.description && h('p', { className: 'shop-card-desc' }, prod.description),
                h('div', { className: 'shop-card-price' }, priceDisplay)
              ),
              h('button', {
                className: 'btn btn-primary shop-buy-btn',
                onClick: function() { handleBuy(prod); },
                disabled: isBuying
              }, isBuying ? 'Redirecting\u2026' : 'Buy Now')
            );
          })
        ),

    h('div', { className: 'shop-footer' },
      h('p', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center' } },
        'A 5% platform fee is applied to each transaction. ',
        h('a', { href: '#pricing', style: { color: 'var(--color-primary)' } }, 'Learn more')
      )
    )
  );
}
