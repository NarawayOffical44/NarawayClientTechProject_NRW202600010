import React from 'react';
import { ShieldCheck, MapPin, TrendingUp, Leaf } from 'lucide-react';

export default function BidMetrics({ bid }) {
  const metrics = [
    { label: 'Compliance', value: bid.compliance_score, icon: ShieldCheck, color: 'emerald' },
    { label: 'Distance', value: bid.distance_feasibility, icon: MapPin, color: 'blue' },
    { label: 'Reliability', value: bid.vendor_reliability, icon: TrendingUp, color: 'sky' },
  ];

  const getColor = (score) => {
    if (score >= 80) return '#10B981'; // emerald
    if (score >= 60) return '#F59E0B'; // amber
    return '#EF4444'; // red
  };

  return (
    <div className="space-y-3 border-t border-[#1E293B] pt-3 mt-3">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">AI Matching Scores</div>

      <div className="grid grid-cols-3 gap-2">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const color = getColor(metric.value);
          return (
            <div key={metric.label} className="bg-[#1E293B]/40 rounded-sm p-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={12} style={{ color }} className="shrink-0" />
                <div className="text-xs text-slate-500">{metric.label}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold" style={{ color }}>{metric.value}</div>
                <div className="w-full h-1 bg-[#0F172A] rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${metric.value}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Certifications */}
      {(bid.vendor_certifications?.length > 0 || bid.vendor_carbon_credits > 0) && (
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-sm p-2">
          <div className="text-xs font-semibold text-emerald-400 mb-1.5 flex items-center gap-1">
            <ShieldCheck size={11} /> Certifications
          </div>
          <div className="space-y-0.5 text-xs">
            {bid.vendor_carbon_credits > 0 && (
              <div className="flex items-center gap-1 text-emerald-300">
                <Leaf size={10} className="text-emerald-400" />
                CCTS: {bid.vendor_carbon_credits} tCO₂e
              </div>
            )}
            {bid.vendor_certifications?.map((cert, idx) => (
              <div key={idx} className="text-emerald-300">• {cert}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
