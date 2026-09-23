import express from 'express';
import pool from '../config/database.js';
import { requireAuth, requireSelf, isUuid } from '../middleware/auth.js';

const router = express.Router();

const clean = (value) => (value && String(value).trim()) || null;

// Stored as a JSON array string. Accepts an array or a comma-separated string.
const serializeSpecialties = (value) => {
  if (!value) return null;
  const list = Array.isArray(value) ? value : String(value).split(',');
  const items = list.map((item) => String(item).trim()).filter(Boolean);
  return items.length > 0 ? JSON.stringify(items) : null;
};

// Columns an owner can edit through the profile endpoints, with how each value is cleaned.
const PROFILE_FIELDS = [
  ['first_name', clean],
  ['last_name', clean],
  ['business_name', clean],
  ['phone', clean],
  ['country', clean],
  ['website', clean],
  ['social_instagram', clean],
  ['social_tiktok', clean],
  ['social_behance', clean],
  ['social_youtube', clean],
  ['specialties', serializeSpecialties],
  ['experience_level', clean],
  ['bio', clean],
  ['profile_image_url', clean],
  ['signature_url', clean],
  ['address_line1', clean],
  ['address_line2', clean],
  ['address_city', clean],
  ['address_state', clean],
  ['address_zip', clean],
  ['address_country', (v) => clean(v) || 'US'],
  ['billing_line1', clean],
  ['billing_line2', clean],
  ['billing_city', clean],
  ['billing_state', clean],
  ['billing_zip', clean],
  ['billing_country', (v) => clean(v) || 'US'],
];

const profileValues = (body) => PROFILE_FIELDS.map(([name, transform]) => transform(body[name]));

// Never returned to anyone but the account owner (or an admin).
const PRIVATE_FIELDS = [
  'email', 'phone', 'stripe_account_id', 'blocked',
  'address_line1', 'address_line2', 'address_city', 'address_state', 'address_zip', 'address_country',
  'billing_line1', 'billing_line2', 'billing_city', 'billing_state', 'billing_zip', 'billing_country',
  'default_allow_comments', 'email_notifications', 'comment_notifications', 'default_special_instructions',
  'default_shipping_preference', 'default_shipping_carrier', 'default_return_days',
];

const toPublicUser = (user) => {
  const copy = { ...user };
  for (const field of PRIVATE_FIELDS) delete copy[field];
  return copy;
};

// Search users (for chat)
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    const searchLimit = Math.min(parseInt(limit) || 20, 50);

    if (!q || q.trim().length === 0) {
      return res.json({ users: [] });
    }

    const searchTerm = `%${q.trim()}%`;

    const [users] = await pool.execute(
      `SELECT id, auth_user_id, username, first_name, last_name, business_name, profile_image_url, created_at
       FROM users
       WHERE (username ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ? OR business_name ILIKE ?)
       ORDER BY
         CASE
           WHEN business_name ILIKE ? THEN 1
           WHEN first_name ILIKE ? OR last_name ILIKE ? THEN 2
           WHEN username ILIKE ? THEN 3
           ELSE 4
         END,
         created_at DESC
       LIMIT ${searchLimit}`,
      Array(8).fill(searchTerm)
    );

    res.json({ users: users || [] });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all artists (users with active listings)
router.get('/artists/list', async (req, res) => {
  try {
    const [artists] = await pool.execute(
      `SELECT DISTINCT
        u.id,
        u.auth_user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.business_name,
        u.profile_image_url,
        COALESCE(
          u.business_name,
          NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
          u.username
        ) as artist_name
      FROM users u
      INNER JOIN listings l ON u.id = l.user_id
      WHERE l.status = 'active' AND COALESCE(u.blocked, FALSE) = FALSE
      ORDER BY artist_name ASC`
    );

    res.json({ artists: artists || [] });
  } catch (error) {
    console.error('Error fetching artists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const parseSpecialties = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // stored as plain comma-separated text
  }
  return String(value).split(',').map((s) => s.trim()).filter(Boolean);
};

// Public: artists with live work for the homepage "Meet the artists" strip, most active first.
router.get('/artists/showcase', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.username, u.profile_image_url, u.specialties, u.country,
         COALESCE(
           u.business_name,
           NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
           u.username
         ) AS artist_name,
         COUNT(l.id) AS listing_count,
         (ARRAY_AGG(l.primary_image_url ORDER BY COALESCE(l.bumped_at, l.created_at) DESC)
            FILTER (WHERE l.primary_image_url IS NOT NULL))[1] AS cover_image_url
       FROM users u
       JOIN listings l ON l.user_id = u.id AND l.status = 'active'
       WHERE COALESCE(u.blocked, FALSE) = FALSE AND COALESCE(u.active, TRUE) = TRUE
       GROUP BY u.id
       ORDER BY COUNT(l.id) DESC, MAX(COALESCE(l.bumped_at, l.created_at)) DESC
       LIMIT 12`
    );
    res.json({
      artists: rows.map((r) => ({
        id: r.id,
        username: r.username,
        artist_name: r.artist_name,
        profile_image_url: r.profile_image_url,
        country: r.country,
        specialties: parseSpecialties(r.specialties).slice(0, 3),
        listing_count: Number(r.listing_count),
        cover_image_url: r.cover_image_url,
      })),
    });
  } catch (error) {
    console.error('Error fetching artist showcase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by auth id (uuid) or username
router.get('/:authUserId', async (req, res) => {
  try {
    const { authUserId: identifier } = req.params;

    const [rows] = await pool.execute(
      isUuid(identifier)
        ? 'SELECT *, COALESCE(active, TRUE) as active FROM users WHERE auth_user_id = ?'
        : 'SELECT *, COALESCE(active, TRUE) as active FROM users WHERE lower(username) = lower(?)',
      [identifier]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    user.active = Boolean(user.active);

    const isOwnerOrAdmin = req.auth && (req.auth.authUserId === user.auth_user_id || req.auth.isAdmin);
    res.json(isOwnerOrAdmin ? user : toPublicUser(user));
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update the caller's own profile
router.post('/', requireAuth, async (req, res) => {
  try {
    const { authUserId, email } = req.auth;
    const requestedType = (req.body.user_type === 'artist' || req.body.user_type === 'buyer') ? req.body.user_type : null;

    const columns = PROFILE_FIELDS.map(([name]) => name);
    const values = profileValues(req.body);
    const assignments = columns.map((name) => `${name} = EXCLUDED.${name}`).join(', ');

    const [result] = await pool.execute(
      `INSERT INTO users (auth_user_id, email, user_type, ${columns.join(', ')})
       VALUES (?, ?, ?, ${columns.map(() => '?').join(', ')})
       ON CONFLICT (auth_user_id) DO UPDATE SET
         ${assignments},
         user_type = CASE WHEN users.user_type = 'admin' THEN 'admin' ELSE COALESCE(?, users.user_type) END
       RETURNING *, (xmax = 0) AS inserted`,
      [authUserId, email.toLowerCase(), requestedType || 'artist', ...values, requestedType]
    );

    const { inserted, ...user } = result.rows[0];
    if (inserted) {
      await pool.execute('INSERT INTO dashboard_stats (user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING', [user.id]);
    }
    res.status(inserted ? 201 : 200).json(user);
  } catch (error) {
    console.error('Error creating/updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const normalizeSettings = (row) => {
  const pref = row.default_shipping_preference != null ? String(row.default_shipping_preference).trim().toLowerCase() : '';
  const carrier = row.default_shipping_carrier != null ? String(row.default_shipping_carrier).trim().toLowerCase() : '';
  const returnDays = row.default_return_days != null ? parseInt(String(row.default_return_days), 10) : null;
  return {
    default_allow_comments: row.default_allow_comments !== false,
    email_notifications: row.email_notifications !== false,
    comment_notifications: row.comment_notifications !== false,
    default_special_instructions: row.default_special_instructions != null ? String(row.default_special_instructions) : '',
    default_shipping_preference: pref === 'free' ? 'free' : 'buyer',
    default_shipping_carrier: carrier === 'own' ? 'own' : 'shippo',
    default_return_days: returnDays > 0 && returnDays <= 365 ? returnDays : null,
  };
};

const SETTINGS_COLUMNS = 'default_allow_comments, email_notifications, comment_notifications, default_special_instructions, default_shipping_preference, default_shipping_carrier, default_return_days';

// Get user settings
router.get('/:authUserId/settings', requireSelf(), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ${SETTINGS_COLUMNS} FROM users WHERE auth_user_id = ?`,
      [req.params.authUserId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(normalizeSettings(rows[0]));
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user settings
router.put('/:authUserId/settings', requireSelf(), async (req, res) => {
  try {
    const { default_allow_comments, email_notifications, comment_notifications, default_special_instructions, default_shipping_preference, default_shipping_carrier, default_return_days } = req.body;

    let specialInstructionsValue = null;
    if (default_special_instructions !== undefined && default_special_instructions !== null) {
      const text = String(default_special_instructions).trim();
      specialInstructionsValue = text.length > 0 ? text : null;
    }

    const shippingPrefValue = (default_shipping_preference === 'free' || default_shipping_preference === 'buyer') ? default_shipping_preference : 'buyer';
    const shippingCarrierValue = (default_shipping_carrier === 'own' || default_shipping_carrier === 'shippo') ? default_shipping_carrier : 'shippo';
    const returnDaysNum = default_return_days === null || default_return_days === 'none' || default_return_days === undefined ? null : (parseInt(String(default_return_days), 10) || null);
    const returnDaysValue = returnDaysNum != null && returnDaysNum > 0 && returnDaysNum <= 365 ? returnDaysNum : null;
    const toBool = (value) => (value !== undefined ? Boolean(value) : null);

    const [result] = await pool.execute(
      `UPDATE users SET
        default_allow_comments = COALESCE(?::boolean, default_allow_comments),
        email_notifications = COALESCE(?::boolean, email_notifications),
        comment_notifications = COALESCE(?::boolean, comment_notifications),
        default_special_instructions = ?,
        default_shipping_preference = ?,
        default_shipping_carrier = ?,
        default_return_days = ?
      WHERE auth_user_id = ?
      RETURNING ${SETTINGS_COLUMNS}`,
      [
        toBool(default_allow_comments),
        toBool(email_notifications),
        toBool(comment_notifications),
        specialInstructionsValue,
        shippingPrefValue,
        shippingCarrierValue,
        returnDaysValue,
        req.params.authUserId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(normalizeSettings(result.rows[0]));
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Update user profile
router.put('/:authUserId', requireSelf(), async (req, res) => {
  try {
    const assignments = PROFILE_FIELDS.map(([name]) => `${name} = ?`).join(', ');

    const [result] = await pool.execute(
      `UPDATE users SET ${assignments} WHERE auth_user_id = ? RETURNING *`,
      [...profileValues(req.body), req.params.authUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reactivate user account (self-service)
router.put('/:authUserId/reactivate', requireSelf(), async (req, res) => {
  try {
    const { authUserId } = req.params;

    const [existing] = await pool.execute('SELECT blocked FROM users WHERE auth_user_id = ?', [authUserId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (existing[0].blocked) {
      return res.status(403).json({ error: 'Your account has been blocked. Please contact support.' });
    }

    const [result] = await pool.execute(
      'UPDATE users SET active = TRUE WHERE auth_user_id = ? RETURNING *',
      [authUserId]
    );

    res.json({ success: true, message: 'Account reactivated successfully', user: { ...result.rows[0], active: true } });
  } catch (error) {
    console.error('Error reactivating user:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
