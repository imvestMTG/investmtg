/* auth.js — Authentication state management */
import React from 'react';
import { backendFetch } from './api.js';
import { PROXY_BASE } from './config.js';

/* ── Auth state (singleton) ── */
var _user = null;
var _checked = false;
var _listeners = [];

function notifyAuth() {
  _listeners.forEach(function(fn) { fn(_user); });
}

/** Subscribe to auth changes. Returns unsubscribe function. */
export function onAuthChange(fn) {
  _listeners.push(fn);
  return function() { _listeners = _listeners.filter(function(l) { return l !== fn; }); };
}

/** Get cached user (may be null before checkAuth completes) */
export function getUser() {
  return _user;
}

/** Check auth status with backend. Call once on app startup. */
export function checkAuth() {
  if (_checked) return Promise.resolve(_user);
  return backendFetch('/auth/me').then(function(data) {
    _checked = true;
    if (data && data.authenticated) {
      _user = data.user;
    } else {
      _user = null;
    }
    notifyAuth();
    return _user;
  }).catch(function() {
    _checked = true;
    _user = null;
    notifyAuth();
    return null;
  });
}

/** Redirect to Google sign-in */
export function signIn() {
  window.location.href = PROXY_BASE + '/auth/google';
}

/** Sign out — clear session and reload */
export function signOut() {
  return backendFetch('/auth/logout', { method: 'DELETE' }).then(function() {
    _user = null;
    _checked = false;
    notifyAuth();
    window.location.reload();
  }).catch(function() {
    _user = null;
    _checked = false;
    notifyAuth();
    window.location.reload();
  });
}

/** React hook: returns { user, loading } */
export function useAuth() {
  var ref = React.useState({ user: _user, loading: !_checked });
  var state = ref[0], setState = ref[1];

  React.useEffect(function() {
    // If not checked yet, trigger check
    if (!_checked) {
      checkAuth().then(function(u) {
        setState({ user: u, loading: false });
      });
    }
    return onAuthChange(function(u) {
      setState({ user: u, loading: false });
    });
  }, []);

  return state;
}
