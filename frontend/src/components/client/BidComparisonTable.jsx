import React, { useState } from 'react';
import { ChevronUp, ChevronDown, TrendingDown, Check, Clock } from 'lucide-react';

const STATUS_STYLES = {
  submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  shortlisted: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  accepted: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

export default function BidComparisonTable({ comparison, summary }) {
  const [sortKey, setSortKey] = useState('price_per_unit');
  const [sortDir, setSortDir] = useState('asc');

  const sorted = [...comparison].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <div className="w-4 h-4" />;
    return sortDir === 'asc'
      ? <ChevronUp size={16} className="text-sky-400" />
      : <ChevronDown size={16} className="text-sky-400" />;
  };

  if (!comparison.length) {
    return (
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-8 text-center">
        <p className="text-slate-400 text-sm">No bids received yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-3">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Bids</div>
            <div className="text-xl font-bold text-white">{summary.total_bids}</div>
          </div>
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-3">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Shortlisted</div>
            <div className="text-xl font-bold text-amber-400">{summary.shortlisted_count}</div>
          </div>
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-3">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Avg Price</div>
            <div className="text-xl font-bold text-white">₹{summary.avg_price}</div>
          </div>
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-3">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Range</div>
            <div className="text-sm text-slate-400">₹{summary.min_price.toFixed(2)}–{summary.max_price.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-[#0F172A] border border-[#1E293B] rounded-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1E293B] bg-[#0F172A]/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                <button
                  onClick={() => toggleSort('vendor_company')}
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  Vendor <SortIcon col="vendor_company" />
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">
                <button
                  onClick={() => toggleSort('price_per_unit')}
                  className="flex items-center justify-end gap-2 hover:text-white transition-colors w-full"
                >
                  Price (₹/kWh) <SortIcon col="price_per_unit" />
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">
                <button
                  onClick={() => toggleSort('quantity_mw')}
                  className="flex items-center justify-end gap-2 hover:text-white transition-colors w-full"
                >
                  Qty (MW) <SortIcon col="quantity_mw" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                <button
                  onClick={() => toggleSort('delivery_timeline')}
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  Timeline <SortIcon col="delivery_timeline" />
                </button>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                <button
                  onClick={() => toggleSort('ai_score')}
                  className="flex items-center justify-center gap-2 hover:text-white transition-colors w-full"
                >
                  AI Score <SortIcon col="ai_score" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Gaps</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">Compliance</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">Reliability</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((bid, idx) => (
              <tr key={bid.bid_id} className="border-b border-[#1E293B] hover:bg-[#1E293B]/30 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{bid.vendor_company}</td>
                <td className="px-4 py-3 text-right font-['JetBrains_Mono',monospace] text-white">
                  ₹{bid.price_per_unit.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-slate-300">{bid.quantity_mw}</td>
                <td className="px-4 py-3 text-slate-300 text-xs">{bid.delivery_timeline || '—'}</td>
                <td className="px-4 py-3 text-center">
                  {bid.ai_score ? (
                    <div className="inline-flex items-center gap-2 bg-[#1E293B] rounded-sm px-2 py-1">
                      <span className="font-bold text-sky-400">{bid.ai_score}</span>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {bid.ai_analysis?.gaps?.length ? (
                    <span className="inline-block px-2 py-1 rounded-sm text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {bid.ai_analysis.gaps.length} gap{bid.ai_analysis.gaps.length !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-xs font-medium">✓ All met</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {bid.compliance_score ? (
                    <span className="inline-flex items-center gap-1 bg-[#1E293B] rounded-sm px-2 py-1 text-xs font-semibold"
                      style={{ color: bid.compliance_score >= 80 ? '#10B981' : bid.compliance_score >= 60 ? '#F59E0B' : '#EF4444' }}
                    >
                      {bid.compliance_score}
                    </span>
                  ) : <span className="text-slate-500 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {bid.vendor_reliability ? (
                    <span className="inline-flex items-center gap-1 bg-[#1E293B] rounded-sm px-2 py-1 text-xs font-semibold"
                      style={{ color: bid.vendor_reliability >= 80 ? '#10B981' : bid.vendor_reliability >= 60 ? '#F59E0B' : '#EF4444' }}
                    >
                      {bid.vendor_reliability}
                    </span>
                  ) : <span className="text-slate-500 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-1 rounded-sm text-xs font-medium border ${STATUS_STYLES[bid.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                    {bid.status === 'submitted' && <span className="flex items-center gap-1"><Clock size={12} /> Submitted</span>}
                    {bid.status === 'shortlisted' && <span className="flex items-center gap-1"><Check size={12} /> Shortlisted</span>}
                    {bid.status === 'accepted' && <span className="flex items-center gap-1"><Check size={12} /> Accepted</span>}
                    {bid.status === 'rejected' && <span>Rejected</span>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes if available */}
      {sorted.some(b => b.notes) && (
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Vendor Notes</h4>
          <div className="space-y-2">
            {sorted.filter(b => b.notes).map(bid => (
              <div key={bid.bid_id} className="text-sm">
                <div className="text-slate-300 font-medium">{bid.vendor_company}</div>
                <div className="text-slate-400 text-xs mt-1">{bid.notes}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
