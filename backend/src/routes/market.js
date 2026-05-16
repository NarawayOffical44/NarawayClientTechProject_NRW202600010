/**
 * routes/market.js - Market insights (public endpoint)
 * GET /api/market/insights - Returns a live-updating synthetic market snapshot.
 * Production: replace buildMarketSnapshot with IEX/PXIL/CCTS/NLDC data feeds.
 */
const express = require('express');
const router  = express.Router();

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function movement(base, amplitude, phase) {
  const now = Date.now() / 1000;
  return Math.sin(now / 37 + phase) * amplitude + Math.cos(now / 71 + phase) * (amplitude / 2);
}

function energyPrice(type, base, amplitude, phase) {
  const change = round(movement(base, amplitude, phase));
  const price = round(base + change);
  return {
    type,
    price,
    change,
    change_pct: round((change / base) * 100),
    unit: 'INR/kWh',
    trend: change >= 0 ? 'up' : 'down',
  };
}

function buildPriceHistory(latest) {
  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Live'];
  return months.map((month, idx) => {
    const age = months.length - idx - 1;
    return {
      month,
      solar: round(latest.solar + age * 0.05 + movement(0, 0.03, idx)),
      wind: round(latest.wind + age * 0.045 + movement(0, 0.035, idx + 2)),
      carbon: Math.max(210, Math.round(latest.carbon - age * 7 + movement(0, 2.5, idx + 4))),
    };
  });
}

function buildMarketSnapshot() {
  const energy_prices = [
    energyPrice('Solar', 2.85, 0.09, 1),
    energyPrice('Wind', 3.12, 0.11, 2),
    energyPrice('Hydro', 2.45, 0.07, 3),
    energyPrice('Thermal', 4.20, 0.14, 4),
    energyPrice('Green H2', 5.80, 0.18, 5),
  ];

  const solar = energy_prices.find(p => p.type === 'Solar').price;
  const wind = energy_prices.find(p => p.type === 'Wind').price;
  const carbonBase = 245.5;
  const cctsChange = round(movement(carbonBase, 8.5, 6));
  const cctsPrice = round(carbonBase + cctsChange);

  return {
    source: 'synthetic-live-market',
    source_label: 'Live demo snapshot',
    generated_at: new Date().toISOString(),
    refresh_seconds: 20,
    energy_prices,
    carbon: {
      ccts_price: cctsPrice,
      ccts_change: cctsChange,
      ccts_change_pct: round((cctsChange / carbonBase) * 100),
      unit: 'INR/tCO2e',
      eu_cbam: round(68.50 + movement(0, 1.6, 7)),
      eu_cbam_change: round(movement(0, 1.2, 8)),
      eu_cbam_unit: 'EUR/tCO2e',
      india_budget_crore: 20000,
      trading_scheme: 'CCTS',
    },
    market_stats: {
      active_rfqs_india: 142 + Math.round(movement(0, 4, 9)),
      registered_vendors: 523 + Math.round(movement(0, 6, 10)),
      total_mw_traded: 8540 + Math.round(movement(0, 120, 11)),
      avg_bid_response_hours: round(36 + movement(0, 2.2, 12), 1),
      yoy_growth_pct: round(34 + movement(0, 1.4, 13), 1),
    },
    price_history: buildPriceHistory({ solar, wind, carbon: cctsPrice }),
  };
}

router.get('/insights', (req, res) => {
  res.set('Cache-Control', 'no-store');
  return res.json(buildMarketSnapshot());
});

module.exports = router;
