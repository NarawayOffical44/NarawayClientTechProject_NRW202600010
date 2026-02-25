const router = require('express').Router();
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { getDB } = require('../config/db');
const { generateId, nowISO, expiresAt } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');

// POST /register
router.post('/register', async (req, res) => {
  try {
    const db = getDB();
    const { email, password, name, role, company } = req.body;
    if (!email || !password || !name || !role) return res.status(400).json({ detail: 'Missing required fields' });

    const existing = await db.collection('users').findOne({ email });
    if (existing) return res.status(400).json({ detail: 'Email already registered' });

    const user_id = generateId('usr_');
    const password_hash = await bcrypt.hash(password, 10);
    const user = { user_id, email, name, role, company: company || null, picture: null, password_hash, is_active: true, created_at: nowISO() };
    await db.collection('users').insertOne(user);

    if (role === 'vendor') {
      await db.collection('vendor_profiles').insertOne({
        vendor_id: generateId('vnd_'), user_id, company_name: company || name,
        description: '', energy_types: [], capacity_mw: 0, certifications: [],
        regulatory_docs: [], carbon_credits: 0, verification_status: 'pending',
        contact_email: email, contact_phone: '', website: '', location: '',
        created_at: nowISO(),
      });
    }

    const session_token = generateId('sess_');
    await db.collection('user_sessions').insertOne({ session_token, user_id, expires_at: expiresAt(7), created_at: nowISO() });
    res.cookie('session_token', session_token, { httpOnly: true, secure: true, sameSite: 'none', path: '/' });
    const { password_hash: _, _id, ...safeUser } = user;
    res.json({ user: safeUser, session_token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: err.message });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const db = getDB();
    const { email, password } = req.body;
    const user = await db.collection('users').findOne({ email });
    if (!user || !user.password_hash) return res.status(401).json({ detail: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ detail: 'Invalid credentials' });

    const session_token = generateId('sess_');
    await db.collection('user_sessions').insertOne({ session_token, user_id: user.user_id, expires_at: expiresAt(7), created_at: nowISO() });
    res.cookie('session_token', session_token, { httpOnly: true, secure: true, sameSite: 'none', path: '/' });
    const { password_hash, _id, ...safeUser } = user;
    res.json({ user: safeUser, session_token });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /google/session
router.post('/google/session', async (req, res) => {
  try {
    const db = getDB();
    const { session_id, role = 'client' } = req.body;
    const resp = await axios.get('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data', {
      headers: { 'X-Session-ID': session_id },
    });
    const { email, name, picture, session_token } = resp.data;

    let user = await db.collection('users').findOne({ email });
    if (!user) {
      const user_id = generateId('usr_');
      user = { user_id, email, name: name || email, role, company: null, picture, password_hash: null, is_active: true, created_at: nowISO() };
      await db.collection('users').insertOne(user);
      if (role === 'vendor') {
        await db.collection('vendor_profiles').insertOne({
          vendor_id: generateId('vnd_'), user_id, company_name: name || email,
          description: '', energy_types: [], capacity_mw: 0, certifications: [],
          regulatory_docs: [], carbon_credits: 0, verification_status: 'pending',
          contact_email: email, contact_phone: '', website: '', location: '', created_at: nowISO(),
        });
      }
    } else {
      await db.collection('users').updateOne({ email }, { $set: { picture, name } });
      user = await db.collection('users').findOne({ user_id: user.user_id });
    }

    await db.collection('user_sessions').insertOne({ session_token, user_id: user.user_id, expires_at: expiresAt(7), created_at: nowISO() });
    res.cookie('session_token', session_token, { httpOnly: true, secure: true, sameSite: 'none', path: '/' });
    const { password_hash, _id, ...safeUser } = user;
    res.json({ user: safeUser, session_token });
  } catch (err) {
    res.status(400).json({ detail: 'Invalid Google session: ' + err.message });
  }
});

// GET /me
router.get('/me', requireAuth(), (req, res) => {
  res.json(req.user);
});

// POST /logout
router.post('/logout', async (req, res) => {
  try {
    const db = getDB();
    const auth = req.headers['authorization'] || '';
    let token = auth.startsWith('Bearer ') ? auth.slice(7) : req.cookies?.session_token;
    if (token) await db.collection('user_sessions').deleteOne({ session_token: token });
    res.clearCookie('session_token', { path: '/', sameSite: 'none', secure: true });
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.json({ message: 'Logged out' });
  }
});

module.exports = router;
