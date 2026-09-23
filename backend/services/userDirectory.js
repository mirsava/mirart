import pool from '../config/database.js';
import { PAYMENTS_SQL } from './adminRevenue.js';

const SORTS = {
  newest: 'u.created_at DESC',
  active: 'au.last_sign_in_at DESC NULLS LAST, u.created_at DESC',
  listings: 'listings_total DESC, u.created_at DESC',
  spend: 'paid_total DESC, u.created_at DESC',
  name: 'display_name ASC',
};

const DISPLAY_NAME = `COALESCE(u.business_name, NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.username, u.email)`;

function buildFilters({ search, type, status, plan }) {
  const where = [];
  const params = [];
  if (search && String(search).trim()) {
    const term = `%${String(search).trim()}%`;
    where.push('(u.email ILIKE ? OR u.username ILIKE ? OR u.first_name ILIKE ? OR u.last_name ILIKE ? OR u.business_name ILIKE ?)');
    params.push(term, term, term, term, term);
  }
  if (['artist', 'buyer', 'admin'].includes(type)) {
    where.push('u.user_type = ?');
    params.push(type);
  }
  if (status === 'blocked') where.push('COALESCE(u.blocked, FALSE) = TRUE');
  if (status === 'inactive') where.push('COALESCE(u.blocked, FALSE) = FALSE AND u.active = FALSE');
  if (status === 'active') where.push('COALESCE(u.blocked, FALSE) = FALSE AND COALESCE(u.active, TRUE) = TRUE');
  if (plan === 'none') where.push('sub.plan_name IS NULL');
  else if (plan === 'any') where.push('sub.plan_name IS NOT NULL');
  else if (plan) {
    where.push('sub.plan_name = ?');
    params.push(String(plan));
  }
  return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

// Only the columns the admin table needs (no addresses, phone numbers or payout ids).
const BASE_SQL = `
  FROM users u
  LEFT JOIN auth.users au ON au.id = u.auth_user_id
  LEFT JOIN LATERAL (
    SELECT sp.name AS plan_name, us.billing_period, us.end_date, us.auto_renew
    FROM user_subscriptions us JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = u.id AND us.status = 'active' AND us.end_date >= CURRENT_DATE
    ORDER BY us.created_at DESC LIMIT 1
  ) sub ON TRUE
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'active') AS active
    FROM listings GROUP BY user_id
  ) lc ON lc.user_id = u.id
  LEFT JOIN (
    SELECT user_id, SUM(amount) AS total FROM (${PAYMENTS_SQL}) p WHERE source = 'stripe' GROUP BY user_id
  ) pay ON pay.user_id = u.id
`;

const SELECT_SQL = `
  SELECT u.id, u.auth_user_id, u.username, u.email, u.first_name, u.last_name, u.business_name, u.user_type,
    COALESCE(u.active, TRUE) AS active, COALESCE(u.blocked, FALSE) AS blocked, u.profile_image_url, u.created_at,
    au.last_sign_in_at, ${DISPLAY_NAME} AS display_name,
    sub.plan_name, sub.billing_period, sub.end_date AS plan_end_date, sub.auto_renew AS plan_auto_renew,
    COALESCE(lc.total, 0) AS listings_total, COALESCE(lc.active, 0) AS listings_active,
    COALESCE(pay.total, 0) AS paid_total
`;

const shapeRow = (r) => ({
  ...r,
  listings_total: Number(r.listings_total),
  listings_active: Number(r.listings_active),
  paid_total: parseFloat(r.paid_total || 0),
  active: r.active !== false,
  blocked: Boolean(r.blocked),
});

export async function getUserDirectory({ search, type, status, plan, sort = 'newest', page = 1, limit = 25 }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const { whereSql, params } = buildFilters({ search, type, status, plan });
  const orderBy = SORTS[sort] || SORTS.newest;

  const [[countRows], [rows], [summary]] = await Promise.all([
    pool.execute(`SELECT COUNT(*) AS total ${BASE_SQL} ${whereSql}`, params),
    pool.execute(`${SELECT_SQL} ${BASE_SQL} ${whereSql} ORDER BY ${orderBy} LIMIT ${limitNum} OFFSET ${(pageNum - 1) * limitNum}`, params),
    pool.execute(
      `SELECT COUNT(*) AS all_users,
         COUNT(*) FILTER (WHERE user_type = 'artist') AS artists,
         COUNT(*) FILTER (WHERE user_type = 'buyer') AS buyers,
         COUNT(*) FILTER (WHERE user_type = 'admin') AS admins,
         COUNT(*) FILTER (WHERE COALESCE(blocked, FALSE) = TRUE) AS blocked
       FROM users`
    ),
  ]);
  const total = Number(countRows[0]?.total || 0);
  return {
    users: rows.map(shapeRow),
    counts: Object.fromEntries(Object.entries(summary[0] || {}).map(([k, v]) => [k, Number(v || 0)])),
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.max(1, Math.ceil(total / limitNum)) },
  };
}

const csvCell = (value) => {
  if (value == null) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  // Quote everything that could break a row; neutralise leading formula characters for spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) || safe !== text ? `"${safe.replace(/"/g, '""')}"` : safe;
};

// Same filters and sort as the table, without paging (capped at 10,000 rows).
export async function exportUserDirectoryCsv(filters) {
  const { whereSql, params } = buildFilters(filters);
  const orderBy = SORTS[filters.sort] || SORTS.newest;
  const [rows] = await pool.execute(`${SELECT_SQL} ${BASE_SQL} ${whereSql} ORDER BY ${orderBy} LIMIT 10000`, params);
  const header = ['id', 'name', 'email', 'username', 'type', 'status', 'plan', 'billing', 'listings_active', 'listings_total', 'paid_total', 'last_sign_in', 'joined'];
  const lines = rows.map(shapeRow).map((u) => [
    u.id,
    u.display_name,
    u.email,
    u.username,
    u.user_type,
    u.blocked ? 'blocked' : u.active ? 'active' : 'inactive',
    u.plan_name,
    u.billing_period,
    u.listings_active,
    u.listings_total,
    u.paid_total.toFixed(2),
    u.last_sign_in_at,
    u.created_at,
  ].map(csvCell).join(','));
  return [header.join(','), ...lines].join('\r\n');
}
