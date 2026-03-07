/* shared/ConfirmModal.js — Replaces window.confirm and alert with styled modal */
import React from 'react';
var h = React.createElement;

/**
 * ConfirmModal — displays a modal with message, confirm, and cancel buttons
 * Props: { title, message, confirmLabel, cancelLabel, onConfirm, onCancel, isAlert }
 * If isAlert is true, only shows a single OK button (replaces alert())
 */
export function ConfirmModal(props) {
  var title = props.title || 'Confirm';
  var message = props.message || '';
  var confirmLabel = props.confirmLabel || 'Confirm';
  var cancelLabel = props.cancelLabel || 'Cancel';
  var isAlert = props.isAlert || false;

  React.useEffect(function() {
    function onEsc(e) {
      if (e.key === 'Escape') {
        if (isAlert) { props.onConfirm(); }
        else { props.onCancel(); }
      }
    }
    document.addEventListener('keydown', onEsc);
    return function() { document.removeEventListener('keydown', onEsc); };
  }, []);

  return h('div', {
    className: 'confirm-modal-overlay',
    onClick: function(e) {
      if (e.target === e.currentTarget) {
        if (isAlert) props.onConfirm();
        else props.onCancel();
      }
    }
  },
    h('div', { className: 'confirm-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'confirm-title' },
      h('h3', { id: 'confirm-title', className: 'confirm-modal-title' }, title),
      h('p', { className: 'confirm-modal-message' }, message),
      h('div', { className: 'confirm-modal-actions' },
        !isAlert && h('button', {
          className: 'btn btn-secondary',
          onClick: props.onCancel,
          autoFocus: true
        }, cancelLabel),
        h('button', {
          className: 'btn btn-primary',
          onClick: props.onConfirm,
          autoFocus: isAlert
        }, isAlert ? 'OK' : confirmLabel)
      )
    )
  );
}
