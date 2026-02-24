import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, BarChart3, Shield, Globe, ChevronRight, Menu, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../App';

const NAV_LINKS = [
  { label: 'Platform', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Vendors', href: '#vendors' },
  { label: 'Contact', href: '#contact' },
];

const STATS = [
  { value: '500+', label: 'Verified Vendors' },
  { value: '1,200+', label: 'RFQs Posted' },
  { value: '94%', label: 'Bid Match Rate' },
  { value: '< 48h', label: 'Avg Response Time' },
];

const FEATURES = [
  {
    icon: <Zap size={22} strokeWidth={1.5} className="text-sky-400" />,
    title: 'RFQ Marketplace',
    desc: 'Post detailed energy requirements and receive competitive bids from our verified vendor network within hours.',
    badge: 'Core',
  },
  {
    icon: <BarChart3 size={22} strokeWidth={1.5} className="text-amber-400" />,
    title: 'AI Bid Ranking',
    desc: 'Our AI engine scores every bid against your requirements — price, quantity, timeline, compliance — and surfaces the best match instantly.',
    badge: 'AI-Powered',
  },
  {
    icon: <Shield size={22} strokeWidth={1.5} className="text-emerald-400" />,
    title: 'Vendor Verification',
    desc: 'Every vendor on the platform undergoes regulatory document checks, green energy certifications, and carbon credit balance verification.',
    badge: 'Compliance',
  },
  {
    icon: <Globe size={22} strokeWidth={1.5} className="text-violet-400" />,
    title: 'Gap Analysis Engine',
    desc: 'Identify exactly what a vendor is missing vs. your requirements. No more back-and-forth. Make informed decisions with data.',
    badge: 'Analytics',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Post Your RFQ',
    desc: 'Define your energy requirements — type, quantity, delivery location, financial terms, and technical specs.',
  },
  {
    number: '02',
    title: 'Receive Bids',
    desc: 'Verified vendors from our network submit competitive bids tailored to your specifications.',
  },
  {
    number: '03',
    title: 'AI Ranks & Recommends',
    desc: 'Our AI engine scores each bid, highlights strengths and gaps, and recommends the best match for your needs.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : `/${user.role}/dashboard`);
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-[#F8FAFC]">
      {/* Navbar */}
      <nav
        data-testid="landing-navbar"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#020617]/95 backdrop-blur-xl border-b border-[#1E293B]' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-sky-500 rounded-sm flex items-center justify-center">
              <Zap size={14} strokeWidth={2.5} className="text-white" />
            </div>
            <span className="font-['Chivo'] font-black text-lg tracking-tight text-white">RENERGIZR</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-slate-400 hover:text-white transition-colors duration-200 font-medium"
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button
              data-testid="landing-login-btn"
              onClick={() => navigate('/auth')}
              className="text-sm text-slate-300 hover:text-white transition-colors duration-200 px-4 py-2 font-medium"
            >
              Sign In
            </button>
            <button
              data-testid="landing-get-started-btn"
              onClick={handleGetStarted}
              className="text-sm bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-sm font-semibold transition-colors duration-200 flex items-center gap-1.5 glow-primary"
            >
              Get Started <ChevronRight size={14} />
            </button>
          </div>
          <button className="md:hidden text-slate-400" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-[#0F172A] border-t border-[#1E293B] px-6 py-4 flex flex-col gap-4">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} className="text-sm text-slate-300 hover:text-white" onClick={() => setMenuOpen(false)}>
                {l.label}
              </a>
            ))}
            <button onClick={handleGetStarted} className="text-sm bg-sky-500 text-white px-4 py-2 rounded-sm font-semibold text-left">
              Get Started
            </button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1639422026989-c17351e8c71e?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600)`,
          }}
        />
        <div className="absolute inset-0 bg-[#020617]/80" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(14,165,233,0.08) 0%, transparent 60%)' }} />
        <div className="relative max-w-7xl mx-auto px-6 md:px-8 pt-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold px-3 py-1.5 rounded-sm mb-8 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse" />
              B2B Energy Trading Platform
            </div>
            <h1 className="font-['Chivo'] font-black text-5xl md:text-7xl leading-none tracking-tight mb-6">
              Trade Energy
              <br />
              <span className="text-sky-400">Smarter.</span>
              <br />
              <span className="text-slate-400 font-light">Faster.</span>
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed mb-10 max-w-xl font-['Inter']">
              India's first AI-powered B2B energy marketplace. Post RFQs, receive bids from verified vendors, and let our AI engine rank the best deals in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                data-testid="hero-post-rfq-btn"
                onClick={handleGetStarted}
                className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-8 py-3.5 rounded-sm font-semibold text-sm transition-colors duration-200 glow-primary"
              >
                Post Your First RFQ <ArrowRight size={16} />
              </button>
              <button
                data-testid="hero-vendor-join-btn"
                onClick={() => navigate('/auth')}
                className="flex items-center justify-center gap-2 border border-[#1E293B] hover:border-sky-500/50 text-slate-300 hover:text-white px-8 py-3.5 rounded-sm font-semibold text-sm transition-all duration-200"
              >
                Join as Vendor
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020617] to-transparent" />
      </section>

      {/* Stats Bar */}
      <section className="bg-[#0F172A] border-y border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-['Chivo'] font-black text-3xl md:text-4xl text-sky-400 mb-1">{s.value}</div>
                <div className="text-sm text-slate-500 font-medium tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6 md:px-8">
        <div className="mb-14">
          <div className="text-xs text-sky-400 font-semibold tracking-widest uppercase mb-3">Platform Features</div>
          <h2 className="font-['Chivo'] font-bold text-4xl md:text-5xl text-white mb-4">
            Built for Energy Procurement
          </h2>
          <p className="text-slate-400 max-w-xl text-base leading-relaxed">
            Every feature is designed around the complexities of B2B energy trading — regulatory, financial, and technical.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              data-testid={`feature-card-${i}`}
              className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-6 hover:border-sky-500/30 transition-all duration-300 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#1E293B] rounded-sm flex items-center justify-center shrink-0 group-hover:bg-[#1E293B] transition-colors">
                  {f.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-['Chivo'] font-bold text-lg text-white">{f.title}</h3>
                    <span className="text-xs bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-sm font-semibold">{f.badge}</span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-[#0F172A] border-y border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="mb-14">
            <div className="text-xs text-amber-400 font-semibold tracking-widest uppercase mb-3">Process</div>
            <h2 className="font-['Chivo'] font-bold text-4xl md:text-5xl text-white">
              Three Steps to Better Energy Deals
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.number} className="relative">
                <div className="font-['Chivo'] font-black text-6xl text-[#1E293B] mb-4 leading-none">{s.number}</div>
                <h3 className="font-['Chivo'] font-bold text-xl text-white mb-3">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vendor CTA */}
      <section id="vendors" className="py-24 max-w-7xl mx-auto px-6 md:px-8">
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-sm p-10 md:p-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative max-w-2xl">
            <div className="text-xs text-emerald-400 font-semibold tracking-widest uppercase mb-4">For Energy Vendors</div>
            <h2 className="font-['Chivo'] font-bold text-4xl md:text-5xl text-white mb-4">
              Reach Qualified Energy Buyers
            </h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Get verified, access our growing marketplace of B2B energy buyers, and submit bids for RFQs that match your capabilities. Complete your profile once — and let the deals come to you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                data-testid="vendor-register-btn"
                onClick={() => navigate('/auth')}
                className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-sm font-semibold text-sm transition-colors duration-200 flex items-center gap-2 glow-primary"
              >
                Register as Vendor <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 bg-[#0F172A] border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-['Chivo'] font-bold text-3xl text-white mb-3">Get in Touch</h2>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                Have questions about the platform or want to schedule a demo for your energy procurement team? Reach out to us.
              </p>
              <div className="space-y-3 text-sm text-slate-400">
                <div>Renergizr Industries Private Limited</div>
                <div>contact@renergizr.com</div>
                <div>+91 98765 43210</div>
              </div>
            </div>
            <div className="bg-[#020617] border border-[#1E293B] rounded-sm p-6">
              <div className="space-y-4">
                <input
                  data-testid="contact-name-input"
                  type="text"
                  placeholder="Your Name"
                  className="w-full bg-[#0F172A] border border-[#1E293B] text-white placeholder-slate-500 px-4 py-3 rounded-sm text-sm focus:outline-none focus:border-sky-500 transition-colors"
                />
                <input
                  data-testid="contact-email-input"
                  type="email"
                  placeholder="Email Address"
                  className="w-full bg-[#0F172A] border border-[#1E293B] text-white placeholder-slate-500 px-4 py-3 rounded-sm text-sm focus:outline-none focus:border-sky-500 transition-colors"
                />
                <textarea
                  data-testid="contact-message-input"
                  placeholder="Message"
                  rows={4}
                  className="w-full bg-[#0F172A] border border-[#1E293B] text-white placeholder-slate-500 px-4 py-3 rounded-sm text-sm focus:outline-none focus:border-sky-500 transition-colors resize-none"
                />
                <button
                  data-testid="contact-submit-btn"
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-sm font-semibold text-sm transition-colors duration-200"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#020617] border-t border-[#1E293B] py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-sky-500 rounded-sm flex items-center justify-center">
              <Zap size={10} strokeWidth={2.5} className="text-white" />
            </div>
            <span className="font-['Chivo'] font-black text-sm text-white">RENERGIZR</span>
          </div>
          <div className="text-xs text-slate-600">
            &copy; 2026 Renergizr Industries Private Limited. All rights reserved.
          </div>
          <div className="flex gap-6 text-xs text-slate-500">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
