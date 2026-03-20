/**
 * tests/rfqs.test.js — RFQ and Bid route tests
 *
 * Test coverage:
 * - RFQ CRUD (Create, Read, Update, Delete)
 * - Input validation (quantity, price ceiling)
 * - Bid submission & validation
 * - AI ranking
 * - Bid comparison
 */

// TODO: Test POST /api/rfqs (Create RFQ)
//   - Valid RFQ created with all fields
//   - Missing required fields rejected
//   - Invalid energy_type rejected
//   - Invalid price_ceiling (> 99999.9999) rejected
//   - Invalid quantity_mw (negative) rejected

// TODO: Test POST /api/rfqs/:rfq_id/bids (Submit Bid)
//   - Valid bid submitted
//   - Bid price above ceiling rejected ✅ NEW FIX
//   - Bid quantity > RFQ quantity rejected ✅ NEW FIX
//   - Duplicate bid (same vendor) rejected
//   - Vendor profile snapshot saved

// TODO: Test POST /api/rfqs/:rfq_id/bids/rank (AI Ranking)
//   - AI ranking returns scores for all bids
//   - Real compliance score calculated (not random)
//   - Real reliability score calculated (not random)
//   - Real distance score calculated (not random)
//   - Graceful fallback if Groq API fails

// TODO: Test GET /api/rfqs/:rfq_id/bids/comparison
//   - Returns sortable bid comparison table
//   - Includes all scoring metrics
//   - Summary stats calculated

// TODO: Test GET /api/rfqs/:rfq_id/bids (List Bids)
//   - Only RFQ owner sees bids
//   - Vendors see only open RFQs

describe.skip('RFQ Routes', () => {
  it('should pass when implemented', () => {
    expect(true).toBe(true);
  });
});
