const { getDB } = require('../config/db');
const { generateId, nowISO } = require('../utils/helpers');

async function createNotification(userId, type, title, message, link = null, data = {}) {
  const db = getDB();
  const notif = {
    notif_id: generateId('notif_'),
    user_id: userId,
    type,
    title,
    message,
    link,
    data,
    read: false,
    created_at: nowISO(),
  };
  await db.collection('notifications').insertOne(notif);
  return notif;
}

module.exports = { createNotification };
