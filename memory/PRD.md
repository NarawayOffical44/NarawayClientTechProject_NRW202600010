# Renergizr Industries - B2B Energy Trading Platform

## Problem Statement
Build a B2B energy trading marketplace for Renergizr Industries Private Limited (per MOU). Platform connects energy buyers (clients) posting RFQs with verified energy vendors. AI-powered bid ranking, carbon credits tracking, and regulatory compliance.

## Architecture
- **Frontend**: React + Tailwind CSS + Recharts (dark industrial theme)
- **Backend**: FastAPI + MongoDB (motor async driver)
- **Auth**: JWT sessions (email/password) + Emergent Google OAuth
- **AI Engine**: Gemini 2.0 Flash via emergentintegrations (bid ranking + gap analysis)
- **Design**: Dark navy (#020617) + Sky blue (#0EA5E9) accent + Chivo/Inter fonts

## User Personas
1. **Energy Buyers (Client role)**: Post RFQs, review bids, use AI analysis
2. **Energy Vendors (Vendor role)**: Bid on RFQs, manage profile + certifications
3. **Platform Admin (Admin role)**: Verify vendors, manage users, analytics

## Core Features Implemented ✅

### Landing Page (Company Website)
- Live energy market ticker (Solar, Wind, CCTS Carbon, EU CBAM)
- Hero section with live market data widget
- About Renergizr (company story, INR 3.8L invested)
- 6-feature bento grid (RFQ, AI Ranking, Vendor Verification, Carbon Credits, Market Intelligence, CBAM Compliance)
- How It Works (3 steps)
- Carbon Credits & CCTS section (India ₹20,000 Cr CCTS, EU CBAM context)
- For Clients + For Vendors sections
- News & Insights (Finshots, LiveMint article links)
- Compliance badges (CCTS, MNRE, CEA, CBAM, ISO 14001, GreenPro)
- Contact form
- SEO meta tags (title, description, OG tags)
- Comprehensive footer

### Authentication
- JWT email/password login + registration
- Google OAuth (Emergent-managed)
- Role selection: Client / Vendor
- Session management (7-day cookies)

### Client Module
- Dashboard with stats (RFQs, bids, awarded)
- Energy price trend chart (6-month)
- Carbon market widget
- 4-step RFQ creation (Basic → Technical Specs → Logistics → Financial)
- RFQ detail with bid price comparison chart
- AI ranking (Gemini Flash) with gap analysis
- Accept/reject individual bids
- RFQ status management (open/closed/awarded)

### Vendor Module
- Dashboard with profile completion tracker
- Carbon Credits widget (balance + market value at CCTS rate)
- CCTS Carbon Price trend chart
- Marketplace with search + filter by energy type
- 3-tab vendor profile (Company Info / Energy & Capacity / Compliance & Docs)
- Carbon credits section with market value calculator
- Regulatory document management (7 doc types)
- Green certifications (7 certification types)
- Bid submission with price, quantity, timeline, notes

### Admin Dashboard
- Overview: stats + platform bar chart + energy price charts + CCTS carbon chart
- Users tab: role management, activate/deactivate
- Vendors tab: CCTS verification (verify/reject workflow)
- RFQs tab: all RFQs oversight

### API Endpoints
- Auth: register, login, google/session, me, logout
- RFQs: CRUD, status update
- Bids: submit, list, status update, AI ranking
- Vendor: profile CRUD, my bids
- Admin: users, vendors, analytics, rfqs
- Market: /api/market/insights (public, simulated data)
- Notifications: get, mark-read

## Seed Data (Test Credentials)
- **Admin**: admin@renergizr.com / Admin@123
- **Client 1**: buyer1@acme.com / Client@123
- **Client 2**: buyer2@tatapower.com / Client@123
- **Vendor 1**: vendor1@greensun.com / Vendor@123 (CCTS Verified, 12,500 tCO2e)
- **Vendor 2**: vendor2@windpower.com / Vendor@123 (Pending verification)

## Dates
- Jan 2026: Platform MVP (auth, RFQ, bids, AI ranking)
- Feb 2026: Major update (carbon credits, market data, comprehensive landing page, compliance docs)

## Prioritized Backlog

### P0 (Critical for Production)
- Real payment integration (Stripe/Razorpay) for platform fees
- Email notifications (SendGrid) for bid alerts
- File upload for vendor regulatory documents (Cloudinary)
- Real carbon credit API integration (registry data)
- Push notifications

### P1 (High Value)
- RFQ templates by energy type
- Vendor shortlisting (client can invite specific vendors)
- Bid negotiation workflow (counter-offers)
- Multi-language support (Hindi, Marathi)
- Mobile app (React Native)
- Analytics dashboard for vendors (win rate, pricing benchmark)

### P2 (Future)
- Carbon trading marketplace (buy/sell credits between vendors)
- Energy price alerts
- Integration with MNRE/CEA API for real regulatory verification
- Invoice & PO generation post-award
- Enterprise SSO (SAML)
- White-label version for large energy companies

## Tech Debt / Known Issues
- Market insights data is simulated (not live feed)
- Document upload UI placeholder (no actual file storage)
- Notifications returns empty array (not yet populated)
- No email verification on registration
