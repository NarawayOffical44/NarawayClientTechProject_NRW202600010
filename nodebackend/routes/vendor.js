const router = require('express').Router();
const { getDB } = require('../config/db');
const { generateId, nowISO } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');

// GET /vendor/profile
router.get('/profile', requireAuth(['vendor']), async (req, res) => {
  try {
    const db = getDB();
    const profile = await db.collection('vendor_profiles').findOne({ user_id: req.user.user_id }, { projection: { _id: 0 } });
    if (!profile) return res.status(404).json({ detail: 'Profile not found' });
    res.json(profile);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// PUT /vendor/profile
router.put('/profile', requireAuth(['vendor']), async (req, res) => {
  try {
    const db = getDB();
    const { company_name, description, energy_types, capacity_mw, certifications, carbon_credits, contact_email, contact_phone, website, location, regulatory_docs } = req.body;
    const update = {
      ...(company_name !== undefined && { company_name }),
      ...(description !== undefined && { description }),
      ...(energy_types !== undefined && { energy_types }),
      ...(capacity_mw !== undefined && { capacity_mw: parseFloat(capacity_mw) }),
      ...(certifications !== undefined && { certifications }),
      ...(carbon_credits !== undefined && { carbon_credits: parseFloat(carbon_credits) }),
      ...(contact_email !== undefined && { contact_email }),
      ...(contact_phone !== undefined && { contact_phone }),
      ...(website !== undefined && { website }),
      ...(location !== undefined && { location }),
      ...(regulatory_docs !== undefined && { regulatory_docs }),
      updated_at: nowISO(),
    };
    await db.collection('vendor_profiles').updateOne({ user_id: req.user.user_id }, { $set: update }, { upsert: true });
    const profile = await db.collection('vendor_profiles').findOne({ user_id: req.user.user_id }, { projection: { _id: 0 } });
    res.json(profile);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// GET /vendor/bids
router.get('/bids', requireAuth(['vendor']), async (req, res) => {
  try {
    const db = getDB();
    const bids = await db.collection('bids').find({ vendor_id: req.user.user_id }, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray();
    const enriched = await Promise.all(bids.map(async bid => {
      const rfq = await db.collection('rfqs').findOne({ rfq_id: bid.rfq_id }, { projection: { _id: 0, title: 1, energy_type: 1, delivery_location: 1, status: 1, quantity_mw: 1 } });
      const contract = bid.contract_id ? await db.collection('contracts').findOne({ contract_id: bid.contract_id }, { projection: { _id: 0 } }) : null;
      return { ...bid, rfq, contract };
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// POST /vendor/documents/upload
router.post('/documents/upload', requireAuth(['vendor']), async (req, res) => {
  try {
    const db = getDB();
    const { doc_type, filename, data_base64, size_bytes } = req.body;
    if (!doc_type || !filename || !data_base64) return res.status(400).json({ detail: 'Missing fields' });

    try { Buffer.from(data_base64, 'base64'); } catch { return res.status(400).json({ detail: 'Invalid base64 data' }); }
    if (size_bytes && size_bytes > 10 * 1024 * 1024) return res.status(400).json({ detail: 'File too large (max 10MB)' });

    const doc_id = generateId('doc_');
    const doc = { doc_id, user_id: req.user.user_id, doc_type, filename, data_base64, size_bytes: size_bytes || 0, status: 'uploaded', uploaded_at: nowISO() };
    await db.collection('vendor_documents').replaceOne({ user_id: req.user.user_id, doc_type }, doc, { upsert: true });
    await db.collection('vendor_profiles').updateOne({ user_id: req.user.user_id }, { $addToSet: { regulatory_docs: doc_type } });
    const { _id, data_base64: _, ...safe } = doc;
    res.json(safe);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// GET /vendor/documents
router.get('/documents', requireAuth(['vendor']), async (req, res) => {
  try {
    const db = getDB();
    const docs = await db.collection('vendor_documents').find({ user_id: req.user.user_id }, { projection: { _id: 0, data_base64: 0 } }).toArray();
    res.json(docs);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
