const router = require('express').Router();
const { getDB } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// GET /notifications
router.get('/', requireAuth(), async (req, res) => {
  try {
    const db = getDB();
    const notifications = await db.collection('notifications')
      .find({ user_id: req.user.user_id }, { projection: { _id: 0 } })
      .sort({ created_at: -1 }).limit(50).toArray();
    const unread_count = await db.collection('notifications').countDocuments({ user_id: req.user.user_id, read: false });
    res.json({ notifications, unread_count });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// PATCH /notifications/:id/read
router.patch('/:notif_id/read', requireAuth(), async (req, res) => {
  try {
    const db = getDB();
    await db.collection('notifications').updateOne({ notif_id: req.params.notif_id, user_id: req.user.user_id }, { $set: { read: true } });
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// POST /notifications/read-all
router.post('/read-all', requireAuth(), async (req, res) => {
  try {
    const db = getDB();
    await db.collection('notifications').updateMany({ user_id: req.user.user_id }, { $set: { read: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
