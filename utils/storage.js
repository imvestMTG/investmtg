/* storage.js — Safe localStorage wrapper
 *
 * All localStorage reads/writes go through this module.
 * Guards against:
 *  - corrupted values (the string "undefined", "null", invalid JSON)
 *  - localStorage being unavailable (private browsing, storage full)
 *  - JSON.stringify(undefined) silently producing undefined
 *
 * Usage:
 *   import { storageGet, storageSet, storageRemove } from './storage.js';
 *   var cart = storageGet('investmtg-cart', []);
 *   storageSet('investmtg-cart', cart);
 */

/**
 * Read a JSON value from localStorage.
 * Returns `fallback` if the key is missing, corrupted, or unparseable.
 */
export function storageGet(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (raw == null || raw === 'undefined' || raw === 'null' || raw === '') {
      return fallback;
    }
    return JSON.parse(raw);
  } catch (e) {
    // Corrupted value — remove it so it doesn't keep crashing
    try { localStorage.removeItem(key); } catch (e2) { /* ignore */ }
    return fallback;
  }
}

/**
 * Write a JSON value to localStorage.
 * Refuses to write undefined/null — writes fallback instead.
 */
export function storageSet(key, value) {
  try {
    if (value === undefined || value === null) {
      localStorage.removeItem(key);
      return;
    }
    var serialized = JSON.stringify(value);
    if (serialized === undefined) {
      // JSON.stringify can return undefined for symbols, functions, etc.
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, serialized);
  } catch (e) {
    // Storage full or unavailable — ignore silently
  }
}

/**
 * Read a plain string from localStorage (not JSON).
 * Returns `fallback` if missing or unavailable.
 */
export function storageGetRaw(key, fallback) {
  try {
    var val = localStorage.getItem(key);
    return val != null ? val : fallback;
  } catch (e) {
    return fallback;
  }
}

/**
 * Write a plain string to localStorage (not JSON).
 */
export function storageSetRaw(key, value) {
  try {
    if (value == null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, String(value));
    }
  } catch (e) {
    // Storage full or unavailable
  }
}

/**
 * Remove a key from localStorage.
 */
export function storageRemove(key) {
  try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
}
