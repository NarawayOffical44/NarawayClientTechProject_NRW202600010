const router = require('express').Router();
const { getDB } = require('../config/db');
const { nowISO } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../services/notifications');
const { sendEmail, baseHtml } = require('../services/email');

// GET /admin/users
router.get('/users', requireAuth(['admin']), async (req, res) => {
  try {
    const db = getDB();
    const users = await db.collection('users').find({}, { projection: { _id: 0, password_hash: 0 } }).sort({ created_at: -1 }).toArray();
    res.json(users);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// PATCH /admin/users/:id
router.patch('/users/:user_id', requireAuth(['admin']), async (req, res) => {
  try {
    const db = getDB();
    const { role, verification_status, is_active } = req.body;
    const update = {};
    if (role !== undefined) update.role = role;
    if (is_active !== undefined) update.is_active = is_active;
    if (!Object.keys(update).length && verification_status === undefined) return res.status(400).json({ detail: 'No update data' });
    if (Object.keys(update).length) await db.collection('users').updateOne({ user_id: req.params.user_id }, { $set: update });

    if (verification_status !== undefined) {
      await db.collection('vendor_profiles').updateOne({ user_id: req.params.user_id }, { $set: { verification_status } });
      const targetUser = await db.collection('users').findOne({ user_id: req.params.user_id });
      if (verification_status === 'verified') {
        await createNotification(req.params.user_id, 'vendor_verified', 'Profile Verified!',
          'Your vendor profile has been verified by Renergizr. You now have full marketplace access.');
        if (targetUser) {
          const body = `<p>Dear ${targetUser.name},</p>
            <p>Your vendor profile on Renergizr has been <strong style="color:#10b981">verified</strong>!</p>
            <p>You now have full marketplace access and can bid on all open RFQs.</p>`;
          await sendEmail(targetUser.email, 'Vendor Profile Verified — Renergizr', baseHtml('Profile Verified!', body));
        }
      } else if (verification_status === 'rejected') {
        await createNotification(req.params.user_id, 'vendor_rejected', 'Verification Update',
          'Your vendor profile verification requires additional documentation. Please update your compliance documents.');
      }
    }
    res.json({ message: 'User updated' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// GET /admin/vendors
router.get('/vendors', requireAuth(['admin']), async (req, res) => {
  try {
    const db = getDB();
    const vendors = await db.collection('vendor_profiles').find({}, { projection: { _id: 0 } }).toArray();
    const enriched = await Promise.all(vendors.map(async v => {
      const u = await db.collection('users').findOne({ user_id: v.user_id }, { projection: { _id: 0, email: 1, name: 1, is_active: 1, created_at: 1 } });
      return { ...v, user: u };
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// GET /admin/analytics
router.get('/analytics', requireAuth(['admin']), async (req, res) => {
  try {
    const db = getDB();
    const [total_users, total_clients, total_vendors, total_rfqs, open_rfqs, awarded_rfqs, total_bids, total_contracts, active_contracts, pending_vendors, verified_vendors] = await Promise.all([
      db.collection('users').countDocuments({}),
      db.collection('users').countDocuments({ role: 'client' }),
      db.collection('users').countDocuments({ role: 'vendor' }),
      db.collection('rfqs').countDocuments({}),
      db.collection('rfqs').countDocuments({ status: 'open' }),
      db.collection('rfqs').countDocuments({ status: 'awarded' }),
      db.collection('bids').countDocuments({}),
      db.collection('contracts').countDocuments({}),
      db.collection('contracts').countDocuments({ status: 'active' }),
      db.collection('vendor_profiles').countDocuments({ verification_status: 'pending' }),
      db.collection('vendor_profiles').countDocuments({ verification_status: 'verified' }),
    ]);
    res.json({ total_users, total_clients, total_vendors, total_rfqs, open_rfqs, awarded_rfqs, total_bids, total_contracts, active_contracts, pending_vendors, verified_vendors });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// GET /admin/rfqs
router.get('/rfqs', requireAuth(['admin']), async (req, res) => {
  try {
    const db = getDB();
    const rfqs = await db.collection('rfqs').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray();
    res.json(rfqs);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// GET /admin/contracts
router.get('/contracts', requireAuth(['admin']), async (req, res) => {
  try {
    const db = getDB();
    const contracts = await db.collection('contracts').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray();
    res.json(contracts);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// GET /admin/documents — view uploaded vendor docs
router.get('/documents', requireAuth(['admin']), async (req, res) => {
  try {
    const db = getDB();
    const docs = await db.collection('vendor_documents').find({}, { projection: { _id: 0, data_base64: 0 } }).toArray();
    const enriched = await Promise.all(docs.map(async d => {
      const u = await db.collection('users').findOne({ user_id: d.user_id }, { projection: { _id: 0, name: 1, email: 1, company: 1 } });
      return { ...d, user: u };
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// GET /admin/documents/:doc_id/download
router.get('/documents/:doc_id/download', requireAuth(['admin']), async (req, res) => {
  try {
    const db = getDB();
    const doc = await db.collection('vendor_documents').findOne({ doc_id: req.params.doc_id }, { projection: { _id: 0 } });
    if (!doc) return res.status(404).json({ detail: 'Document not found' });
    const buffer = Buffer.from(doc.data_base64, 'base64');
    const ext = doc.filename.split('.').pop().toLowerCase();
    const mimeTypes = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
    res.send(buffer);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
