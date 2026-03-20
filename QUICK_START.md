# 🚀 RENERGIZR — Quick Start & Deployment Guide

## ⚡ 5-Minute Local Setup

### Step 1: Prerequisites
```bash
# Verify you have Node.js 20+
node --version  # Should show v20.x or higher

# Install git
git --version
```

### Step 2: Clone Repository
```bash
git clone https://github.com/NarawayOffical44/NarawayClientTechProject_NRW202600010
cd NarawayClientTechProject_NRW202600010
```

### Step 3: Backend Setup
```bash
cd backend

# Create .env file
cat > .env << EOF
MONGO_URL=mongodb+srv://anilanita07_db_user:OMAagppkLGw8DmwR@cluster0.u33r6dj.mongodb.net/?appName=Cluster0
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
PORT=8001
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000
COOKIE_NAME=session_token
GROQ_API_KEY=gsk_YOUR_GROQ_KEY_HERE
RESEND_API_KEY=re_YOUR_RESEND_KEY_HERE
EOF

# Install dependencies & start
npm install
npm run dev  # Starts on http://localhost:8001
```

### Step 4: Frontend Setup (New Terminal)
```bash
cd frontend

# Create .env.local
cat > .env.local << EOF
REACT_APP_API_URL=http://localhost:8001/api
EOF

# Install dependencies & start
npm install
npm start  # Starts on http://localhost:3000
```

### Step 5: Access Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8001/api
- **API Docs:** See `SCOPE_AUDIT.md` for all endpoints

---

## 🔑 Getting API Keys (Free Tier)

### Groq API Key (AI Bid Ranking)
```bash
# 1. Visit: https://console.groq.com/
# 2. Sign up with email
# 3. Create API key
# 4. Copy key → paste into backend/.env as GROQ_API_KEY
# Free tier: 25 requests/day (enough for testing)
```

### Resend API Key (Email)
```bash
# 1. Visit: https://resend.com/
# 2. Sign up with email
# 3. Create API key
# 4. Copy key → paste into backend/.env as RESEND_API_KEY
# Free tier: 100 emails/day
```

### MongoDB Connection (Already Configured)
```bash
# Already provided in backend/.env
# Uses Naraway's MongoDB Atlas account
# No setup needed for MVP testing
```

---

## 🧪 Test the Application

### Create Test Accounts
```bash
# In browser: http://localhost:3000

# Test Client Account:
Email: client@test.com
Password: Test@123456
Role: Client
Company: Test Corp

# Test Vendor Account:
Email: vendor@test.com
Password: Test@123456
Role: Vendor
Company: Green Energy Solutions
```

### Test Workflow
1. **Login as Client** → Create RFQ (Solar, 50 MW, ₹3.50/kWh)
2. **Login as Vendor** → View RFQ in Marketplace → Submit Bid (₹3.00/kWh, 50 MW)
3. **Back to Client** → AI Rank Bids (calls Groq API)
4. **Award Contract** → Vendor receives notification
5. **Check Admin Dashboard** → View analytics, audit logs

---

## 📦 Production Deployment

### Option A: Railway (Recommended - Easiest)
```bash
# 1. Go to https://railway.app
# 2. Sign up with GitHub
# 3. Create new project → Deploy from GitHub
# 4. Select this repository
# 5. Add environment variables:
#    - MONGO_URL (from MongoDB Atlas)
#    - JWT_SECRET (generate new)
#    - GROQ_API_KEY
#    - RESEND_API_KEY
#    - NODE_ENV=production
# 6. Deploy (automatic on git push)
```

### Option B: AWS ECS Fargate (Scalable)
```bash
# 1. Build Docker image
docker build -t renergizr-backend:latest .

# 2. Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker tag renergizr-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/renergizr:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/renergizr:latest

# 3. Create ECS cluster & deploy
# (Use AWS Console or Terraform for IaC)
```

### Option C: Docker Compose (Local Production Simulation)
```bash
# In project root
docker-compose up --build

# Services:
# - Backend: http://localhost:8001
# - Frontend: http://localhost:3000
# - MongoDB: localhost:27017 (local container)
```

### Frontend Deployment: Vercel (Automatic)
```bash
# 1. Connect GitHub repo to Vercel (https://vercel.com)
# 2. Set environment variables:
#    - REACT_APP_API_URL=https://api.renergizr.in (backend URL)
# 3. Every git push → auto-deploy
# 4. Get free SSL, CDN, analytics
```

---

## 🧹 Cleanup & Troubleshooting

### Clear Cache & Reinstall
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Check Database Connection
```bash
# Backend will show on startup:
# ✓ Connected to MongoDB: renergizr

# Or test manually:
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL).then(() => {
  console.log('✓ DB Connected');
  process.exit(0);
}).catch(err => {
  console.error('✗ DB Error:', err.message);
  process.exit(1);
});
"
```

### Test API Endpoint
```bash
# Ensure backend is running
curl http://localhost:8001/health
# Should return: { "status": "ok", "timestamp": "..." }
```

### Common Issues

| Issue | Solution |
|-------|----------|
| `Port 8001 already in use` | Kill process: `lsof -ti:8001 \| xargs kill -9` |
| `MongoDB connection timeout` | Check internet, verify MONGO_URL in .env |
| `Groq API errors` | Verify GROQ_API_KEY is valid and has quota |
| `CORS errors` | Ensure CORS_ORIGINS in .env matches frontend URL |
| `npm ERR! code ERESOLVE` | Run `npm install --force` or `npm install --legacy-peer-deps` |

---

## 📊 Verify Everything Works

### Health Check Endpoints
```bash
# Backend health
curl http://localhost:8001/health

# Test auth
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"Test@123456","role":"client"}'

# Test RFQ creation (requires JWT - login first)
# See SCOPE_AUDIT.md for full API documentation
```

### Run Automated Tests
```bash
cd backend
npm test                    # Run all tests
npm test -- --coverage      # See coverage %
npm test -- --watch        # Watch mode (re-run on file change)
```

---

## 📋 Pre-Production Checklist

- [ ] All environment variables set (.env, .env.local)
- [ ] Backend: `npm test` passes
- [ ] Frontend: `npm start` builds without errors
- [ ] Database indexes created: `db.users.getIndexes()`
- [ ] Test auth rate limiting (5 failed logins = blocked)
- [ ] Test RFQ creation with validation (price, qty)
- [ ] Test AI ranking (calls Groq API)
- [ ] Test audit logging (/api/admin/audit-logs)
- [ ] Error monitoring configured (Sentry optional)
- [ ] SSL/TLS enabled (production domains)
- [ ] CORS origins updated (production domain)
- [ ] Backup strategy planned (MongoDB Atlas backups)

---

## 🎯 Next Steps

### Immediate (Today)
1. ✅ Run local setup
2. ✅ Create test accounts
3. ✅ Test full workflow (RFQ → Bid → Ranking → Contract)
4. ✅ Run test suite

### This Week
1. Deploy backend to Railway
2. Deploy frontend to Vercel
3. Configure production DNS
4. Run load testing
5. Set up monitoring (Sentry)

### Next Week
1. Final UAT (User Acceptance Testing)
2. Customer training
3. Soft launch (limited users)
4. Monitor for issues

### Next Month
1. Plan Phase 2 features
2. Gather user feedback
3. Optimize based on usage

---

## 📞 Support

**Documentation:**
- `PROJECT_COMPLETION_REPORT.md` — What's completed
- `INDUSTRY_GRADE_AUDIT_2026.md` — Security audit
- `SCOPE_AUDIT.md` — Feature compliance
- `DATABASE_SCHEMA.md` — DB structure
- `LOCAL_SETUP.md` — Detailed local setup

**GitHub Issues:** https://github.com/NarawayOffical44/NarawayClientTechProject_NRW202600010/issues

---

**Ready to Launch!** 🚀

