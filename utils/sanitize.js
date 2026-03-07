/* sanitize.js — Shared input sanitization for investMTG */

/**
 * Sanitize user input — strips dangerous patterns, trims, limits length
 * @param {string} str - raw user input
 * @param {number} maxLen - maximum allowed length (default 500)
 * @returns {string} sanitized string
 */
export function sanitizeInput(str, maxLen) {
  if (!str) return '';
  if (!maxLen) maxLen = 500;
  var s = String(str).trim().slice(0, maxLen);
  // Remove null bytes and control characters (except newlines and tabs)
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Strip potential script injection patterns
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  s = s.replace(/javascript:/gi, '');
  s = s.replace(/on\w+\s*=/gi, '');
  return s;
}

/**
 * Validate email address with proper regex
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email) return false;
  // RFC 5322 simplified — covers 99.9% of real addresses
  var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Validate phone number (basic — at least 7 digits)
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  if (!phone) return false;
  var digits = phone.replace(/\D/g, '');
  return digits.length >= 7;
}
