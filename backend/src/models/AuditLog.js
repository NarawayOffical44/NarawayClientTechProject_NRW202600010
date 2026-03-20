/**
 * models/AuditLog.js — Audit trail for all critical admin actions
 *
 * Used for compliance, regulatory audits, and dispute resolution.
 * Tracks: who did what, when, to which resource, and why.
 */
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Actor (who performed the action)
  actor_user_id:     { type: String, required: true, index: true },
  actor_name:        { type: String },
  actor_role:        { type: String, enum: ['admin'] },

  // Action details
  action:            { type: String, required: true, enum: [
    'verify_vendor',
    'suspend_vendor',
    'approve_document',
    'reject_document',
    'award_contract',
    'cancel_contract',
    'update_user',
    'delete_user',
    'flag_bid',
    'user_login',
    'other'
  ], index: true },

  // Resource being acted upon
  entity_type:       { type: String, enum: ['vendor', 'user', 'rfq', 'bid', 'contract', 'document'], index: true },
  entity_id:         { type: String, index: true },
  entity_label:      { type: String }, // friendly name (vendor name, email, etc.)

  // What changed
  changes:           { type: mongoose.Schema.Types.Mixed }, // { field: { old: "...", new: "..." } }
  reason:            { type: String }, // why the action was taken (required for rejections, suspensions)

  // Context
  ip_address:        { type: String },
  user_agent:        { type: String },
  details:           { type: mongoose.Schema.Types.Mixed }, // additional metadata

  // Timestamp
  created_at:        { type: Date, default: Date.now, index: true },
});

// Automatically delete audit logs older than 1 year (optional, for GDPR compliance)
// Uncomment if needed: auditLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 31536000 });

module.exports = mongoose.model('AuditLog', auditLogSchema, 'audit_logs');
