/**
 * utils/ai.js — Groq AI integration
 *
 * MOU Scope 1.1.b: "AI-driven bid ranking and gap analysis engine"
 *
 * Uses Groq API (mixtral-8x7b-32768) — fast, cost-efficient, open-source,
 * ideal for structured JSON analysis tasks like bid ranking.
 *
 * Developer note (Naraway team):
 *   rankBids() is the only AI call in the platform. All prompts are structured to
 *   return valid JSON — the response is parsed and stored back to MongoDB per bid.
 *   If the AI call fails, a graceful fallback returns score=50 for all bids.
 */

const axios = require('axios');
const logger = require('./logger');

// Groq API endpoint and model
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const AI_MODEL = 'mixtral-8x7b-32768';

const Bid = require('../models/Bid');
const Contract = require('../models/Contract');
const VendorProfile = require('../models/VendorProfile');

/**
 * calculateComplianceScore — Real vendor compliance score from certifications & verification status
 * Score breakdown: Baseline 50 + Verification status (0-30) + Certifications (0-20)
 * @param {String} vendor_id — Vendor ID
 * @returns {Number} — Score 0-100
 */
async function calculateComplianceScore(vendor_id) {
  try {
    const vendor = await VendorProfile.findOne({ vendor_id }).lean();
    if (!vendor) return 50; // unknown vendor = baseline

    let score = 50; // baseline

    // Verification status scoring (0-30)
    if (vendor.verification_status === 'verified') {
      score += 30; // fully verified
    } else if (vendor.verification_status === 'suspended') {
      score = 20; // heavily penalized
    } else if (vendor.verification_status === 'pending') {
      score += 10; // slight boost for pending review
    }

    // Certifications scoring (0-20, max 5 certs worth 4 points each)
    const certCount = vendor.certifications?.length || 0;
    score += Math.min(20, certCount * 4);

    return Math.min(100, score);
  } catch (err) {
    logger.error(`Error calculating compliance score: ${err.message}`);
    return 50; // fallback
  }
}

/**
 * calculateVendorReliability — Vendor reliability score based on bid & contract history
 * Score breakdown: Baseline 50 + Bid acceptance rate (0-25) + Contract completion rate (0-25)
 * @param {String} vendor_id — Vendor ID
 * @returns {Number} — Score 0-100
 */
async function calculateVendorReliability(vendor_id) {
  try {
    // Get all bids for this vendor
    const allBids = await Bid.find({ vendor_id }).lean();
    if (allBids.length === 0) return 60; // new vendor = moderate baseline

    // Calculate bid acceptance rate
    const acceptedBids = allBids.filter(b => b.status === 'accepted');
    const acceptanceRate = acceptedBids.length / allBids.length;

    // Calculate contract completion rate
    const completedContracts = await Contract.countDocuments({
      vendor_id,
      status: 'completed'
    });
    const totalContracts = await Contract.countDocuments({ vendor_id });
    const completionRate = totalContracts === 0 ? 0.5 : completedContracts / totalContracts;

    // Score: 50 (baseline) + 25 (acceptance) + 25 (completion)
    let score = 50;
    score += acceptanceRate * 25; // up to 75
    score += completionRate * 25; // up to 100

    return Math.min(100, Math.max(40, score)); // clamp 40-100
  } catch (err) {
    logger.error(`Error calculating reliability score: ${err.message}`);
    return 60; // fallback
  }
}

/**
 * calculateDistanceFeasibility — Calculate feasibility score based on delivery location
 * In production: use geolocation APIs (Google Maps, OpenStreetMap) to calculate actual distance
 * For now: Simple heuristic based on vendor location + RFQ location
 * @param {String} vendor_location — Vendor's registered location (state/region)
 * @param {String} rfq_location — RFQ delivery location
 * @returns {Number} — Score 0-100
 */
function calculateDistanceFeasibility(vendor_location, rfq_location) {
  try {
    // If locations match exactly, perfect score
    if (vendor_location && rfq_location && vendor_location.toLowerCase().includes(rfq_location.toLowerCase())) {
      return 95;
    }
    if (rfq_location && vendor_location && rfq_location.toLowerCase().includes(vendor_location.toLowerCase())) {
      return 95;
    }

    // Same state/region region = very good
    const vendorState = vendor_location?.split(',')[vendor_location.split(',').length - 1]?.trim();
    const rfqState = rfq_location?.split(',')[rfq_location.split(',').length - 1]?.trim();
    if (vendorState && rfqState && vendorState.toLowerCase() === rfqState.toLowerCase()) {
      return 85;
    }

    // Different state but both in India = acceptable (assume national grid)
    if (vendor_location && rfq_location) {
      return 75;
    }

    // Vendor location not specified = moderate baseline
    return 70;
  } catch (err) {
    logger.error(`Error calculating distance feasibility: ${err.message}`);
    return 70; // fallback
  }
}

/**
 * rankBids — AI-powered bid ranking and gap analysis.
 *
 * @param {Object} rfq  — Full RFQ document (quantity_mw, energy_type, price_ceiling, etc.)
 * @param {Array}  bids — Array of bid documents to evaluate
 * @returns {Object}    — { rankings: [{bid_id, score, strengths, gaps, recommendation}], summary, best_bid_id }
 */
async function rankBids(rfq, bids) {
  // Build concise prompt — Claude Haiku works best with clear, brief prompts
  const prompt = `You are an expert energy procurement analyst for India's B2B energy marketplace.

RFQ Requirements:
- Energy Type: ${rfq.energy_type}
- Quantity: ${rfq.quantity_mw} MW
- Price Ceiling: ₹${rfq.price_ceiling}/kWh
- Location: ${rfq.delivery_location}
- Timeline: ${rfq.delivery_start_date} to ${rfq.delivery_end_date}
- Payment Terms: ${rfq.payment_terms}
- Add-on Services: ${rfq.add_on_services?.join(', ') || 'None'}

Bids to rank:
${bids.map((b, i) => `
Bid ${i + 1}:
  bid_id: ${b.bid_id}
  Vendor: ${b.vendor_name}
  Price: ₹${b.price_per_unit}/kWh
  Quantity: ${b.quantity_mw} MW
  Timeline: ${b.delivery_timeline}
  Notes: ${b.notes || 'None'}
`).join('')}

Analyse each bid against the RFQ requirements. Consider: price competitiveness, quantity match, delivery timeline, vendor reliability.

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "rankings": [
    {
      "bid_id": "bid_id_here",
      "score": 85,
      "strengths": ["competitive price", "exact quantity match"],
      "gaps": ["longer delivery timeline"],
      "recommendation": "Best value bid — recommend shortlisting"
    }
  ],
  "summary": "2-3 sentence market analysis summary",
  "best_bid_id": "bid_id_here"
}`;

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: AI_MODEL,
        messages: [
          { role: 'system', content: 'You are an expert energy procurement analyst. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1024,
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract text content from Groq response
    const raw = response.data.choices[0]?.message?.content || '';

    // Strip any accidental markdown code fences
    const clean = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);

  } catch (err) {
    logger.error(`AI ranking error: ${err.message}`);
    // Graceful fallback — return neutral scores so the UI doesn't break
    return {
      rankings: bids.map(b => ({
        bid_id:         b.bid_id,
        score:          50,
        strengths:      [],
        gaps:           [],
        recommendation: 'Manual review required — AI analysis unavailable',
      })),
      summary:      'AI analysis unavailable. Please review bids manually.',
      best_bid_id:  bids[0]?.bid_id || null,
    };
  }
}

/**
 * enrichBidsWithScores — Calculate all scoring metrics for bids (compliance, distance, reliability)
 * Called after AI ranking to add additional metrics
 * @param {Array} bids — Array of bid documents
 * @param {Object} rfq — RFQ document
 * @returns {Promise<Array>} — Bids enriched with calculated scores
 */
async function enrichBidsWithScores(bids, rfq) {
  const enriched = [];
  for (const bid of bids) {
    const complianceScore = await calculateComplianceScore(bid.vendor_id);
    const reliabilityScore = await calculateVendorReliability(bid.vendor_id);
    const distanceScore = calculateDistanceFeasibility(bid.vendor_location, rfq.delivery_location);

    enriched.push({
      ...bid,
      compliance_score: complianceScore,
      vendor_reliability: reliabilityScore,
      distance_feasibility: distanceScore,
    });
  }
  return enriched;
}

module.exports = {
  rankBids,
  calculateComplianceScore,
  calculateDistanceFeasibility,
  calculateVendorReliability,
  enrichBidsWithScores,
};
