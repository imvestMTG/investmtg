/* TermsGate.js — First-visit Terms of Service acceptance banner */
import React from 'react';
import { storageGetRaw, storageSetRaw } from '../utils/storage.js';
var h = React.createElement;

var TOS_KEY = 'investmtg-tos-accepted';
var TOS_VERSION = '2026-03-15';

export function TermsGate() {
  var ref = React.useState(function() {
    var stored = storageGetRaw(TOS_KEY, '');
    return stored === TOS_VERSION;
  });
  var accepted = ref[0], setAccepted = ref[1];

  if (accepted) return null;

  function handleAccept() {
    storageSetRaw(TOS_KEY, TOS_VERSION);
    setAccepted(true);
  }

  return h('div', { className: 'tos-gate-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Terms of Service' },
    h('div', { className: 'tos-gate-modal' },
      h('div', { className: 'tos-gate-icon' }, '\uD83D\uDCC4'),
      h('h2', { className: 'tos-gate-title' }, 'Terms of Service'),
      h('p', { className: 'tos-gate-message' },
        'By using investMTG, you agree to our ',
        h('a', { href: '#terms', className: 'tos-gate-link' }, 'Terms of Service'),
        ' and ',
        h('a', { href: '#privacy', className: 'tos-gate-link' }, 'Privacy Policy'),
        '. investMTG is a Guam-only community marketplace for Magic: The Gathering cards.'
      ),
      h('div', { className: 'tos-gate-actions' },
        h('button', {
          className: 'btn btn-primary btn-lg tos-gate-accept',
          onClick: handleAccept
        }, 'I Agree')
      ),
      h('p', { className: 'tos-gate-footnote' },
        'You can review the full terms at any time from the footer.'
      )
    )
  );
}

/* Reusable ToS checkbox for forms (checkout, seller registration) */
export function TermsCheckbox(props) {
  var checked = props.checked;
  var onChange = props.onChange;
  var error = props.error;

  return h('div', { className: 'form-group tos-checkbox-group' },
    h('label', { className: 'tos-checkbox-label' },
      h('input', {
        type: 'checkbox',
        checked: checked,
        onChange: function(e) { onChange(e.target.checked); },
        className: 'tos-checkbox-input'
      }),
      h('span', { className: 'tos-checkbox-text' },
        'I agree to the ',
        h('a', { href: '#terms', target: '_blank', rel: 'noopener' }, 'Terms of Service'),
        ' and ',
        h('a', { href: '#privacy', target: '_blank', rel: 'noopener' }, 'Privacy Policy')
      )
    ),
    error && h('p', { className: 'form-error' }, error)
  );
}
