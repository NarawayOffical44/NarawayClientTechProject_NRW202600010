/**
 * routes/auth.js — Authentication routes
 *
 * POST /api/auth/register  — Email/password registration with role selection
 * POST /api/auth/login     — Email/password login → sets JWT cookie
 * GET  /api/auth/me        — Returns current user (used by React AuthProvider on load)
 * POST /api/auth/logout    — Clears JWT cookie
 * POST /api/auth/google/session — Exchanges Emergent OAuth session_id for JWT cookie
 *
 * JWT payload: { user_id, role }
 * Cookie: httpOnly, sameSite: 'lax', secure in production, maxAge: 7 days
 */

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const axios    = require('axios');
const rateLimit = require('express-rate-limit');
const router   = express.Router();
const User     = require('../models/User');
const VendorProfile = require('../models/VendorProfile');
const { generateId, asyncHandler, sendError, sanitizeString, validateEmail } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');

const COOKIE_NAME = process.env.COOKIE_NAME || 'session_token';
const JWT_SECRET  = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required - cannot start without it');
}

// Auth rate limiter: max 5 attempts per 15 min, skip on successful login
const authLimiter = rateLimit({
  windowMs:               15 * 60 * 1000,
  max:                    5,
  skipSuccessfulRequests: true,
  message:                { error: true, message: 'Too many login/register attempts. Please try again later.' },
  standardHeaders:        true,
  legacyHeaders:          false,
});
const COOKIE_OPTS = {
  httpOnly:  true,
  sameSite:  'lax',
  secure:    process.env.NODE_ENV === 'production',
  maxAge:    7 * 24 * 60 * 60 * 1000,  // 7 days in ms
};

/** Sign a JWT for a user */
function signToken(user) {
  return jwt.sign({ user_id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

/** Strip password from user object before sending to client */
function safeUser(user) {
  const { password, __v, _id, ...safe } = user.toObject ? user.toObject() : user;
  return safe;
}

// POST /api/auth/register
// router.post('/register', asyncHandler(async (req, res) => {
//   const { name, email, password, role = 'client', company = '' } = req.body;
//   console.log(req.body)
//   if (!name || !email || !password) return sendError(res, 400, 'name, email and password are required');
//   if (!['client', 'vendor'].includes(role)) return sendError(res, 400, 'role must be client or vendor');

//   const existing = await User.findOne({ email: email.toLowerCase() });
//   if (existing) return sendError(res, 400, 'Email already registered');

//   const hashed = await bcrypt.hash(password, 12);
//   const user = await User.create({
//     user_id:  generateId('usr_'),
//     name,
//     email:    email.toLowerCase(),
//     password: hashed,
//     role,
//     company,
//   });

//   // Auto-create vendor profile so /api/vendor/profile always has a record
//   if (role === 'vendor') {
//     await VendorProfile.create({
//       vendor_id:    generateId('vnd_'),
//       user_id:      user.user_id,
//       company_name: company || name,
//     });
//   }

//   const token = signToken(user);
//   res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
//   // return res.status(201).json(safeUser(user));
//   return res.status(201).json({ user: safeUser(user) });
// }));

router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  const { name, email, password, role = 'client', company = '' } = req.body;

  // Validation
  if (!name || !email || !password) {
    return sendError(res, 400, 'Missing required fields: name, email, password');
  }
  if (!validateEmail(email)) {
    return sendError(res, 400, 'Invalid email format');
  }
  if (password.length < 8) {
    return sendError(res, 400, 'Password must be at least 8 characters');
  }
  if (!['client', 'vendor'].includes(role)) {
    return sendError(res, 400, 'role must be client or vendor');
  }

  // Sanitize inputs
  const sanitizedName = sanitizeString(name, 255);
  const sanitizedCompany = sanitizeString(company, 255);

  // Check if email already registered
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return sendError(res, 400, 'Email already registered');
  }

  // Hash password and create user
  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({
    user_id: generateId('usr_'),
    name: sanitizedName,
    email: email.toLowerCase(),
    password: hashed,
    role,
    company: sanitizedCompany,
  });

  // Auto-create vendor profile
  if (role === 'vendor') {
    await VendorProfile.create({
      vendor_id: generateId('vnd_'),
      user_id: user.user_id,
      company_name: sanitizedCompany || sanitizedName,
    });
  }

  // Set JWT cookie and return user
  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);

  return res.status(201).json({
    user: safeUser(user)
  });
}));
// POST /api/auth/login
router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 400, 'email and password are required');
  }
  if (!validateEmail(email)) {
    return sendError(res, 400, 'Invalid email format');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.password) {
    return sendError(res, 401, 'Invalid email or password');
  }
  if (!user.is_active) {
    return sendError(res, 403, 'Account deactivated. Contact support.');
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return sendError(res, 401, 'Invalid email or password');
  }

  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  return res.json(safeUser(user));
}));

// GET /api/auth/me — called by React AuthProvider on every page load
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findOne({ user_id: req.user.user_id }).lean();
  if (!user) return sendError(res, 404, 'User not found');
  const { password, ...safe } = user;
  return res.json(safe);
}));

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  return res.json({ success: true });
});

// POST /api/auth/change-password — Change user password (admin settings)
router.post('/change-password', requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return sendError(res, 400, 'Current and new password are required');
  }

  if (newPassword.length < 8) {
    return sendError(res, 400, 'Password must be at least 8 characters');
  }

  const user = await User.findOne({ user_id: req.user.user_id });
  if (!user) return sendError(res, 404, 'User not found');

  // Verify current password
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return sendError(res, 401, 'Current password is incorrect');

  // Hash and update new password
  const hashed = await bcrypt.hash(newPassword, 12);
  await User.updateOne({ user_id: req.user.user_id }, { password: hashed });

  return res.json({ success: true, message: 'Password changed successfully' });
}));

// POST /api/auth/google/session — Emergent Google OAuth callback
// Emergent returns a session_id in the URL fragment; frontend posts it here.
router.post('/google/session', asyncHandler(async (req, res) => {
  const { session_id, role = 'client' } = req.body;
  if (!session_id) return sendError(res, 400, 'session_id required');

  // Exchange session_id for user profile via Emergent API
  const emergentRes = await axios.get(
    `https://auth.emergent.sh/session/${session_id}`,
    { timeout: 10000 }
  );
  const profile = emergentRes.data;
  if (!profile?.email) return sendError(res, 400, 'Invalid Emergent session');

  // Find or create user
  let user = await User.findOne({ email: profile.email.toLowerCase() });
  if (!user) {
    user = await User.create({
      user_id:   generateId('usr_'),
      name:      profile.name || profile.email.split('@')[0],
      email:     profile.email.toLowerCase(),
      role:      ['client', 'vendor'].includes(role) ? role : 'client',
      google_id: profile.sub || profile.id,
    });
    if (user.role === 'vendor') {
      await VendorProfile.create({
        vendor_id:    generateId('vnd_'),
        user_id:      user.user_id,
        company_name: user.name,
      });
    }
  }

  if (!user.is_active) return sendError(res, 403, 'Account deactivated');

  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  const { password, ...safe } = user.toObject();
  return res.json({ user: safe });
}));

module.exports = router;
