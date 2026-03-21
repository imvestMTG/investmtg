/* LoadingSpinner.js — Reusable loading indicator */
import React from 'react';
var h = React.createElement;

/**
 * Consistent loading spinner across the app.
 * @param {Object} props
 * @param {'sm'|'md'|'lg'} [props.size='md'] — spinner size
 * @param {string} [props.text] — optional loading message
 * @param {boolean} [props.inline] — true for inline (e.g. inside buttons)
 * @param {boolean} [props.light] — true for white spinner (on dark/primary bg)
 * @param {string} [props.className] — additional CSS class
 */
export function LoadingSpinner(props) {
  var size = props.size || 'md';
  var text = props.text;
  var inline = props.inline;
  var light = props.light;
  var className = props.className || '';

  var spinnerClass = 'spinner spinner-' + size + (light ? ' spinner-light' : '');

  if (inline) {
    return h('span', { className: 'loading-inline ' + className },
      h('span', { className: spinnerClass }),
      text ? ' ' + text : null
    );
  }

  return h('div', { className: 'loading-state loading-state-' + size + ' ' + className },
    h('div', { className: spinnerClass }),
    text ? h('span', { className: 'loading-text' }, text) : null
  );
}
