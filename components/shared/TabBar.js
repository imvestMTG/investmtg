/* TabBar.js — Reusable tab navigation */
import React from 'react';
var h = React.createElement;

/**
 * Consistent tab bar across the app.
 * @param {Object} props
 * @param {Array<{key:string, label:string, icon?:string, count?:number}>} props.tabs
 * @param {string} props.activeKey — currently active tab key
 * @param {Function} props.onChange — called with tab key on click
 * @param {string} [props.className] — additional CSS class for the container
 * @param {string} [props.variant] — 'default' | 'compact' | 'pill'
 */
export function TabBar(props) {
  var tabs = props.tabs || [];
  var activeKey = props.activeKey;
  var onChange = props.onChange;
  var className = props.className || '';
  var variant = props.variant || 'default';

  return h('div', { className: 'tab-bar tab-bar--' + variant + ' ' + className, role: 'tablist' },
    tabs.map(function(tab) {
      var isActive = tab.key === activeKey;
      return h('button', {
        key: tab.key,
        type: 'button',
        role: 'tab',
        'aria-selected': isActive ? 'true' : 'false',
        className: 'tab-bar-item' + (isActive ? ' tab-bar-item--active' : ''),
        onClick: function() { onChange(tab.key); }
      },
        tab.icon ? h('span', { className: 'tab-bar-icon' }, tab.icon) : null,
        h('span', { className: 'tab-bar-label' }, tab.label),
        tab.count != null ? h('span', { className: 'tab-bar-count' }, tab.count) : null
      );
    })
  );
}
