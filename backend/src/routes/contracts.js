/**
 * routes/contracts.js — Contract lifecycle management
 *
 * GET   /api/contracts                    — List contracts for current user (client or vendor)
 * GET   /api/contracts/:contract_id       — Get single contract
 * PATCH /api/contracts/:contract_id/respond — Vendor accepts or declines contract
 */
const express   = require('express');
const router    = express.Router();
const Contract  = require('../models/Contract');
const Bid       = require('../models/Bid');
const RFQ       = require('../models/RFQ');
const User      = require('../models/User');
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');
const { generateId, asyncHandler, sendError } = require('../utils/helpers');
const { sendContractAccepted } = require('../utils/email');

async function notify(userId, type, message, relatedId) {
  try { await Notification.create({ notification_id: generateId('ntf_'), user_id: userId, type, message, related_id: relatedId }); } catch {}
}

function serializeContract(contract) {
  if (!contract) return contract;
  const plain = typeof contract.toObject === 'function' ? contract.toObject() : contract;
  return {
    ...plain,
    created_at: plain.created_at || plain.createdAt,
  };
}

// GET /api/contracts
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const query = req.user.role === 'client'
    ? { client_id: req.user.user_id }
    : { vendor_id: req.user.user_id };
  const contracts = await Contract.find(query).sort({ createdAt: -1 }).lean();
  return res.json(contracts.map(serializeContract));
}));

// GET /api/contracts/:contract_id
router.get('/:contract_id', requireAuth, asyncHandler(async (req, res) => {
  const c = await Contract.findOne({ contract_id: req.params.contract_id }).lean();
  if (!c) return sendError(res, 404, 'Contract not found');
  if (c.client_id !== req.user.user_id && c.vendor_id !== req.user.user_id && req.user.role !== 'admin')
    return sendError(res, 403, 'Access denied');
  return res.json(serializeContract(c));
}));

// PATCH /api/contracts/:contract_id/respond — vendor accept/decline
async function respondToContract(req, res) {
  const { notes } = req.body;
  const action = req.body.action || (req.body.accept === true ? 'accept' : req.body.accept === false ? 'decline' : null);
  if (!['accept', 'decline'].includes(action)) return sendError(res, 400, 'action must be accept or decline');

  const contract = await Contract.findOne({ contract_id: req.params.contract_id });
  if (!contract) return sendError(res, 404, 'Contract not found');
  if (contract.vendor_id !== req.user.user_id) return sendError(res, 403, 'Not your contract');
  if (contract.status !== 'pending_vendor_acceptance') return sendError(res, 400, 'Contract already responded to');

  contract.status      = action === 'accept' ? 'active' : 'vendor_declined';
  contract.vendor_notes = notes || '';
  await contract.save();
  await Bid.updateOne(
    { bid_id: contract.bid_id },
    { $set: { status: action === 'accept' ? 'contract_signed' : 'contract_declined', contract_id: contract.contract_id } }
  );

  if (action === 'decline') {
    await RFQ.updateOne(
      { rfq_id: contract.rfq_id },
      { $set: { status: 'bidding_closed' }, $unset: { awarded_bid_id: '', contract_id: '' } }
    );
    await Bid.updateMany(
      { rfq_id: contract.rfq_id, bid_id: { $ne: contract.bid_id }, status: 'rejected', contract_id: { $exists: false } },
      { $set: { status: 'submitted' } }
    );
  }

  // Notify client
  const msg = action === 'accept'
    ? `${req.user.name} accepted the contract for "${contract.rfq_title}"`
    : `${req.user.name} declined the contract for "${contract.rfq_title}"`;
  await notify(contract.client_id, `contract_${action}ed`, msg, contract.contract_id);

  if (action === 'accept') {
    const clientUser = await User.findOne({ user_id: contract.client_id }).lean();
    if (clientUser) sendContractAccepted({ clientEmail: clientUser.email, rfqTitle: contract.rfq_title, vendorName: req.user.name });
  }

  return res.json(serializeContract(contract));
}

router.patch('/:contract_id/respond', requireAuth, asyncHandler(respondToContract));
router.post('/:contract_id/respond', requireAuth, asyncHandler(respondToContract));

module.exports = router;
