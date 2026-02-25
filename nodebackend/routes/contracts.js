const router = require('express').Router();
const { getDB } = require('../config/db');
const { nowISO } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../services/notifications');
const { sendEmail, baseHtml } = require('../services/email');

// GET /contracts
router.get('/', requireAuth(), async (req, res) => {
  try {
    const db = getDB();
    const u = req.user;
    let query = {};
    if (u.role === 'client') query.client_id = u.user_id;
    else if (u.role === 'vendor') query.vendor_id = u.user_id;
    const contracts = await db.collection('contracts').find(query, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray();
    res.json(contracts);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// GET /contracts/:id
router.get('/:contract_id', requireAuth(), async (req, res) => {
  try {
    const db = getDB();
    const contract = await db.collection('contracts').findOne({ contract_id: req.params.contract_id }, { projection: { _id: 0 } });
    if (!contract) return res.status(404).json({ detail: 'Not found' });
    const u = req.user;
    if (contract.client_id !== u.user_id && contract.vendor_id !== u.user_id && u.role !== 'admin') return res.status(403).json({ detail: 'Not authorized' });
    res.json(contract);
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// POST /contracts/:id/respond
router.post('/:contract_id/respond', requireAuth(['vendor']), async (req, res) => {
  try {
    const db = getDB();
    const contract = await db.collection('contracts').findOne({ contract_id: req.params.contract_id });
    if (!contract) return res.status(404).json({ detail: 'Not found' });
    if (contract.vendor_id !== req.user.user_id) return res.status(403).json({ detail: 'Not authorized' });
    if (contract.status !== 'pending_vendor_acceptance') return res.status(400).json({ detail: 'Contract already responded to' });

    const { accept, notes } = req.body;
    const newStatus = accept ? 'active' : 'vendor_declined';
    await db.collection('contracts').updateOne({ contract_id: req.params.contract_id }, {
      $set: { status: newStatus, vendor_response: accept ? 'accepted' : 'declined', vendor_notes: notes || null, responded_at: nowISO(), updated_at: nowISO() }
    });
    await db.collection('bids').updateOne({ bid_id: contract.bid_id }, { $set: { status: accept ? 'contract_signed' : 'contract_declined' } });

    const action = accept ? 'accepted' : 'declined';
    await createNotification(contract.client_id, 'contract_response', `Contract ${action.charAt(0).toUpperCase() + action.slice(1)} by Vendor`,
      `${contract.vendor_company} has ${action} the contract for '${contract.rfq_title}'.`,
      `/client/rfqs/${contract.rfq_id}`);

    const clientUser = await db.collection('users').findOne({ user_id: contract.client_id });
    if (clientUser) {
      if (accept) {
        const body = `<p>Dear ${contract.client_name},</p>
          <p><strong style="color:#10b981">${contract.vendor_company}</strong> has accepted the contract for <strong style="color:#0ea5e9">${contract.rfq_title}</strong>.</p>
          <p>The contract is now <strong>Active</strong>. Energy delivery will proceed as per agreed terms.</p>
          ${notes ? `<p>Vendor notes: ${notes}</p>` : ''}`;
        await sendEmail(clientUser.email, `Contract Accepted: ${contract.rfq_title}`, baseHtml('Contract Accepted!', body));
      } else {
        const body = `<p>Dear ${contract.client_name},</p>
          <p>${contract.vendor_company} has declined the contract for <strong style="color:#0ea5e9">${contract.rfq_title}</strong>.</p>
          ${notes ? `<p>Reason: ${notes}</p>` : ''}
          <p>Please log in to award the contract to another vendor.</p>`;
        await sendEmail(clientUser.email, `Contract Declined: ${contract.rfq_title}`, baseHtml('Contract Declined by Vendor', body));
      }
    }

    res.json({ message: `Contract ${action}`, status: newStatus });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
