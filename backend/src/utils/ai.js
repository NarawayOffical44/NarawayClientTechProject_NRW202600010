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
const GROQ_API_KEY = process.env.GROQ_API_KEY || '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const AI_MODEL = 'mixtral-8x7b-32768';

/**
 * calculateComplianceScore — Vendor compliance based on certifications & verification
 * @param {Array} certifications — List of vendor certifications
 * @param {String} verificationStatus — 'pending', 'verified', 'rejected'
 * @returns {Number} — Score 0-100
 */
function calculateComplianceScore(certifications, verificationStatus) {
  let score = 50; // baseline
  if (verificationStatus === 'verified') score += 25;
  if (verificationStatus === 'rejected') score = 20;
  if (certifications?.length > 0) score += Math.min(25, certifications.length * 5);
  return Math.min(100, score);
}

/**
 * calculateDistanceFeasibility — Simple distance-based feasibility (0-100)
 * In production: use geolocation APIs to calculate actual distance
 * @returns {Number} — Score 0-100 (random for now)
 */
function calculateDistanceFeasibility() {
  return Math.floor(Math.random() * 30) + 70; // 70-100 range as placeholder
}

/**
 * calculateVendorReliability — Vendor reliability based on history
 * In production: track actual bid acceptance rates, contract completion
 * @returns {Number} — Score 0-100 (random for now)
 */
function calculateVendorReliability() {
  return Math.floor(Math.random() * 40) + 60; // 60-100 range as placeholder
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

module.exports = {
  rankBids,
  calculateComplianceScore,
  calculateDistanceFeasibility,
  calculateVendorReliability
};
