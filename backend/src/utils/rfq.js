function serializeRFQ(rfq) {
  if (!rfq) return rfq;
  const plain = typeof rfq.toObject === 'function' ? rfq.toObject() : rfq;
  const specs = plain.specs || {};
  const financialTerms = plain.financial_terms || {};
  const advance = financialTerms.advance_percent ?? financialTerms.advance_payment_pct ?? plain.advance_payment_pct ?? 0;

  return {
    ...plain,
    start_date: plain.start_date ?? plain.delivery_start_date ?? '',
    end_date: plain.end_date ?? plain.delivery_end_date ?? '',
    specs: {
      ...specs,
      voltage_kv: specs.voltage_kv ?? plain.voltage_kv ?? '',
      phase: specs.phase ?? plain.phase ?? '',
    },
    financial_terms: {
      ...financialTerms,
      payment_terms: financialTerms.payment_terms ?? plain.payment_terms ?? '',
      advance_percent: advance,
      advance_payment_pct: financialTerms.advance_payment_pct ?? plain.advance_payment_pct ?? advance,
    },
    carbon_credits_tco2e: plain.carbon_credits_tco2e ?? null,
  };
}

function serializeRFQs(rfqs) {
  return rfqs.map(serializeRFQ);
}

module.exports = { serializeRFQ, serializeRFQs };
