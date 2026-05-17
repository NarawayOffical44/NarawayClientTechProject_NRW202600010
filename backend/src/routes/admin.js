/**
 * routes/admin.js — Admin governance (Scope 1.1.e)
 *
 * GET   /api/admin/analytics       — Platform KPIs for overview dashboard
 * GET   /api/admin/users           — All users list
 * PATCH /api/admin/users/:user_id  — Update user role / is_active / verification_status
 * GET   /api/admin/vendors         — All vendor profiles with user info
 * GET   /api/admin/rfqs            — All RFQs
 * GET   /api/admin/contracts       — All contracts
 */
const express   = require('express');
const router    = express.Router();
const mongoose  = require('mongoose');
const User      = require('../models/User');
const RFQ       = require('../models/RFQ');
const Bid       = require('../models/Bid');
const VendorProfile = require('../models/VendorProfile');
const Contract  = require('../models/Contract');
const Notification = require('../models/Notification');
const AuditLog  = require('../models/AuditLog');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateId, asyncHandler, sendError } = require('../utils/helpers');
const { sendVendorVerified } = require('../utils/email');
const { auditLog, getAuditLogs } = require('../utils/audit');
const { serializeRFQs } = require('../utils/rfq');

// All admin routes require admin role
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/analytics
router.get('/analytics', asyncHandler(async (req, res) => {
  const [
    totalUsers, totalClients, totalVendors, openRfqs, awardedRfqs, completedRfqs,
    totalRfqs, totalBids, pendingVendors, verifiedVendors, activeContracts, contractValue,
    impactContracts, creditBalances, supportContracts,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'client' }),
    User.countDocuments({ role: 'vendor' }),
    RFQ.countDocuments({ status: 'open' }),
    RFQ.countDocuments({ status: 'awarded' }),
    RFQ.countDocuments({ status: 'completed' }),
    RFQ.countDocuments(),
    Bid.countDocuments(),
    VendorProfile.countDocuments({ verification_status: 'pending' }),
    VendorProfile.countDocuments({ verification_status: 'verified' }),
    Contract.countDocuments({ status: 'active' }),
    Contract.aggregate([
      { $match: { status: { $in: ['active', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$estimated_annual_value_inr' } } },
    ]),
    Contract.find({ status: { $in: ['active', 'completed'] } }).select('energy_type quantity_mw').lean(),
    VendorProfile.aggregate([
      { $group: { _id: null, total: { $sum: '$carbon_credits_ccts' } } },
    ]),
    Contract.find({ 'support_interest.0': { $exists: true } }).select('support_interest').lean(),
  ]);
  const renewableContracts = impactContracts.filter(c => c.energy_type !== 'thermal');
  const renewableMw = renewableContracts.reduce((sum, c) => sum + (c.quantity_mw || 0), 0);
  const annualMwh = Math.round(renewableMw * 8760);
  const supportRequests = supportContracts.reduce((sum, c) => sum + (c.support_interest?.length || 0), 0);
  return res.json({
    total_users: totalUsers,
    total_clients: totalClients,
    total_vendors: totalVendors,
    open_rfqs: openRfqs,
    awarded_rfqs: awardedRfqs,
    completed_rfqs: completedRfqs,
    total_rfqs: totalRfqs,
    total_bids: totalBids,
    pending_vendors: pendingVendors,
    verified_vendors: verifiedVendors,
    active_contracts: activeContracts,
    estimated_contract_value_inr: contractValue[0]?.total || 0,
    renewable_mw: renewableMw,
    annual_renewable_mwh: annualMwh,
    estimated_co2_avoided_tco2e: Math.round(annualMwh * 0.82),
    carbon_credits_available_tco2e: creditBalances[0]?.total || 0,
    support_requests: supportRequests,
  });
}));

// GET /api/admin/users
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
  return res.json(users);
}));

// PATCH /api/admin/users/:user_id
router.patch('/users/:user_id', asyncHandler(async (req, res) => {
  const { role, is_active, verification_status, reason } = req.body;
  const user = await User.findOne({ user_id: req.params.user_id });
  if (!user) return sendError(res, 404, 'User not found');

  // Track changes for audit log
  const changes = {};
  if (role !== undefined && user.role !== role) {
    changes.role = { old: user.role, new: role };
    user.role = role;
  }
  if (is_active !== undefined && user.is_active !== is_active) {
    changes.is_active = { old: user.is_active, new: is_active };
    user.is_active = is_active;
  }

  await user.save();

  // If verification_status is being set, update vendor profile
  if (verification_status) {
    const vp = await VendorProfile.findOne({ user_id: user.user_id });
    if (vp && vp.verification_status !== verification_status) {
      changes.verification_status = { old: vp.verification_status, new: verification_status };
      vp.verification_status = verification_status;
      await vp.save();

      // Log the verification action
      await auditLog(
        req,
        verification_status === 'verified' ? 'verify_vendor' : 'suspend_vendor',
        'vendor',
        vp.vendor_id,
        changes,
        reason || `Vendor ${verification_status}`
      );

      if (verification_status === 'verified') {
        sendVendorVerified({ vendorEmail: user.email, companyName: vp.company_name || user.name });
        // Notify vendor
        try {
          await Notification.create({
            notification_id: generateId('ntf_'),
            user_id: user.user_id,
            type: 'vendor_verified',
            message: `Your company has been verified on Renergizr! You can now bid on all RFQs.`
          });
        } catch {}
      } else if (verification_status === 'rejected') {
        try {
          await Notification.create({
            notification_id: generateId('ntf_'),
            user_id: user.user_id,
            type: 'vendor_rejected',
            message: `Your company verification was rejected. Reason: ${reason || 'See admin dashboard'}`
          });
        } catch {}
      }
    }
  }

  // Log user role/active changes
  if (Object.keys(changes).length > 0 && !verification_status) {
    await auditLog(req, 'update_user', 'user', user.user_id, changes, reason || 'User update');
  }

  const { password, ...safe } = user.toObject();
  return res.json(safe);
}));

// GET /api/admin/vendors
router.get('/vendors', asyncHandler(async (req, res) => {
  const profiles = await VendorProfile.find().sort({ createdAt: -1 }).lean();
  // Attach user email to each profile
  const userIds  = profiles.map(p => p.user_id);
  const users    = await User.find({ user_id: { $in: userIds } }).select('user_id email name').lean();
  const userMap  = Object.fromEntries(users.map(u => [u.user_id, u]));
  const vendorIds = profiles.map(p => p.vendor_id);
  const docs = await mongoose.connection.collection('vendor_documents')
    .find({ vendor_id: { $in: vendorIds } }, { projection: { data: 0 } })
    .toArray();
  const docsByVendor = docs.reduce((acc, doc) => {
    acc[doc.vendor_id] = acc[doc.vendor_id] || [];
    acc[doc.vendor_id].push(doc);
    return acc;
  }, {});
  const result   = profiles.map(p => ({ ...p, user: userMap[p.user_id] || null, documents: docsByVendor[p.vendor_id] || [] }));
  return res.json(result);
}));

// GET /api/admin/rfqs
router.get('/rfqs', asyncHandler(async (req, res) => {
  const rfqs = await RFQ.find().sort({ createdAt: -1 }).lean();
  return res.json(serializeRFQs(rfqs));
}));

// GET /api/admin/contracts
router.get('/contracts', asyncHandler(async (req, res) => {
  const contracts = await Contract.find().sort({ createdAt: -1 }).lean();
  return res.json(contracts);
}));

router.get('/support-requests', asyncHandler(async (req, res) => {
  const contracts = await Contract.find({ 'support_interest.0': { $exists: true } }).sort({ updatedAt: -1 }).lean();
  const requests = contracts.flatMap(contract => (contract.support_interest || []).map(item => ({
    request_id: item._id,
    contract_id: contract.contract_id,
    rfq_title: contract.rfq_title,
    client_company: contract.client_company,
    vendor_company: contract.vendor_company,
    type: item.type,
    status: item.status || 'requested',
    requester_role: item.requester_role,
    notes: item.notes,
    purpose: item.purpose,
    carbon_credits_tco2e: item.carbon_credits_tco2e,
    created_at: item.created_at,
  })));
  requests.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return res.json(requests);
}));

// GET /api/admin/audit-logs — Retrieve audit trail
router.get('/audit-logs', asyncHandler(async (req, res) => {
  const { action, entity_type, entity_id, days = 30, limit = 100 } = req.query;
  const filters = {
    ...(action && { action }),
    ...(entity_type && { entity_type }),
    ...(entity_id && { entity_id }),
    ...(days && { days: parseInt(days) }),
  };

  const logs = await getAuditLogs(filters, parseInt(limit));
  return res.json(logs);
}));

router.patch('/vendor-documents/:doc_id', asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'verified', 'rejected'].includes(status)) return sendError(res, 400, 'Invalid document status');
  const doc = await mongoose.connection.collection('vendor_documents').findOneAndUpdate(
    { doc_id: req.params.doc_id },
    { $set: { status } },
    { returnDocument: 'after', projection: { data: 0 } }
  );
  const updated = doc?.value || doc;
  if (!updated) return sendError(res, 404, 'Document not found');
  return res.json(updated);
}));

module.exports = router;
