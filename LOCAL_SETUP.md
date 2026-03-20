# Local Setup & Testing Guide

## Prerequisites
- Node.js 20+
- MongoDB Atlas Account (already configured)
- Anthropic API Key (for AI ranking)

---

## Backend Setup

### 1. Environment Variables
File: `backend/.env` (already configured)

```
MONGO_URL=mongodb+srv://anilanita07_db_user:OMAagppkLGw8DmwR@cluster0.u33r6dj.mongodb.net/?appName=Cluster0
JWT_SECRET=your-strong-random-secret-here-change-in-production
PORT=8001
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000
COOKIE_NAME=session_token
GROQ_API_KEY=<your-groq-api-key>
```

**Get GROQ_API_KEY:**
1. Visit https://console.groq.com/
2. Sign in with your Groq account (or create one)
3. Navigate to API Keys
4. Create new API key
5. Copy and paste into `.env` as GROQ_API_KEY

**Note:** Renergizr uses Groq API (mixtral-8x7b-32768) for bid ranking—fast, cost-effective, open-source.
Alternative: To use Anthropic Claude instead, request support via GitHub issues.

### 2. Install & Start Backend

```bash
cd backend
npm install
npm run dev
```

Backend will start at: **http://localhost:8001**

---

## Frontend Setup

### 1. Environment Variables
File: `frontend/.env.local` (create if not exists)

```
REACT_APP_API_URL=http://localhost:8001/api
```

### 2. Install & Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will start at: **http://localhost:3000**

---

## Test Credentials

### Create Test Accounts

#### Test Client Account:
1. Go to http://localhost:3000
2. Click "Sign Up"
3. Register:
   - **Email:** client@test.com
   - **Password:** Test@123456
   - **Role:** Client
   - **Company:** Test Corp

#### Test Vendor Account:
1. Go to http://localhost:3000
2. Click "Sign Up"
3. Register:
   - **Email:** vendor@test.com
   - **Password:** Test@123456
   - **Role:** Vendor
   - **Company:** Green Energy Solutions

#### Test Admin Account (if needed):
Contact support to promote account to admin in database.

---

## Test Features

### 1. Create RFQ (As Client)
- Login as `client@test.com`
- Go to "Create RFQ"
- Fill form (Steps 1-4):
  - **Title:** Solar Energy Supply - 50 MW
  - **Energy Type:** Solar
  - **Quantity:** 50 MW
  - **Location:** Jodhpur, Rajasthan
  - **Price Ceiling:** ₹3.50/kWh
  - **Add-ons:** Select "Carbon Credits"
  - **Carbon Credits:** 500 tCO₂e
- Submit

### 2. Submit Bid (As Vendor)
- Login as `vendor@test.com`
- Go to "Marketplace"
- Find the RFQ you created
- Click to view details
- Submit Bid:
  - **Price:** ₹3.00/kWh
  - **Quantity:** 50 MW
  - **Timeline:** 30 days
  - **Notes:** Ready for immediate delivery

### 3. AI Ranking (As Client)
- Go back to RFQ detail
- Click "AI Rank" button
- System will:
  - Analyze bids using Claude AI
  - Calculate compliance/distance/reliability scores
  - Display strengths, gaps, recommendations

### 4. Vendor Comparison (As Client)
- Click "Comparison" button
- See side-by-side table:
  - Price, quantity, timeline
  - AI score, compliance, reliability
  - Gaps count, certifications
  - Sort by any column

### 5. Gap Analysis (As Client)
- Click on bid card to expand
- View:
  - AI Strengths (green ✓)
  - Gaps/Unmet specs (amber !)
  - Recommendations (blue)
  - Metrics (compliance, distance, reliability)

### 6. Carbon Credits Display (As Client)
- In RFQ detail, see "Carbon Credits" section
- Shows: 500 tCO₂e CCTS Certified
- In bid cards, see vendor's available carbon credits

### 7. Award Contract (As Client)
- Select a bid
- Click "Award Contract"
- Review terms
- Confirm award
- Vendor receives notification

---

## Database

All data stored in MongoDB Atlas:
- **Cluster:** cluster0.u33r6dj.mongodb.net
- **Database:** renergizr
- **Collections:** users, rfqs, bids, contracts, vendor_profiles, notifications

### View Data:
1. Go to https://cloud.mongodb.com/
2. Login with MongoDB account
3. Navigate to cluster0 → renergizr database
4. Browse collections

---

## Common Issues

### 1. "AI Rank button does nothing"
- **Cause:** Missing `ANTHROPIC_API_KEY` in `.env`
- **Fix:** Add valid API key and restart backend

### 2. "Cannot connect to MongoDB"
- **Cause:** Invalid connection string
- **Fix:** Verify `.env` MONGO_URL matches MongoDB Atlas

### 3. "CORS error when API calls fail"
- **Cause:** Frontend and backend mismatch ports
- **Fix:** Ensure frontend calls `http://localhost:8001` (backend port)

### 4. "Login not working"
- **Cause:** JWT_SECRET missing
- **Fix:** Ensure `JWT_SECRET` is set in `.env`

---

## Production Checklist

Before pushing to production:

- [ ] Change `JWT_SECRET` to strong random value
- [ ] Add real `ANTHROPIC_API_KEY`
- [ ] Set `NODE_ENV=production`
- [ ] Update `CORS_ORIGINS` to actual domain
- [ ] Update MongoDB user/password
- [ ] Enable HTTPS
- [ ] Run backend tests: `npm test`
- [ ] Build frontend: `npm run build`
- [ ] Test all features on staging
- [ ] Deploy to AWS ECS / Railway / Render

---

## Next Steps

After testing locally:
1. Commit changes: `git add . && git commit -m "Add all features"`
2. Push to GitHub: `git push origin main`
3. Deploy to production via CI/CD pipeline

---

**Questions?** Check DATABASE_SCHEMA.md or SCOPE_AUDIT.md for more details.
