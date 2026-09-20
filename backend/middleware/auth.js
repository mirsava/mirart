import pool from '../config/database.js';
import { getSupabaseAdmin } from '../config/supabase.js';

const CACHE_TTL_MS = 30 * 1000;
const cache = new Map();

const ROLE_TO_GROUP = { admin: 'site_admin', artist: 'artist', buyer: 'buyer' };

function cacheGet(token) {
  const hit = cache.get(token);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(token);
    return null;
  }
  return hit.value;
}

function cacheSet(token, value) {
  if (cache.size > 500) cache.clear();
  cache.set(token, { value, expires: Date.now() + CACHE_TTL_MS });
}

async function resolveAuth(token) {
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data?.user) return null;

  const [rows] = await pool.execute(
    'SELECT id, user_type, blocked, active FROM users WHERE auth_user_id = ?',
    [data.user.id]
  );
  const row = rows[0];
  const role = row?.user_type || null;
  return {
    authUserId: data.user.id,
    email: data.user.email,
    userId: row?.id ?? null,
    role,
    groups: role ? [ROLE_TO_GROUP[role] || role] : [],
    isAdmin: role === 'admin',
    blocked: Boolean(row?.blocked),
    active: row ? row.active !== false : true,
  };
}

// Verifies the Supabase access token (if any) and sets req.auth. Never rejects: anonymous requests pass through.
export async function attachAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return next();

  try {
    let auth = cacheGet(token);
    if (!auth) {
      auth = await resolveAuth(token);
      if (auth) cacheSet(token, auth);
    }
    if (auth) req.auth = auth;
  } catch (err) {
    console.error('Auth verification failed:', err.message);
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.auth) return res.status(401).json({ error: 'Authentication required' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.auth) return res.status(401).json({ error: 'Authentication required' });
  if (!req.auth.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

// Route param (default :authUserId) must be the caller's own auth id, unless the caller is an admin.
export const requireSelf = (param = 'authUserId') => (req, res, next) => {
  if (!req.auth) return res.status(401).json({ error: 'Authentication required' });
  if (req.params[param] !== req.auth.authUserId && !req.auth.isAdmin) {
    return res.status(403).json({ error: 'You can only access your own account' });
  }
  next();
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value) => typeof value === 'string' && UUID_PATTERN.test(value);

export const clearAuthCache = () => cache.clear();
