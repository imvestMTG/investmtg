/* shared/ErrorBoundary.js — Catches render errors to prevent full app crash */
import React from 'react';
var h = React.createElement;

var ErrorFallback = function(props) {
  return h('div', {
    className: 'error-boundary-fallback',
    style: {
      padding: 'var(--space-8)',
      textAlign: 'center',
      maxWidth: '500px',
      margin: '0 auto'
    }
  },
    h('h2', { style: { marginBottom: 'var(--space-4)', color: 'var(--color-text)' } }, 'Something went wrong'),
    h('p', { style: { color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' } },
      'This section encountered an error. The rest of the site should still work.'
    ),
    h('button', {
      className: 'btn btn-primary',
      onClick: function() {
        window.location.hash = '';
        window.location.reload();
      }
    }, 'Go Home')
  );
};

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
}

ErrorBoundary.getDerivedStateFromError = function() {
  return { hasError: true };
};

ErrorBoundary.prototype.componentDidCatch = function(error, info) {
  // Log error for debugging (gated behind debug mode)
  if (window.location.hash.includes('debug')) {
    console.error('ErrorBoundary caught:', error, info);
  }
};

ErrorBoundary.prototype.render = function() {
  if (this.state.hasError) {
    return h(ErrorFallback);
  }
  return this.props.children;
};
