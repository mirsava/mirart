import pool from '../config/database.js';
import { getListingAccess, countPlanListings } from './billing.js';
import { createNotification } from './notificationService.js';
import { logActivity } from './activityLog.js';

const SETTING_KEY = 'promotions_config';
const CREDIT_WINDOW_DAYS = 30;

// Artists pay to feature a listing (pinned above the rest, plus the homepage spotlight) or to bump it
// back to the top of "newest". Plans that advertise "Featured listings" include free features every 30 days.
// A listing pass (pay-per-listing) keeps one listing live for listing_pass_days without a plan slot.
export const DEFAULT_PROMOTION_CONFIG = {
  enabled: true,
  feature_options: [
    { days: 7, price: 5 },
    { days: 30, price: 15 },
  ],
  // $2 covers Stripe's ~30c fixed fee; a pack of 5 for $4 is one payment instead of five
  bump_price: 2,
  bump_cooldown_hours: 24,
  bump_daily_limit: 3, // bumps per artist per 24 hours, across all their listings
  bump_slot_every: 4, // in "Newest", at most 1 in every N places goes to a bumped listing
  bump_max_active: 30, // bumps stop selling while this many are active, so each one still gets seen
  bump_pack_enabled: true,
  bump_pack_size: 5,
  bump_pack_price: 4,
  plan_feature_credits: { professional: 1, enterprise: 3 },
  plan_feature_days: 7,
  listing_pass_enabled: true,
  listing_pass_price: 3,
  listing_pass_days: 60,
  featured_artist_enabled: true,
  featured_artist_price: 25,
  featured_artist_weeks_ahead: 8,
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
  bump_daily_limit: Math.round(toNumber(raw.bump_daily_limit, DEFAULT_PROMOTION_CONFIG.bump_daily_limit, 1, 50)),
  bump_slot_every: Math.round(toNumber(raw.bump_slot_every, DEFAULT_PROMOTION_CONFIG.bump_slot_every, 2, 10)),
  bump_max_active: Math.round(toNumber(raw.bump_max_active, DEFAULT_PROMOTION_CONFIG.bump_max_active, 3, 1000)),
  bump_pack_enabled: raw.bump_pack_enabled === undefined ? DEFAULT_PROMOTION_CONFIG.bump_pack_enabled : raw.bump_pack_enabled === true,
  bump_pack_size: Math.round(toNumber(raw.bump_pack_size, DEFAULT_PROMOTION_CONFIG.bump_pack_size, 2, 50)),
  bump_pack_price: toPrice(raw.bump_pack_price, DEFAULT_PROMOTION_CONFIG.bump_pack_price),
  plan_feature_credits: normalizeCredits(raw.plan_feature_credits),
  plan_feature_days: Math.round(toNumber(raw.plan_feature_days, DEFAULT_PROMOTION_CONFIG.plan_feature_days, 1, 90)),
  listing_pass_enabled: raw.listing_pass_enabled === undefined ? DEFAULT_PROMOTION_CONFIG.listing_pass_enabled : raw.listing_pass_enabled === true,
  listing_pass_price: toPrice(raw.listing_pass_price, DEFAULT_PROMOTION_CONFIG.listing_pass_price),
  listing_pass_days: Math.round(toNumber(raw.listing_pass_days, DEFAULT_PROMOTION_CONFIG.listing_pass_days, 1, 365)),
  featured_artist_enabled: raw.featured_artist_enabled === undefined ? DEFAULT_PROMOTION_CONFIG.featured_artist_enabled : raw.featured_artist_enabled === true,
  featured_artist_price: toPrice(raw.featured_artist_price, DEFAULT_PROMOTION_CONFIG.featured_artist_price),
  featured_artist_weeks_ahead: Math.round(toNumber(raw.featured_artist_weeks_ahead, DEFAULT_PROMOTION_CONFIG.featured_artist_weeks_ahead, 1, 26)),
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
  // For a pack, `days` carries the number of bumps it adds
  if (type === 'bump_pack') {
    return config.bump_pack_enabled ? { type, days: config.bump_pack_size, price: config.bump_pack_price } : null;
  }
  if (type === 'listing_pass') {
    return config.listing_pass_enabled ? { type, days: config.listing_pass_days, price: config.listing_pass_price } : null;
  }
  if (type === 'feature') {
    const option = config.feature_options.find((o) => o.days === Number(days));
    return option ? { type, days: option.days, price: option.price } : null;
  }
  return null;
}

// Bumps this artist has made in the last 24 hours (paid or from pack credits), for the daily limit.
export async function bumpsInLastDay(userId, executor = pool) {
  const [rows] = await executor.execute(
    `SELECT COUNT(*) AS count FROM listing_promotions
     WHERE user_id = ? AND promotion_type = 'bump' AND created_at > now() - interval '24 hours'`,
    [userId]
  );
  return Number(rows[0]?.count || 0);
}

// Live listings currently benefiting from a bump (a bump counts for 7 days), across the whole site.
export async function countActiveBumps(executor = pool) {
  const [rows] = await executor.execute(
    `SELECT COUNT(*) AS count FROM listings
     WHERE status = 'active' AND bumped_at IS NOT NULL AND bumped_at > created_at AND bumped_at > now() - interval '7 days'`
  );
  return Number(rows[0]?.count || 0);
}

// Views each recent bump brought: the listing's views in the 7 days after the bump (so far), compared with what
// its usual daily views (the 7 days before) would have given over the same number of days.
export async function getBumpResults(userId, executor = pool) {
  const [rows] = await executor.execute(
    `SELECT lp.listing_id, l.title, lp.created_at,
       LEAST(7, GREATEST(1, CURRENT_DATE - lp.created_at::date + 1)) AS days_so_far,
       (SELECT COALESCE(SUM(views), 0) FROM listing_view_daily
          WHERE listing_id = lp.listing_id AND day >= lp.created_at::date AND day < lp.created_at::date + 7) AS views_during,
       (SELECT COALESCE(SUM(views), 0) FROM listing_view_daily
          WHERE listing_id = lp.listing_id AND day >= lp.created_at::date - 7 AND day < lp.created_at::date) AS views_before
     FROM listing_promotions lp JOIN listings l ON l.id = lp.listing_id
     WHERE lp.user_id = ? AND lp.promotion_type = 'bump' AND lp.created_at > now() - interval '30 days'
     ORDER BY lp.created_at DESC LIMIT 20`,
    [userId]
  );
  return rows.map((r) => {
    const daysSoFar = Number(r.days_so_far);
    const during = Number(r.views_during);
    const expected = (Number(r.views_before) / 7) * daysSoFar;
    return {
      listing_id: r.listing_id,
      title: r.title,
      bumped_at: new Date(r.created_at).toISOString(),
      days_so_far: daysSoFar,
      active: daysSoFar < 7 || Date.now() - new Date(r.created_at).getTime() < 7 * 86400000,
      views: during,
      usual_views: Math.round(expected),
      extra_views: Math.max(0, Math.round(during - expected)),
    };
  });
}

export async function getBumpCredits(userId, executor = pool) {
  const [rows] = await executor.execute('SELECT bump_credits FROM users WHERE id = ?', [userId]);
  return Number(rows[0]?.bump_credits || 0);
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
  } else if (type === 'bump_pack') {
    // Prepaid bumps: no listing involved, `days` is the number of bumps bought
    await executor.execute('UPDATE users SET bump_credits = bump_credits + ? WHERE id = ?', [days, userId]);
  } else if (type === 'listing_pass') {
    // Paying for a pass also puts the listing live (a sold listing stays sold).
    const [before] = await executor.execute('SELECT status FROM listings WHERE id = ?', [listingId]);
    await executor.execute(
      `UPDATE listings
       SET paid_until = GREATEST(COALESCE(paid_until, now()), now()) + make_interval(days => ?::int),
           status = CASE WHEN status = 'sold' THEN status ELSE 'active' END
       WHERE id = ?`,
      [days, listingId]
    );
    const wasLive = ['active', 'sold'].includes(before[0]?.status);
    if (!wasLive) {
      await executor.execute('UPDATE dashboard_stats SET active_listings = active_listings + 1 WHERE user_id = ?', [userId]);
    }
  } else {
    await executor.execute('UPDATE listings SET bumped_at = now() WHERE id = ?', [listingId]);
  }
  return { applied: true };
}

export async function getListingPromotionState(listingId) {
  const [rows] = await pool.execute('SELECT id, status, featured_until, bumped_at, paid_until FROM listings WHERE id = ?', [listingId]);
  return rows[0] || null;
}

// When a listing pass ends, the listing falls back on the artist's plan (or free-launch) slots. It stays live if
// a slot is free; otherwise it is deactivated and the artist is told how to renew. Runs with the daily subscription job.
export async function runListingPassExpirationJob() {
  const [expired] = await pool.execute(
    `SELECT id, user_id, title FROM listings
     WHERE status = 'active' AND paid_until IS NOT NULL AND paid_until <= now()
     ORDER BY user_id, paid_until`
  );
  const byUser = new Map();
  for (const listing of expired) {
    if (!byUser.has(listing.user_id)) byUser.set(listing.user_id, []);
    byUser.get(listing.user_id).push(listing);
  }

  let kept = 0;
  let deactivated = 0;
  for (const [userId, listings] of byUser) {
    const access = await getListingAccess(userId);
    // countPlanListings already includes these listings, since their passes have ended.
    const overflow = access.allowed ? Math.max(0, (await countPlanListings(userId)) - access.maxListings) : listings.length;
    const toDeactivate = listings.slice(0, Math.min(overflow, listings.length));
    const toKeep = listings.slice(toDeactivate.length);

    if (toKeep.length) {
      await pool.execute('UPDATE listings SET paid_until = NULL WHERE id = ANY(?::int[])', [toKeep.map((l) => l.id)]);
      kept += toKeep.length;
    }
    if (toDeactivate.length) {
      await pool.execute("UPDATE listings SET status = 'inactive' WHERE id = ANY(?::int[])", [toDeactivate.map((l) => l.id)]);
      await pool.execute(
        'UPDATE dashboard_stats SET active_listings = GREATEST(active_listings - ?, 0) WHERE user_id = ?',
        [toDeactivate.length, userId]
      );
      deactivated += toDeactivate.length;
      for (const listing of toDeactivate) {
        await logActivity({
          userId,
          action: 'listing_status_changed',
          entityType: 'listing',
          entityId: listing.id,
          details: { title: listing.title, from: 'active', to: 'inactive', reason: 'Listing pass ended' },
        });
        try {
          await createNotification({
            userId,
            type: 'listing',
            title: 'Listing pass ended',
            body: `"${listing.title}" is no longer live. Renew its pass or subscribe to activate it again.`,
            link: '/dashboard',
            referenceId: listing.id,
            severity: 'warning',
          });
        } catch (err) {
          console.warn('Could not create notification:', err.message);
        }
      }
    }
  }

  if (kept || deactivated) {
    console.log(`[Listing passes] ${kept} ended and kept live on plan slots, ${deactivated} deactivated`);
  }
  return { kept, deactivated };
}
