/**
 * utils/audit.js — Audit logging utility
 *
 * Usage:
 *   auditLog(req, 'verify_vendor', 'vendor', vendor_id, { changes }, 'Verified after document review')
 */

const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

/**
 * auditLog — Record a critical action to the audit trail
 * @param {Object} req — Express request object (for user_id, ip, user_agent)
 * @param {String} action — Action type ('verify_vendor', 'reject_document', etc.)
 * @param {String} entity_type — Resource type ('vendor', 'user', 'rfq', etc.)
 * @param {String} entity_id — Resource ID
 * @param {Object} changes — What changed: { field: { old, new } }
 * @param {String} reason — Why the action was taken
 * @param {Object} metadata — Optional extra data
 */
async function auditLog(req, action, entity_type, entity_id, changes = null, reason = null, metadata = null) {
  try {
    const doc = await AuditLog.create({
      actor_user_id:  req.user?.user_id || 'system',
      actor_name:     req.user?.name || 'System',
      actor_role:     req.user?.role || 'admin',
      action,
      entity_type,
      entity_id,
      changes,
      reason,
      ip_address:     req.ip,
      user_agent:     req.get('user-agent'),
      details:        metadata,
    });
    logger.info(`[AUDIT] ${req.user?.name || 'System'} ${action} ${entity_type}/${entity_id} (reason: ${reason})`);
    return doc;
  } catch (err) {
    logger.error(`[AUDIT ERROR] Failed to log: ${err.message}`);
    // Don't throw — audit failure shouldn't block the action
  }
}

/**
 * getAuditLogs — Retrieve audit logs with filters
 * @param {Object} filters — { action, entity_type, entity_id, actor_user_id, days }
 * @param {Number} limit — Max records to return (default 100)
 * @returns {Promise<Array>}
 */
async function getAuditLogs(filters = {}, limit = 100) {
  try {
    const query = {};
    if (filters.action) query.action = filters.action;
    if (filters.entity_type) query.entity_type = filters.entity_type;
    if (filters.entity_id) query.entity_id = filters.entity_id;
    if (filters.actor_user_id) query.actor_user_id = filters.actor_user_id;

    // Date range filter (last N days)
    if (filters.days) {
      const since = new Date(Date.now() - filters.days * 24 * 60 * 60 * 1000);
      query.created_at = { $gte: since };
    }

    const logs = await AuditLog
      .find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();

    return logs;
  } catch (err) {
    logger.error(`Failed to retrieve audit logs: ${err.message}`);
    return [];
  }
}

module.exports = { auditLog, getAuditLogs };
