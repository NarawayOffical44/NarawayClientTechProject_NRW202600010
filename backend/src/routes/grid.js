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

function randFloat(min, max, digits = 3) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(digits));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

  const totalMW  = Math.floor(Math.random() * 800) + 4100;
  const now      = new Date().toISOString();

  // Assign each region a network tier and corresponding latency
  const regionNetworks = [
    { name: 'North India', tier: NETWORK_TIERS[2], edge_gateway: 'Delhi 6G MEC', load_mw: randInt(1200, 1600), load_pct: randInt(58, 88), nodes: randInt(38, 45) },
    { name: 'South India', tier: NETWORK_TIERS[1], edge_gateway: 'Bengaluru 5G NR', load_mw: randInt(1000, 1400), load_pct: randInt(52, 82), nodes: randInt(30, 39) },
    { name: 'West India',  tier: NETWORK_TIERS[1], edge_gateway: 'Mumbai 5G NR', load_mw: randInt(900, 1200),  load_pct: randInt(48, 78), nodes: randInt(26, 35) },
    { name: 'East India',  tier: NETWORK_TIERS[0], edge_gateway: 'Kolkata 4G LTE fallback', load_mw: randInt(700, 1000),  load_pct: randInt(44, 74), nodes: randInt(22, 29) },
  ];
  const nodes = regionNetworks.reduce((sum, r) => sum + r.nodes, 0);

  // Primary grid latency (best tier active)
  const primaryTier = NETWORK_TIERS[2];
  const latency = randFloat(primaryTier.min, primaryTier.max);
  const jitter = randFloat(0.02, 0.18);
  const packetLoss = randFloat(0.001, 0.015);
  const syncAccuracy = randFloat(8, 42, 1);
  const responseReserve = stability === 'stable' ? 0 : randInt(18, 72);

  const networkTiers = { '4G_nodes': 0, '5G_nodes': 0, '6G_nodes': 0 };
  regionNetworks.forEach(({ tier, nodes: tierNodes }) => {
    if (tier.type.startsWith('4G')) networkTiers['4G_nodes'] += tierNodes;
    else if (tier.type.startsWith('5G')) networkTiers['5G_nodes'] += tierNodes;
    else if (tier.type.startsWith('6G')) networkTiers['6G_nodes'] += tierNodes;
  });

  const regions = regionNetworks.map(({ tier, ...r }) => ({
    ...r,
    network_type: tier.type,
    latency_ms: randFloat(tier.min, tier.max),
    jitter_ms: randFloat(tier.type === '6G' ? 0.02 : 0.08, tier.type === '4G LTE' ? 1.4 : 0.45),
    packet_loss_pct: randFloat(tier.type === '4G LTE' ? 0.02 : 0.001, tier.type === '4G LTE' ? 0.08 : 0.02),
    signal_quality_pct: randInt(tier.type === '4G LTE' ? 86 : 94, 99),
    balancing_mw: stability === 'stable' ? 0 : randInt(4, 22),
  }));

  const events = [
    { timestamp: now, severity: 'info',   message: `Grid frequency: ${freq} Hz — ${stability === 'stable' ? 'nominal' : 'deviation detected, balancing active'}` },
    { timestamp: now, severity: 'action', message: `Network sync: ${nodes} edge nodes (4G/5G/6G) balanced across regional grid` },
    { timestamp: now, severity: 'info',   message: `URLLC slice healthy: ${jitter} ms jitter, ${packetLoss}% packet loss, ${syncAccuracy} us sync accuracy` },
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
    network_tiers: networkTiers,
    control_plane: {
      mode: 'edge_auto_balancing',
      slice: 'grid-urllc',
      gateway: '6G MEC primary / 5G NR fallback',
      sla_latency_ms: 1.0,
      jitter_ms: jitter,
      packet_loss_pct: packetLoss,
      sync_accuracy_us: syncAccuracy,
      failover_ready: true,
    },
    balancing_action: {
      active: stability !== 'stable',
      reserve_mw: responseReserve,
      response_time_ms: parseFloat((latency + jitter).toFixed(3)),
      target_frequency_hz: 50.0,
    },
    renewable_mix: { solar, wind, hydro, thermal },
    events, regions, timestamp: now,
  });
});

module.exports = router;
