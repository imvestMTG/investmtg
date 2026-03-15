/* auth.js — Authentication state management */
import React from 'react';
import { PROXY_BASE } from './config.js';
import { storageGetRaw, storageSetRaw, storageRemove } from './storage.js';

/* ── Auth state (singleton) ── */
var _user = null;
var _checked = false;
var _listeners = [];
var AUTH_TOKEN_KEY = 'investmtg_auth_token';

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

/** Get stored auth token */
function getToken() {
  return storageGetRaw(AUTH_TOKEN_KEY, null);
}

/** Store auth token */
function setToken(token) {
  if (token) {
    storageSetRaw(AUTH_TOKEN_KEY, token);
  } else {
    storageRemove(AUTH_TOKEN_KEY);
  }
}

/** Fetch with auth token header */
function authFetch(path, options) {
  var opts = options || {};
  var token = getToken();
  if (token) {
    opts.headers = opts.headers || {};
    opts.headers['Authorization'] = 'Bearer ' + token;
  }
  opts.credentials = 'include';
  var url = PROXY_BASE + path;
  return fetch(url, opts).then(function(res) {
    if (!res.ok) throw new Error('Auth error: ' + res.status);
    return res.json();
  });
}

/** On app startup: check URL for auth_token from OAuth callback.
 *  Checks both hash fragment (#auth_token=...) and legacy query param (?auth_token=...).
 *  Returns 'captured' if a token was found and saved (caller should proceed with auth check). */
function captureTokenFromURL() {
  try {
    var token = null;
    // Primary: read from hash fragment (secure — never sent to servers or referrer headers)
    var hash = window.location.hash || '';
    if (hash.indexOf('auth_token=') !== -1) {
      var hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      token = hashParams.get('auth_token');
    }
    // Fallback: legacy query param (for any cached redirects still using ?auth_token=)
    if (!token) {
      var params = new URLSearchParams(window.location.search);
      token = params.get('auth_token');
    }
    if (token) {
      setToken(token);
      // Clean the URL: strip auth_token from hash without triggering a page reload.
      // Use history.replaceState to update the URL silently, then let checkAuth()
      // continue with the stored token. Hash-only changes via location.replace()
      // do NOT trigger a full page reload, which left auth in a stuck state.
      try {
        window.history.replaceState(null, '', window.location.pathname + '#home');
      } catch(e2) {
        window.location.hash = '#home';
      }
      return 'captured';
    }
  } catch(e) {
    /* ignore — will fall through to normal auth check */
  }
  return null;
}

/** Check auth status with backend. Call once on app startup. */
export function checkAuth() {
  if (_checked) return Promise.resolve(_user);

  // First, check if we just came back from OAuth redirect.
  // If a token was captured from the URL, proceed to verify it with the backend.
  captureTokenFromURL();

  var token = getToken();
  if (!token) {
    _checked = true;
    _user = null;
    notifyAuth();
    return Promise.resolve(null);
  }

  _checked = true; // Set early to prevent double-calls
  return authFetch('/auth/me').then(function(data) {
    if (data && data.authenticated) {
      _user = data.user;
    } else {
      _user = null;
      setToken(null);
    }
    notifyAuth();
    return _user;
  }).catch(function(err) {
    console.error('[investMTG auth] checkAuth failed:', err);
    _user = null;
    setToken(null);
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
  return authFetch('/auth/logout', { method: 'DELETE' }).then(function() {
    _user = null;
    _checked = false;
    setToken(null);
    notifyAuth();
    window.location.reload();
  }).catch(function() {
    _user = null;
    _checked = false;
    setToken(null);
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
      }).catch(function() { setState({ user: null, loading: false }); });
    }
    return onAuthChange(function(u) {
      setState({ user: u, loading: false });
    });
  }, []);

  return state;
}

/** Export authFetch for use by other modules that need authenticated requests */
export { authFetch };
