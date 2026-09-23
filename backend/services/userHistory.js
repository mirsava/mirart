import pool from '../config/database.js';

const num = (v) => (v == null ? 0 : parseFloat(v));
const iso = (v) => (v ? new Date(v).toISOString() : null);

const ACTION_LABELS = {
  listing_created: 'Created listing',
  listing_activated: 'Activated listing',
  listing_edited: 'Edited listing',
  listing_status_changed: 'Changed listing status',
  listing_deleted: 'Deleted listing',
  user_type_changed: 'Account type changed',
  user_activated: 'Account activated',
  user_deactivated: 'Account deactivated',
  user_blocked: 'Account blocked',
  user_unblocked: 'Account unblocked',
  user_deleted: 'Account deleted',
  subscription_cancelled: 'Subscription cancelled',
  subscription_resumed: 'Subscription resumed',
  subscription_expired: 'Subscription expired',
  subscription_extended: 'Subscription extended',
  featured_artist_assigned: 'Given a featured artist week',
  featured_artist_removed: 'Featured artist week removed',
};

const PROMOTION_LABELS = { feature: 'Featured a listing', bump: 'Bumped a listing', listing_pass: 'Bought a listing pass' };

function describeActivity(row) {
  const d = row.details || {};
  const parts = [];
  if (d.title) parts.push(`"${d.title}"`);
  if (d.from || d.to) parts.push(`${d.from ?? '?'} → ${d.to ?? '?'}`);
  if (d.fields?.length) parts.push(`fields: ${d.fields.join(', ')}`);
  if (d.days) parts.push(`+${d.days} days`);
  if (d.week_start) parts.push(`week of ${d.week_start}`);
  if (d.reason) parts.push(d.reason);
  if (d.email) parts.push(d.email);
  return parts.join(' · ') || null;
}

// Everything the admin "User details" panel shows: profile, stats, payments, listings and one merged timeline.
export async function getUserHistory(userId) {
  const [users] = await pool.execute(
    `SELECT id, auth_user_id, username, email, first_name, last_name, business_name, user_type, active, blocked,
       country, bio, profile_image_url, created_at
     FROM users WHERE id = ?`,
    [userId]
  );
  const user = users[0];
  if (!user) return null;

  let lastSignIn = null;
  try {
    const [auth] = await pool.execute('SELECT last_sign_in_at FROM auth.users WHERE id = ?', [user.auth_user_id]);
    lastSignIn = auth[0]?.last_sign_in_at || null;
  } catch {
    // auth schema not readable in this environment
  }

  const [
    [listings],
    [subscriptions],
    [promotions],
    [bookings],
    [activity],
    [messageCounts],
    [recentMessages],
    [reminders],
    [newsletter],
  ] = await Promise.all([
    pool.execute(
      `SELECT id, title, status, category, price, views, created_at, featured_until, paid_until, primary_image_url
       FROM listings WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    ),
    pool.execute(
      `SELECT us.id, sp.name AS plan_name, us.billing_period, us.status, us.start_date, us.end_date, us.auto_renew,
         us.created_at, sp.price_monthly, sp.price_yearly
       FROM user_subscriptions us JOIN subscription_plans sp ON sp.id = us.plan_id
       WHERE us.user_id = ? ORDER BY us.created_at DESC`,
      [userId]
    ),
    pool.execute(
      `SELECT lp.id, lp.listing_id, lp.promotion_type, lp.days, lp.amount, lp.source, lp.created_at, l.title
       FROM listing_promotions lp LEFT JOIN listings l ON l.id = lp.listing_id
       WHERE lp.user_id = ? ORDER BY lp.created_at DESC`,
      [userId]
    ),
    pool.execute(
      'SELECT id, week_start, amount, source, created_at FROM featured_artist_bookings WHERE user_id = ? ORDER BY week_start DESC',
      [userId]
    ),
    pool.execute(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.created_at, a.actor_id,
         COALESCE(au.business_name, NULLIF(TRIM(CONCAT(COALESCE(au.first_name, ''), ' ', COALESCE(au.last_name, ''))), ''), au.username, au.email) AS actor_name,
         au.user_type AS actor_type
       FROM activity_log a LEFT JOIN users au ON au.id = a.actor_id
       WHERE a.user_id = ? ORDER BY a.created_at DESC LIMIT 300`,
      [userId]
    ),
    pool.execute(
      `SELECT
         (SELECT COUNT(*) FROM messages WHERE sender_id = ?) AS sent,
         (SELECT COUNT(*) FROM messages WHERE recipient_id = ?) AS received,
         (SELECT COUNT(*) FROM support_chat_messages WHERE user_id = ? AND sender = 'user') AS support`,
      [userId, userId, userId]
    ),
    pool.execute(
      `SELECT m.id, m.subject, m.created_at, m.sender_id, l.title AS listing_title
       FROM messages m LEFT JOIN listings l ON l.id = m.listing_id
       WHERE m.sender_id = ? OR m.recipient_id = ? ORDER BY m.created_at DESC LIMIT 50`,
      [userId, userId]
    ),
    pool.execute(
      `SELECT r.kind, r.stage, r.sent_at, l.title
       FROM listing_reminders r JOIN listings l ON l.id = r.listing_id
       WHERE l.user_id = ? ORDER BY r.sent_at DESC LIMIT 50`,
      [userId]
    ),
    pool.execute(
      'SELECT subscribed_at, unsubscribed_at FROM newsletter_subscribers WHERE user_id = ? OR lower(email) = lower(?) LIMIT 1',
      [userId, user.email]
    ),
  ]);

  const planPrice = (s) => num(s.billing_period === 'yearly' ? s.price_yearly : s.price_monthly);

  const payments = [
    ...promotions.map((p) => ({
      at: iso(p.created_at),
      description: `${PROMOTION_LABELS[p.promotion_type] || p.promotion_type}${p.days ? ` (${p.days} days)` : ''}: ${p.title ? `"${p.title}"` : 'a listing that was later deleted'}`,
      amount: num(p.amount),
      source: p.source,
    })),
    ...bookings.map((b) => ({
      at: iso(b.created_at),
      description: `Featured artist: week of ${iso(b.week_start)?.slice(0, 10)}`,
      amount: num(b.amount),
      source: b.source,
    })),
    ...subscriptions.map((s) => ({
      at: iso(s.created_at),
      description: `Subscription: ${s.plan_name} (${s.billing_period})`,
      amount: planPrice(s),
      source: 'subscription',
    })),
  ].sort((a, b) => (b.at || '').localeCompare(a.at || ''));

  const existingListingIds = new Set(listings.map((l) => l.id));
  const timeline = [
    { at: iso(user.created_at), type: 'account', title: 'Joined ArtZyla', detail: `as ${user.user_type}` },
    ...(lastSignIn ? [{ at: iso(lastSignIn), type: 'account', title: 'Last signed in' }] : []),
    ...listings.map((l) => ({ at: iso(l.created_at), type: 'listing', title: 'Created listing', detail: `"${l.title}" · now ${l.status}` })),
    ...subscriptions.map((s) => ({
      at: iso(s.created_at),
      type: 'subscription',
      title: `Subscribed to ${s.plan_name}`,
      detail: `${s.billing_period} · ${s.status}${s.auto_renew ? '' : ' · not renewing'} · ends ${iso(s.end_date)?.slice(0, 10)}`,
    })),
    ...promotions.map((p) => ({
      at: iso(p.created_at),
      type: 'payment',
      title: PROMOTION_LABELS[p.promotion_type] || p.promotion_type,
      detail: `${p.title ? `"${p.title}"` : 'deleted listing'}${p.days ? ` · ${p.days} days` : ''} · ${p.source === 'stripe' ? `$${num(p.amount).toFixed(2)}` : p.source === 'plan' ? 'included with plan' : 'free (admin)'}`,
    })),
    ...bookings.map((b) => ({
      at: iso(b.created_at),
      type: 'payment',
      title: 'Booked featured artist week',
      detail: `week of ${iso(b.week_start)?.slice(0, 10)} · $${num(b.amount).toFixed(2)}`,
    })),
    ...recentMessages.map((m) => ({
      at: iso(m.created_at),
      type: 'message',
      title: m.sender_id === Number(userId) ? 'Sent a message' : 'Received a message',
      detail: `${m.subject}${m.listing_title ? ` · about "${m.listing_title}"` : ''}`,
    })),
    ...reminders.map((r) => ({
      at: iso(r.sent_at),
      type: 'notice',
      title: `Sent ${r.stage === '1d' ? '1-day' : '7-day'} renewal reminder`,
      detail: `${r.kind === 'listing_pass' ? 'listing pass' : 'featured spot'} · "${r.title}"`,
    })),
    ...(newsletter[0]
      ? [
          { at: iso(newsletter[0].subscribed_at), type: 'notice', title: 'Subscribed to the weekly email' },
          ...(newsletter[0].unsubscribed_at ? [{ at: iso(newsletter[0].unsubscribed_at), type: 'notice', title: 'Unsubscribed from the weekly email' }] : []),
        ]
      : []),
    // Logged events. Creation of listings that still exist is already covered above.
    ...activity
      .filter((a) => !(a.action === 'listing_created' && existingListingIds.has(a.entity_id)))
      .map((a) => ({
        at: iso(a.created_at),
        type: a.entity_type === 'listing' ? 'listing' : a.action.startsWith('subscription') ? 'subscription' : 'account',
        title: ACTION_LABELS[a.action] || a.action,
        detail: describeActivity(a),
        actor: a.actor_id == null ? 'System' : a.actor_id === Number(userId) ? null : `${a.actor_name || `User #${a.actor_id}`}${a.actor_type === 'admin' ? ' (admin)' : ''}`,
      })),
  ]
    .filter((e) => e.at)
    .sort((a, b) => b.at.localeCompare(a.at));

  const oneTime = payments.filter((p) => p.source === 'stripe');
  return {
    user: { ...user, active: user.active !== false, blocked: Boolean(user.blocked), last_sign_in_at: iso(lastSignIn) },
    stats: {
      listings_total: listings.length,
      listings_active: listings.filter((l) => l.status === 'active').length,
      total_views: listings.reduce((sum, l) => sum + (l.views || 0), 0),
      one_time_spent: oneTime.reduce((sum, p) => sum + p.amount, 0),
      subscriptions_count: subscriptions.length,
      messages_sent: Number(messageCounts[0]?.sent || 0),
      messages_received: Number(messageCounts[0]?.received || 0),
      support_messages: Number(messageCounts[0]?.support || 0),
      newsletter: newsletter[0] ? (newsletter[0].unsubscribed_at ? 'unsubscribed' : 'subscribed') : 'no',
    },
    current_subscription: subscriptions.find((s) => s.status === 'active' && new Date(s.end_date) >= new Date(new Date().toDateString())) || null,
    payments,
    listings: listings.map((l) => ({ ...l, price: l.price != null ? num(l.price) : null })),
    timeline,
    history_logged_since: activity.length ? iso(activity[activity.length - 1].created_at) : null,
  };
}
