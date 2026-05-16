/**
 * routes/grid.js — 4G/5G/6G Real-Time Grid Balancing (MOU Scope 1.1.f)
 * GET /api/grid/status — Returns simulated real-time grid telemetry
 *
 * Network tiers simulated:
 *   4G LTE  — latency 5–25 ms  (legacy fallback nodes)
 *   5G NR   — latency 1–5 ms   (primary grid nodes)
 *   6G      — latency 0.28–1 ms (edge gateway nodes)
 *
 * Production: replace with WebSocket + SCADA/NLDC API integration via 5G/6G edge gateway.
 * Frontend polls every 2s to simulate low-latency data push.
 */
const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');

// Network tier latency ranges (ms)
const NETWORK_TIERS = [
  { type: '4G LTE', min: 5.0,  max: 25.0  },
  { type: '5G NR',  min: 1.0,  max: 5.0   },
  { type: '6G',     min: 0.28, max: 0.95  },
];

router.get('/status', requireAuth, (req, res) => {
  // Simulate slight frequency deviation from India nominal 50.0 Hz
  const freq    = parseFloat((50.0 + (Math.random() * 0.40 - 0.20)).toFixed(4));
  const voltage = parseFloat((220.0 + (Math.random() * 6 - 3)).toFixed(2));

  const dev = Math.abs(freq - 50.0);
  const stability = dev < 0.10 ? 'stable' : dev < 0.25 ? 'warning' : 'critical';

  const solar   = Math.floor(Math.random() * 15) + 33;  // 33–48%
  const wind    = Math.floor(Math.random() * 10) + 24;  // 24–34%
  const hydro   = Math.floor(Math.random() * 7)  + 9;   // 9–16%
  const thermal = 100 - solar - wind - hydro;

  const nodes    = Math.floor(Math.random() * 18) + 120;
  const totalMW  = Math.floor(Math.random() * 800) + 4100;
  const now      = new Date().toISOString();

  // Assign each region a network tier and corresponding latency
  const regionNetworks = [
    { name: 'North India', tier: NETWORK_TIERS[2], load_mw: Math.floor(Math.random()*400)+1200, load_pct: Math.floor(Math.random()*30)+58, nodes: Math.floor(Math.random()*8)+38 },
    { name: 'South India', tier: NETWORK_TIERS[1], load_mw: Math.floor(Math.random()*400)+1000, load_pct: Math.floor(Math.random()*30)+52, nodes: Math.floor(Math.random()*10)+30 },
    { name: 'West India',  tier: NETWORK_TIERS[1], load_mw: Math.floor(Math.random()*300)+900,  load_pct: Math.floor(Math.random()*30)+48, nodes: Math.floor(Math.random()*10)+26 },
    { name: 'East India',  tier: NETWORK_TIERS[0], load_mw: Math.floor(Math.random()*300)+700,  load_pct: Math.floor(Math.random()*30)+44, nodes: Math.floor(Math.random()*8)+22 },
  ];

  // Primary grid latency (best tier active)
  const primaryTier = NETWORK_TIERS[2];
  const latency = parseFloat((Math.random() * (primaryTier.max - primaryTier.min) + primaryTier.min).toFixed(3));

  const regions = regionNetworks.map(({ tier, ...r }) => ({
    ...r,
    network_type: tier.type,
    latency_ms: parseFloat((Math.random() * (tier.max - tier.min) + tier.min).toFixed(3)),
  }));

  const events = [
    { timestamp: now, severity: 'info',   message: `Grid frequency: ${freq} Hz — ${stability === 'stable' ? 'nominal' : 'deviation detected, balancing active'}` },
    { timestamp: now, severity: 'action', message: `Network sync: ${nodes} edge nodes (4G/5G/6G) balanced across regional grid` },
    { timestamp: now, severity: 'info',   message: `Renewable mix: Solar ${solar}%, Wind ${wind}%, Hydro ${hydro}%` },
    { timestamp: now, severity: 'info',   message: `East India on 4G LTE fallback — 5G NR upgrade scheduled Q3 2026` },
  ];
  if (stability !== 'stable') {
    events.unshift({ timestamp: now, severity: 'warning', message: `Frequency deviation ${freq.toFixed(3)} Hz — auto-balancing engaged via 5G/6G control plane` });
  }

  return res.json({
    frequency_hz: freq, voltage_kv: voltage, total_load_mw: totalMW,
    grid_stability: stability, latency_ms: latency, active_nodes: nodes,
    network_type: '6G',  // primary gateway tier
    network_tiers: { '4G_nodes': 22, '5G_nodes': 56, '6G_nodes': nodes - 78 },
    renewable_mix: { solar, wind, hydro, thermal },
    events, regions, timestamp: now,
  });
});

module.exports = router;
