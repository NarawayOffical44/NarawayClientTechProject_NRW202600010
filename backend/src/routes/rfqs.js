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
const { generateId, asyncHandler, sendError, sanitizeString, validatePrice, validateQuantity } = require('../utils/helpers');
const { rankBids, calculateComplianceScore, calculateVendorReliability, calculateDistanceFeasibility, enrichBidsWithScores } = require('../utils/ai');
const { sendNewBid, sendContractAwarded } = require('../utils/email');
const { serializeRFQ, serializeRFQs } = require('../utils/rfq');
const logger = require('../utils/logger');

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function parseOptionalNumber(value) {
  return hasValue(value) ? parseFloat(value) : null;
}

const RFQ_STATUSES = ['draft', 'open', 'bidding_closed', 'awarded', 'completed', 'cancelled'];
const RFQ_STATUS_TRANSITIONS = {
  draft: ['open', 'cancelled'],
  open: ['bidding_closed', 'cancelled'],
  bidding_closed: ['open', 'awarded', 'cancelled'],
  awarded: ['completed', 'bidding_closed'],
  completed: [],
  cancelled: [],
};

function validateRFQStatusChange(currentStatus, nextStatus) {
  if (!RFQ_STATUSES.includes(nextStatus)) return `Invalid RFQ status: ${nextStatus}`;
  if (currentStatus === nextStatus) return null;
  if (!RFQ_STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
    return `Cannot change RFQ status from ${currentStatus} to ${nextStatus}`;
  }
  return null;
}

function normalizeRFQInput(body = {}) {
  const specs = body.specs || {};
  const financialTerms = body.financial_terms || {};
  return {
    title: body.title,
    description: body.description,
    energy_type: body.energy_type,
    quantity_mw: body.quantity_mw,
    voltage_kv: body.voltage_kv ?? specs.voltage_kv,
    phase: body.phase ?? specs.phase,
    add_on_services: Array.isArray(body.add_on_services) ? body.add_on_services : [],
    delivery_location: body.delivery_location,
    delivery_start_date: body.delivery_start_date ?? body.start_date,
    delivery_end_date: body.delivery_end_date ?? body.end_date,
    price_ceiling: body.price_ceiling,
    payment_terms: body.payment_terms ?? financialTerms.payment_terms,
    advance_payment_pct: body.advance_payment_pct ?? body.advance_percent ?? financialTerms.advance_payment_pct ?? financialTerms.advance_percent,
    carbon_credits_tco2e: body.carbon_credits_tco2e,
  };
}

function serializeBid(bid) {
  if (!bid) return bid;
  return {
    ...bid,
    vendor_location: bid.vendor_location || '',
    vendor_verification: bid.vendor_verification || bid.vendor_verification_status || 'pending',
  };
}

function getState(location = '') {
  const parts = String(location).split(',').map(p => p.trim()).filter(Boolean);
  return (parts[parts.length - 1] || '').toLowerCase();
}

function scoreRFQForVendor(rfq, profile) {
  if (!profile) {
    return {
      match_score: 50,
      match_reasons: ['Complete vendor profile', 'Open marketplace RFQ'],
    };
  }

  const reasons = [];
  let score = 35;
  const energyTypes = profile.energy_types || [];
  if (energyTypes.includes(rfq.energy_type)) {
    score += 35;
    reasons.push('Energy type match');
  } else if (energyTypes.length) {
    reasons.push('Adjacent energy opportunity');
  }

  const capacity = parseFloat(profile.capacity_mw || 0);
  const quantity = parseFloat(rfq.quantity_mw || 0);
  if (capacity && quantity && capacity >= quantity) {
    score += 15;
    reasons.push('Capacity fit');
  } else if (capacity) {
    score += 6;
    reasons.push('Partial capacity fit');
  }

  if (getState(profile.location) && getState(profile.location) === getState(rfq.delivery_location)) {
    score += 10;
    reasons.push('Regional delivery fit');
  }

  if (profile.verification_status === 'verified') {
    score += 5;
    reasons.push('Verified supplier');
  } else {
    reasons.push('Verification pending');
  }

  return {
    match_score: Math.min(100, score),
    match_reasons: reasons.slice(0, 3),
  };
}

function enrichRFQsForVendor(rfqs, profile) {
  return rfqs
    .map(rfq => ({ ...rfq, ...scoreRFQForVendor(rfq, profile) }))
    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function serializePublicRFQ(rfq) {
  return {
    rfq_id: rfq.rfq_id,
    title: rfq.title,
    description: rfq.description,
    client_name: rfq.client_name,
    energy_type: rfq.energy_type,
    quantity_mw: rfq.quantity_mw,
    delivery_location: rfq.delivery_location,
    price_ceiling: rfq.price_ceiling,
    bid_count: rfq.bid_count || 0,
    add_on_services: rfq.add_on_services || [],
  };
}

async function canViewRFQ(req, rfq) {
  if (req.user.role === 'admin') return true;
  if (rfq.status === 'open') return true;
  if (req.user.role === 'client') return rfq.client_id === req.user.user_id;
  if (req.user.role === 'vendor') {
    const [bid, contract] = await Promise.all([
      Bid.exists({ rfq_id: rfq.rfq_id, vendor_id: req.user.user_id }),
      Contract.exists({ rfq_id: rfq.rfq_id, vendor_id: req.user.user_id }),
    ]);
    return !!bid || !!contract;
  }
  return false;
}

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
  } catch (e) { logger.warn(`Notification failed for user ${userId}: ${e.message}`); }
}

// GET /api/rfqs
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  let query = {};
  const marketplaceView = req.query.marketplace === 'true';
  if (marketplaceView) query.status = 'open';
  else if (req.user.role === 'client') query.client_id = req.user.user_id;
  else if (req.user.role === 'vendor') query.status = 'open';
  if (!marketplaceView && req.query.status && req.user.role !== 'vendor') query.status = req.query.status;
  if (req.query.energy_type) query.energy_type = req.query.energy_type;

  let rfqs = await RFQ.find(query).sort({ createdAt: -1 }).lean();
  if (req.user.role === 'vendor') {
    const profile = await VendorProfile.findOne({ user_id: req.user.user_id }).lean();
    rfqs = enrichRFQsForVendor(rfqs, profile);
  }
  return res.json(serializeRFQs(rfqs));
}));

// GET /api/rfqs/public/open - public marketplace preview, summary only.
router.get('/public/open', asyncHandler(async (req, res) => {
  const query = { status: 'open' };
  if (req.query.energy_type) query.energy_type = req.query.energy_type;
  const rfqs = await RFQ.find(query).sort({ createdAt: -1 }).limit(50).lean();
  return res.json(rfqs.map(serializePublicRFQ));
}));

// POST /api/rfqs
router.post('/', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  const {
    title, description, energy_type, quantity_mw, voltage_kv, phase, add_on_services,
    delivery_location, delivery_start_date, delivery_end_date, price_ceiling,
    payment_terms, advance_payment_pct, carbon_credits_tco2e,
  } = normalizeRFQInput(req.body);

  // Validation
  if (!title || !energy_type || !quantity_mw || !delivery_location) {
    return sendError(res, 400, 'Missing required fields: title, energy_type, quantity_mw, delivery_location');
  }
  if (!['solar', 'wind', 'hydro', 'thermal', 'green_hydrogen'].includes(energy_type)) {
    return sendError(res, 400, 'Invalid energy_type');
  }
  if (!validateQuantity(quantity_mw)) {
    return sendError(res, 400, 'Invalid quantity_mw: must be positive number');
  }
  if (hasValue(price_ceiling) && !validatePrice(price_ceiling)) {
    return sendError(res, 400, 'Invalid price_ceiling: must be 0-99999.9999');
  }

  // Sanitize inputs
  const rfq = await RFQ.create({
    rfq_id:     generateId('rfq_'),
    client_id:  req.user.user_id,
    client_name: req.user.name,
    title:      sanitizeString(title, 255),
    description: sanitizeString(description, 2000),
    energy_type,
    quantity_mw: parseFloat(quantity_mw),
    voltage_kv: parseOptionalNumber(voltage_kv),
    phase: sanitizeString(phase, 100),
    add_on_services: add_on_services.map(s => sanitizeString(s, 100)).filter(Boolean),
    delivery_location: sanitizeString(delivery_location, 500),
    delivery_start_date,
    delivery_end_date,
    price_ceiling: parseOptionalNumber(price_ceiling),
    payment_terms: sanitizeString(payment_terms, 500),
    advance_payment_pct: parseOptionalNumber(advance_payment_pct) || 0,
    carbon_credits_tco2e: parseOptionalNumber(carbon_credits_tco2e),
    status: 'open',
  });
  return res.status(201).json(serializeRFQ(rfq));
}));

// GET /api/rfqs/:rfq_id
router.get('/:rfq_id', requireAuth, asyncHandler(async (req, res) => {
  const rfq = await RFQ.findOne({ rfq_id: req.params.rfq_id }).lean();
  if (!rfq) return sendError(res, 404, 'RFQ not found');
  if (!(await canViewRFQ(req, rfq))) return sendError(res, 403, 'Access denied');
  return res.json(serializeRFQ(rfq));
}));

router.patch('/:rfq_id/status', requireAuth, asyncHandler(async (req, res) => {
  const rfq = await RFQ.findOne({ rfq_id: req.params.rfq_id });
  if (!rfq) return sendError(res, 404, 'RFQ not found');
  if (rfq.client_id !== req.user.user_id && req.user.role !== 'admin')
    return sendError(res, 403, 'Not your RFQ');
  if (!req.body.status) return sendError(res, 400, 'status is required');
  const statusError = validateRFQStatusChange(rfq.status, req.body.status);
  if (statusError) return sendError(res, 400, statusError);

  rfq.status = req.body.status;
  await rfq.save();
  return res.json(serializeRFQ(rfq));
}));

// PATCH /api/rfqs/:rfq_id
router.patch('/:rfq_id', requireAuth, asyncHandler(async (req, res) => {
  const rfq = await RFQ.findOne({ rfq_id: req.params.rfq_id });
  if (!rfq) return sendError(res, 404, 'RFQ not found');
  if (rfq.client_id !== req.user.user_id && req.user.role !== 'admin')
    return sendError(res, 403, 'Not your RFQ');
  if (req.body.status !== undefined) {
    const statusError = validateRFQStatusChange(rfq.status, req.body.status);
    if (statusError) return sendError(res, 400, statusError);
  }

  const allowed = ['title', 'description', 'status', 'delivery_location', 'price_ceiling'];
  allowed.forEach(f => { if (req.body[f] !== undefined) rfq[f] = req.body[f]; });
  await rfq.save();
  return res.json(serializeRFQ(rfq));
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

  return res.json(serializeRFQ(rfq));
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
  winBid.contract_id = contract.contract_id;
  await winBid.save();

  // Reject all other bids
  await Bid.updateMany(
    { rfq_id: rfq.rfq_id, bid_id: { $ne: winBid.bid_id } },
    { $set: { status: 'rejected' } }
  );

  // Update RFQ
  rfq.status = 'awarded';
  rfq.awarded_bid_id = winBid.bid_id;
  rfq.contract_id = contract.contract_id;
  await rfq.save();

  // Notifications & email
  await notify(winBid.vendor_id, 'contract_awarded', `You've been awarded the contract for "${rfq.title}"!`, contract.contract_id);
  const vendorUser = await User.findOne({ user_id: winBid.vendor_id }).lean();
  if (vendorUser) {
    sendContractAwarded({ vendorEmail: vendorUser.email, rfqTitle: rfq.title, clientName: req.user.name });
  }

  return res.json({ rfq: serializeRFQ(rfq), contract });
}));

// GET /api/rfqs/:rfq_id/bids
router.get('/:rfq_id/bids', requireAuth, asyncHandler(async (req, res) => {
  const rfq = await RFQ.findOne({ rfq_id: req.params.rfq_id }).lean();
  if (!rfq) return sendError(res, 404, 'RFQ not found');
  if (req.user.role === 'client' && rfq.client_id !== req.user.user_id) return sendError(res, 403, 'Not your RFQ');

  const query = { rfq_id: req.params.rfq_id };
  if (req.user.role === 'vendor') query.vendor_id = req.user.user_id;
  const bids = await Bid.find(query).sort({ createdAt: -1 }).lean();
  return res.json(bids.map(serializeBid));
}));

// POST /api/rfqs/:rfq_id/bids — Submit bid (vendor)
router.post('/:rfq_id/bids', requireAuth, requireRole('vendor'), asyncHandler(async (req, res) => {
  const rfq = await RFQ.findOne({ rfq_id: req.params.rfq_id });
  if (!rfq) return sendError(res, 404, 'RFQ not found');
  if (rfq.status !== 'open') return sendError(res, 400, 'RFQ is not accepting bids');

  // One bid per vendor per RFQ
  const existing = await Bid.findOne({ rfq_id: rfq.rfq_id, vendor_id: req.user.user_id });
  if (existing) return sendError(res, 400, 'You have already bid on this RFQ');

  const { price_per_unit, quantity_mw, delivery_timeline, notes } = req.body;

  // Validation
  if (!price_per_unit || !quantity_mw) {
    return sendError(res, 400, 'Missing required fields: price_per_unit, quantity_mw');
  }
  if (!validatePrice(price_per_unit)) {
    return sendError(res, 400, 'Invalid price_per_unit: must be 0-99999.9999');
  }
  if (!validateQuantity(quantity_mw)) {
    return sendError(res, 400, 'Invalid quantity_mw: must be positive number');
  }
  // NEW: Validate price against ceiling
  if (hasValue(rfq.price_ceiling) && parseFloat(price_per_unit) > rfq.price_ceiling) {
    return sendError(res, 400, `Price exceeds RFQ ceiling: ₹${rfq.price_ceiling}/kWh`, { ceiling: rfq.price_ceiling, offered: price_per_unit });
  }
  // NEW: Validate quantity matches RFQ requirement (allow equal or less)
  if (parseFloat(quantity_mw) > rfq.quantity_mw) {
    return sendError(res, 400, `Quantity exceeds RFQ requirement: ${rfq.quantity_mw} MW`, { required: rfq.quantity_mw, offered: quantity_mw });
  }

  const vp = await VendorProfile.findOne({ user_id: req.user.user_id }).lean();
  if (!vp) return sendError(res, 403, 'Complete vendor profile before bidding');
  if (vp.verification_status !== 'verified') {
    return sendError(res, 403, 'Vendor verification is required before bidding');
  }

  const bid = await Bid.create({
    bid_id:          generateId('bid_'),
    rfq_id:          rfq.rfq_id,
    vendor_id:       req.user.user_id,
    vendor_name:     req.user.name,
    vendor_company:  vp?.company_name || req.user.name,
    vendor_location: vp?.location || '',
    vendor_certifications:    vp?.certifications || [],
    vendor_carbon_credits:    vp?.carbon_credits_ccts || 0,
    vendor_verification_status: vp?.verification_status || 'pending',
    vendor_verification: vp?.verification_status || 'pending',
    price_per_unit: parseFloat(price_per_unit),
    quantity_mw: parseFloat(quantity_mw),
    delivery_timeline: sanitizeString(delivery_timeline, 500),
    notes: sanitizeString(notes, 1000),
    status: 'submitted',
  });

  // Increment bid count on RFQ
  await RFQ.updateOne({ rfq_id: rfq.rfq_id }, { $inc: { bid_count: 1 } });

  // Notify client
  await notify(rfq.client_id, 'new_bid', `${req.user.name} submitted a bid on "${rfq.title}"`, rfq.rfq_id);
  const clientUser = await User.findOne({ user_id: rfq.client_id }).lean();
  if (clientUser) sendNewBid({ clientEmail: clientUser.email, rfqTitle: rfq.title, vendorName: req.user.name, price: bid.price_per_unit });

  return res.status(201).json(serializeBid(bid.toObject()));
}));

// POST /api/rfqs/:rfq_id/bids/rank — AI ranking (Scope 1.1.b)
async function rankRFQBids(req, res) {
  const rfq  = await RFQ.findOne({ rfq_id: req.params.rfq_id }).lean();
  if (!rfq) return sendError(res, 404, 'RFQ not found');
  if (rfq.client_id !== req.user.user_id && req.user.role !== 'admin') {
    return sendError(res, 403, 'Not your RFQ');
  }

  const bids = await Bid.find({ rfq_id: rfq.rfq_id }).lean();
  if (!bids.length) return sendError(res, 400, 'No bids to rank');

  // Get AI ranking from configured provider, with fallback if unavailable.
  const aiResult = await rankBids(rfq, bids);

  // Calculate and persist real scores for each bid
  for (const ranking of aiResult.rankings || []) {
    const bid = bids.find(b => b.bid_id === ranking.bid_id);
    if (!bid) continue;

    const complianceScore = await calculateComplianceScore(bid.vendor_id);
    const reliabilityScore = await calculateVendorReliability(bid.vendor_id);
    const distanceScore = calculateDistanceFeasibility(bid.vendor_location, rfq.delivery_location);

    await Bid.updateOne(
      { bid_id: ranking.bid_id },
      { $set: {
        ai_score: ranking.score,
        ai_analysis: { strengths: ranking.strengths, gaps: ranking.gaps, recommendation: ranking.recommendation },
        compliance_score: complianceScore,
        distance_feasibility: distanceScore,
        vendor_reliability: reliabilityScore
      }}
    );
  }

  return res.json(aiResult);
}

router.post('/:rfq_id/bids/rank', requireAuth, requireRole('client'), asyncHandler(rankRFQBids));
router.post('/:rfq_id/bids/ai-rank', requireAuth, requireRole('client'), asyncHandler(rankRFQBids));

// PATCH /api/bids/:bid_id/shortlist — Toggle shortlist
async function toggleShortlist(req, res) {
  const bid = await Bid.findOne({ bid_id: req.params.bid_id });
  if (!bid) return sendError(res, 404, 'Bid not found');
  const rfq = await RFQ.findOne({ rfq_id: bid.rfq_id }).lean();
  if (!rfq) return sendError(res, 404, 'RFQ not found');
  if (rfq.client_id !== req.user.user_id && req.user.role !== 'admin') return sendError(res, 403, 'Not your RFQ');
  if (req.params.rfq_id && req.params.rfq_id !== bid.rfq_id) return sendError(res, 404, 'Bid not found for RFQ');

  bid.is_shortlisted = !bid.is_shortlisted;
  bid.status = bid.is_shortlisted ? 'shortlisted' : 'submitted';
  await bid.save();

  if (bid.is_shortlisted) {
    await notify(bid.vendor_id, 'bid_shortlisted', `Your bid on "${rfq?.title}" has been shortlisted!`, bid.rfq_id);
  }

  return res.json(bid);
}

router.patch('/bids/:bid_id/shortlist', requireAuth, requireRole('client'), asyncHandler(toggleShortlist));
router.patch('/:rfq_id/bids/:bid_id/shortlist', requireAuth, requireRole('client'), asyncHandler(toggleShortlist));

// GET /api/rfqs/:rfq_id/bids/comparison — Vendor comparison (all bids side-by-side)
router.get('/:rfq_id/bids/comparison', requireAuth, requireRole('client'), asyncHandler(async (req, res) => {
  const rfq = await RFQ.findOne({ rfq_id: req.params.rfq_id }).lean();
  if (!rfq) return sendError(res, 404, 'RFQ not found');
  if (rfq.client_id !== req.user.user_id && req.user.role !== 'admin')
    return sendError(res, 403, 'Not your RFQ');

  const bids = await Bid.find({ rfq_id: req.params.rfq_id }).sort({ price_per_unit: 1 }).lean();

  if (!bids.length) return res.json({ rfq: serializeRFQ(rfq), bids: [], summary: null });

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
    compliance_score: b.compliance_score || null,
    distance_feasibility: b.distance_feasibility || null,
    vendor_reliability: b.vendor_reliability || null,
    vendor_location: b.vendor_location || '',
    vendor_certifications: b.vendor_certifications || [],
    vendor_carbon_credits: b.vendor_carbon_credits || 0,
    vendor_verification: b.vendor_verification || b.vendor_verification_status,
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

  return res.json({ rfq: serializeRFQ(rfq), comparison, summary });
}));

module.exports = router;
