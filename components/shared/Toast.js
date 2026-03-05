/* shared/Toast.js */
import React from 'react';
var h = React.createElement;

var toastListeners = [];
var toastId = 0;

export function showToast(message, type) {
  var id = ++toastId;
  toastListeners.forEach(function(fn) { fn({ id: id, message: message, type: type || 'default' }); });
}

export function ToastContainer() {
  var ref = React.useState([]);
  var toasts = ref[0], setToasts = ref[1];

  React.useEffect(function() {
    function listener(toast) {
      setToasts(function(prev) { return prev.concat([toast]); });
      setTimeout(function() {
        setToasts(function(prev) { return prev.filter(function(t) { return t.id !== toast.id; }); });
      }, 3000);
    }
    toastListeners.push(listener);
    return function() {
      toastListeners = toastListeners.filter(function(fn) { return fn !== listener; });
    };
  }, []);

  if (toasts.length === 0) return null;

  return h('div', { className: 'toast-container', role: 'status', 'aria-live': 'polite' },
    toasts.map(function(toast) {
      return h('div', {
        key: toast.id,
        className: 'toast toast-' + toast.type
      }, toast.message);
    })
  );
}
