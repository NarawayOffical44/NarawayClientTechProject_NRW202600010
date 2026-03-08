# Renergizr Industries — Database Schema (Supabase PostgreSQL)
**Version:** 1.2 | **Date:** 2026-03-08
**Provider:** Supabase | **Database:** PostgreSQL

---

## 📊 Tables Overview

### 1. **users** — User Accounts & Authentication
Stores all platform users (clients, vendors, admins)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) NOT NULL UNIQUE,  -- uid_xxx for consistency
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'client',  -- 'client' | 'vendor' | 'admin'
  company VARCHAR(255),
  phone VARCHAR(20),
  location VARCHAR(255),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  verification_status VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'verified' | 'suspended'
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_role ON users(role);
```

---

### 2. **rfqs** — Request for Quote
Energy buyer RFQs with technical, logistics, and financial specs

```sql
CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id VARCHAR(50) NOT NULL UNIQUE,  -- rfq_xxx
  client_id VARCHAR(50) NOT NULL,
  client_name VARCHAR(255),

  -- Step 1: Basic Info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  energy_type VARCHAR(50) NOT NULL,  -- 'solar' | 'wind' | 'hydro' | 'thermal' | 'green_hydrogen'

  -- Step 2: Technical Specs
  quantity_mw DECIMAL(10, 2) NOT NULL,
  voltage_kv DECIMAL(10, 2),
  phase VARCHAR(50),
  add_on_services TEXT[],  -- Array of service descriptions

  -- Step 3: Logistics
  delivery_location VARCHAR(255),
  delivery_start_date DATE,
  delivery_end_date DATE,

  -- Step 4: Financial
  price_ceiling DECIMAL(12, 4),  -- ₹/kWh
  payment_terms VARCHAR(255),
  advance_payment_pct DECIMAL(5, 2) DEFAULT 0,

  -- Lifecycle
  status VARCHAR(30) NOT NULL DEFAULT 'draft',  -- 'draft' | 'open' | 'bidding_closed' | 'awarded' | 'completed' | 'cancelled'
  awarded_bid_id VARCHAR(50),
  bid_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rfqs_client_id ON rfqs(client_id);
CREATE INDEX idx_rfqs_rfq_id ON rfqs(rfq_id);
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_rfqs_energy_type ON rfqs(energy_type);
```

---

### 3. **bids** — Vendor Bids on RFQs
Vendor bids with AI scoring and ranking

```sql
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id VARCHAR(50) NOT NULL UNIQUE,  -- bid_xxx
  rfq_id VARCHAR(50) NOT NULL,
  vendor_id VARCHAR(50) NOT NULL,
  vendor_name VARCHAR(255),
  vendor_company VARCHAR(255),

  -- Bid Details
  price_per_unit DECIMAL(12, 4) NOT NULL,  -- ₹/kWh
  quantity_mw DECIMAL(10, 2) NOT NULL,
  delivery_timeline VARCHAR(255),
  notes TEXT,

  -- Status
  status VARCHAR(30) DEFAULT 'submitted',  -- 'submitted' | 'shortlisted' | 'accepted' | 'rejected'
  is_shortlisted BOOLEAN DEFAULT false,

  -- AI Scoring (Scope 1.1.b)
  ai_score INT,  -- 0–100 from Claude Haiku
  ai_analysis JSONB,  -- {strengths: [], gaps: [], recommendation: "..."}

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bids_rfq_id ON bids(rfq_id);
CREATE INDEX idx_bids_vendor_id ON bids(vendor_id);
CREATE INDEX idx_bids_bid_id ON bids(bid_id);
CREATE INDEX idx_bids_status ON bids(status);
```

---

### 4. **vendor_profiles** — Vendor Details & Certifications
Detailed vendor information, capabilities, and compliance status

```sql
CREATE TABLE vendor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id VARCHAR(50) NOT NULL UNIQUE,  -- vnd_xxx
  user_id VARCHAR(50) NOT NULL UNIQUE,

  -- Company Info
  company_name VARCHAR(255),
  description TEXT,
  location VARCHAR(255),
  website VARCHAR(255),
  contact_person VARCHAR(255),
  contact_phone VARCHAR(20),

  -- Capabilities
  energy_types VARCHAR(50)[],  -- ['solar', 'wind', ...]
  capacity_mw DECIMAL(10, 2),

  -- Carbon Compliance (Scope 1.1.g)
  carbon_credits_ccts DECIMAL(15, 2),  -- tCO2e balance
  certifications VARCHAR(100)[],  -- ['MNRE', 'CEA', 'ISO_14001', ...]
  verification_status VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'verified' | 'suspended'

  -- Metadata
  verified_at TIMESTAMP,
  verified_by VARCHAR(50),  -- admin user_id

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vendor_profiles_user_id ON vendor_profiles(user_id);
CREATE INDEX idx_vendor_profiles_vendor_id ON vendor_profiles(vendor_id);
CREATE INDEX idx_vendor_profiles_verification_status ON vendor_profiles(verification_status);
```

---

### 5. **vendor_documents** — Compliance Documents (Scope 1.1.g)
Regulatory documents, certifications, proof of compliance

```sql
CREATE TABLE vendor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id VARCHAR(50) NOT NULL UNIQUE,  -- doc_xxx
  vendor_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,

  -- Document Details
  doc_type VARCHAR(100) NOT NULL,  -- 'MNRE_Registration' | 'CEA_License' | 'Green_Certification' | 'CCTS_Proof' | 'ISO_14001' | 'Bank_Details'
  filename VARCHAR(255),
  file_url VARCHAR(500),  -- Supabase Storage URL or S3 presigned
  content_type VARCHAR(100),
  file_size INT,  -- bytes

  -- Status
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  admin_notes TEXT,
  reviewed_by VARCHAR(50),  -- admin user_id
  reviewed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vendor_documents_vendor_id ON vendor_documents(vendor_id);
CREATE INDEX idx_vendor_documents_status ON vendor_documents(status);
```

---

### 6. **contracts** — Awarded Contracts
Finalized energy contracts between client and vendor

```sql
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id VARCHAR(50) NOT NULL UNIQUE,  -- cnt_xxx
  rfq_id VARCHAR(50) NOT NULL,
  rfq_title VARCHAR(255),
  bid_id VARCHAR(50) NOT NULL,

  -- Parties
  client_id VARCHAR(50) NOT NULL,
  client_company VARCHAR(255),
  vendor_id VARCHAR(50) NOT NULL,
  vendor_company VARCHAR(255),

  -- Energy Terms
  energy_type VARCHAR(50),
  price_per_unit DECIMAL(12, 4),  -- ₹/kWh
  quantity_mw DECIMAL(10, 2),
  delivery_location VARCHAR(255),
  delivery_timeline VARCHAR(255),

  -- Dates & Payment
  start_date DATE,
  end_date DATE,
  payment_schedule VARCHAR(255),
  advance_payment_pct DECIMAL(5, 2),
  estimated_annual_value_inr DECIMAL(15, 2),

  -- Terms
  contract_terms TEXT,

  -- Lifecycle
  status VARCHAR(30) DEFAULT 'pending_vendor_acceptance',  -- 'pending_vendor_acceptance' | 'active' | 'completed' | 'disputed'
  vendor_accepted_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contracts_contract_id ON contracts(contract_id);
CREATE INDEX idx_contracts_client_id ON contracts(client_id);
CREATE INDEX idx_contracts_vendor_id ON contracts(vendor_id);
CREATE INDEX idx_contracts_status ON contracts(status);
```

---

### 7. **notifications** — Real-Time & In-App Notifications
Platform notifications for all user actions

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id VARCHAR(50) NOT NULL UNIQUE,  -- ntf_xxx
  user_id VARCHAR(50) NOT NULL,

  -- Notification Details
  type VARCHAR(50) NOT NULL,  -- 'new_bid' | 'bid_shortlisted' | 'contract_awarded' | 'bidding_closed' | 'vendor_verified' | 'document_reviewed'
  message TEXT NOT NULL,
  related_id VARCHAR(50),  -- rfq_id | bid_id | contract_id | vendor_id

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
```

---

### 8. **email_logs** — Email Delivery Tracking (Resend Integration)
Audit trail for all emails sent via Resend API

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id VARCHAR(100) NOT NULL UNIQUE,  -- From Resend API

  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  template VARCHAR(100),  -- 'new_bid' | 'contract_awarded' | 'vendor_verified' | etc.

  sent_at TIMESTAMP,
  status VARCHAR(20),  -- 'sent' | 'delivered' | 'bounced' | 'failed'
  error_message TEXT,

  metadata JSONB,  -- {rfq_id, vendor_id, client_id, etc.}

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_logs_recipient_email ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_status ON email_logs(status);
```

---

### 9. **grid_telemetry** — Real-Time Grid Data (5G/6G, Scope 1.1.f)
Grid frequency, voltage, load, and stability metrics

```sql
CREATE TABLE grid_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Grid Metrics
  frequency_hz DECIMAL(6, 4),  -- ~50.0 Hz for India
  voltage_kv DECIMAL(8, 2),    -- 220 kV nominal
  total_load_mw INT,
  grid_stability VARCHAR(20),  -- 'stable' | 'warning' | 'critical'
  latency_ms DECIMAL(5, 3),    -- 5G/6G latency (0.28–0.95 ms)
  active_nodes INT,

  -- Renewable Mix (%)
  solar_pct INT,
  wind_pct INT,
  hydro_pct INT,
  thermal_pct INT,

  -- Regional Distribution
  regions JSONB,  -- [{name: "North India", load_mw: 1400, load_pct: 85, nodes: 45}, ...]

  -- Events Log
  events JSONB,  -- [{timestamp, severity: 'info'|'warning'|'action', message}, ...]

  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_grid_telemetry_timestamp ON grid_telemetry(timestamp);
```

---

### 10. **audit_logs** — System Audit Trail
Track all critical actions (admin operations, verifications, etc.)

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_user_id VARCHAR(50),  -- Who performed the action
  action VARCHAR(100) NOT NULL,  -- 'verify_vendor' | 'reject_document' | 'award_contract' | etc.
  entity_type VARCHAR(50),  -- 'vendor' | 'rfq' | 'contract' | etc.
  entity_id VARCHAR(50),

  changes JSONB,  -- What changed: {field: {old: "...", new: "..."}}
  reason TEXT,  -- Why (for rejections, suspensions, etc.)

  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

---

## 🔐 Security & Privacy

### Authentication
- JWT tokens (expires in 24h)
- Refresh tokens for persistent sessions
- Password hashing: bcryptjs (rounds: 12)

### Authorization
- Role-based access control (RBAC): client, vendor, admin
- Row-level security (RLS) on Supabase:
  - Clients see only their own RFQs
  - Vendors see only open RFQs + their bids
  - Admins see all records

### Data Protection
- PII fields: email, phone (encrypted in transit via HTTPS)
- Document storage: Supabase Storage (encrypted at rest)
- Audit logs for all admin actions

---

## 📈 Analytics & Reporting Tables

### View: **rfq_analytics**
```sql
CREATE VIEW rfq_analytics AS
SELECT
  DATE(r.created_at) as date,
  r.energy_type,
  COUNT(*) as rfqs_created,
  COUNT(DISTINCT r.client_id) as unique_clients,
  AVG(r.quantity_mw) as avg_quantity_mw,
  AVG(r.price_ceiling) as avg_price_ceiling
FROM rfqs r
GROUP BY DATE(r.created_at), r.energy_type;
```

### View: **vendor_performance**
```sql
CREATE VIEW vendor_performance AS
SELECT
  v.vendor_id,
  v.company_name,
  COUNT(b.bid_id) as total_bids,
  SUM(CASE WHEN b.status = 'accepted' THEN 1 ELSE 0 END) as accepted_bids,
  AVG(b.ai_score) as avg_ai_score
FROM vendor_profiles v
LEFT JOIN bids b ON v.vendor_id = b.vendor_id
GROUP BY v.vendor_id, v.company_name;
```

---

## 🚀 Migration Strategy

### Phase 1: Schema Setup
- Create all tables with indices
- Set up Row-Level Security (RLS) policies
- Enable Supabase Storage bucket for documents

### Phase 2: Data Migration (if migrating from MongoDB)
- ETL scripts to transform MongoDB documents → PostgreSQL rows
- Validate data integrity
- Backfill audit_logs

### Phase 3: Integration
- Update backend (Express) to use Supabase client (supabase-js)
- Replace Mongoose with Supabase queries
- Test all CRUD operations

---

## 📝 Notes

1. **Timestamps:** All tables use `created_at` and `updated_at` for audit trails
2. **IDs:** Mix of UUID (primary keys) + VARCHAR (user-facing IDs like rfq_xxx, bid_xxx) for consistency
3. **JSON Fields:** JSONB for flexible nested data (ai_analysis, metadata, regions)
4. **Indexes:** Included on frequently queried fields (status, user_id, rfq_id, etc.)
5. **RLS Policies:** To be configured per role in Supabase dashboard
6. **Triggers:** Auto-update `updated_at` on every record modification

---

**Last Updated:** 2026-03-08
**Database Admin:** Naraway Team
