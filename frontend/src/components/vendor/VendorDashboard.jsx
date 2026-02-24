import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, TrendingUp, CheckCircle, Clock, ChevronRight, Zap } from 'lucide-react';
import Navbar from '../Navbar';
import { API, useAuth } from '../../App';

const STATUS_STYLES = {
  submitted: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  accepted: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

export default function VendorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bids, setBids] = useState([]);
  const [openRFQs, setOpenRFQs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/vendor/bids`, { withCredentials: true }),
      axios.get(`${API}/rfqs`, { withCredentials: true }),
    ]).then(([bidsRes, rfqsRes]) => {
      setBids(bidsRes.data);
      setOpenRFQs(rfqsRes.data.slice(0, 5));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const stats = {
    totalBids: bids.length,
    active: bids.filter(b => b.status === 'submitted').length,
    accepted: bids.filter(b => b.status === 'accepted').length,
  };

  return (
    <div className="min-h-screen bg-[#020617]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-['Chivo'] font-bold text-2xl md:text-3xl text-white">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-slate-500 text-sm mt-1">Energy Vendor · {user?.company || 'Your Company'}</p>
          </div>
          <button
            data-testid="browse-marketplace-btn"
            onClick={() => navigate('/vendor/marketplace')}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 rounded-sm font-semibold text-sm transition-colors glow-primary"
          >
            <Search size={16} /> Browse RFQs
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Bids', value: stats.totalBids, icon: <TrendingUp size={18} strokeWidth={1.5} />, color: 'text-sky-400' },
            { label: 'Active Bids', value: stats.active, icon: <Clock size={18} strokeWidth={1.5} />, color: 'text-amber-400' },
            { label: 'Accepted', value: stats.accepted, icon: <CheckCircle size={18} strokeWidth={1.5} />, color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} data-testid={`vendor-stat-${s.label.toLowerCase().replace(' ', '-')}`} className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-4">
              <div className={`${s.color} mb-2`}>{s.icon}</div>
              <div className={`font-['Chivo'] font-black text-3xl ${s.color} mb-1`}>{s.value}</div>
              <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* My Bids */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm">
            <div className="px-6 py-4 border-b border-[#1E293B] flex items-center justify-between">
              <h2 className="font-['Chivo'] font-bold text-base text-white">My Recent Bids</h2>
            </div>
            {loading ? (
              <div className="py-8 flex justify-center"><div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : bids.length === 0 ? (
              <div className="py-10 text-center">
                <TrendingUp size={24} strokeWidth={1} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No bids submitted yet.</p>
                <button onClick={() => navigate('/vendor/marketplace')} className="mt-4 text-sky-400 text-xs hover:text-sky-300">Browse Marketplace</button>
              </div>
            ) : (
              <div className="divide-y divide-[#1E293B]">
                {bids.slice(0, 5).map(bid => (
                  <div key={bid.bid_id} data-testid={`my-bid-${bid.bid_id}`} className="px-6 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{bid.rfq?.title || 'RFQ'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        ₹{bid.price_per_unit}/kWh · {bid.quantity_mw} MW
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-sm font-semibold capitalize shrink-0 ${STATUS_STYLES[bid.status] || STATUS_STYLES.submitted}`}>
                      {bid.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Open RFQs */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm">
            <div className="px-6 py-4 border-b border-[#1E293B] flex items-center justify-between">
              <h2 className="font-['Chivo'] font-bold text-base text-white">Open RFQs</h2>
              <button onClick={() => navigate('/vendor/marketplace')} className="text-xs text-sky-400 hover:text-sky-300">View All</button>
            </div>
            {loading ? (
              <div className="py-8 flex justify-center"><div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : openRFQs.length === 0 ? (
              <div className="py-10 text-center">
                <Zap size={24} strokeWidth={1} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No open RFQs available.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1E293B]">
                {openRFQs.map(rfq => (
                  <div
                    key={rfq.rfq_id}
                    data-testid={`open-rfq-${rfq.rfq_id}`}
                    onClick={() => navigate(`/vendor/rfqs/${rfq.rfq_id}`)}
                    className="px-6 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#1E293B]/40 transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{rfq.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 capitalize">{rfq.energy_type} · {rfq.quantity_mw} MW · {rfq.delivery_location}</div>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
