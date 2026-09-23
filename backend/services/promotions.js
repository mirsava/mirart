import pool from '../config/database.js';

const SETTING_KEY = 'promotions_config';
const CREDIT_WINDOW_DAYS = 30;

// Artists pay to feature a listing (pinned above the rest, plus the homepage spotlight) or to bump it
// back to the top of "newest". Plans that advertise "Featured listings" include free features every 30 days.
export const DEFAULT_PROMOTION_CONFIG = {
  enabled: true,
  feature_options: [
    { days: 7, price: 5 },
    { days: 30, price: 15 },
  ],
  bump_price: 1,
  bump_cooldown_hours: 24,
  plan_feature_credits: { professional: 1, enterprise: 3 },
  plan_feature_days: 7,
};

const toNumber = (value, fallback, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const toPrice = (value, fallback) => Math.round(toNumber(value, fallback, 0.5, 1000) * 100) / 100;

function normalizeFeatureOptions(raw) {
  if (!Array.isArray(raw)) return DEFAULT_PROMOTION_CONFIG.feature_options;
  const byDays = new Map();
  for (const option of raw) {
    const days = Math.round(toNumber(option?.days, NaN, 1, 365));
    if (!Number.isFinite(days)) continue;
    byDays.set(days, { days, price: toPrice(option?.price, 5) });
  }
  const options = [...byDays.values()].sort((a, b) => a.days - b.days).slice(0, 6);
  return options.length ? options : DEFAULT_PROMOTION_CONFIG.feature_options;
}

function normalizeCredits(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_PROMOTION_CONFIG.plan_feature_credits;
  const credits = {};
  for (const [tier, count] of Object.entries(raw)) {
    if (!/^[a-z0-9_-]{1,50}$/.test(tier)) continue;
    credits[tier] = Math.round(toNumber(count, 0, 0, 100));
  }
  return credits;
}

export const normalizePromotionConfig = (raw = {}) => ({
  enabled: raw.enabled === undefined ? DEFAULT_PROMOTION_CONFIG.enabled : raw.enabled === true,
  feature_options: normalizeFeatureOptions(raw.feature_options),
  bump_price: toPrice(raw.bump_price, DEFAULT_PROMOTION_CONFIG.bump_price),
  bump_cooldown_hours: Math.round(toNumber(raw.bump_cooldown_hours, DEFAULT_PROMOTION_CONFIG.bump_cooldown_hours, 0, 720)),
  plan_feature_credits: normalizeCredits(raw.plan_feature_credits),
  plan_feature_days: Math.round(toNumber(raw.plan_feature_days, DEFAULT_PROMOTION_CONFIG.plan_feature_days, 1, 90)),
});

export async function getPromotionConfig() {
  const [rows] = await pool.execute('SELECT setting_value FROM site_settings WHERE setting_key = ?', [SETTING_KEY]);
  return normalizePromotionConfig(rows[0]?.setting_value || {});
}

export async function savePromotionConfig(patch) {
  const next = normalizePromotionConfig({ ...(await getPromotionConfig()), ...patch });
  await pool.execute(
    'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value',
    [SETTING_KEY, JSON.stringify(next)]
  );
  return next;
}

// Server-side price for a promotion; null when the requested option does not exist.
export function quotePromotion(config, type, days) {
  if (type === 'bump') return { type, days: null, price: config.bump_price };
  if (type === 'feature') {
    const option = config.feature_options.find((o) => o.days === Number(days));
    return option ? { type, days: option.days, price: option.price } : null;
  }
  return null;
}

// When the listing may next be bumped, or null if it may be bumped now.
export function nextBumpAt(listing, config, now = new Date()) {
  if (!listing?.bumped_at || config.bump_cooldown_hours <= 0) return null;
  const next = new Date(new Date(listing.bumped_at).getTime() + config.bump_cooldown_hours * 60 * 60 * 1000);
  return next > now ? next : null;
}

// Free features left this window for the user's current plan. `executor` lets callers count inside a transaction.
export async function getFeatureCredits(userId, config, executor = pool) {
  const [subs] = await executor.execute(
    `SELECT sp.tier FROM user_subscriptions us
     JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE us.user_id = ? AND us.status = 'active' AND us.end_date >= CURRENT_DATE
     ORDER BY us.created_at DESC LIMIT 1`,
    [userId]
  );
  const allowance = subs[0] ? config.plan_feature_credits[subs[0].tier] || 0 : 0;
  if (!allowance) return { allowance: 0, used: 0, remaining: 0, days: config.plan_feature_days };
  const [used] = await executor.execute(
    `SELECT COUNT(*) AS used FROM listing_promotions
     WHERE user_id = ? AND source = 'plan' AND created_at > now() - make_interval(days => ?::int)`,
    [userId, CREDIT_WINDOW_DAYS]
  );
  const usedCount = Number(used[0]?.used || 0);
  return { allowance, used: usedCount, remaining: Math.max(0, allowance - usedCount), days: config.plan_feature_days };
}

// Records the promotion and updates the listing in one statement pair. With a stripe_session_id, a repeat
// call is a no-op (returns applied: false), so refreshing the success page never double-applies a payment.
export async function applyPromotion(executor, { listingId, userId, type, days = null, amount = 0, source, stripeSessionId = null }) {
  const [insert] = await executor.execute(
    `INSERT INTO listing_promotions (listing_id, user_id, promotion_type, days, amount, source, stripe_session_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (stripe_session_id) DO NOTHING`,
    [listingId, userId, type, days, amount, source, stripeSessionId]
  );
  if (!insert.affectedRows) return { applied: false };

  if (type === 'feature') {
    await executor.execute(
      `UPDATE listings
       SET featured_until = GREATEST(COALESCE(featured_until, now()), now()) + make_interval(days => ?::int)
       WHERE id = ?`,
      [days, listingId]
    );
  } else {
    await executor.execute('UPDATE listings SET bumped_at = now() WHERE id = ?', [listingId]);
  }
  return { applied: true };
}

export async function getListingPromotionState(listingId) {
  const [rows] = await pool.execute('SELECT id, featured_until, bumped_at FROM listings WHERE id = ?', [listingId]);
  return rows[0] || null;
}
