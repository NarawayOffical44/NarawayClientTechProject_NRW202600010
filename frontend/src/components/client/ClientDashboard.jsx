import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, FileText, TrendingUp, CheckCircle, Clock, ChevronRight, Zap } from 'lucide-react';
import Navbar from '../Navbar';
import { API, useAuth } from '../../App';

const STATUS_STYLES = {
  open: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  closed: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  awarded: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  draft: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
};

const ENERGY_ICONS = {
  solar: '☀', wind: '💨', hydro: '💧', thermal: '🔥', green_hydrogen: '⚡',
};

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/rfqs`, { withCredentials: true })
      .then(r => setRfqs(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: rfqs.length,
    open: rfqs.filter(r => r.status === 'open').length,
    bids: rfqs.reduce((sum, r) => sum + (r.bid_count || 0), 0),
    awarded: rfqs.filter(r => r.status === 'awarded').length,
  };

  return (
    <div className="min-h-screen bg-[#020617]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-['Chivo'] font-bold text-2xl md:text-3xl text-white">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{user?.company || 'Energy Buyer'} · Dashboard</p>
          </div>
          <button
            data-testid="create-rfq-btn"
            onClick={() => navigate('/client/rfqs/new')}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 rounded-sm font-semibold text-sm transition-colors duration-200 glow-primary"
          >
            <Plus size={16} /> New RFQ
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total RFQs', value: stats.total, icon: <FileText size={18} strokeWidth={1.5} />, color: 'text-sky-400' },
            { label: 'Open RFQs', value: stats.open, icon: <Clock size={18} strokeWidth={1.5} />, color: 'text-emerald-400' },
            { label: 'Bids Received', value: stats.bids, icon: <TrendingUp size={18} strokeWidth={1.5} />, color: 'text-amber-400' },
            { label: 'Awarded', value: stats.awarded, icon: <CheckCircle size={18} strokeWidth={1.5} />, color: 'text-violet-400' },
          ].map((s) => (
            <div key={s.label} data-testid={`stat-${s.label.toLowerCase().replace(' ', '-')}`} className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-4">
              <div className={`${s.color} mb-3`}>{s.icon}</div>
              <div className={`font-['Chivo'] font-black text-3xl ${s.color} mb-1`}>{s.value}</div>
              <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* RFQs Table */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm">
          <div className="px-6 py-4 border-b border-[#1E293B] flex items-center justify-between">
            <h2 className="font-['Chivo'] font-bold text-base text-white">My RFQs</h2>
            <span className="text-xs text-slate-500">{rfqs.length} total</span>
          </div>
          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rfqs.length === 0 ? (
            <div className="py-16 text-center">
              <Zap size={32} strokeWidth={1} className="text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 text-sm mb-4">No RFQs posted yet.</p>
              <button
                data-testid="first-rfq-btn"
                onClick={() => navigate('/client/rfqs/new')}
                className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2.5 rounded-sm font-semibold text-sm transition-colors"
              >
                Post Your First RFQ
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#1E293B]">
              {rfqs.map(rfq => (
                <div
                  key={rfq.rfq_id}
                  data-testid={`rfq-row-${rfq.rfq_id}`}
                  onClick={() => navigate(`/client/rfqs/${rfq.rfq_id}`)}
                  className="px-6 py-4 hover:bg-[#1E293B]/40 cursor-pointer transition-colors duration-150 flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-8 h-8 bg-[#1E293B] rounded-sm flex items-center justify-center text-sm shrink-0">
                      {ENERGY_ICONS[rfq.energy_type] || <Zap size={14} />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{rfq.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {rfq.energy_type} · {rfq.quantity_mw} MW · {rfq.delivery_location}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center hidden md:block">
                      <div className="font-['JetBrains_Mono',monospace] font-medium text-white text-sm">{rfq.bid_count || 0}</div>
                      <div className="text-xs text-slate-500">Bids</div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-sm font-semibold capitalize ${STATUS_STYLES[rfq.status] || STATUS_STYLES.open}`}>
                      {rfq.status}
                    </span>
                    <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
