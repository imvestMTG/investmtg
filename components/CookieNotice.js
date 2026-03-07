/* CookieNotice.js — Minimal cookie notice for third-party services */
import React from 'react';
var h = React.createElement;

var COOKIE_KEY = 'investmtg-cookie-ok';

export function CookieNotice() {
  var ref = React.useState(function() {
    return localStorage.getItem(COOKIE_KEY) === '1';
  });
  var dismissed = ref[0], setDismissed = ref[1];

  if (dismissed) return null;

  function handleDismiss() {
    localStorage.setItem(COOKIE_KEY, '1');
    setDismissed(true);
  }

  return h('div', { className: 'cookie-notice', role: 'alert', 'aria-live': 'polite' },
    h('p', null,
      'This site uses essential cookies from third-party services (Cloudflare, SumUp) for security and payment processing. No tracking or advertising cookies are used. ',
      h('a', { href: '#privacy' }, 'Learn more')
    ),
    h('button', { onClick: handleDismiss, 'aria-label': 'Dismiss cookie notice' }, 'Got it')
  );
}
