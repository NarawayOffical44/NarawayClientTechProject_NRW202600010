const { v4: uuidv4 } = require('uuid');

function generateId(prefix = '') {
  return `${prefix}${uuidv4().replace(/-/g, '').slice(0, 12)}`;
}

function nowISO() {
  return new Date().toISOString();
}

function expiresAt(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

module.exports = { generateId, nowISO, expiresAt };
