/**
 * routes/notifications.js — In-app notifications
 *
 * GET  /api/notifications          — List notifications for current user (newest first)
 * PATCH /api/notifications/:id/read — Mark single notification as read
 * POST  /api/notifications/read-all — Mark all as read
 */
const express  = require('express');
const router   = express.Router();
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const TITLES = {
  new_bid: 'New Bid Received',
  bid_shortlisted: 'Bid Shortlisted',
  contract_awarded: 'Contract Awarded',
  contract_accepted: 'Contract Accepted',
  contract_declined: 'Contract Declined',
  vendor_verified: 'Vendor Verified',
  vendor_rejected: 'Vendor Verification Update',
  bidding_closed: 'Bidding Closed',
};

function notificationLink(notification, role) {
  if (!notification.related_id) return null;
  if (['new_bid', 'bid_shortlisted', 'bidding_closed'].includes(notification.type)) {
    return role === 'vendor'
      ? `/vendor/rfqs/${notification.related_id}`
      : `/client/rfqs/${notification.related_id}`;
  }
  if (notification.type?.startsWith('contract_')) {
    return role === 'vendor' ? '/vendor/contracts' : '/client/contracts';
  }
  return null;
}

function serializeNotification(notification, role) {
  return {
    ...notification,
    notif_id: notification.notif_id || notification.notification_id,
    title: notification.title || TITLES[notification.type] || 'Notification',
    read: notification.read ?? notification.is_read ?? false,
    created_at: notification.created_at || notification.createdAt,
    link: notification.link || notificationLink(notification, role),
  };
}

// GET /api/notifications
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user_id: req.user.user_id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return res.json({
    notifications: notifications.map(n => serializeNotification(n, req.user.role)),
    unread_count: notifications.filter(n => !n.is_read).length,
  });
}));

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, asyncHandler(async (req, res) => {
  await Notification.updateOne(
    { notification_id: req.params.id, user_id: req.user.user_id },
    { $set: { is_read: true } }
  );
  return res.json({ success: true });
}));

// POST /api/notifications/read-all
router.post('/read-all', requireAuth, asyncHandler(async (req, res) => {
  await Notification.updateMany({ user_id: req.user.user_id, is_read: false }, { $set: { is_read: true } });
  return res.json({ success: true });
}));

module.exports = router;
