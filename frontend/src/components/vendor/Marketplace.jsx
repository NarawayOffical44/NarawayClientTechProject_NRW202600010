import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ChevronRight,
  Droplets,
  Filter,
  Flame,
  Search,
  ShieldCheck,
  Sun,
  Target,
  Wind,
  Zap,
} from 'lucide-react';
import Navbar from '../Navbar';
import { API } from '../../App';

const ENERGY_TYPES = ['All', 'solar', 'wind', 'hydro', 'thermal', 'green_hydrogen'];

const ENERGY_META = {
  solar: { label: 'Solar', icon: Sun },
  wind: { label: 'Wind', icon: Wind },
  hydro: { label: 'Hydro', icon: Droplets },
  thermal: { label: 'Thermal', icon: Flame },
  green_hydrogen: { label: 'Green Hydrogen', icon: Zap },
};

function formatEnergy(type) {
  return ENERGY_META[type]?.label || String(type || '').replace('_', ' ');
}

function getEnergyIcon(type) {
  return ENERGY_META[type]?.icon || Zap;
}

export default function Marketplace() {
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/rfqs`, { withCredentials: true })
      .then(r => setRfqs(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rfqs
      .filter(r => {
        if (filterType !== 'All' && r.energy_type !== filterType) return false;
        if (!q) return true;
        return (r.title || '').toLowerCase().includes(q) ||
          (r.delivery_location || '').toLowerCase().includes(q) ||
          formatEnergy(r.energy_type).toLowerCase().includes(q);
      })
      .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  }, [rfqs, search, filterType]);

  const counts = useMemo(() => {
    const base = { All: rfqs.length };
    ENERGY_TYPES.filter(t => t !== 'All').forEach(t => {
      base[t] = rfqs.filter(r => r.energy_type === t).length;
    });
    return base;
  }, [rfqs]);

  const recommendedCount = rfqs.filter(r => (r.match_score || 0) >= 70).length;
  const topMatches = rfqs.filter(r => r.match_score !== undefined).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#020617]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="font-['Chivo'] font-bold text-2xl md:text-3xl text-white mb-1">Energy Marketplace</h1>
          <p className="text-slate-500 text-sm">Browse open RFQs and submit competitive bids</p>
        </div>

        <div className="relative mb-5">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            data-testid="marketplace-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, location, or energy type..."
            className="w-full bg-[#0F172A] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 pl-9 pr-4 py-2.5 rounded-sm text-sm outline-none transition-colors"
          />
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-5 items-start">
          <div className="space-y-4">
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={14} className="text-sky-400" />
                <h3 className="text-sm font-semibold text-white">Filters</h3>
              </div>
              <div className="space-y-1.5">
                {ENERGY_TYPES.map(t => (
                  <button
                    key={t}
                    data-testid={`filter-${t}`}
                    onClick={() => setFilterType(t)}
                    className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-sm border font-medium transition-all duration-200 ${
                      filterType === t
                        ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                        : 'border-[#1E293B] text-slate-400 hover:border-[#334155] hover:text-white'
                    }`}
                  >
                    <span className="capitalize">{t === 'All' ? 'All RFQs' : formatEnergy(t)}</span>
                    <span className="text-slate-500">{counts[t] || 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target size={14} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Profile Fit</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-[#1E293B]/40 rounded-sm p-3">
                  <div className="text-xs text-slate-500 mb-1">Recommended</div>
                  <div className="font-['Chivo'] font-black text-2xl text-emerald-400">{recommendedCount}</div>
                </div>
                <div className="bg-[#1E293B]/40 rounded-sm p-3">
                  <div className="text-xs text-slate-500 mb-1">Open RFQs</div>
                  <div className="font-['Chivo'] font-black text-2xl text-sky-400">{rfqs.length}</div>
                </div>
              </div>
              <div className="space-y-2">
                {topMatches.map(r => (
                  <button
                    key={r.rfq_id}
                    onClick={() => navigate(`/vendor/rfqs/${r.rfq_id}`)}
                    className="w-full text-left border border-[#1E293B] hover:border-sky-500/30 rounded-sm px-3 py-2 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-white truncate">{r.title}</span>
                      <span className="text-xs text-emerald-400 shrink-0">{r.match_score || 0}%</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{formatEnergy(r.energy_type)} · {r.delivery_location}</div>
                  </button>
                ))}
                {topMatches.length === 0 && (
                  <div className="text-xs text-slate-500 border border-[#1E293B] rounded-sm px-3 py-2">
                    Complete your vendor profile to improve RFQ matching.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="text-xs text-slate-500 font-medium">
                {loading ? 'Loading...' : `${filtered.length} open RFQ${filtered.length !== 1 ? 's' : ''} available`}
              </div>
              <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
                <ShieldCheck size={13} className="text-emerald-400" />
                Profile-ranked marketplace
              </div>
            </div>

            {loading ? (
              <div className="py-16 flex justify-center">
                <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center bg-[#0F172A] border border-[#1E293B] rounded-sm">
                <Zap size={28} strokeWidth={1} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No open RFQs found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(rfq => {
                  const Icon = getEnergyIcon(rfq.energy_type);
                  const isRecommended = (rfq.match_score || 0) >= 70;
                  return (
                    <div
                      key={rfq.rfq_id}
                      data-testid={`marketplace-rfq-${rfq.rfq_id}`}
                      onClick={() => navigate(`/vendor/rfqs/${rfq.rfq_id}`)}
                      className="bg-[#0F172A] border border-[#1E293B] hover:border-sky-500/30 rounded-sm p-5 cursor-pointer transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="w-10 h-10 bg-[#1E293B] rounded-sm flex items-center justify-center shrink-0">
                            <Icon size={18} strokeWidth={1.5} className="text-sky-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className="font-['Chivo'] font-bold text-base text-white group-hover:text-sky-400 transition-colors truncate">{rfq.title}</h3>
                              {isRecommended && (
                                <span className="hidden sm:inline-flex text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-sm shrink-0">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                              <span className="text-xs text-slate-500">{formatEnergy(rfq.energy_type)}</span>
                              <span className="w-1 h-1 bg-slate-700 rounded-full" />
                              <span className="text-xs text-slate-500">{rfq.delivery_location}</span>
                              <span className="w-1 h-1 bg-slate-700 rounded-full" />
                              <span className="text-xs text-slate-500">{rfq.bid_count || 0} bids</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-2 line-clamp-2">{rfq.description}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {rfq.match_score !== undefined && (
                            <div className={`text-xs font-semibold mb-1 ${isRecommended ? 'text-emerald-400' : 'text-sky-400'}`}>
                              {rfq.match_score}% match
                            </div>
                          )}
                          <div className="font-['Chivo'] font-bold text-xl text-white">{rfq.quantity_mw}<span className="text-sm text-slate-500 font-normal"> MW</span></div>
                          {rfq.price_ceiling && (
                            <div className="text-xs text-slate-500 mt-1">Ceiling: Rs.{rfq.price_ceiling}/kWh</div>
                          )}
                          <div className="flex items-center gap-1 justify-end mt-2">
                            <span className="text-xs text-sky-400 font-medium">Bid Now</span>
                            <ChevronRight size={12} className="text-sky-400" />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-[#1E293B]">
                        {(rfq.match_reasons || []).slice(0, 2).map(reason => (
                          <span key={reason} className="text-xs bg-emerald-500/5 text-emerald-400/80 border border-emerald-500/10 px-2 py-0.5 rounded-sm">{reason}</span>
                        ))}
                        {rfq.add_on_services?.slice(0, 3).map(s => (
                          <span key={s} className="text-xs bg-sky-500/5 text-sky-400/70 border border-sky-500/10 px-2 py-0.5 rounded-sm">{s}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
