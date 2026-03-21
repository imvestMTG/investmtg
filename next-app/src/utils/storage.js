/**
 * storage.js — Safe localStorage wrapper (modern syntax)
 * All localStorage access goes through here. Never use raw localStorage.
 */

export function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[storage] Failed to write:', key, e.message);
  }
}

export function storageGetRaw(key, fallback = '') {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export function storageSetRaw(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('[storage] Failed to write raw:', key, e.message);
  }
}

export function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
