import React from 'react';
import { ShieldCheck, Leaf } from 'lucide-react';

export default function VendorCertifications({ vendorProfile }) {
  if (!vendorProfile) return null;

  const hasCerts = vendorProfile.certifications?.length > 0;
  const hasCarbon = vendorProfile.carbon_credits_ccts > 0;

  if (!hasCerts && !hasCarbon) return null;

  return (
    <div className="space-y-2 border-t border-[#1E293B] pt-3 mt-3">
      <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Certifications & Compliance</div>

      {/* CCTS Carbon Credits */}
      {hasCarbon && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sm px-3 py-2">
          <Leaf size={12} className="text-emerald-400 shrink-0" />
          <div className="flex-1 text-xs">
            <div className="text-emerald-400 font-semibold">CCTS Certified</div>
            <div className="text-emerald-300 text-xs">{vendorProfile.carbon_credits_ccts} tCO₂e available</div>
          </div>
        </div>
      )}

      {/* Other Certifications */}
      {hasCerts && (
        <div className="space-y-1">
          {vendorProfile.certifications.map((cert, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck size={12} className="text-sky-400 shrink-0" />
              <span>{cert}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
