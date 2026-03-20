/**
 * utils/helpers.js — Shared utility functions
 *
 * Developer note (Naraway team):
 *   generateId() mirrors the Python uuid4 hex[:12] pattern so IDs look the same
 *   across old data and new Node.js backend.
 */

const { v4: uuidv4 } = require('uuid');

/**
 * generateId — creates a short prefixed unique ID.
 * Examples: "rfq_a3b9c1d2e0f1", "bid_8f4e2c1a9b7d"
 * @param {string} prefix  — e.g. 'rfq_', 'bid_', 'usr_'
 */
function generateId(prefix = '') {
  return `${prefix}${uuidv4().replace(/-/g, '').slice(0, 12)}`;
}

/**
 * asyncHandler — wraps async route handlers so uncaught errors
 * are forwarded to Express error middleware (avoids try/catch everywhere).
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * sendError — standardised error response (consistent across all endpoints)
 * Response shape: { error: true, message, details (optional), timestamp }
 */
function sendError(res, status, message, details = null) {
  return res.status(status).json({
    error: true,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  });
}

/**
 * sanitizeString — removes HTML/XSS vectors, trims whitespace
 * @param {string} input — user input
 * @param {number} maxLength — max allowed length
 * @returns {string} — sanitized string
 */
function sanitizeString(input, maxLength = 500) {
  if (typeof input !== 'string') return '';
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // remove angle brackets (XSS)
    .trim();
}

/**
 * validateEmail — basic email format validation
 * @param {string} email
 * @returns {boolean}
 */
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * validatePrice — ensures price is valid decimal (0-99999.9999)
 * @param {number} price
 * @returns {boolean}
 */
function validatePrice(price) {
  const num = parseFloat(price);
  return !isNaN(num) && num >= 0 && num <= 99999.9999;
}

/**
 * validateQuantity — ensures quantity is positive number
 * @param {number} qty
 * @returns {boolean}
 */
function validateQuantity(qty) {
  const num = parseFloat(qty);
  return !isNaN(num) && num > 0;
}

module.exports = {
  generateId,
  asyncHandler,
  sendError,
  sanitizeString,
  validateEmail,
  validatePrice,
  validateQuantity,
};
