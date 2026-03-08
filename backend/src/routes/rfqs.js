/**
 * routes/rfqs.js — RFQ management (Scope 1.1.a, 1.1.c)
 *
 * GET    /api/rfqs              — List RFQs (client sees own, vendor sees open ones)
 * POST   /api/rfqs              — Create RFQ (client only)
 * GET    /api/rfqs/:rfq_id      — Get single RFQ with bids
 * PATCH  /api/rfqs/:rfq_id      — Update RFQ status
 * POST   /api/rfqs/:rfq_id/close-bidding — Close bidding (client only)
 * POST   /api/rfqs/:rfq_id/award/:bid_id — Award contract to bid (client only)
 * GET    /api/rfqs/:rfq_id/bids          — List bids for RFQ
 * POST   /api/rfqs/:rfq_id/bids          — Submit a bid (vendor only)
 * POST   /api/rfqs/:rfq_id/bids/rank     — AI rank bids (client only, Scope 1.1.b)
 * GET    /api/rfqs/:rfq_id/bids/comparison — Vendor comparison table (client only)
 * PATCH  /api/bids/:bid_id/shortlist     — Toggle shortlist (client only)
 */

const express  = require('express');
const router   = express.Router();
const RFQ      = require('../models/RFQ');
const Bid      = require('../models/Bid');
const Contract = require('../models/Contract');
const User     = require('../models/User');
const VendorProfile = require('../models/VendorProfile');
const Notification  = require('../models/Notification');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateId, asyncHandler, sendError } = require('../utils/helpers');
const { rankBids, calculateComplianceScore, calculateDistanceFeasibility, calculateVendorReliability } = require('../utils/ai');
const { sendNewBid, sendContractAwarded } = require('../utils/email');

// ── Helper: create a notification in the DB ────────────────────────────────
async function notify(userId, type, message, relatedId = null) {
  try {
    await Notification.create({
      notification_id: generateId('ntf_'),
      user_id: userId,
      type,
      message,
      related_id: relatedId,
    });
  } catch (e) { /* non-blocking */ }
}

// GET /api/rfqs
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role === 'client') query.client_id = req.user.user_id;
  else if (req.user.role === 'vendor') query.status = 'open';

  const rfqs = await RFQ.find(query).sort({ createdAt: -1 }).lean();
  return res.json(rfqs);
}));

// POST /api/rfqs
router.post('/', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  const rfq = await RFQ.create({
    rfq_id:     generateId('rfq_'),
    client_id:  req.user.user_id,
    client_name: req.user.name,
    ...req.body,
    status: 'open',
  });
  return res.status(201).json(rfq);
}));

// GET /api/rfqs/:rfq_id
router.get('/:rfq_id', requireAuth, asyncHandler(async (req, res) => {
  const rfq = await RFQ.findOne({ rfq_id: req.params.rfq_id }).lean();
  if (!rfq) return sendError(res, 404, 'RFQ not found');
  return res.json(rfq);
}));

// PATCH /api/rfqs/:rfq_id
router.patch('/:rfq_id', requireAuth, asyncHandler(async (req, res) => {
  const rfq = await RFQ.findOne({ rfq_id: req.params.rfq_id });
  if (!rfq) return sendError(res, 404, 'RFQ not found');
  if (rfq.client_id !== req.user.user_id && req.user.role !== 'admin')
    return sendError(res, 403, 'Not your RFQ');

  const allowed = ['title', 'description', 'status', 'delivery_location', 'price_ceiling'];
  allowed.forEach(f => { if (req.body[f] !== undefined) rfq[f] = req.body[f]; });
  await rfq.save();
  return res.json(rfq);
}));

// POST /api/rfqs/:rfq_id/close-bidding
router.post('/:rfq_id/close-bidding', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  const rfq = await RFQ.findOne({ rfq_id: req.params.rfq_id });
  if (!rfq) return sendError(res, 404, 'RFQ not found');
  if (rfq.client_id !== req.user.user_id) return sendError(res, 403, 'Not your RFQ');
  if (rfq.status !== 'open') return sendError(res, 400, 'RFQ is not open');

  rfq.status = 'bidding_closed';
  await rfq.save();

  // Notify all vendors who bid
  const bids = await Bid.find({ rfq_id: rfq.rfq_id }).lean();
  for (const b of bids) {
    await notify(b.vendor_id, 'bidding_closed', `Bidding has closed on "${rfq.title}"`, rfq.rfq_id);
  }

  return res.json(rfq);
}));

// POST /api/rfqs/:rfq_id/award/:bid_id — Award contract
router.post('/:rfq_id/award/:bid_id', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  const rfq = await RFQ.findOne({ rfq_id: req.params.rfq_id });
  if (!rfq) return sendError(res, 404, 'RFQ not found');
  if (rfq.client_id !== req.user.user_id) return sendError(res, 403, 'Not your RFQ');
  if (!['open', 'bidding_closed'].includes(rfq.status)) return sendError(res, 400, 'Cannot award at this stage');

  const winBid = await Bid.findOne({ bid_id: req.params.bid_id, rfq_id: rfq.rfq_id });
  if (!winBid) return sendError(res, 404, 'Bid not found');

  const { contract_terms, payment_schedule, start_date, end_date, advance_pct } = req.body;

  // Fetch vendor company name
  const vp = await VendorProfile.findOne({ user_id: winBid.vendor_id }).lean();
  const clientUser = await User.findOne({ user_id: req.user.user_id }).lean();

  // Estimated annual value: price × MW × 8760 hours × 1000 kW/MW
  const estimatedValue = winBid.price_per_unit * winBid.quantity_mw * 8760 * 1000;

  // Create contract
  const contract = await Contract.create({
    contract_id:   generateId('cnt_'),
    rfq_id:        rfq.rfq_id,
    rfq_title:     rfq.title,
    bid_id:        winBid.bid_id,
    client_id:     req.user.user_id,
    client_company: clientUser?.company || req.user.name,
    vendor_id:     winBid.vendor_id,
    vendor_company: vp?.company_name || winBid.vendor_company,
    energy_type:   rfq.energy_type,
    price_per_unit: winBid.price_per_unit,
    quantity_mw:   winBid.quantity_mw,
    delivery_location: rfq.delivery_location,
    delivery_timeline: winBid.delivery_timeline,
    start_date:    start_date || rfq.delivery_start_date,
    end_date:      end_date || rfq.delivery_end_date,
    payment_schedule:  payment_schedule || rfq.payment_terms,
    advance_payment_pct: advance_pct || rfq.advance_payment_pct,
    contract_terms,
    estimated_annual_value_inr: Math.round(estimatedValue),
    status: 'pending_vendor_acceptance',
  });

  // Update winning bid
  winBid.status = 'accepted';
  await winBid.save();

  // Reject all other bids
  await Bid.updateMany(
    { rfq_id: rfq.rfq_id, bid_id: { $ne: winBid.bid_id } },
    { $set: { status: 'rejected' } }
  );

  // Update RFQ
  rfq.status = 'awarded';
  rfq.awarded_bid_id = winBid.bid_id;
  await rfq.save();

  // Notifications & email
  await notify(winBid.vendor_id, 'contract_awarded', `You've been awarded the contract for "${rfq.title}"!`, contract.contract_id);
  const vendorUser = await User.findOne({ user_id: winBid.vendor_id }).lean();
  if (vendorUser) {
    sendContractAwarded({ vendorEmail: vendorUser.email, rfqTitle: rfq.title, clientName: req.user.name });
  }

  return res.json({ rfq, contract });
}));

// GET /api/rfqs/:rfq_id/bids
router.get('/:rfq_id/bids', requireAuth, asyncHandler(async (req, res) => {
  const bids = await Bid.find({ rfq_id: req.params.rfq_id }).sort({ createdAt: -1 }).lean();
  return res.json(bids);
}));

// POST /api/rfqs/:rfq_id/bids — Submit bid (vendor)
router.post('/:rfq_id/bids', requireAuth, requireRole('vendor'), asyncHandler(async (req, res) => {
  const rfq = await RFQ.findOne({ rfq_id: req.params.rfq_id });
  if (!rfq) return sendError(res, 404, 'RFQ not found');
  if (rfq.status !== 'open') return sendError(res, 400, 'RFQ is not accepting bids');

  // One bid per vendor per RFQ
  const existing = await Bid.findOne({ rfq_id: rfq.rfq_id, vendor_id: req.user.user_id });
  if (existing) return sendError(res, 400, 'You have already bid on this RFQ');

  const vp = await VendorProfile.findOne({ user_id: req.user.user_id }).lean();

  const bid = await Bid.create({
    bid_id:          generateId('bid_'),
    rfq_id:          rfq.rfq_id,
    vendor_id:       req.user.user_id,
    vendor_name:     req.user.name,
    vendor_company:  vp?.company_name || req.user.name,
    vendor_certifications:    vp?.certifications || [],
    vendor_carbon_credits:    vp?.carbon_credits_ccts || 0,
    vendor_verification_status: vp?.verification_status || 'pending',
    ...req.body,
    status: 'submitted',
  });

  // Increment bid count on RFQ
  await RFQ.updateOne({ rfq_id: rfq.rfq_id }, { $inc: { bid_count: 1 } });

  // Notify client
  await notify(rfq.client_id, 'new_bid', `${req.user.name} submitted a bid on "${rfq.title}"`, rfq.rfq_id);
  const clientUser = await User.findOne({ user_id: rfq.client_id }).lean();
  if (clientUser) sendNewBid({ clientEmail: clientUser.email, rfqTitle: rfq.title, vendorName: req.user.name, price: bid.price_per_unit });

  return res.status(201).json(bid);
}));

// POST /api/rfqs/:rfq_id/bids/rank — AI ranking (Scope 1.1.b)
router.post('/:rfq_id/bids/rank', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  const rfq  = await RFQ.findOne({ rfq_id: req.params.rfq_id }).lean();
  if (!rfq) return sendError(res, 404, 'RFQ not found');

  const bids = await Bid.find({ rfq_id: rfq.rfq_id }).lean();
  if (!bids.length) return sendError(res, 400, 'No bids to rank');

  const aiResult = await rankBids(rfq, bids);

  // Persist AI scores and calculated metrics to each bid
  for (const ranking of aiResult.rankings || []) {
    const bid = bids.find(b => b.bid_id === ranking.bid_id);
    if (!bid) continue;

    const complianceScore = calculateComplianceScore(bid.vendor_certifications, bid.vendor_verification_status);
    const distanceFeasibility = calculateDistanceFeasibility();
    const vendorReliability = calculateVendorReliability();

    await Bid.updateOne(
      { bid_id: ranking.bid_id },
      { $set: {
        ai_score: ranking.score,
        ai_analysis: { strengths: ranking.strengths, gaps: ranking.gaps, recommendation: ranking.recommendation },
        compliance_score: complianceScore,
        distance_feasibility: distanceFeasibility,
        vendor_reliability: vendorReliability
      }}
    );
  }

  return res.json(aiResult);
}));

// PATCH /api/bids/:bid_id/shortlist — Toggle shortlist
router.patch('/bids/:bid_id/shortlist', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  const bid = await Bid.findOne({ bid_id: req.params.bid_id });
  if (!bid) return sendError(res, 404, 'Bid not found');

  bid.is_shortlisted = !bid.is_shortlisted;
  bid.status = bid.is_shortlisted ? 'shortlisted' : 'submitted';
  await bid.save();

  if (bid.is_shortlisted) {
    const rfq = await RFQ.findOne({ rfq_id: bid.rfq_id }).lean();
    await notify(bid.vendor_id, 'bid_shortlisted', `Your bid on "${rfq?.title}" has been shortlisted!`, bid.rfq_id);
  }

  return res.json(bid);
}));

// GET /api/rfqs/:rfq_id/bids/comparison — Vendor comparison (all bids side-by-side)
router.get('/:rfq_id/bids/comparison', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  const rfq = await RFQ.findOne({ rfq_id: req.params.rfq_id }).lean();
  if (!rfq) return sendError(res, 404, 'RFQ not found');
  if (rfq.client_id !== req.user.user_id && req.user.role !== 'admin')
    return sendError(res, 403, 'Not your RFQ');

  const bids = await Bid.find({ rfq_id: req.params.rfq_id }).sort({ price_per_unit: 1 }).lean();

  if (!bids.length) return res.json({ rfq, bids: [], summary: null });

  // Build comparison data
  const comparison = bids.map(b => ({
    bid_id: b.bid_id,
    vendor_name: b.vendor_name,
    vendor_company: b.vendor_company,
    price_per_unit: b.price_per_unit,
    quantity_mw: b.quantity_mw,
    delivery_timeline: b.delivery_timeline,
    notes: b.notes,
    ai_score: b.ai_score || null,
    ai_analysis: b.ai_analysis || null,
    status: b.status,
    is_shortlisted: b.is_shortlisted,
    createdAt: b.createdAt,
  }));

  // Calculate summary metrics
  const prices = bids.map(b => b.price_per_unit);
  const summary = {
    total_bids: bids.length,
    shortlisted_count: bids.filter(b => b.is_shortlisted).length,
    min_price: Math.min(...prices),
    max_price: Math.max(...prices),
    avg_price: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2),
    rfq_price_ceiling: rfq.price_ceiling,
  };

  return res.json({ rfq, comparison, summary });
}));

module.exports = router;
