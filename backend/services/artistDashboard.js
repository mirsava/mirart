import pool from '../config/database.js';
import { getListingAccess, countPlanListings } from './billing.js';
import { getPromotionConfig, getFeatureCredits } from './promotions.js';
import { weekStartOf } from './featuredArtist.js';
import { PAYMENTS_SQL } from './adminRevenue.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const n = (v) => Number(v || 0);
const iso = (v) => (v ? new Date(v).toISOString() : null);
const dateKey = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

// Starter and "no plan" get the basic analytics; Professional, Enterprise and free-launch access get everything.
export async function getAnalyticsTier(userId) {
  const access = await getListingAccess(userId);
  if (access.subscription) {
    const [plans] = await pool.execute('SELECT tier FROM subscription_plans WHERE id = ?', [access.subscription.plan_id]);
    return plans[0]?.tier === 'starter' ? 'basic' : 'full';
  }
  return access.source === 'free' ? 'full' : 'basic';
}

// Landing tab: this week vs last week, what needs doing, and how complete the profile is.
export async function getArtistOverview(userId) {
  const [[week], [todo], [profile], [nextFeatured], [endingSoon]] = await Promise.all([
    pool.execute(
      `SELECT
         (SELECT COALESCE(SUM(d.views), 0) FROM listing_view_daily d JOIN listings l ON l.id = d.listing_id
            WHERE l.user_id = ? AND d.day > CURRENT_DATE - 7) AS views_this,
         (SELECT COALESCE(SUM(d.views), 0) FROM listing_view_daily d JOIN listings l ON l.id = d.listing_id
            WHERE l.user_id = ? AND d.day <= CURRENT_DATE - 7 AND d.day > CURRENT_DATE - 14) AS views_last,
         (SELECT COUNT(*) FROM likes k JOIN listings l ON l.id = k.listing_id
            WHERE l.user_id = ? AND k.created_at > now() - interval '7 days') AS likes_this,
         (SELECT COUNT(*) FROM likes k JOIN listings l ON l.id = k.listing_id
            WHERE l.user_id = ? AND k.created_at <= now() - interval '7 days' AND k.created_at > now() - interval '14 days') AS likes_last,
         (SELECT COUNT(*) FROM messages WHERE recipient_id = ? AND created_at > now() - interval '7 days') AS messages_this,
         (SELECT COUNT(*) FROM messages WHERE recipient_id = ? AND created_at <= now() - interval '7 days' AND created_at > now() - interval '14 days') AS messages_last`,
      [userId, userId, userId, userId, userId, userId]
    ),
    pool.execute(
      `SELECT
         (SELECT COUNT(*) FROM messages WHERE recipient_id = ? AND status = 'sent') AS unread_messages,
         (SELECT COUNT(*) FROM listings WHERE user_id = ? AND status = 'draft') AS drafts,
         (SELECT COUNT(*) FROM listings WHERE user_id = ? AND status = 'active') AS active_listings`,
      [userId, userId, userId]
    ),
    pool.execute(
      `SELECT profile_image_url, bio, username, website, social_instagram, social_tiktok, social_behance, social_youtube
       FROM users WHERE id = ?`,
      [userId]
    ),
    pool.execute(
      'SELECT week_start FROM featured_artist_bookings WHERE user_id = ? AND week_start >= ?::date ORDER BY week_start LIMIT 1',
      [userId, weekStartOf()]
    ),
    pool.execute(
      `SELECT id, title,
         CASE WHEN paid_until > now() AND paid_until <= now() + interval '7 days' THEN paid_until END AS pass_ends,
         CASE WHEN featured_until > now() AND featured_until <= now() + interval '7 days' THEN featured_until END AS feature_ends
       FROM listings
       WHERE user_id = ? AND status = 'active'
         AND ((paid_until > now() AND paid_until <= now() + interval '7 days')
           OR (featured_until > now() AND featured_until <= now() + interval '7 days'))
       ORDER BY LEAST(COALESCE(paid_until, 'infinity'), COALESCE(featured_until, 'infinity')) LIMIT 5`,
      [userId]
    ),
  ]);

  const w = week[0] || {};
  const t = todo[0] || {};
  const p = profile[0] || {};
  const config = await getPromotionConfig();
  const credits = await getFeatureCredits(userId, config);
  const pair = (thisWeek, lastWeek) => ({ this_week: n(thisWeek), last_week: n(lastWeek) });

  const checklist = [
    { key: 'photo', label: 'Add a profile photo', done: Boolean(p.profile_image_url) },
    { key: 'bio', label: 'Write a bio (a few sentences about you and your work)', done: String(p.bio || '').trim().length >= 40 },
    { key: 'username', label: 'Choose a username for your public profile link', done: Boolean(p.username) },
    { key: 'links', label: 'Link your website or social media', done: Boolean(p.website || p.social_instagram || p.social_tiktok || p.social_behance || p.social_youtube) },
    { key: 'listings', label: 'Have at least 3 live listings', done: n(t.active_listings) >= 3 },
  ];

  return {
    week: {
      views: pair(w.views_this, w.views_last),
      likes: pair(w.likes_this, w.likes_last),
      messages: pair(w.messages_this, w.messages_last),
    },
    todo: {
      unread_messages: n(t.unread_messages),
      drafts: n(t.drafts),
      ending_soon: endingSoon.map((l) => ({ id: l.id, title: l.title, pass_ends: iso(l.pass_ends), feature_ends: iso(l.feature_ends) })),
      next_featured_week: nextFeatured[0] ? dateKey(nextFeatured[0].week_start) : null,
      feature_credits_left: credits.remaining,
    },
    active_listings: n(t.active_listings),
    username: p.username || null,
    checklist,
  };
}

// Analytics built on views, likes and messages. `days` is the range for the chart and per-listing numbers.
export async function getArtistEngagement(userId, days = 30) {
  const range = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;
  const tier = await getAnalyticsTier(userId);

  const [[daily], [totals], [listings]] = await Promise.all([
    pool.execute(
      `SELECT d.day, SUM(d.views) AS views FROM listing_view_daily d JOIN listings l ON l.id = d.listing_id
       WHERE l.user_id = ? AND d.day > CURRENT_DATE - ?::int GROUP BY d.day`,
      [userId, range]
    ),
    pool.execute(
      `SELECT
         (SELECT COUNT(*) FROM likes k JOIN listings l ON l.id = k.listing_id WHERE l.user_id = ? AND k.created_at > now() - make_interval(days => ?::int)) AS likes,
         (SELECT COUNT(*) FROM messages WHERE recipient_id = ? AND created_at > now() - make_interval(days => ?::int)) AS messages`,
      [userId, range, userId, range]
    ),
    tier === 'full'
      ? pool.execute(
          `SELECT l.id, l.title, l.status, l.views AS views_total, l.primary_image_url,
             (l.featured_until IS NOT NULL AND l.featured_until > now()) AS is_featured,
             (SELECT COALESCE(SUM(views), 0) FROM listing_view_daily WHERE listing_id = l.id AND day > CURRENT_DATE - ?::int) AS views,
             (SELECT COUNT(*) FROM likes WHERE listing_id = l.id AND created_at > now() - make_interval(days => ?::int)) AS likes,
             (SELECT COUNT(*) FROM likes WHERE listing_id = l.id) AS likes_total,
             (SELECT COUNT(*) FROM messages WHERE listing_id = l.id AND recipient_id = l.user_id AND created_at > now() - make_interval(days => ?::int)) AS messages
           FROM listings l WHERE l.user_id = ? AND l.status IN ('active', 'sold', 'inactive')
           ORDER BY views DESC, l.views DESC LIMIT 50`,
          [range, range, range, userId]
        )
      : Promise.resolve([[]]),
  ]);

  // Every day in the range, oldest first, so the chart has no gaps
  const byDay = new Map(daily.map((r) => [dateKey(r.day), n(r.views)]));
  const series = [];
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  for (let i = range - 1; i >= 0; i--) {
    const day = new Date(today.getTime() - i * DAY_MS).toISOString().slice(0, 10);
    series.push({ day, views: byDay.get(day) || 0 });
  }
  const views = series.reduce((sum, d) => sum + d.views, 0);
  const summary = { views, likes: n(totals[0]?.likes), messages: n(totals[0]?.messages) };
  const result = { tier, days: range, summary, series };
  if (tier === 'basic') return result;

  return {
    ...result,
    message_rate: views ? summary.messages / views : 0,
    listings: listings.map((l) => ({
      id: l.id,
      title: l.title,
      status: l.status,
      primary_image_url: l.primary_image_url,
      is_featured: Boolean(l.is_featured),
      views: n(l.views),
      views_total: n(l.views_total),
      likes: n(l.likes),
      likes_total: n(l.likes_total),
      messages: n(l.messages),
    })),
    promotions: await getPromotionImpact(userId),
  };
}

// For recent features and bumps: average daily views in the 7 days before vs. while it ran
// (features) or in the 7 days after (bumps). Only views recorded since daily tracking began count.
async function getPromotionImpact(userId) {
  const [promos] = await pool.execute(
    `SELECT lp.listing_id, lp.promotion_type, lp.days, lp.created_at, l.title
     FROM listing_promotions lp JOIN listings l ON l.id = lp.listing_id
     WHERE lp.user_id = ? AND lp.promotion_type IN ('feature', 'bump') AND lp.created_at > now() - interval '120 days'
     ORDER BY lp.created_at DESC LIMIT 10`,
    [userId]
  );
  if (!promos.length) return [];
  const ids = [...new Set(promos.map((p) => p.listing_id))];
  const [rows] = await pool.execute(
    `SELECT listing_id, day, views FROM listing_view_daily WHERE listing_id = ANY(?::int[]) AND day > CURRENT_DATE - 140`,
    [ids]
  );
  const views = new Map(rows.map((r) => [`${r.listing_id}:${dateKey(r.day)}`, n(r.views)]));
  const average = (listingId, from, to) => {
    let total = 0;
    let count = 0;
    for (let t = from.getTime(); t < to.getTime(); t += DAY_MS) {
      total += views.get(`${listingId}:${new Date(t).toISOString().slice(0, 10)}`) || 0;
      count += 1;
    }
    return count ? total / count : 0;
  };
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  return promos.map((p) => {
    const start = new Date(new Date(p.created_at).toISOString().slice(0, 10) + 'T00:00:00Z');
    const length = p.promotion_type === 'feature' ? n(p.days) || 7 : 7;
    const end = new Date(Math.min(start.getTime() + length * DAY_MS, today.getTime() + DAY_MS));
    const before = average(p.listing_id, new Date(start.getTime() - 7 * DAY_MS), start);
    const during = end > start ? average(p.listing_id, start, end) : 0;
    return {
      listing_id: p.listing_id,
      title: p.title,
      type: p.promotion_type,
      started_at: iso(p.created_at),
      avg_views_before: Math.round(before * 10) / 10,
      avg_views_during: Math.round(during * 10) / 10,
    };
  });
}

// Plan & billing tab: slot usage, included features, passes, featured bookings and payment history.
export async function getArtistPlan(userId) {
  const config = await getPromotionConfig();
  const [access, used, credits, [passes], [featured], [bookings], [payments]] = await Promise.all([
    getListingAccess(userId),
    countPlanListings(userId),
    getFeatureCredits(userId, config),
    pool.execute(
      `SELECT id, title, status, paid_until FROM listings WHERE user_id = ? AND paid_until > now() ORDER BY paid_until`,
      [userId]
    ),
    pool.execute(
      `SELECT id, title, featured_until FROM listings WHERE user_id = ? AND featured_until > now() ORDER BY featured_until`,
      [userId]
    ),
    pool.execute(
      `SELECT week_start, amount, source FROM featured_artist_bookings WHERE user_id = ? AND week_start >= ?::date ORDER BY week_start`,
      [userId, weekStartOf()]
    ),
    pool.execute(
      `SELECT at, type, description, amount, source FROM (${PAYMENTS_SQL}) p
       WHERE user_id = ? AND type <> 'order_fee' ORDER BY at DESC LIMIT 50`,
      [userId]
    ),
  ]);
  const sub = access.subscription;
  let planName = null;
  if (sub) {
    const [plans] = await pool.execute('SELECT name, tier FROM subscription_plans WHERE id = ?', [sub.plan_id]);
    planName = plans[0]?.name || null;
    sub.tier = plans[0]?.tier;
  }
  return {
    plan: sub
      ? { name: planName, tier: sub.tier, billing_period: sub.billing_period, end_date: dateKey(sub.end_date), auto_renew: Boolean(sub.auto_renew) }
      : null,
    access_source: access.source,
    slots: { used, max: access.maxListings },
    credits,
    listing_pass: { enabled: config.listing_pass_enabled, price: config.listing_pass_price, days: config.listing_pass_days },
    passes: passes.map((l) => ({ id: l.id, title: l.title, status: l.status, paid_until: iso(l.paid_until) })),
    featured_listings: featured.map((l) => ({ id: l.id, title: l.title, featured_until: iso(l.featured_until) })),
    featured_weeks: bookings.map((b) => ({ week_start: dateKey(b.week_start), amount: parseFloat(b.amount), source: b.source })),
    payments: payments.map((p) => ({ at: iso(p.at), type: p.type, description: p.description, amount: parseFloat(p.amount), source: p.source })),
  };
}
