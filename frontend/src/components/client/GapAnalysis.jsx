import React from 'react';
import { AlertCircle, CheckCircle, TrendingDown } from 'lucide-react';

export default function GapAnalysis({ bid, rfq }) {
  if (!bid.ai_analysis) return null;

  const { strengths, gaps, recommendation } = bid.ai_analysis;

  return (
    <div className="space-y-3 border-t border-[#1E293B] pt-3 mt-3">
      {/* Recommendation */}
      {recommendation && (
        <div className="bg-sky-500/5 border border-sky-500/20 rounded-sm p-3">
          <div className="flex gap-2">
            <CheckCircle size={14} className="text-sky-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-sky-400 uppercase tracking-wide mb-0.5">AI Recommendation</div>
              <div className="text-xs text-slate-300">{recommendation}</div>
            </div>
          </div>
        </div>
      )}

      {/* Strengths */}
      {strengths && strengths.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2 flex items-center gap-2">
            <CheckCircle size={12} />
            Strengths ({strengths.length})
          </div>
          <div className="space-y-1.5 pl-6">
            {strengths.map((strength, idx) => (
              <div key={idx} className="text-xs text-emerald-300 flex items-start gap-2">
                <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                <span>{strength}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gaps (Unmet Requirements) */}
      {gaps && gaps.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-2">
            <AlertCircle size={12} />
            Gaps / Unmet Specs ({gaps.length})
          </div>
          <div className="space-y-1.5 pl-6">
            {gaps.map((gap, idx) => (
              <div key={idx} className="text-xs text-amber-300 flex items-start gap-2">
                <span className="text-amber-400 font-bold mt-0.5">!</span>
                <span>{gap}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No gaps badge */}
      {(!gaps || gaps.length === 0) && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-sm p-2 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle size={12} />
          All RFQ requirements met
        </div>
      )}
    </div>
  );
}
