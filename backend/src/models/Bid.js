/**
 * models/Bid.js — Bid schema
 *
 * State machine:
 *   submitted → shortlisted → accepted | rejected → contract_signed | contract_declined
 */
const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  bid_id:           { type: String, required: true, unique: true, sparse: true, index: true },
  rfq_id:           { type: String, required: true, index: true },
  vendor_id:        { type: String, required: true, index: true },
  vendor_name:      { type: String },
  vendor_company:   { type: String },

  // Bid details submitted by vendor
  price_per_unit:   { type: Number, required: true },  // ₹/kWh
  quantity_mw:      { type: Number, required: true },
  delivery_timeline: { type: String },
  notes:            { type: String },

  // Lifecycle
  status:           { type: String, enum: ['submitted', 'shortlisted', 'accepted', 'rejected', 'contract_signed', 'contract_declined'], default: 'submitted' },
  is_shortlisted:   { type: Boolean, default: false },

  // AI ranking results (Scope 1.1.b — populated by /bids/rank endpoint)
  ai_score:         { type: Number },
  ai_analysis:      {
    strengths:      [{ type: String }],
    gaps:           [{ type: String }],
    recommendation: { type: String },
  },

  // Vendor profile snapshot (captured at bid time for compliance & certifications)
  vendor_certifications:   [{ type: String }],
  vendor_carbon_credits:   { type: Number, default: 0 },
  vendor_verification_status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },

  // Scoring metrics (Scope 1.1.b — AI matching engine)
  compliance_score:        { type: Number },      // 0-100, based on certifications & vendor status
  distance_feasibility:    { type: Number },      // 0-100, based on delivery location vs vendor location
  vendor_reliability:      { type: Number },      // 0-100, calculated from vendor history
}, { timestamps: true });

// Compound unique index: same vendor cannot bid twice on same RFQ
bidSchema.index({ rfq_id: 1, vendor_id: 1 }, { unique: true });

module.exports = mongoose.model('Bid', bidSchema, 'bids');
