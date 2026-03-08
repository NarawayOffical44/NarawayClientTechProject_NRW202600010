# Renergizr Industries — Deployment & Hosting Guide
**Version:** 1.2 | **Last Updated:** 2026-03-08
**Service Provider:** Naraway | **Client:** Renergizr Industries

---

## 🚀 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React SPA)                     │
│              (Vercel / Netlify / AWS CloudFront)            │
│                   https://renergizr.in/                     │
└────────────┬────────────────────────────────────────────────┘
             │ (API requests via axios)
             ↓
┌─────────────────────────────────────────────────────────────┐
│                 Backend API (Express.js)                    │
│            (AWS ECS Fargate / Docker Container)             │
│              API URL: api.renergizr.in:8001                 │
└────────────┬────────────────────────────────────────────────┘
             │ (Database queries)
             ↓
┌──────────────────────┬──────────────────────┐
│ Supabase PostgreSQL  │ Supabase Storage     │
│   (Database)         │   (Files/Docs)       │
└──────────────────────┴──────────────────────┘
             ↓
┌──────────────────────┬──────────────────────┐
│  Anthropic Claude    │   Resend Email API   │
│  (AI Bid Ranking)    │   (Email Delivery)   │
└──────────────────────┴──────────────────────┘
```

---

## 📍 Current Git Setup

**GitHub Repository:**
```
Organization: NarawayOffical44
Repository: NarawayClientTechProject_NRW202600010
Remote URL: https://github.com/NarawayOffical44/NarawayClientTechProject_NRW202600010.git
Branch: main (production)
```

**Verify current setup:**
```bash
cd /e/NarawayClientTechProject_NRW202600010-main/NarawayClientTechProject_NRW202600010
git remote -v
git branch -a
git status
```

---

## 🌐 Frontend Deployment

### Option 1: **Vercel** (Recommended for React)
**Best for:** Full-stack JavaScript apps, automatic deployments on git push

**Setup Steps:**
1. Push code to GitHub (already configured)
2. Connect repo to Vercel: https://vercel.com/new
3. Select `frontend` directory as root
4. Environment variables:
   ```
   REACT_APP_API_URL=https://api.renergizr.in
   REACT_APP_ENV=production
   ```
5. Deploy button triggers automatically on every push

**Pros:** Zero-config, auto-scaling, free tier available, preview deployments

---

### Option 2: **Netlify** (Alternative)
**Setup:**
1. Connect GitHub repo to Netlify
2. Build command: `yarn build` or `npm run build`
3. Publish directory: `frontend/build`
4. Deploy & enjoy automatic HTTPS

---

### Option 3: **AWS CloudFront + S3**
**Manual deployment:**
```bash
cd frontend
yarn build
aws s3 sync build/ s3://renergizr-frontend/
aws cloudfront create-invalidation --distribution-id [ID] --paths "/*"
```

---

## 🖥️ Backend Deployment

### Current: **AWS ECS Fargate** (Docker-based)
**Status:** Ready (Dockerfile exists)

**Dockerfile Location:** `backend/Dockerfile`
**Image Name:** `renergizr-api`
**Port:** 8001

**Build & Push:**
```bash
# Build Docker image
docker build -t renergizr-api:latest backend/

# Tag for AWS ECR
docker tag renergizr-api:latest [AWS_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/renergizr-api:latest

# Push to ECR (Elastic Container Registry)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [AWS_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com
docker push [AWS_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/renergizr-api:latest
```

**ECS Fargate Task Definition:**
```json
{
  "family": "renergizr-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "renergizr-api",
      "image": "[AWS_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/renergizr-api:latest",
      "portMappings": [{ "containerPort": 8001, "hostPort": 8001 }],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "SUPABASE_URL", "value": "https://xxxxx.supabase.co" },
        { "name": "SUPABASE_KEY", "value": "..." },
        { "name": "ANTHROPIC_API_KEY", "value": "..." },
        { "name": "RESEND_API_KEY", "value": "..." }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/renergizr-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -qO- http://localhost:8001/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 15
      }
    }
  ]
}
```

**Alternative: Railway or Render** (Simpler than AWS)
```bash
# Railway: No Docker needed, auto-deploys from GitHub
railway init
railway up

# Render: Similar to Railway, very beginner-friendly
```

---

## 🔧 Environment Variables Setup

### Backend (.env)
```
# Node Environment
NODE_ENV=production

# Supabase Database
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGc... (service role key)
SUPABASE_ANON_KEY=eyJhbGc... (anon key)

# AI Integration (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Email Delivery (Resend)
RESEND_API_KEY=re_xxxxx

# Server
PORT=8001
HOST=0.0.0.0

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=https://renergizr.in

# Logging
LOG_LEVEL=info
```

### Frontend (.env.production)
```
REACT_APP_API_URL=https://api.renergizr.in
REACT_APP_ENV=production
```

**Never commit .env files!** Use GitHub Secrets / Environment variables in deployment platform.

---

## 📦 Database Setup (Supabase)

### 1. Create Supabase Project
- Go to https://supabase.com
- New project: Region (closest to users), password
- Copy connection strings

### 2. Initialize Database Schema
```bash
# Using SQL Editor in Supabase Dashboard
# Copy contents of DATABASE_SCHEMA.md
# Paste in Supabase SQL Editor → Run

# OR via CLI
npm install -g supabase
supabase db push
```

### 3. Setup Row-Level Security (RLS)
**Policies:**
```sql
-- Clients see only their own RFQs
CREATE POLICY "Clients view own RFQs" ON rfqs
  FOR SELECT USING (
    auth.uid() = (SELECT id FROM users WHERE user_id = rfqs.client_id LIMIT 1)
  );

-- Vendors see open RFQs
CREATE POLICY "Vendors view open RFQs" ON rfqs
  FOR SELECT USING (
    status = 'open' AND auth.role() = 'authenticated'
  );

-- Admins see all
CREATE POLICY "Admins view all" ON rfqs
  FOR SELECT USING (
    (SELECT role FROM users WHERE user_id = auth.user_id() LIMIT 1) = 'admin'
  );
```

### 4. Storage Buckets (for Vendor Documents)
```sql
-- Create bucket for vendor documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-documents', 'vendor-documents', false);

-- Policy: vendors can upload to their own folder
CREATE POLICY "Vendors upload own docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.user_id()
  );
```

---

## 🔐 Environment & Secrets Management

### GitHub Secrets (for CI/CD)
1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Add secrets:
   ```
   SUPABASE_URL
   SUPABASE_KEY
   ANTHROPIC_API_KEY
   RESEND_API_KEY
   JWT_SECRET
   AWS_ACCOUNT_ID (for Docker push)
   AWS_ACCESS_KEY_ID
   AWS_SECRET_ACCESS_KEY
   ```

### Deployment Platform Secrets
**Vercel (Frontend):**
- Project Settings → Environment Variables
- Add: `REACT_APP_API_URL`

**ECS/Fargate (Backend):**
- Use AWS Secrets Manager OR ECS Task Definition environment variables

---

## 🚀 CI/CD Pipeline Setup

### GitHub Actions Workflow (Optional)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy Renergizr

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Login to Amazon ECR
        run: |
          aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Build & Push Docker Image
        run: |
          docker build -t renergizr-api:${{ github.sha }} backend/
          docker tag renergizr-api:${{ github.sha }} ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com/renergizr-api:latest
          docker push ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com/renergizr-api:latest

      - name: Deploy to ECS
        run: aws ecs update-service --cluster renergizr --service renergizr-api --force-new-deployment --region us-east-1

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: frontend
```

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (`npm test`, `pytest`)
- [ ] No console errors/warnings
- [ ] Environment variables set correctly
- [ ] Database migrations complete
- [ ] Supabase RLS policies configured
- [ ] Git branch is clean (`git status`)

### Deployment Steps
1. **Commit & Push:**
   ```bash
   git add .
   git commit -m "chore: deploy v1.2"
   git push origin main
   ```

2. **Backend:**
   - GitHub Actions triggers automatically (if CI/CD configured)
   - OR manually push Docker image to ECR
   - Update ECS task definition

3. **Frontend:**
   - Vercel auto-deploys on GitHub push
   - Monitor deployment: https://vercel.com/dashboard

4. **Verify:**
   ```bash
   # Check API health
   curl https://api.renergizr.in/health

   # Check frontend loads
   curl https://renergizr.in
   ```

### Post-Deployment
- [ ] Smoke tests (login, create RFQ, submit bid, etc.)
- [ ] Monitor logs: AWS CloudWatch, Vercel, Supabase
- [ ] Check database queries and performance
- [ ] Verify email delivery (Resend dashboard)
- [ ] Test AI bid ranking

---

## 🔍 Monitoring & Logs

### AWS CloudWatch (Backend Logs)
```bash
aws logs tail /ecs/renergizr-api --follow
```

### Supabase Dashboard
- Query performance
- Row count trends
- Storage usage
- Auth activity

### Vercel Dashboard
- Frontend performance
- Build times
- HTTP status codes

---

## 🆘 Rollback Procedure

### If Deployment Fails:

**Backend (ECS):**
```bash
# Revert to previous task definition
aws ecs update-service \
  --cluster renergizr \
  --service renergizr-api \
  --task-definition renergizr-api:2  # Previous version number
```

**Frontend (Vercel):**
- Vercel Dashboard → Deployments → Click previous successful deployment → "Redeploy"

**Database (Supabase):**
- Supabase Dashboard → Database → Backups
- Restore from last known good backup

---

## 📊 Cost Estimation (Monthly)

| Service | Usage | Cost |
|---------|-------|------|
| **AWS ECS Fargate** | 512 CPU, 1GB RAM, 730 hrs | $25–50 |
| **Supabase PostgreSQL** | 50GB, 500K queries | $25–50 |
| **Vercel Frontend** | 100GB bandwidth | $0–20 |
| **Anthropic Claude** | 10K API calls | $1–5 |
| **Resend Email** | 500 emails | $0–10 |
| **CloudWatch Logs** | 5GB logs | $2–5 |
| **Total** | | **$53–140/month** |

---

## 🎯 Next Steps

1. **Set up Supabase project** → Copy connection strings
2. **Configure GitHub secrets** → All API keys & DB credentials
3. **Deploy backend** → ECS or Railway
4. **Deploy frontend** → Vercel or Netlify
5. **Run smoke tests** → Verify all features work
6. **Monitor production** → Set up alerts

---

**Questions?** Contact Naraway Dev Team
**Last Updated:** 2026-03-08
