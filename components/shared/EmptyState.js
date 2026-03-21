/* EmptyState.js — Reusable empty/no-data state */
import React from 'react';
var h = React.createElement;

/**
 * Consistent empty state across the app.
 * @param {Object} props
 * @param {string} [props.icon] — emoji or text icon
 * @param {string} [props.title] — heading
 * @param {string} [props.message] — description
 * @param {Function} [props.onAction] — CTA click handler
 * @param {string} [props.actionLabel] — CTA button text
 * @param {string} [props.className] — additional CSS class
 */
export function EmptyState(props) {
  var icon = props.icon;
  var title = props.title;
  var message = props.message;
  var onAction = props.onAction;
  var actionLabel = props.actionLabel;
  var className = props.className || '';

  return h('div', { className: 'empty-state ' + className },
    icon ? h('div', { className: 'empty-state-icon' }, icon) : null,
    title ? h('h3', { className: 'empty-state-title' }, title) : null,
    message ? h('p', { className: 'empty-state-message' }, message) : null,
    onAction && actionLabel
      ? h('button', {
          className: 'btn btn-primary btn-sm',
          onClick: onAction
        }, actionLabel)
      : null
  );
}
