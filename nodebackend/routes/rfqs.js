const router = require('express').Router();
const { getDB } = require('../config/db');
const { generateId, nowISO } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../services/notifications');
const { sendEmail, baseHtml } = require('../services/email');

// POST /rfqs — create RFQ
router.post('/', requireAuth(['client', 'admin']), async (req, res) => {
  try {
    const db = getDB();
    const u = req.user;
    const { title, description, energy_type, quantity_mw, delivery_location, start_date, end_date, price_ceiling, specs, logistics, financial_terms, add_on_services } = req.body;
    if (!title || !energy_type || !quantity_mw || !delivery_location) return res.status(400).json({ detail: 'Missing required fields' });

    const rfq_id = generateId('rfq_');
    const rfq = {
      rfq_id, client_id: u.user_id, client_name: u.name, client_company: u.company || '',
      title, description: description || '', energy_type, quantity_mw: parseFloat(quantity_mw),
      delivery_location, start_date: start_date || '', end_date: end_date || '',
      price_ceiling: price_ceiling ? parseFloat(price_ceiling) : null,
      specs: specs || {}, logistics: logistics || {}, financial_terms: financial_terms || {},
      add_on_services: add_on_services || [], status: 'open', bid_count: 0,
      ai_analysis_summary: null, best_bid_id: null, awarded_bid_id: null, contract_id: null,
      created_at: nowISO(), updated_at: nowISO(),
    };
    await db.collection('rfqs').insertOne(rfq);
    const { _id, ...safe } = rfq;
    res.json(safe);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// GET /rfqs — list
router.get('/', requireAuth(), async (req, res) => {
  try {
    const db = getDB();
    const u = req.user;
    let query = {};
    if (u.role === 'client') { query.client_id = u.user_id; if (req.query.status) query.status = req.query.status; }
    else if (u.role === 'vendor') { query.status = 'open'; }
    else { if (req.query.status) query.status = req.query.status; }
    if (req.query.energy_type) query.energy_type = req.query.energy_type;
    const rfqs = await db.collection('rfqs').find(query, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray();
    res.json(rfqs);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// GET /rfqs/:id
router.get('/:rfq_id', requireAuth(), async (req, res) => {
  try {
    const db = getDB();
    const rfq = await db.collection('rfqs').findOne({ rfq_id: req.params.rfq_id }, { projection: { _id: 0 } });
    if (!rfq) return res.status(404).json({ detail: 'RFQ not found' });
    res.json(rfq);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// PATCH /rfqs/:id/status
router.patch('/:rfq_id/status', requireAuth(['client', 'admin']), async (req, res) => {
  try {
    const db = getDB();
    const rfq = await db.collection('rfqs').findOne({ rfq_id: req.params.rfq_id });
    if (!rfq) return res.status(404).json({ detail: 'Not found' });
    if (rfq.client_id !== req.user.user_id && req.user.role !== 'admin') return res.status(403).json({ detail: 'Not authorized' });
    await db.collection('rfqs').updateOne({ rfq_id: req.params.rfq_id }, { $set: { status: req.body.status, updated_at: nowISO() } });
    res.json({ message: 'Status updated' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// POST /rfqs/:id/close-bidding
router.post('/:rfq_id/close-bidding', requireAuth(['client', 'admin']), async (req, res) => {
  try {
    const db = getDB();
    const rfq = await db.collection('rfqs').findOne({ rfq_id: req.params.rfq_id });
    if (!rfq) return res.status(404).json({ detail: 'Not found' });
    if (rfq.client_id !== req.user.user_id && req.user.role !== 'admin') return res.status(403).json({ detail: 'Not authorized' });
    if (rfq.status !== 'open') return res.status(400).json({ detail: 'RFQ is not open' });
    await db.collection('rfqs').updateOne({ rfq_id: req.params.rfq_id }, { $set: { status: 'bidding_closed', updated_at: nowISO() } });
    const bids = await db.collection('bids').find({ rfq_id: req.params.rfq_id }, { projection: { _id: 0 } }).toArray();
    for (const bid of bids) {
      await createNotification(bid.vendor_id, 'rfq_closed', 'Bidding Period Closed',
        `The bidding period for '${rfq.title}' has closed. Await the client's decision.`,
        `/vendor/rfqs/${req.params.rfq_id}`);
    }
    res.json({ message: 'Bidding closed', status: 'bidding_closed' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// POST /rfqs/:rfq_id/award/:bid_id
router.post('/:rfq_id/award/:bid_id', requireAuth(['client', 'admin']), async (req, res) => {
  try {
    const db = getDB();
    const { rfq_id, bid_id } = req.params;
    const rfq = await db.collection('rfqs').findOne({ rfq_id });
    if (!rfq) return res.status(404).json({ detail: 'RFQ not found' });
    if (rfq.client_id !== req.user.user_id && req.user.role !== 'admin') return res.status(403).json({ detail: 'Not authorized' });
    if (!['open', 'bidding_closed'].includes(rfq.status)) return res.status(400).json({ detail: 'RFQ not in awardable state' });

    const bid = await db.collection('bids').findOne({ bid_id });
    if (!bid) return res.status(404).json({ detail: 'Bid not found' });

    const { contract_terms, delivery_milestones, payment_schedule } = req.body;
    const contract_id = generateId('con_');
    const approxMWh = bid.quantity_mw * 8760 * 0.25;
    const total_value = Math.round(bid.price_per_unit * approxMWh * 1000 * 100) / 100;

    const contract = {
      contract_id, rfq_id, rfq_title: rfq.title, bid_id,
      client_id: rfq.client_id, client_name: rfq.client_name, client_company: rfq.client_company || '',
      vendor_id: bid.vendor_id, vendor_name: bid.vendor_name, vendor_company: bid.vendor_company,
      energy_type: rfq.energy_type, quantity_mw: rfq.quantity_mw, price_per_unit: bid.price_per_unit,
      estimated_annual_value_inr: total_value,
      delivery_location: rfq.delivery_location, start_date: rfq.start_date, end_date: rfq.end_date,
      delivery_timeline: bid.delivery_timeline,
      contract_terms: contract_terms || 'Standard RERC/CERC terms apply. Governed by Indian Electricity Act 2003.',
      delivery_milestones: delivery_milestones || [],
      payment_schedule: payment_schedule || 'Net 30 days from invoice date',
      status: 'pending_vendor_acceptance', vendor_response: null, vendor_notes: null, responded_at: null,
      created_at: nowISO(), updated_at: nowISO(),
    };
    await db.collection('contracts').insertOne(contract);

    await db.collection('rfqs').updateOne({ rfq_id }, { $set: { status: 'awarded', awarded_bid_id: bid_id, contract_id, updated_at: nowISO() } });
    await db.collection('bids').updateOne({ bid_id }, { $set: { status: 'accepted', contract_id } });
    await db.collection('bids').updateMany({ rfq_id, bid_id: { $ne: bid_id }, status: { $nin: ['accepted'] } }, { $set: { status: 'rejected' } });

    await createNotification(bid.vendor_id, 'contract_awarded', 'Contract Awarded to You!',
      `Congratulations! You have been awarded the contract for '${rfq.title}'. Please review and accept.`,
      `/vendor/rfqs/${rfq_id}`, { contract_id });

    const otherBids = await db.collection('bids').find({ rfq_id, bid_id: { $ne: bid_id } }, { projection: { _id: 0 } }).toArray();
    for (const ob of otherBids) {
      await createNotification(ob.vendor_id, 'bid_rejected', 'Bid Not Selected',
        `Your bid for '${rfq.title}' was not selected. Thank you for participating.`, `/vendor/rfqs/${rfq_id}`);
    }

    const vendorUser = await db.collection('users').findOne({ user_id: bid.vendor_id });
    if (vendorUser) {
      const body = `<p>Dear ${bid.vendor_name},</p>
        <p>Your bid has been selected for <strong style="color:#0ea5e9">${rfq.title}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #1e293b">Price</td><td style="padding:8px;color:#0ea5e9">₹${bid.price_per_unit}/kWh</td></tr>
          <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #1e293b">Quantity</td><td style="padding:8px;color:#e2e8f0">${rfq.quantity_mw} MW</td></tr>
          <tr><td style="padding:8px;color:#64748b">Location</td><td style="padding:8px;color:#e2e8f0">${rfq.delivery_location}</td></tr>
        </table>
        <p>Please log in to accept the contract within 48 hours.</p>`;
      await sendEmail(vendorUser.email, `Contract Awarded: ${rfq.title}`, baseHtml("You've Been Awarded a Contract!", body));
    }

    const { _id, ...safeContract } = contract;
    res.json(safeContract);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
