import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';
import Navbar from '../Navbar';
import { API } from '../../App';

export default function VendorRFQView() {
  const { rfq_id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [myBid, setMyBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    price_per_unit: '', quantity_mw: '', delivery_timeline: '', specs: {}, notes: '',
  });

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/rfqs/${rfq_id}`, { withCredentials: true }),
      axios.get(`${API}/rfqs/${rfq_id}/bids`, { withCredentials: true }),
    ]).then(([rfqRes, bidsRes]) => {
      setRfq(rfqRes.data);
      if (bidsRes.data.length > 0) setMyBid(bidsRes.data[0]);
      setForm(f => ({ ...f, quantity_mw: rfqRes.data.quantity_mw?.toString() || '' }));
    }).catch(console.error).finally(() => setLoading(false));
  }, [rfq_id]);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.price_per_unit || !form.quantity_mw || !form.delivery_timeline) {
      setError('Please fill all required fields');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const res = await axios.post(`${API}/rfqs/${rfq_id}/bids`, {
        price_per_unit: parseFloat(form.price_per_unit),
        quantity_mw: parseFloat(form.quantity_mw),
        delivery_timeline: form.delivery_timeline,
        notes: form.notes,
      }, { withCredentials: true });
      setMyBid(res.data);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit bid');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!rfq) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-400">RFQ not found</div>;

  return (
    <div className="min-h-screen bg-[#020617]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/vendor/marketplace')} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-['Chivo'] font-bold text-2xl text-white">{rfq.title}</h1>
            <p className="text-slate-500 text-sm mt-0.5">{rfq.delivery_location} · {rfq.energy_type} · {rfq.quantity_mw} MW</p>
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* RFQ Details */}
          <div className="md:col-span-3 space-y-4">
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-5">
              <h2 className="font-['Chivo'] font-bold text-base text-white mb-4">RFQ Requirements</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-[#1E293B] pb-2">
                  <span className="text-slate-500">Energy Type</span>
                  <span className="text-white capitalize">{rfq.energy_type?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between border-b border-[#1E293B] pb-2">
                  <span className="text-slate-500">Quantity Required</span>
                  <span className="text-white font-['JetBrains_Mono',monospace] font-medium">{rfq.quantity_mw} MW</span>
                </div>
                <div className="flex justify-between border-b border-[#1E293B] pb-2">
                  <span className="text-slate-500">Delivery Location</span>
                  <span className="text-white">{rfq.delivery_location}</span>
                </div>
                <div className="flex justify-between border-b border-[#1E293B] pb-2">
                  <span className="text-slate-500">Duration</span>
                  <span className="text-white text-xs">{rfq.start_date} → {rfq.end_date}</span>
                </div>
                {rfq.price_ceiling && (
                  <div className="flex justify-between border-b border-[#1E293B] pb-2">
                    <span className="text-slate-500">Price Ceiling</span>
                    <span className="text-amber-400 font-medium font-['JetBrains_Mono',monospace]">₹{rfq.price_ceiling}/kWh</span>
                  </div>
                )}
                {rfq.specs?.voltage_kv && (
                  <div className="flex justify-between border-b border-[#1E293B] pb-2">
                    <span className="text-slate-500">Voltage</span>
                    <span className="text-white">{rfq.specs.voltage_kv} kV</span>
                  </div>
                )}
                {rfq.specs?.phase && (
                  <div className="flex justify-between border-b border-[#1E293B] pb-2">
                    <span className="text-slate-500">Phase</span>
                    <span className="text-white">{rfq.specs.phase}</span>
                  </div>
                )}
                {rfq.financial_terms?.payment_terms && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Terms</span>
                    <span className="text-white capitalize">{rfq.financial_terms.payment_terms.replace('_', ' ')}</span>
                  </div>
                )}
              </div>
              {rfq.description && (
                <div className="mt-4 pt-4 border-t border-[#1E293B]">
                  <div className="text-xs text-slate-500 mb-2">Description</div>
                  <p className="text-slate-300 text-sm leading-relaxed">{rfq.description}</p>
                </div>
              )}
            </div>
            {rfq.add_on_services?.length > 0 && (
              <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Required Add-on Services</h3>
                <div className="flex flex-wrap gap-2">
                  {rfq.add_on_services.map(s => (
                    <span key={s} className="text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-1.5 rounded-sm">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bid Form */}
          <div className="md:col-span-2">
            {myBid || submitted ? (
              <div className="bg-[#0F172A] border border-emerald-500/20 rounded-sm p-6 text-center">
                <CheckCircle size={32} strokeWidth={1.5} className="text-emerald-400 mx-auto mb-4" />
                <h3 className="font-['Chivo'] font-bold text-lg text-white mb-2">Bid Submitted!</h3>
                <p className="text-slate-400 text-sm mb-4">Your bid has been received. The client will review and notify you.</p>
                <div className="bg-[#1E293B] rounded-sm p-4 text-left space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Your Price</span><span className="text-white font-['JetBrains_Mono',monospace]">₹{myBid?.price_per_unit}/kWh</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Quantity</span><span className="text-white">{myBid?.quantity_mw} MW</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="text-blue-400 capitalize font-semibold">{myBid?.status || 'submitted'}</span></div>
                </div>
                <button onClick={() => navigate('/vendor/dashboard')} className="mt-4 text-sky-400 text-sm hover:text-sky-300 transition-colors">
                  Back to Dashboard
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-5">
                <h2 className="font-['Chivo'] font-bold text-base text-white mb-5">Submit Your Bid</h2>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2.5 rounded-sm text-xs mb-4">
                    {error}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Price per kWh (INR) *</label>
                    <input
                      data-testid="bid-price-input"
                      type="number"
                      step="0.01"
                      value={form.price_per_unit}
                      onChange={e => upd('price_per_unit', e.target.value)}
                      placeholder="3.20"
                      className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                      required
                    />
                    {rfq.price_ceiling && (
                      <p className="text-xs text-amber-400 mt-1">Client ceiling: ₹{rfq.price_ceiling}/kWh</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Quantity You Can Supply (MW) *</label>
                    <input
                      data-testid="bid-quantity-input"
                      type="number"
                      value={form.quantity_mw}
                      onChange={e => upd('quantity_mw', e.target.value)}
                      className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Delivery Timeline *</label>
                    <input
                      data-testid="bid-timeline-input"
                      value={form.delivery_timeline}
                      onChange={e => upd('delivery_timeline', e.target.value)}
                      placeholder="e.g. Ready in 3 months from LOI"
                      className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2 block">Additional Notes</label>
                    <textarea
                      data-testid="bid-notes-input"
                      value={form.notes}
                      onChange={e => upd('notes', e.target.value)}
                      placeholder="Any additional details, warranties, certifications..."
                      rows={3}
                      className="w-full bg-[#020617] border border-[#1E293B] focus:border-sky-500 text-white placeholder-slate-600 px-4 py-3 rounded-sm text-sm outline-none transition-colors resize-none"
                    />
                  </div>
                  <button
                    data-testid="submit-bid-btn"
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white py-3 rounded-sm font-semibold text-sm transition-colors glow-primary"
                  >
                    {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={14} /> Submit Bid</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
