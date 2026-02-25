const axios = require('axios');

/**
 * AI bid ranking using Gemini via Emergent proxy (OpenAI-compatible endpoint).
 * Falls back to algorithmic scoring if AI unavailable.
 */
async function rankBidsWithAI(rfq, bids) {
  const apiKey = process.env.EMERGENT_LLM_KEY;
  const proxyUrl = process.env.INTEGRATION_PROXY_URL || 'https://integrations.emergentagent.com';

  const rfqSummary = {
    title: rfq.title,
    energy_type: rfq.energy_type,
    quantity_mw: rfq.quantity_mw,
    delivery_location: rfq.delivery_location,
    price_ceiling: rfq.price_ceiling || null,
    start_date: rfq.start_date,
    end_date: rfq.end_date,
    specs: rfq.specs || {},
    financial_terms: rfq.financial_terms || {},
  };

  const bidsSummary = bids.map(b => ({
    bid_id: b.bid_id,
    vendor: b.vendor_company,
    price_per_unit: b.price_per_unit,
    quantity_mw: b.quantity_mw,
    delivery_timeline: b.delivery_timeline,
    notes: b.notes || '',
  }));

  const prompt = `You are an expert energy procurement analyst for a B2B energy trading platform.

RFQ Requirements:
${JSON.stringify(rfqSummary, null, 2)}

Vendor Bids Received:
${JSON.stringify(bidsSummary, null, 2)}

Analyze each bid and provide a score 0-100, strengths, gaps, and recommendation.

Respond ONLY with valid JSON in exactly this format:
{
  "rankings": [
    {
      "bid_id": "bid_id_here",
      "score": 85,
      "strengths": ["competitive price", "meets quantity"],
      "gaps": ["delivery timeline long"],
      "recommendation": "Strong candidate"
    }
  ],
  "summary": "Overall market analysis in 2-3 sentences",
  "best_bid_id": "bid_id_here"
}`;

  try {
    const response = await axios.post(
      `${proxyUrl}/openai/v1/chat/completions`,
      {
        model: 'gemini-2.0-flash',
        messages: [
          { role: 'system', content: 'You are an expert energy procurement analyst. Always respond with valid JSON only, no markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    let text = response.data.choices[0].message.content.trim();
    if (text.includes('```')) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}') + 1;
      text = text.slice(start, end);
    }
    return JSON.parse(text);
  } catch (err) {
    console.error('[AI] Ranking failed, using algorithmic fallback:', err.message);
    return algorithmicRanking(rfq, bids);
  }
}

function algorithmicRanking(rfq, bids) {
  const ceiling = rfq.price_ceiling;
  const ranked = bids.map(bid => {
    let score = 50;
    if (ceiling) {
      const ratio = bid.price_per_unit / ceiling;
      if (ratio <= 0.85) score += 30;
      else if (ratio <= 0.95) score += 20;
      else if (ratio <= 1.0) score += 10;
      else score -= 20;
    }
    if (bid.quantity_mw >= rfq.quantity_mw) score += 15;
    if (bid.vendor_verification === 'verified') score += 10;
    score = Math.max(0, Math.min(100, score));
    return {
      bid_id: bid.bid_id,
      score,
      strengths: score > 70 ? ['Competitive pricing', 'Meets requirements'] : ['Bid submitted'],
      gaps: ceiling && bid.price_per_unit > ceiling ? ['Exceeds price ceiling'] : [],
      recommendation: score > 70 ? 'Recommended for shortlisting' : 'Review manually',
    };
  });
  ranked.sort((a, b) => b.score - a.score);
  return {
    rankings: ranked,
    summary: `${bids.length} bid(s) analyzed algorithmically. Review AI ranking for deeper analysis.`,
    best_bid_id: ranked[0]?.bid_id || null,
  };
}

module.exports = { rankBidsWithAI };
