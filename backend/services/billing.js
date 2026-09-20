import pool from '../config/database.js';

const SETTING_KEY = 'billing_config';
const DAY_MS = 24 * 60 * 60 * 1000;

// Billing is off at launch: every artist can list up to `free_listing_limit` artworks with no subscription.
export const DEFAULT_BILLING_CONFIG = {
  enabled: false,
  free_listing_limit: 25,
  grace_days: 30,
  billing_started_at: null,
};

const toInt = (value, fallback, min, max) => {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const normalize = (raw = {}) => ({
  enabled: raw.enabled === true,
  free_listing_limit: toInt(raw.free_listing_limit, DEFAULT_BILLING_CONFIG.free_listing_limit, 1, 100000),
  grace_days: toInt(raw.grace_days, DEFAULT_BILLING_CONFIG.grace_days, 0, 365),
  billing_started_at: raw.billing_started_at || null,
});

export async function getBillingConfig() {
  const [rows] = await pool.execute('SELECT setting_value FROM site_settings WHERE setting_key = ?', [SETTING_KEY]);
  return normalize(rows[0]?.setting_value || {});
}

// Turning billing on (re)starts the grace period for artists without a subscription.
export async function saveBillingConfig(patch) {
  const current = await getBillingConfig();
  const next = normalize({ ...current, ...patch });
  if (next.enabled && !current.enabled) next.billing_started_at = new Date().toISOString();
  await pool.execute(
    'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value',
    [SETTING_KEY, JSON.stringify(next)]
  );
  return next;
}

// Public-facing summary of what an artist without a paid plan can do right now.
export function describeAccess(config, now = new Date()) {
  const startedAt = config.billing_started_at ? new Date(config.billing_started_at) : null;
  const graceEndsAt = config.enabled && startedAt ? new Date(startedAt.getTime() + config.grace_days * DAY_MS) : null;
  const inGrace = Boolean(graceEndsAt && now < graceEndsAt);
  return {
    billing_enabled: config.enabled,
    in_grace: inGrace,
    grace_ends_at: graceEndsAt ? graceEndsAt.toISOString() : null,
    free_access: !config.enabled || inGrace,
    free_listing_limit: config.free_listing_limit,
    grace_days: config.grace_days,
  };
}

// How many listings a user may have active, and whether they may activate any at all.
export async function getListingAccess(userId) {
  const [subs] = await pool.execute(
    `SELECT us.*, sp.max_listings
     FROM user_subscriptions us
     JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE us.user_id = ? AND us.status = 'active' AND us.end_date >= CURRENT_DATE
     ORDER BY us.created_at DESC
     LIMIT 1`,
    [userId]
  );
  const access = describeAccess(await getBillingConfig());
  const subscription = subs[0] || null;

  if (subscription) {
    const planLimit = parseInt(subscription.max_listings, 10);
    return { allowed: true, source: 'subscription', maxListings: access.free_access ? Math.max(planLimit, access.free_listing_limit) : planLimit, subscription, access };
  }
  if (access.free_access) {
    return { allowed: true, source: 'free', maxListings: access.free_listing_limit, subscription: null, access };
  }
  return { allowed: false, source: 'none', maxListings: 0, subscription: null, access };
}
