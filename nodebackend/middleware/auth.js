const { getDB } = require('../config/db');

async function getCurrentUser(req) {
  const db = getDB();
  let token = null;

  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) {
    token = auth.slice(7);
  }
  if (!token && req.cookies?.session_token) {
    token = req.cookies.session_token;
  }
  if (!token) {
    const err = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }

  const session = await db.collection('user_sessions').findOne({ session_token: token }, { projection: { _id: 0 } });
  if (!session) {
    const err = new Error('Invalid session');
    err.status = 401;
    throw err;
  }

  const expires = new Date(session.expires_at);
  if (expires < new Date()) {
    const err = new Error('Session expired');
    err.status = 401;
    throw err;
  }

  const user = await db.collection('users').findOne({ user_id: session.user_id }, { projection: { _id: 0, password_hash: 0 } });
  if (!user) {
    const err = new Error('User not found');
    err.status = 401;
    throw err;
  }
  return user;
}

function requireAuth(roles = []) {
  return async (req, res, next) => {
    try {
      const user = await getCurrentUser(req);
      if (roles.length > 0 && !roles.includes(user.role)) {
        return res.status(403).json({ detail: 'Insufficient permissions' });
      }
      req.user = user;
      next();
    } catch (err) {
      res.status(err.status || 401).json({ detail: err.message });
    }
  };
}

module.exports = { getCurrentUser, requireAuth };
