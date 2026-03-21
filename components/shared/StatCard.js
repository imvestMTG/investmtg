/* StatCard.js — Reusable stat/metric card */
import React from 'react';
var h = React.createElement;

/**
 * Consistent stat/metric display card.
 * @param {Object} props
 * @param {string} props.label — metric label (e.g. "Total Sales")
 * @param {string|number} props.value — primary value
 * @param {string} [props.sub] — secondary text/subtitle
 * @param {string} [props.icon] — optional icon/emoji
 * @param {'default'|'primary'|'success'|'warning'|'error'} [props.variant='default']
 * @param {string} [props.className] — additional CSS class
 */
export function StatCard(props) {
  var label = props.label;
  var value = props.value;
  var sub = props.sub;
  var icon = props.icon;
  var variant = props.variant || 'default';
  var className = props.className || '';

  return h('div', { className: 'stat-card stat-card--' + variant + ' ' + className },
    icon ? h('div', { className: 'stat-card-icon' }, icon) : null,
    h('div', { className: 'stat-card-label' }, label),
    h('div', { className: 'stat-card-value' }, value),
    sub ? h('div', { className: 'stat-card-sub' }, sub) : null
  );
}

/**
 * Grid container for StatCards.
 * @param {Object} props
 * @param {number} [props.columns] — min columns (auto-fit by default)
 * @param {string} [props.className] — additional CSS class
 * @param {*} props.children — StatCard elements
 */
export function StatGrid(props) {
  var className = props.className || '';
  return h('div', { className: 'stat-grid ' + className }, props.children);
}
