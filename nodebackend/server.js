require('dotenv').config({ path: '/app/backend/.env' });

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/auth');
const rfqRoutes = require('./routes/rfqs');
const bidRoutes = require('./routes/bids');
const contractRoutes = require('./routes/contracts');
const vendorRoutes = require('./routes/vendor');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const marketRoutes = require('./routes/market');

const app = express();
const PORT = process.env.NODE_PORT || 8002;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS === '*' ? true : (process.env.CORS_ORIGINS || '').split(','),
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parser (manual - no extra package needed)
app.use((req, _res, next) => {
  const cookies = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) cookies[k.trim()] = v.join('=').trim();
  });
  req.cookies = cookies;
  next();
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'renergizr-node', version: '1.0.0', timestamp: new Date().toISOString() }));

// API Routes
app.use('/auth', authRoutes);
app.use('/rfqs', rfqRoutes);
app.use('/rfqs/:rfq_id/bids', bidRoutes);
app.use('/contracts', contractRoutes);
app.use('/vendor', vendorRoutes);
app.use('/admin', adminRoutes);
app.use('/notifications', notificationRoutes);
app.use('/market', marketRoutes);

// API docs endpoint
app.get('/docs', (_req, res) => {
  res.json({
    service: 'Renergizr Node.js API',
    version: '1.0.0',
    base_url: '/api/v2',
    endpoints: {
      auth: ['POST /auth/register', 'POST /auth/login', 'POST /auth/google/session', 'GET /auth/me', 'POST /auth/logout'],
      rfqs: ['POST /rfqs', 'GET /rfqs', 'GET /rfqs/:id', 'PATCH /rfqs/:id/status', 'POST /rfqs/:id/close-bidding', 'POST /rfqs/:id/award/:bid_id'],
      bids: ['POST /rfqs/:id/bids', 'GET /rfqs/:id/bids', 'POST /rfqs/:id/bids/ai-rank', 'PATCH /rfqs/:id/bids/:bid_id/shortlist', 'PATCH /rfqs/:id/bids/:bid_id/status'],
      contracts: ['GET /contracts', 'GET /contracts/:id', 'POST /contracts/:id/respond'],
      vendor: ['GET /vendor/profile', 'PUT /vendor/profile', 'GET /vendor/bids', 'POST /vendor/documents/upload', 'GET /vendor/documents'],
      admin: ['GET /admin/users', 'PATCH /admin/users/:id', 'GET /admin/vendors', 'GET /admin/analytics', 'GET /admin/rfqs', 'GET /admin/contracts', 'GET /admin/documents', 'GET /admin/documents/:id/download'],
      notifications: ['GET /notifications', 'PATCH /notifications/:id/read', 'POST /notifications/read-all'],
      market: ['GET /market/insights'],
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ detail: `Route ${req.method} ${req.path} not found on Node.js backend` });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ detail: err.message || 'Internal server error' });
});

// Start server after DB connection
connectDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Renergizr Node.js API] Running on port ${PORT}`);
      console.log(`[Routes] /health, /docs, /auth/*, /rfqs/*, /contracts/*, /vendor/*, /admin/*, /notifications/*, /market/*`);
    });
  })
  .catch(err => {
    console.error('[Startup] Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

module.exports = app;
