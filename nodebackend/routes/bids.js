const router = require('express').Router({ mergeParams: true });
const { getDB } = require('../config/db');
const { generateId, nowISO } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../services/notifications');
const { sendEmail, baseHtml } = require('../services/email');
const { rankBidsWithAI } = require('../services/ai');

// POST /rfqs/:rfq_id/bids — submit bid
router.post('/', requireAuth(['vendor']), async (req, res) => {
  try {
    const db = getDB();
    const { rfq_id } = req.params;
    const u = req.user;
    const rfq = await db.collection('rfqs').findOne({ rfq_id });
    if (!rfq) return res.status(404).json({ detail: 'RFQ not found' });
    if (rfq.status !== 'open') return res.status(400).json({ detail: 'RFQ is not open for bids' });
    const existing = await db.collection('bids').findOne({ rfq_id, vendor_id: u.user_id });
    if (existing) return res.status(400).json({ detail: 'You have already submitted a bid for this RFQ' });

    const profile = await db.collection('vendor_profiles').findOne({ user_id: u.user_id });
    const { price_per_unit, quantity_mw, delivery_timeline, notes, specs } = req.body;
    if (!price_per_unit || !quantity_mw || !delivery_timeline) return res.status(400).json({ detail: 'Missing required bid fields' });

    const bid_id = generateId('bid_');
    const bid = {
      bid_id, rfq_id, vendor_id: u.user_id, vendor_name: u.name,
      vendor_company: profile?.company_name || u.name,
      vendor_location: profile?.location || '',
      vendor_verification: profile?.verification_status || 'pending',
      price_per_unit: parseFloat(price_per_unit),
      quantity_mw: parseFloat(quantity_mw),
      delivery_timeline, notes: notes || '',
      specs: specs || {}, ai_score: null, ai_analysis: null,
      status: 'submitted', contract_id: null, created_at: nowISO(),
    };
    await db.collection('bids').insertOne(bid);
    await db.collection('rfqs').updateOne({ rfq_id }, { $inc: { bid_count: 1 } });

    await createNotification(rfq.client_id, 'new_bid', 'New Bid Received',
      `${bid.vendor_company} submitted a bid of ₹${bid.price_per_unit}/kWh for '${rfq.title}'.`,
      `/client/rfqs/${rfq_id}`, { bid_id, rfq_id });

    const clientUser = await db.collection('users').findOne({ user_id: rfq.client_id });
    if (clientUser) {
      const body = `<p>Dear ${rfq.client_name},</p>
        <p>A new bid has been received for <strong style="color:#0ea5e9">${rfq.title}</strong>:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #1e293b">Vendor</td><td style="padding:8px;color:#e2e8f0">${bid.vendor_company}</td></tr>
          <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #1e293b">Price</td><td style="padding:8px;color:#0ea5e9">₹${bid.price_per_unit}/kWh</td></tr>
          <tr><td style="padding:8px;color:#64748b">Quantity</td><td style="padding:8px;color:#e2e8f0">${bid.quantity_mw} MW</td></tr>
        </table>`;
      await sendEmail(clientUser.email, `New Bid: ${rfq.title}`, baseHtml(`New Bid on ${rfq.title}`, body));
    }

    const { _id, ...safe } = bid;
    res.json(safe);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// GET /rfqs/:rfq_id/bids
router.get('/', requireAuth(), async (req, res) => {
  try {
    const db = getDB();
    const { rfq_id } = req.params;
    const u = req.user;
    const rfq = await db.collection('rfqs').findOne({ rfq_id });
    if (!rfq) return res.status(404).json({ detail: 'RFQ not found' });
    let bids;
    if (u.role === 'vendor') {
      bids = await db.collection('bids').find({ rfq_id, vendor_id: u.user_id }, { projection: { _id: 0 } }).toArray();
    } else {
      if (rfq.client_id !== u.user_id && u.role !== 'admin') return res.status(403).json({ detail: 'Not authorized' });
      bids = await db.collection('bids').find({ rfq_id }, { projection: { _id: 0 } }).sort({ ai_score: -1 }).toArray();
    }
    res.json(bids);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// POST /rfqs/:rfq_id/bids/ai-rank
router.post('/ai-rank', requireAuth(['client', 'admin']), async (req, res) => {
  try {
    const db = getDB();
    const { rfq_id } = req.params;
    const rfq = await db.collection('rfqs').findOne({ rfq_id });
    if (!rfq) return res.status(404).json({ detail: 'Not found' });
    if (rfq.client_id !== req.user.user_id && req.user.role !== 'admin') return res.status(403).json({ detail: 'Not authorized' });

    const bids = await db.collection('bids').find({ rfq_id }, { projection: { _id: 0 } }).toArray();
    if (!bids.length) return res.status(400).json({ detail: 'No bids to rank' });

    const result = await rankBidsWithAI(rfq, bids);

    for (const ranking of result.rankings || []) {
      await db.collection('bids').updateOne({ bid_id: ranking.bid_id }, {
        $set: { ai_score: ranking.score, ai_analysis: { strengths: ranking.strengths, gaps: ranking.gaps, recommendation: ranking.recommendation } }
      });
    }
    await db.collection('rfqs').updateOne({ rfq_id }, { $set: { ai_analysis_summary: result.summary, best_bid_id: result.best_bid_id } });
    res.json(result);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// PATCH /rfqs/:rfq_id/bids/:bid_id/shortlist
router.patch('/:bid_id/shortlist', requireAuth(['client', 'admin']), async (req, res) => {
  try {
    const db = getDB();
    const { rfq_id, bid_id } = req.params;
    const rfq = await db.collection('rfqs').findOne({ rfq_id });
    if (!rfq) return res.status(404).json({ detail: 'Not found' });
    if (rfq.client_id !== req.user.user_id && req.user.role !== 'admin') return res.status(403).json({ detail: 'Not authorized' });
    const bid = await db.collection('bids').findOne({ bid_id });
    if (!bid) return res.status(404).json({ detail: 'Bid not found' });
    if (['accepted', 'rejected', 'contract_signed', 'contract_declined'].includes(bid.status)) return res.status(400).json({ detail: 'Cannot change finalized bid' });

    const newStatus = bid.status === 'shortlisted' ? 'submitted' : 'shortlisted';
    await db.collection('bids').updateOne({ bid_id }, { $set: { status: newStatus } });
    if (newStatus === 'shortlisted') {
      await createNotification(bid.vendor_id, 'bid_shortlisted', 'Your Bid Was Shortlisted!',
        `Your bid for '${rfq.title}' has been shortlisted by the client.`, `/vendor/rfqs/${rfq_id}`);
    }
    res.json({ message: `Bid ${newStatus}`, status: newStatus });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// PATCH /rfqs/:rfq_id/bids/:bid_id/status
router.patch('/:bid_id/status', requireAuth(['client', 'admin']), async (req, res) => {
  try {
    const db = getDB();
    const { rfq_id, bid_id } = req.params;
    const rfq = await db.collection('rfqs').findOne({ rfq_id });
    if (!rfq || (rfq.client_id !== req.user.user_id && req.user.role !== 'admin')) return res.status(403).json({ detail: 'Not authorized' });
    await db.collection('bids').updateOne({ bid_id }, { $set: { status: req.body.status } });
    res.json({ message: 'Bid status updated' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
