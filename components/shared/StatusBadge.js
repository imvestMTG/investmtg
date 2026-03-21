/* StatusBadge.js — Reusable status/label badge */
import React from 'react';
var h = React.createElement;

/**
 * Consistent badge across the app.
 * @param {Object} props
 * @param {string} props.label — badge text
 * @param {'success'|'warning'|'error'|'neutral'|'info'|'gold'} [props.variant='neutral']
 * @param {string} [props.icon] — optional prefix icon/emoji
 * @param {'sm'|'md'} [props.size='md'] — badge size
 * @param {string} [props.title] — tooltip text
 * @param {string} [props.className] — additional CSS class
 */
export function StatusBadge(props) {
  var label = props.label;
  var variant = props.variant || 'neutral';
  var icon = props.icon;
  var size = props.size || 'md';
  var title = props.title;
  var className = props.className || '';

  return h('span', {
    className: 'status-badge status-badge--' + variant + ' status-badge--' + size + ' ' + className,
    title: title || null
  },
    icon ? h('span', { className: 'status-badge-icon' }, icon) : null,
    label
  );
}
