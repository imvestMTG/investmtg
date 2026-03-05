/* shared/SkeletonCard.js */
import React from 'react';
var h = React.createElement;

export function SkeletonCard() {
  return h('div', { className: 'skeleton-card', 'aria-hidden': 'true' },
    h('div', { className: 'skeleton skeleton-image', style: { marginBottom: 'var(--space-3)' } }),
    h('div', { className: 'skeleton skeleton-text' }),
    h('div', { className: 'skeleton skeleton-text' }),
    h('div', { className: 'skeleton skeleton-text', style: { width: '60%' } })
  );
}
