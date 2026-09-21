import express from 'express';
import pool from '../config/database.js';
import { createSupabaseAnon } from '../config/supabase.js';
import { loginLimiter, usernameLookupLimiter } from '../middleware/security.js';

const router = express.Router();

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,}$/;

router.get('/username-available', usernameLookupLimiter, async (req, res) => {
  try {
    const username = String(req.query.username || '').trim();
    if (!USERNAME_PATTERN.test(username)) {
      return res.status(400).json({ error: 'Invalid username' });
    }
    const [rows] = await pool.execute('SELECT 1 FROM users WHERE lower(username) = lower(?)', [username]);
    res.json({ available: rows.length === 0 });
  } catch (error) {
    console.error('Username availability check failed:', error);
    res.status(500).json({ error: 'Failed to check username' });
  }
});

// Username sign-in is resolved server-side so email addresses are never exposed to the browser.
// Email sign-ins go straight to Supabase from the client.
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username or email and password are required' });
    }

    let email = String(identifier).trim();
    if (!email.includes('@')) {
      const [rows] = await pool.execute('SELECT email FROM users WHERE lower(username) = lower(?)', [email]);
      email = rows[0]?.email;
    }

    const invalid = () => res.status(401).json({ error: 'Invalid login credentials', code: 'invalid_credentials' });
    if (!email) return invalid();

    const { data, error } = await createSupabaseAnon().auth.signInWithPassword({ email, password });
    if (error || !data?.session) {
      if (error?.code === 'email_not_confirmed') {
        return res.status(403).json({ error: 'Email not confirmed', code: 'email_not_confirmed', email });
      }
      return invalid();
    }

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
