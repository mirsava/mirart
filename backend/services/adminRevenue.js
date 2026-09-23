import pool from '../config/database.js';
import { weekStartOf, addWeeks } from './featuredArtist.js';

const num = (v) => (v == null ? 0 : parseFloat(v));
const displayName = (alias) =>
  `COALESCE(${alias}.business_name, NULLIF(TRIM(CONCAT(COALESCE(${alias}.first_name, ''), ' ', COALESCE(${alias}.last_name, ''))), ''), ${alias}.username, ${alias}.email)`;

// Every purchase as one row: { at, type, description, amount, source, user_id }. Subscriptions count their first
// charge at the plan price (the user_subscriptions row) plus renewals the webhook recorded.
export const PAYMENTS_SQL = `
  SELECT lp.created_at AS at, lp.promotion_type AS type,
    CASE lp.promotion_type
      WHEN 'feature' THEN 'Featured listing' || COALESCE(' (' || lp.days || ' days)', '')
      WHEN 'bump' THEN 'Bumped listing'
      ELSE 'Listing pass' || COALESCE(' (' || lp.days || ' days)', '')
    END || COALESCE(': ' || l.title, '') AS description,
    lp.amount, lp.source, lp.user_id
  FROM listing_promotions lp LEFT JOIN listings l ON l.id = lp.listing_id
  UNION ALL
  SELECT b.created_at, 'featured_artist', 'Featured artist: week of ' || to_char(b.week_start, 'YYYY-MM-DD'), b.amount, b.source, b.user_id
  FROM featured_artist_bookings b
  UNION ALL
  SELECT us.created_at, 'subscription', 'Subscription: ' || sp.name || ' (' || us.billing_period || ')',
    CASE WHEN us.billing_period = 'yearly' THEN sp.price_yearly ELSE sp.price_monthly END, 'stripe', us.user_id
  FROM user_subscriptions us JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.payment_intent_id IS NOT NULL
  UNION ALL
  SELECT p.paid_at, 'subscription', 'Subscription renewal', p.amount, 'stripe', p.user_id
  FROM subscription_payments p
  UNION ALL
  SELECT o.created_at, 'order_fee', 'Order fee: ' || o.order_number, o.platform_fee, 'stripe', o.buyer_id
  FROM orders o WHERE o.status IN ('paid', 'shipped', 'delivered')
`;

export const PAYMENT_TYPES = ['subscription', 'feature', 'bump', 'listing_pass', 'featured_artist', 'order_fee'];

export async function getAdminOverview(now = new Date()) {
  const [[byType], [monthly], [growth], [attention], [upcoming]] = await Promise.all([
    pool.execute(
      `SELECT type,
         COALESCE(SUM(amount) FILTER (WHERE at >= date_trunc('month', now())), 0) AS this_month,
         COALESCE(SUM(amount) FILTER (WHERE at > now() - interval '30 days'), 0) AS last_30d,
         COALESCE(SUM(amount), 0) AS all_time,
         COUNT(*) AS purchases
       FROM (${PAYMENTS_SQL}) p WHERE source = 'stripe'
       GROUP BY type`
    ),
    pool.execute(
      `SELECT to_char(date_trunc('month', at), 'YYYY-MM') AS month, type, COALESCE(SUM(amount), 0) AS amount
       FROM (${PAYMENTS_SQL}) p
       WHERE source = 'stripe' AND at >= date_trunc('month', now()) - interval '11 months'
       GROUP BY 1, 2 ORDER BY 1`
    ),
    pool.execute(
      `SELECT
         (SELECT COUNT(*) FROM users) AS users_total,
         (SELECT COUNT(*) FROM users WHERE created_at > now() - interval '7 days') AS users_7d,
         (SELECT COUNT(*) FROM users WHERE created_at > now() - interval '30 days') AS users_30d,
         (SELECT COUNT(*) FROM users WHERE user_type = 'artist') AS artists,
         (SELECT COUNT(*) FROM users WHERE user_type = 'buyer') AS buyers,
         (SELECT COUNT(*) FROM listings WHERE status = 'active') AS listings_active,
         (SELECT COUNT(*) FROM listings WHERE created_at > now() - interval '7 days') AS listings_7d,
         (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active' AND end_date >= CURRENT_DATE) AS subscriptions_active,
         (SELECT COUNT(*) FROM newsletter_subscribers WHERE unsubscribed_at IS NULL) AS newsletter_subscribers,
         (SELECT COUNT(*) FROM messages WHERE created_at > now() - interval '7 days') AS messages_7d`
    ),
    pool.execute(
      `SELECT
         (SELECT COUNT(DISTINCT user_id) FROM support_chat_messages WHERE sender = 'user' AND read_at IS NULL AND user_id IS NOT NULL) AS unread_support,
         (SELECT COUNT(*) FROM listings WHERE status = 'active' AND paid_until > now() AND paid_until <= now() + interval '7 days') AS passes_ending,
         (SELECT COUNT(*) FROM listings WHERE status = 'active' AND featured_until > now() AND featured_until <= now() + interval '7 days') AS features_ending,
         (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active' AND auto_renew = FALSE AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 14) AS subscriptions_ending,
         (SELECT COUNT(*) FROM orders WHERE status = 'paid') AS orders_to_ship`
    ),
    pool.execute(
      `SELECT b.week_start, b.source, u.id AS user_id, ${displayName('u')} AS artist_name
       FROM featured_artist_bookings b JOIN users u ON u.id = b.user_id
       WHERE b.week_start >= ?::date ORDER BY b.week_start LIMIT 8`,
      [weekStartOf(now)]
    ),
  ]);

  const revenue = { this_month: 0, last_30d: 0, all_time: 0, by_type: {} };
  for (const row of byType) {
    revenue.this_month += num(row.this_month);
    revenue.last_30d += num(row.last_30d);
    revenue.all_time += num(row.all_time);
    revenue.by_type[row.type] = {
      this_month: num(row.this_month),
      last_30d: num(row.last_30d),
      all_time: num(row.all_time),
      purchases: Number(row.purchases),
    };
  }

  // Last 12 months, oldest first, with every month present so the chart has no gaps.
  const months = [];
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  for (let i = 0; i < 12; i++) {
    months.push({ month: cursor.toISOString().slice(0, 7), total: 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const byMonth = new Map(months.map((m) => [m.month, m]));
  for (const row of monthly) {
    const m = byMonth.get(row.month);
    if (!m) continue;
    m[row.type] = num(row.amount);
    m.total += num(row.amount);
  }

  const g = growth[0] || {};
  const a = attention[0] || {};
  return {
    revenue,
    monthly: months,
    growth: Object.fromEntries(Object.entries(g).map(([k, v]) => [k, Number(v || 0)])),
    attention: Object.fromEntries(Object.entries(a).map(([k, v]) => [k, Number(v || 0)])),
    upcoming_featured: upcoming.map((r) => ({
      week_start: r.week_start instanceof Date ? r.week_start.toISOString().slice(0, 10) : String(r.week_start).slice(0, 10),
      artist_name: r.artist_name,
      user_id: r.user_id,
      source: r.source,
    })),
  };
}

export async function listPayments({ type, search, page = 1, limit = 25 }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const where = [];
  const params = [];
  if (type && PAYMENT_TYPES.includes(type)) {
    where.push('p.type = ?');
    params.push(type);
  }
  if (search && String(search).trim()) {
    const term = `%${String(search).trim()}%`;
    where.push(`(p.description ILIKE ? OR u.email ILIKE ? OR ${displayName('u')} ILIKE ?)`);
    params.push(term, term, term);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const base = `FROM (${PAYMENTS_SQL}) p LEFT JOIN users u ON u.id = p.user_id ${whereSql}`;

  const [[totals], [rows]] = await Promise.all([
    pool.execute(`SELECT COUNT(*) AS count, COALESCE(SUM(p.amount) FILTER (WHERE p.source = 'stripe'), 0) AS paid_total ${base}`, params),
    pool.execute(
      `SELECT p.at, p.type, p.description, p.amount, p.source, p.user_id, u.email AS user_email, ${displayName('u')} AS user_name
       ${base} ORDER BY p.at DESC LIMIT ${limitNum} OFFSET ${(pageNum - 1) * limitNum}`,
      params
    ),
  ]);
  const total = Number(totals[0]?.count || 0);
  return {
    payments: rows.map((r) => ({ ...r, amount: num(r.amount), at: r.at ? new Date(r.at).toISOString() : null })),
    paid_total: num(totals[0]?.paid_total),
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.max(1, Math.ceil(total / limitNum)) },
  };
}

// Featured artist weeks from 4 weeks ago to `weeksAhead` ahead, with who holds each.
export async function getFeaturedArtistCalendar(weeksAhead, now = new Date()) {
  const current = weekStartOf(now);
  const first = addWeeks(current, -4);
  const weeks = Array.from({ length: 4 + weeksAhead }, (_, i) => addWeeks(first, i));
  const [rows] = await pool.execute(
    `SELECT b.week_start, b.amount, b.source, u.id AS user_id, u.email, ${displayName('u')} AS artist_name
     FROM featured_artist_bookings b JOIN users u ON u.id = b.user_id
     WHERE b.week_start BETWEEN ?::date AND ?::date`,
    [weeks[0], weeks[weeks.length - 1]]
  );
  const byWeek = new Map(
    rows.map((r) => [r.week_start instanceof Date ? r.week_start.toISOString().slice(0, 10) : String(r.week_start).slice(0, 10), r])
  );
  return weeks.map((week_start) => {
    const b = byWeek.get(week_start);
    return {
      week_start,
      status: week_start < current ? 'past' : week_start === current ? 'current' : 'upcoming',
      booking: b ? { user_id: b.user_id, artist_name: b.artist_name, email: b.email, amount: num(b.amount), source: b.source } : null,
    };
  });
}
