# RENERGIZR INDUSTRIES PRIVATE LIMITED
## Product Requirements Document (PRD)
### B2B Energy Trading Platform — Version 1.2
**Document Date:** February 2026 | **Status:** Active Development | **Confidential**

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Background & Problem Statement](#2-background--problem-statement)
3. [Business Goals & Success Metrics](#3-business-goals--success-metrics)
4. [User Personas](#4-user-personas)
5. [Platform Architecture](#5-platform-architecture)
6. [Feature Specifications](#6-feature-specifications)
7. [Trading Workflow — State Machines](#7-trading-workflow--state-machines)
8. [API Reference](#8-api-reference)
9. [Database Schema](#9-database-schema)
10. [UI/UX Design System](#10-uiux-design-system)
11. [Notifications & Email System](#11-notifications--email-system)
12. [Security & Authentication](#12-security--authentication)
13. [Regulatory & Compliance Context](#13-regulatory--compliance-context)
14. [Test Credentials & Seed Data](#14-test-credentials--seed-data)
15. [Deployment Architecture](#15-deployment-architecture)
16. [Roadmap & Backlog](#16-roadmap--backlog)
17. [Known Issues & Tech Debt](#17-known-issues--tech-debt)
18. [Changelog](#18-changelog)

---

## 1. EXECUTIVE SUMMARY

Renergizr Industries Pvt. Ltd. is building India's first AI-powered B2B energy trading marketplace. The platform enables large industrial energy buyers to publish Requests for Quotation (RFQs), receive competitive bids from CCTS-verified energy vendors, and close deals through a structured, transparent workflow — all within a single digital environment.

The platform is designed for the Indian energy procurement market, aligned with:
- **India's Carbon Credit Trading Scheme (CCTS)** under the Energy Conservation (Amendment) Act 2022
- **MNRE (Ministry of New and Renewable Energy)** procurement guidelines
- **CEA (Central Electricity Authority)** licensing requirements
- **EU CBAM (Carbon Border Adjustment Mechanism)** readiness for export-linked industries

**Current Platform Status:** MVP Live — Core trading workflow, AI bid ranking, notification system, contract management, and vendor verification all operational.

---

## 2. BACKGROUND & PROBLEM STATEMENT

### 2.1 The Market Gap

India's renewable energy sector is growing at 34% YoY, with 142+ open RFQs for industrial energy procurement at any given time. Yet the procurement process remains fragmented:

- Large buyers (manufacturing, data centres, real estate) spend 60–90 days on manual vendor discovery
- No central marketplace for verified green energy vendors
- Carbon credit obligations under CCTS (₹20,000 Cr annual market) are tracked in spreadsheets
- EU CBAM compliance (effective 2026) creates new documentation burdens for exporters

### 2.2 Our Solution

Renergizr creates a structured digital marketplace where:
- **Clients** post RFQs specifying energy type, quantity (MW), location, duration, and price ceiling
- **Vendors** (solar, wind, hydro, thermal, green hydrogen suppliers) submit competitive bids
- **AI** (Gemini 2.0 Flash) ranks bids on price, fit, timeline, and compliance
- **Contracts** are digitally created, accepted, and tracked end-to-end
- **Carbon credits** (CCTS & EU CBAM) are visible, verified, and factored into pricing

### 2.3 Company Background

Renergizr Industries Private Limited was incorporated with an initial investment of INR 3,80,000. The platform was developed under the terms of a Memorandum of Understanding (MOU) between Renergizr and its technology partner, Emergent Labs.

---

## 3. BUSINESS GOALS & SUCCESS METRICS

### 3.1 Phase 1 Goals (Current — MVP)
| Goal | Target | Current Status |
|------|--------|----------------|
| Platform launch | Q1 2026 | ✅ Deployed |
| Vendor onboarding | 25 verified vendors | 2 seeded (demo) |
| Client RFQs | 10 live RFQs | 7 in system |
| Contracts closed | 5 | 2 active |
| AI bid ranking accuracy | >90% | ~94% (simulated) |

### 3.2 Phase 2 Goals (Q2 2026)
- Payment integration (platform fees + transaction fees via Razorpay/Stripe)
- 100+ verified vendors across 5 energy types
- Live carbon credit price feed from CCTS registry
- Mobile app (React Native) for on-the-go bid tracking

### 3.3 Key Business Metrics
- **GMV (Gross Merchandise Value):** Total energy deal value transacted through platform
- **Bid Response Time:** Target < 48 hours average (currently modelled at 36h)
- **Vendor Verification Rate:** % of registered vendors completing CCTS verification
- **Contract Conversion Rate:** % of RFQs that result in signed contracts

---

## 4. USER PERSONAS

### 4.1 Energy Buyer (Client Role)

**Profile:** Head of procurement / energy manager at industrial companies (manufacturing, IT parks, real estate developers, data centres)

**Goals:**
- Reduce energy procurement cost by 15–25% through competitive bidding
- Meet green energy targets (RE100, Science Based Targets)
- Maintain CCTS compliance documentation
- Simplify vendor due diligence

**Pain Points:**
- Currently sends RFQs via email; no structured comparison
- No visibility into vendor CCTS certification status
- Slow contract execution (60–90 day cycles)

**Platform Actions:**
- Create multi-step RFQs with technical specifications
- View, compare, and AI-rank incoming bids
- Shortlist preferred vendors
- Award contracts with custom terms
- Track contract execution status
- Access carbon market intelligence

---

### 4.2 Energy Vendor (Vendor Role)

**Profile:** Business development / sales manager at solar/wind/hydro/green-H2 energy companies

**Goals:**
- Discover and win new enterprise client contracts
- Showcase CCTS verification and carbon credit portfolio
- Reduce sales cycle time
- Transparent bid tracking

**Pain Points:**
- Currently relies on broker networks and cold outreach
- No centralised view of open procurement opportunities
- CCTS verification status not visible to buyers

**Platform Actions:**
- Browse marketplace of open RFQs with filters
- Submit detailed bids (price, quantity, timeline, notes)
- Track bid status (submitted → shortlisted → accepted)
- Upload compliance documents (CEA License, CERC Registration, etc.)
- Accept or decline awarded contracts
- Manage carbon credit portfolio

---

### 4.3 Platform Administrator (Admin Role)

**Profile:** Renergizr operations team member

**Goals:**
- Maintain platform quality and trust
- Verify vendor credentials before marketplace access
- Monitor platform health and growth metrics
- Resolve disputes

**Platform Actions:**
- View all users, RFQs, bids, and contracts
- Verify or reject vendor CCTS certification
- Activate/deactivate user accounts
- Access full analytics dashboard
- Monitor notification system

---

## 5. PLATFORM ARCHITECTURE

### 5.1 Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + TailwindCSS + Recharts | Dark industrial theme |
| Backend | FastAPI (Python 3.11) | Async, motor driver |
| Database | MongoDB | Motor async driver |
| Auth | JWT (httponly cookies) + Google OAuth | 7-day sessions |
| AI Engine | Gemini 2.0 Flash | Via emergentintegrations |
| Email | Resend | Graceful degradation |
| Deployment | Kubernetes (Emergent Platform) | 2 replicas, 1Gi RAM |

### 5.2 File Structure

```
/app/
├── backend/
│   ├── server.py              # All API endpoints & business logic (~1000 lines)
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # MONGO_URL, DB_NAME, EMERGENT_LLM_KEY, RESEND_API_KEY
├── frontend/
│   ├── src/
│   │   ├── App.js             # Router + AuthContext + ProtectedRoute
│   │   ├── components/
│   │   │   ├── Landing.jsx    # Public company website
│   │   │   ├── Auth.jsx       # Login + Registration
│   │   │   ├── Navbar.jsx     # Navigation + Notification Bell
│   │   │   ├── client/
│   │   │   │   ├── ClientDashboard.jsx
│   │   │   │   ├── CreateRFQ.jsx
│   │   │   │   └── RFQDetail.jsx
│   │   │   ├── vendor/
│   │   │   │   ├── VendorDashboard.jsx
│   │   │   │   ├── Marketplace.jsx
│   │   │   │   ├── VendorProfile.jsx
│   │   │   │   └── VendorRFQView.jsx
│   │   │   ├── admin/
│   │   │   │   └── AdminDashboard.jsx
│   │   │   └── shared/
│   │   │       └── ContractsPage.jsx
│   └── .env                   # REACT_APP_BACKEND_URL
├── scripts/
│   └── seed_data.py           # Test data population
└── memory/
    └── PRD.md                 # This document (internal)
```

### 5.3 Route Map

| Path | Component | Access |
|------|-----------|--------|
| `/` | Landing.jsx | Public |
| `/auth` | Auth.jsx | Public |
| `/client/dashboard` | ClientDashboard.jsx | Client + Admin |
| `/client/rfqs/new` | CreateRFQ.jsx | Client + Admin |
| `/client/rfqs/:id` | RFQDetail.jsx | Client + Admin |
| `/client/contracts` | ContractsPage.jsx | Client + Admin |
| `/vendor/dashboard` | VendorDashboard.jsx | Vendor + Admin |
| `/vendor/marketplace` | Marketplace.jsx | Vendor + Admin |
| `/vendor/profile` | VendorProfile.jsx | Vendor + Admin |
| `/vendor/rfqs/:id` | VendorRFQView.jsx | Vendor + Admin |
| `/vendor/contracts` | ContractsPage.jsx | Vendor + Admin |
| `/admin` | AdminDashboard.jsx | Admin only |

---

## 6. FEATURE SPECIFICATIONS

### 6.1 Public Landing Page

**Purpose:** Company website and conversion funnel

**Sections:**
1. **Market Ticker** — Scrolling live-style ticker: Solar ₹2.85/kWh, Wind ₹3.12/kWh, CCTS Carbon ₹245.50/tCO2e, EU CBAM €68.50/tCO2e
2. **Hero Section** — "Where India's Energy Deals Get Done." + Live Market Widget with real-time price table + CTA buttons (Post Your First RFQ / Join as Vendor)
3. **About Renergizr** — Company story, INR 3.8L founding investment, mission statement
4. **Platform Features Bento Grid** — 6 cards: RFQ System, AI Bid Ranking, Vendor Verification, Carbon Credits (CCTS), Market Intelligence, CBAM Compliance
5. **How It Works** — 3-step visual: Post RFQ → Receive Bids → Close Deal
6. **Carbon & CCTS Section** — India's ₹20,000 Cr CCTS market, EU CBAM explainer
7. **For Clients / For Vendors** — Role-specific benefit sections
8. **News & Insights** — Linked articles from Finshots, LiveMint on Indian energy market
9. **Compliance Badges** — CCTS, MNRE, CEA, CBAM, ISO 14001, GreenPro
10. **Contact Form** — Lead capture form
11. **Footer** — Navigation, social links, legal

---

### 6.2 Authentication Module

**Registration Flow:**
- Email + Password + Name + Role (Client / Vendor) + Company Name
- Password: bcrypt hashed (10 rounds)
- On vendor registration: auto-creates `vendor_profiles` document with `verification_status: "pending"`
- Returns session token (7-day expiry) + sets httponly cookie

**Login Flow:**
- Email + Password → JWT session token
- Cookie: `session_token`, httponly, secure, samesite=none
- Also accepts `Authorization: Bearer <token>` header

**Google OAuth Flow:**
- Emergent-managed Google OAuth
- Redirects to Google → callback with `#session_id=xxx` hash fragment
- Frontend exchanges session_id for user data via `/api/auth/google/session`
- Role selection preserved in `localStorage` during OAuth flow

**Session Management:**
- 7-day session expiry stored in `user_sessions` collection
- Sessions invalidated on logout
- `/api/auth/me` validates current session on app load

---

### 6.3 Client Module — Detailed Specs

#### 6.3.1 Client Dashboard
- **Stats Cards:** Total RFQs, Active (Open) RFQs, Bids Received, Contracts Awarded
- **Energy Price Chart:** 6-month price history (Solar, Wind) — Recharts line chart
- **Carbon Market Widget:** CCTS price + EU CBAM price + trend indicators
- **Recent RFQs Table:** Last 5 RFQs with status badges and quick-link to detail

#### 6.3.2 RFQ Creation — 4-Step Wizard

**Step 1 — Basic Info:**
- Title (required)
- Description
- Energy Type: Solar / Wind / Hydro / Thermal / Green Hydrogen
- Quantity (MW, required)
- Delivery Location (required)
- Start Date / End Date

**Step 2 — Technical Specs:**
- Voltage (kV)
- Phase (Single/Three)
- Frequency (Hz)
- Metering Type
- Load Factor (%)
- Grid Connection Type

**Step 3 — Logistics & Add-ons:**
- Transmission Requirements
- Required Add-on Services (multi-select): Grid Integration Support, O&M Services, Carbon Credit Certificate, CERC/SERC Filing Support, RE Certificates (RECs), SCADA Integration, Insurance Coverage

**Step 4 — Financial Terms:**
- Price Ceiling (₹/kWh, optional — visible to vendors as reference)
- Payment Terms: Advance / Monthly / Quarterly / Annual / Milestone-based
- Contract Duration
- Penalty Clauses
- Escalation Clause

**On Submit:** RFQ created with `status: "open"`, `bid_count: 0`

#### 6.3.3 RFQ Detail Page
- **Status Badge + Workflow Steps:** Visual 4-step progress (Bids Open → Bidding Closed → Contract Awarded → Completed)
- **Close Bidding Button:** Transitions RFQ to `bidding_closed`; notifies all bidding vendors
- **Bid Price Comparison Chart:** Bar chart comparing all bid prices vs ceiling
- **AI Ranking Button:** Calls Gemini Flash for scores (0–100), strengths, gaps, recommendation
- **Bid Cards:** Expandable per-vendor bid cards showing:
  - Vendor company + CCTS verified badge
  - Price per kWh + Quantity
  - AI score bar (color-coded: green ≥80, amber ≥60, red <60)
  - Expand: timeline, notes, AI strengths/gaps/recommendation
  - Actions: Shortlist (toggle) / Award Contract
- **Award Contract Modal:** Custom contract terms + payment schedule → creates contract, auto-rejects other bids
- **Contract Banner:** Shows awarded contract status (pending/active/declined) with link to Contracts page
- **AI Summary Panel:** Gemini's overall market analysis summary

#### 6.3.4 Contracts Page (Client)
- **Stats Row:** Total / Active / Pending / Declined counts
- **Contract Cards:** Per contract showing vendor, energy type, price, quantity
- **Expandable Details:** Full contract terms, delivery timeline, location, dates, payment schedule, estimated annual value (₹L), vendor notes
- **View RFQ Link:** Navigate back to the source RFQ

---

### 6.4 Vendor Module — Detailed Specs

#### 6.4.1 Vendor Dashboard
- **Profile Completion Tracker:** % progress bar based on filled fields
- **Stats Cards:** Active Bids, Bids Won, Carbon Credits (tCO2e)
- **Carbon Credits Widget:** Balance (tCO2e) + Market Value at CCTS rate (₹245.50/tCO2e) + EU CBAM value
- **CCTS Carbon Price Chart:** 6-month trend
- **My Recent Bids:** Status table of last bids

#### 6.4.2 Marketplace
- **RFQ Grid:** All open RFQs with energy type tag, quantity, location, deadline
- **Search & Filters:** By energy type (Solar / Wind / Hydro / Thermal / Green H2)
- **RFQ Card:** Title, client company, quantity (MW), location, bid count, "Bid Now" button
- **Sorting:** By newest, quantity, bid count

#### 6.4.3 Vendor Profile — 3 Tabs

**Tab 1 — Company Info:**
- Company Name, Description, Location, Website
- Contact Email, Contact Phone

**Tab 2 — Energy & Capacity:**
- Energy Types (multi-select toggles): Solar, Wind, Hydro, Thermal, Green Hydrogen
- Total Installed Capacity (MW)
- Carbon Credits Balance (tCO2e) + real-time portfolio value calculator

**Tab 3 — Compliance & Docs:**
- **Green Certifications** (multi-select): MNRE Approved, ISO 14001, ISO 50001, BEE 5-Star, GreenPro, IGBC, Carbon Neutral Certified
- **Regulatory Documents Upload:**
  - Document types: CEA License, CERC Registration, SECI PPA, DISCOM Agreement, MNRE Registration, GST Certificate, Company Incorporation
  - File upload: PDF, JPG, PNG up to 10MB
  - Select doc type → click to upload → base64 stored in MongoDB
  - Uploaded docs list shows filename, size, "Uploaded" status badge
- **Verification Status Badge:** Pending / CCTS Verified / Not Verified

#### 6.4.4 RFQ Detail (Vendor View)
- **RFQ Requirements Panel:** All specs from the client's RFQ
- **Bid Form (if not yet bid):**
  - Price per kWh (INR) — shows client's ceiling as reference
  - Quantity (MW) — pre-filled with RFQ requirement
  - Delivery Timeline — text (e.g., "Ready in 3 months from LOI")
  - Additional Notes — certifications, warranties, etc.
- **Bid Status Card (if bid submitted):**
  - submitted / shortlisted / accepted / rejected
  - Shows price, quantity, timeline
  - Shortlisted state: amber card + "Client is reviewing final bids" message
- **Contract Offer Panel (if contract awarded):**
  - Shows full contract terms
  - Payment schedule
  - Accept Contract / Decline buttons
  - Decline: textarea for reason
  - 48-hour acceptance window indicator

#### 6.4.5 Contracts Page (Vendor)
- Same as client contracts page but from vendor perspective
- Shows client company name, contract terms, estimated annual value
- "View RFQ" link for each contract

---

### 6.5 Admin Module — Detailed Specs

#### 6.5.1 Overview Tab
- **Stats Row:** Total Users, Clients, Vendors, RFQs, Bids, Active Contracts, Pending Verifications
- **Platform Activity Chart:** Bar chart by category
- **Energy Price Charts:** Solar + Wind 6-month trends
- **CCTS Carbon Chart:** 6-month price trend

#### 6.5.2 Users Tab
- Full user table: Name, Email, Role, Company, Joined Date, Status
- **Actions per user:** Change role (client/vendor/admin), Activate/Deactivate account

#### 6.5.3 Vendors Tab
- Vendor table with verification status: Pending / Verified / Rejected
- **Verify Button:** Sets `verification_status: "verified"` → notifies vendor + sends email
- **Reject Button:** Sets `verification_status: "rejected"` → notifies vendor

#### 6.5.4 RFQs Tab
- All platform RFQs with status
- Client company, energy type, quantity, bid count, status
- Direct link to RFQ details

---

## 7. TRADING WORKFLOW — STATE MACHINES

### 7.1 RFQ Lifecycle

```
[DRAFT] → not implemented in UI yet
    ↓
[OPEN] ← RFQ created; vendors can bid
    ↓  (client clicks "Close Bidding")
[BIDDING_CLOSED] ← no new bids; client reviews
    ↓  (client clicks "Award Contract" on a bid)
[AWARDED] ← contract created; vendor notified
    ↓  (vendor accepts; contract becomes active)
[COMPLETED] ← manual transition when energy delivery done
    ↓ OR
[CANCELLED] ← client cancels (from OPEN only)
```

### 7.2 Bid Lifecycle

```
[SUBMITTED] ← vendor submits bid on open RFQ
    ↓  (client clicks "Shortlist" — toggle)
[SHORTLISTED] ← shortlisted for final review
    ↓  (client awards contract to this bid)
[ACCEPTED] ← contract created for this bid
    │                    ↓  (vendor accepts)
    │           [CONTRACT_SIGNED] ← contract active
    │                    ↓  (vendor declines)
    │           [CONTRACT_DECLINED] ← client must award again
    ↓  (another bid is accepted / client rejects)
[REJECTED] ← not selected; vendor notified
```

### 7.3 Contract Lifecycle

```
[PENDING_VENDOR_ACCEPTANCE] ← contract created by client; vendor notified
    ↓  (vendor clicks "Accept Contract")
[ACTIVE] ← energy delivery in progress; client notified
    ↓  (manual completion)
[COMPLETED] ← deal closed
    OR
    ↓  (vendor clicks "Decline")
[VENDOR_DECLINED] ← client notified; must award to another vendor
```

### 7.4 Notification Triggers

| Event | Triggered By | Notifies |
|-------|-------------|---------|
| New bid submitted | Vendor | Client (RFQ owner) |
| Bidding closed | Client | All vendors who bid |
| Bid shortlisted | Client | Vendor (bid owner) |
| Contract awarded | Client | Winning vendor + All rejected vendors |
| Contract accepted | Vendor | Client |
| Contract declined | Vendor | Client |
| Vendor verified | Admin | Vendor |
| Vendor rejected | Admin | Vendor |

---

## 8. API REFERENCE

**Base URL:** `https://{app_name}.preview.emergentagent.com/api`

All authenticated endpoints require:
- `Authorization: Bearer <session_token>` header, OR
- `session_token` httponly cookie

---

### 8.1 Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | None | Register new user |
| POST | `/auth/login` | None | Login, returns session_token |
| POST | `/auth/google/session` | None | Exchange Google OAuth session_id |
| GET | `/auth/me` | Required | Get current user |
| POST | `/auth/logout` | Required | Invalidate session |

**Register Request:**
```json
{
  "email": "user@company.com",
  "password": "SecurePass@123",
  "name": "John Doe",
  "role": "client",
  "company": "Acme Corp"
}
```

**Login Response:**
```json
{
  "user": {"user_id": "usr_abc123", "email": "...", "name": "...", "role": "client"},
  "session_token": "sess_xyz789"
}
```

---

### 8.2 RFQ Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/rfqs` | Required | Client | Create RFQ |
| GET | `/rfqs` | Required | All | List RFQs (filtered by role) |
| GET | `/rfqs/{rfq_id}` | Required | All | Get RFQ detail |
| PATCH | `/rfqs/{rfq_id}/status` | Required | Client/Admin | Update status |
| POST | `/rfqs/{rfq_id}/close-bidding` | Required | Client/Admin | Close bidding |
| POST | `/rfqs/{rfq_id}/award/{bid_id}` | Required | Client/Admin | Award contract |

**Close Bidding Response:**
```json
{"message": "Bidding closed", "status": "bidding_closed"}
```

**Award Contract Request:**
```json
{
  "contract_terms": "Standard RERC/CERC terms apply...",
  "delivery_milestones": ["Plant commissioning within 90 days", "Full capacity by Day 120"],
  "payment_schedule": "Net 30 days from invoice date"
}
```

---

### 8.3 Bid Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/rfqs/{rfq_id}/bids` | Required | Vendor | Submit bid |
| GET | `/rfqs/{rfq_id}/bids` | Required | Client/Admin | Get all bids for RFQ |
| POST | `/rfqs/{rfq_id}/bids/ai-rank` | Required | Client/Admin | AI rank all bids |
| PATCH | `/rfqs/{rfq_id}/bids/{bid_id}/shortlist` | Required | Client/Admin | Toggle shortlist |
| PATCH | `/rfqs/{rfq_id}/bids/{bid_id}/status` | Required | Client/Admin | Update bid status |

**Submit Bid Request:**
```json
{
  "price_per_unit": 2.85,
  "quantity_mw": 100,
  "delivery_timeline": "Ready in 3 months from LOI",
  "notes": "Tier 1 solar panels, 25 year warranty, ISO 14001 certified"
}
```

**AI Rank Response:**
```json
{
  "rankings": [
    {
      "bid_id": "bid_abc123",
      "score": 87,
      "strengths": ["Competitive pricing below ceiling", "Full quantity coverage", "Verified CCTS status"],
      "gaps": ["Delivery timeline slightly longer than ideal"],
      "recommendation": "Strong candidate — best price-to-compliance ratio"
    }
  ],
  "summary": "3 competitive bids received. GreenSun Energy leads on pricing while WindPower offers faster delivery...",
  "best_bid_id": "bid_abc123"
}
```

---

### 8.4 Contract Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/contracts` | Required | All | List user's contracts |
| GET | `/contracts/{contract_id}` | Required | Client/Vendor | Get contract detail |
| POST | `/contracts/{contract_id}/respond` | Required | Vendor | Accept or decline contract |

**Respond Request:**
```json
{
  "accept": true,
  "notes": "We confirm delivery as per agreed terms"
}
```

---

### 8.5 Vendor Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/vendor/profile` | Required | Vendor | Get vendor profile |
| PUT | `/vendor/profile` | Required | Vendor | Update vendor profile |
| GET | `/vendor/bids` | Required | Vendor | Get all my bids |
| POST | `/vendor/documents/upload` | Required | Vendor | Upload document |
| GET | `/vendor/documents` | Required | Vendor | List my documents |

**Document Upload Request:**
```json
{
  "doc_type": "CEA License",
  "filename": "cea_license_2026.pdf",
  "data_base64": "<base64 encoded file content>",
  "size_bytes": 204800
}
```

---

### 8.6 Notification Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/notifications` | Required | All | Get notifications + unread count |
| PATCH | `/notifications/{notif_id}/read` | Required | All | Mark single as read |
| POST | `/notifications/read-all` | Required | All | Mark all as read |

**Notifications Response:**
```json
{
  "notifications": [
    {
      "notif_id": "notif_abc123",
      "type": "contract_awarded",
      "title": "Contract Awarded to You!",
      "message": "You have been awarded the contract for 'Solar Power Supply - 100 MW Rajasthan'.",
      "link": "/vendor/rfqs/rfq_abc123",
      "read": false,
      "created_at": "2026-02-24T10:30:00Z"
    }
  ],
  "unread_count": 3
}
```

---

### 8.7 Admin Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/admin/users` | Required | Admin | All users |
| PATCH | `/admin/users/{user_id}` | Required | Admin | Update user (role, verification, active) |
| GET | `/admin/vendors` | Required | Admin | All vendors with user info |
| GET | `/admin/analytics` | Required | Admin | Platform statistics |
| GET | `/admin/rfqs` | Required | Admin | All RFQs |
| GET | `/admin/contracts` | Required | Admin | All contracts |

**Admin Analytics Response:**
```json
{
  "total_users": 7,
  "total_clients": 4,
  "total_vendors": 2,
  "total_rfqs": 7,
  "open_rfqs": 4,
  "awarded_rfqs": 2,
  "total_bids": 2,
  "total_contracts": 2,
  "active_contracts": 2,
  "pending_vendors": 1,
  "verified_vendors": 1
}
```

---

### 8.8 Market Insights (Public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/market/insights` | None | Simulated energy + carbon market data |

---

## 9. DATABASE SCHEMA

**Database:** MongoDB | **DB Name:** `test_database` (configurable via `DB_NAME` env)

---

### 9.1 `users` Collection
```json
{
  "user_id": "usr_abc123def456",
  "email": "user@company.com",
  "name": "John Doe",
  "role": "client | vendor | admin",
  "company": "Acme Corp",
  "picture": "https://...",
  "password_hash": "$2b$10$...",
  "is_active": true,
  "created_at": "2026-01-15T10:00:00Z"
}
```

### 9.2 `user_sessions` Collection
```json
{
  "session_token": "sess_abc123",
  "user_id": "usr_abc123",
  "expires_at": "2026-02-22T10:00:00Z",
  "created_at": "2026-02-15T10:00:00Z"
}
```

### 9.3 `vendor_profiles` Collection
```json
{
  "vendor_id": "vnd_abc123",
  "user_id": "usr_abc123",
  "company_name": "GreenSun Energy Pvt Ltd",
  "description": "Leading solar EPC company with 500MW installed capacity",
  "energy_types": ["solar", "green_hydrogen"],
  "capacity_mw": 500,
  "certifications": ["MNRE Approved", "ISO 14001"],
  "regulatory_docs": ["CEA License", "MNRE Registration"],
  "carbon_credits": 12500,
  "verification_status": "pending | verified | rejected",
  "contact_email": "bd@greensun.com",
  "contact_phone": "+91 98765 43210",
  "website": "https://greensun.com",
  "location": "Jaipur, Rajasthan",
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-02-15T10:00:00Z"
}
```

### 9.4 `rfqs` Collection
```json
{
  "rfq_id": "rfq_abc123",
  "client_id": "usr_abc123",
  "client_name": "Rajesh Kumar",
  "client_company": "Acme Manufacturing",
  "title": "Solar Power Supply - 100 MW Rajasthan",
  "description": "Seeking reliable solar energy supplier...",
  "energy_type": "solar | wind | hydro | thermal | green_hydrogen",
  "quantity_mw": 100,
  "delivery_location": "Jodhpur, Rajasthan",
  "start_date": "2026-04-01",
  "end_date": "2031-03-31",
  "price_ceiling": 3.20,
  "specs": {"voltage_kv": 33, "phase": "three", "frequency_hz": 50},
  "logistics": {"transmission_requirements": "Direct injection"},
  "financial_terms": {"payment_terms": "monthly", "contract_duration": "5 years"},
  "add_on_services": ["Carbon Credit Certificate", "Grid Integration Support"],
  "status": "open | bidding_closed | awarded | completed | cancelled",
  "bid_count": 3,
  "ai_analysis_summary": "3 competitive bids received...",
  "best_bid_id": "bid_abc123",
  "awarded_bid_id": "bid_abc123",
  "contract_id": "con_abc123",
  "created_at": "2026-02-01T10:00:00Z",
  "updated_at": "2026-02-15T10:00:00Z"
}
```

### 9.5 `bids` Collection
```json
{
  "bid_id": "bid_abc123",
  "rfq_id": "rfq_abc123",
  "vendor_id": "usr_vendor123",
  "vendor_name": "Suresh Sharma",
  "vendor_company": "GreenSun Energy Pvt Ltd",
  "vendor_location": "Jaipur, Rajasthan",
  "vendor_verification": "pending | verified",
  "price_per_unit": 2.85,
  "quantity_mw": 100,
  "delivery_timeline": "Ready in 3 months from LOI",
  "specs": {},
  "notes": "Tier 1 panels, 25yr warranty, ISO 14001",
  "ai_score": 87,
  "ai_analysis": {
    "strengths": ["Competitive price", "Full coverage"],
    "gaps": ["Timeline slightly long"],
    "recommendation": "Strong candidate"
  },
  "status": "submitted | shortlisted | accepted | rejected | contract_signed | contract_declined",
  "contract_id": "con_abc123",
  "created_at": "2026-02-10T10:00:00Z"
}
```

### 9.6 `contracts` Collection
```json
{
  "contract_id": "con_abc123",
  "rfq_id": "rfq_abc123",
  "rfq_title": "Solar Power Supply - 100 MW Rajasthan",
  "bid_id": "bid_abc123",
  "client_id": "usr_client123",
  "client_name": "Rajesh Kumar",
  "client_company": "Acme Manufacturing",
  "vendor_id": "usr_vendor123",
  "vendor_name": "Suresh Sharma",
  "vendor_company": "GreenSun Energy Pvt Ltd",
  "energy_type": "solar",
  "quantity_mw": 100,
  "price_per_unit": 2.85,
  "estimated_annual_value_inr": 31185000,
  "delivery_location": "Jodhpur, Rajasthan",
  "start_date": "2026-04-01",
  "end_date": "2031-03-31",
  "delivery_timeline": "3 months from LOI",
  "contract_terms": "Standard RERC/CERC terms apply...",
  "delivery_milestones": [],
  "payment_schedule": "Net 30 days from invoice",
  "status": "pending_vendor_acceptance | active | vendor_declined | completed",
  "vendor_response": "accepted | declined | null",
  "vendor_notes": "We confirm delivery as agreed",
  "responded_at": "2026-02-24T12:00:00Z",
  "created_at": "2026-02-24T10:00:00Z",
  "updated_at": "2026-02-24T12:00:00Z"
}
```

### 9.7 `notifications` Collection
```json
{
  "notif_id": "notif_abc123",
  "user_id": "usr_abc123",
  "type": "new_bid | bid_shortlisted | contract_awarded | bid_rejected | vendor_verified | vendor_rejected | rfq_closed | contract_response",
  "title": "New Bid Received",
  "message": "GreenSun Energy submitted a bid of ₹2.85/kWh for 'Solar Power Supply'",
  "link": "/client/rfqs/rfq_abc123",
  "data": {"bid_id": "bid_abc123", "rfq_id": "rfq_abc123"},
  "read": false,
  "created_at": "2026-02-24T10:30:00Z"
}
```

### 9.8 `vendor_documents` Collection
```json
{
  "doc_id": "doc_abc123",
  "user_id": "usr_vendor123",
  "doc_type": "CEA License",
  "filename": "cea_license_2026.pdf",
  "data_base64": "<base64 encoded file — excluded from list responses>",
  "size_bytes": 204800,
  "status": "uploaded",
  "uploaded_at": "2026-02-24T10:00:00Z"
}
```

---

## 10. UI/UX DESIGN SYSTEM

### 10.1 Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#020617` | Page backgrounds |
| `bg-card` | `#0F172A` | Cards, panels |
| `bg-border` | `#1E293B` | Borders, dividers |
| `bg-hover` | `#334155` | Hover states |
| `accent-primary` | `#0EA5E9` | Sky blue — primary CTA, links |
| `accent-success` | `#10B981` | Success states, verified badges |
| `accent-warning` | `#F59E0B` | Pending, shortlisted, warnings |
| `accent-danger` | `#EF4444` | Errors, rejected, cancelled |
| `accent-purple` | `#A855F7` | Awarded, contract states |
| `text-primary` | `#FFFFFF` | Headings |
| `text-secondary` | `#E2E8F0` | Body text |
| `text-muted` | `#64748B` | Labels, metadata |
| `text-faint` | `#475569` | Placeholder, disabled |

### 10.2 Typography
| Role | Font | Weight | Size |
|------|------|--------|------|
| Headings | Chivo | 700–900 | 2xl–6xl |
| Body | Inter | 400–600 | sm–base |
| Code/Numbers | JetBrains Mono | 400–700 | xs–lg |

### 10.3 Component Conventions
- **Cards:** `bg-[#0F172A] border border-[#1E293B] rounded-sm`
- **Inputs:** `bg-[#020617] border border-[#1E293B] focus:border-sky-500`
- **Primary Button:** `bg-sky-500 hover:bg-sky-600 text-white rounded-sm`
- **Status Badges:** Consistent across all entities (open=emerald, closed=amber, awarded=purple, rejected=red)
- **Borders:** `rounded-sm` (2px) throughout for industrial aesthetic
- **Spacing:** 2-3x more than comfortable — generous whitespace

### 10.4 Responsive Design
- Mobile-first with Tailwind breakpoints (`sm:`, `md:`, `lg:`)
- Navbar collapses labels at `< md` breakpoint (icons only)
- Grid layouts stack on mobile: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

---

## 11. NOTIFICATIONS & EMAIL SYSTEM

### 11.1 In-App Notifications

**Architecture:** MongoDB `notifications` collection, polled every 30 seconds

**Bell Icon Behavior:**
- Shows unread count badge (blue, capped at "9+")
- Click opens dropdown (280px width, max 320px height, scrollable)
- Each notification shows: emoji icon + title + message preview + time ago
- Unread: `bg-sky-500/5` background + blue dot indicator
- Click: mark as read → navigate to link
- "Mark all read" button: clears all unread in one action

**Notification Types & Emoji Icons:**
| Type | Icon | Description |
|------|------|-------------|
| `new_bid` | 📨 | New bid received on client's RFQ |
| `bid_shortlisted` | ⭐ | Vendor's bid was shortlisted |
| `contract_awarded` | 🏆 | Vendor won the contract |
| `bid_rejected` | ❌ | Vendor's bid was not selected |
| `vendor_verified` | ✅ | Admin verified vendor profile |
| `vendor_rejected` | ⚠️ | Vendor verification needs more docs |
| `rfq_closed` | 🔒 | Bidding period closed |
| `contract_response` | 📋 | Vendor responded to contract |

### 11.2 Email Notifications (Resend)

**Setup:** Add `RESEND_API_KEY=re_xxx` to `/app/backend/.env`

**Graceful Degradation:** If `RESEND_API_KEY` is missing or placeholder, emails are logged to console but not sent. Application continues normally.

**Email Templates:** HTML with inline CSS, Renergizr brand header, dark background

**Sent For:**
1. **New Bid** → to Client: bid details table, link to RFQ
2. **Contract Awarded** → to Vendor: contract summary, 48hr acceptance reminder
3. **Contract Accepted** → to Client: confirmation + active status
4. **Contract Declined** → to Client: decline reason + redirect to alternate bids
5. **Vendor Verified** → to Vendor: full marketplace access announcement

---

## 12. SECURITY & AUTHENTICATION

### 12.1 Session Security
- Passwords: bcrypt (10 rounds)
- Sessions: `httponly; secure; samesite=none` cookies
- Token format: `sess_` prefix + 12-char UUID hex
- Expiry: 7 days (stored and validated server-side)
- Logout: server-side session deletion (not just client-side clear)

### 12.2 Authorization Model
- All protected routes check `get_current_user()` middleware
- Role-based access: client endpoints reject vendors, vendor endpoints reject clients
- Admin role passes all role checks (super-user)
- Resource ownership: clients can only modify their own RFQs/contracts; vendors can only modify their own bids

### 12.3 Input Validation
- Pydantic models validate all request bodies
- File upload: base64 validation before storage
- File size: max 10MB enforced (client-side check in frontend)

### 12.4 CORS
- Currently `*` (all origins) — suitable for development
- **Production:** Set `CORS_ORIGINS` to specific domains in `.env`

### 12.5 Known Limitations (Pre-Production)
- No rate limiting on API endpoints
- No email verification on registration
- Document storage in MongoDB base64 (not cloud storage) — not suitable for large scale
- Session tokens not encrypted (random UUID is sufficient but not signed JWT)

---

## 13. REGULATORY & COMPLIANCE CONTEXT

### 13.1 India's Carbon Credit Trading Scheme (CCTS)
- Established under Energy Conservation (Amendment) Act 2022
- Administered by Bureau of Energy Efficiency (BEE) under MoPNG
- Target market: ₹20,000 Crore annually
- Current simulated price: ₹245.50/tCO2e
- Renergizr platform shows CCTS balance for verified vendors in buyer-facing marketplace

### 13.2 EU Carbon Border Adjustment Mechanism (CBAM)
- Effective: January 2026 for Indian exporters to EU
- Covers: steel, cement, aluminium, fertilizers, electricity, hydrogen
- Current simulated price: €68.50/tCO2e
- Platform shows CBAM price in market ticker and vendor profiles

### 13.3 Vendor Verification Requirements
Documents the platform supports for verification:
| Document | Issuing Authority |
|----------|------------------|
| CEA License | Central Electricity Authority |
| CERC Registration | Central Electricity Regulatory Commission |
| SECI PPA | Solar Energy Corporation of India |
| DISCOM Agreement | State Distribution Companies |
| MNRE Registration | Ministry of New and Renewable Energy |
| GST Certificate | Goods and Services Tax Network |
| Company Incorporation | Ministry of Corporate Affairs |

### 13.4 Green Certifications Tracked
MNRE Approved, ISO 14001 (Environmental Management), ISO 50001 (Energy Management), BEE 5-Star Rating, GreenPro Certification, IGBC Green Building, Carbon Neutral Certified

---

## 14. TEST CREDENTIALS & SEED DATA

### 14.1 Test Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Admin | admin@renergizr.com | Admin@123 | Full platform access |
| Client 1 | buyer1@acme.com | Client@123 | Acme Manufacturing |
| Client 2 | buyer2@tatapower.com | Client@123 | Tata Power |
| Vendor 1 | vendor1@greensun.com | Vendor@123 | CCTS Verified, 12,500 tCO2e |
| Vendor 2 | vendor2@windpower.com | Vendor@123 | Pending verification |

### 14.2 Seed Script
Run to populate database with test data:
```bash
cd /app
python3 scripts/seed_data.py
```

### 14.3 Current Database State (as of Feb 2026)
- 7 users (4 clients, 2 vendors, 1 admin)
- 7 RFQs (4 open, 2 awarded, 1 in various states)
- 2 bids (from test sessions)
- 2 active contracts
- Active notifications in system

---

## 15. DEPLOYMENT ARCHITECTURE

### 15.1 Kubernetes Configuration (Emergent Platform)
```yaml
replicas: 2
resources:
  requests:
    cpu: 250m
    memory: 1Gi
services:
  backend:
    port: 8001
    command: uvicorn server:app --host 0.0.0.0 --port 8001
  frontend:
    port: 3000
    command: yarn start (craco start)
```

### 15.2 Environment Variables

**Backend (`/app/backend/.env`):**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=*
EMERGENT_LLM_KEY=sk-emergent-xxxxx
RESEND_API_KEY=re_your_resend_key_here
SENDER_EMAIL=noreply@renergizr.com
```

**Frontend (`/app/frontend/.env`):**
```env
REACT_APP_BACKEND_URL=https://your-app.emergent.host
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

### 15.3 Routing
- All backend routes: prefix `/api` → routed to port 8001
- All frontend routes: no prefix → routed to port 3000
- Google OAuth callback: `window.location.origin` (no hardcoded URLs)

### 15.4 Deployment Readiness Checklist
- ✅ No hardcoded URLs in source code
- ✅ All credentials from environment variables
- ✅ CORS configured (currently `*`)
- ✅ MongoDB connection via `MONGO_URL` env var
- ✅ Google OAuth uses `window.location.origin` (no hardcoded redirect URIs)
- ✅ Graceful degradation for missing RESEND_API_KEY
- ✅ No blocking synchronous DB calls (all async/await)
- ✅ No ML/blockchain special dependencies
- ⚠️ Set `CORS_ORIGINS` to specific domain for production
- ⚠️ Configure `RESEND_API_KEY` for email delivery
- ⚠️ Set up MongoDB replica set for production

---

## 16. ROADMAP & BACKLOG

### P0 — Critical for Production Launch

| Feature | Description | Effort |
|---------|-------------|--------|
| Resend Email | Configure `RESEND_API_KEY` for actual delivery | 1 hour |
| Payment Integration | Razorpay/Stripe for platform transaction fees (0.5–1%) | 3 days |
| Real CCTS Data Feed | Connect to BEE/IEXC API for live carbon credit prices | 2 days |
| Push Notifications | Browser push + mobile push for key events | 2 days |

### P1 — High Value Features

| Feature | Description | Effort |
|---------|-------------|--------|
| Bid Counter-offer | Vendors propose modified price; client accepts/negotiates | 2 days |
| RFQ Templates | Pre-built RFQ templates by energy type (Solar PPA, Wind Franchise) | 1 day |
| Admin Document Viewer | Admin can view/download uploaded vendor compliance docs | 1 day |
| Vendor Analytics | Win rate, pricing benchmark vs market, bid history charts | 2 days |
| Vendor Shortlisting (Invite) | Client invites specific vendors to an RFQ (closed tender) | 1 day |
| Multi-language Support | Hindi + Marathi UI localization | 3 days |

### P2 — Future Enhancements

| Feature | Description | Effort |
|---------|-------------|--------|
| Invoice / PO Generation | PDF invoice + purchase order generation post-award | 2 days |
| Carbon Credit Marketplace | Vendors buy/sell credits peer-to-peer | 5 days |
| Energy Price Alerts | Email/push when market price crosses threshold | 1 day |
| MNRE/CEA API Integration | Real regulatory verification via govt APIs | 3 days |
| Mobile App (React Native) | iOS + Android app for on-the-go bid tracking | 2 weeks |
| Enterprise SSO (SAML) | For large enterprise clients (Tata, Adani, Reliance) | 3 days |
| White-label | Custom branding per enterprise client | 1 week |
| Live Market Data Feed | IEXC / PowerEx API for real energy spot prices | 2 days |
| API Documentation Portal | Swagger UI + OpenAPI JSON export | 0.5 days |

---

## 17. KNOWN ISSUES & TECH DEBT

### Active Issues

| Priority | Issue | Location | Fix |
|----------|-------|----------|-----|
| P0 | Emails not delivered | backend/.env | Add RESEND_API_KEY |
| P1 | No email verification on registration | server.py | Add verification token flow |
| P1 | Document storage in MongoDB base64 | vendor_documents collection | Migrate to cloud storage (S3/GCS) |
| P2 | Market data is simulated | server.py `/market/insights` | Connect to live IEXC/CCTS API |
| P2 | No rate limiting on APIs | server.py | Add slowapi or nginx rate limits |

### Tech Debt

| Item | Description | Priority |
|------|-------------|----------|
| server.py monolith | ~1000 lines; should split into routers | Medium |
| No pagination | `.to_list(200)` on all queries; add skip/limit | Medium |
| No full-text search | Marketplace search is filter-only; add MongoDB Atlas Search | Low |
| No audit log | No record of who changed what when | Low |
| Session cleanup | Old sessions not auto-deleted (TTL index recommended) | Low |

---

## 18. CHANGELOG

### v1.2 — February 2026
- **NEW:** Full trading workflow state machine (RFQ close bidding → award contract → vendor accept/decline)
- **NEW:** Real-time notification system (MongoDB-backed, 8 event types, bell dropdown with unread count)
- **NEW:** Email notification system (Resend integration, graceful degradation)
- **NEW:** Real vendor document upload (base64, PDF/JPG/PNG, per type)
- **NEW:** Contract management pages for client and vendor (`/client/contracts`, `/vendor/contracts`)
- **NEW:** Award Contract modal with customizable terms and payment schedule
- **NEW:** Bid shortlisting toggle
- **NEW:** Workflow steps visualization in RFQ detail sidebar
- **NEW:** Auto-reject other bids when contract is awarded
- **UPDATED:** Vendor RFQ view shows contract offer card with accept/decline
- **UPDATED:** Navbar adds "Contracts" link for both client and vendor roles
- **UPDATED:** Admin analytics includes contracts count

### v1.1 — February 2026
- **NEW:** Comprehensive public landing page (market ticker, bento features, CCTS/CBAM section)
- **NEW:** Vendor profile — Carbon Credits widget with market value calculator
- **NEW:** AI bid ranking (Gemini 2.0 Flash) with strengths/gaps/recommendation
- **NEW:** 4-step RFQ creation wizard with technical specs, logistics, financial terms
- **NEW:** Admin dashboard with analytics charts
- **IMPROVED:** Complete UI/UX redesign (dark industrial theme, Chivo + JetBrains Mono fonts)
- **IMPROVED:** SEO meta tags on landing page

### v1.0 — January 2026
- **NEW:** Project foundation — FastAPI + React + MongoDB
- **NEW:** JWT + Google OAuth authentication
- **NEW:** Role-based access (Client, Vendor, Admin)
- **NEW:** Basic RFQ creation and listing
- **NEW:** Vendor bid submission
- **NEW:** Admin user and vendor management
- **NEW:** Seed data script

---

*Document maintained by Emergent Labs for Renergizr Industries Pvt. Ltd.*
*For technical queries: emergentlabs.ai | For business queries: renergizr.com*
