import pool from '../config/database.js';
import { createNotification } from './notificationService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_WEEKS_TO_SEARCH = 52;

// Weeks run Monday to Sunday (UTC). Returns the Monday as YYYY-MM-DD.
export function weekStartOf(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - daysSinceMonday * DAY_MS).toISOString().slice(0, 10);
}

export const addWeeks = (weekStart, weeks) =>
  new Date(new Date(`${weekStart}T00:00:00Z`).getTime() + weeks * 7 * DAY_MS).toISOString().slice(0, 10);

const toDateString = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10));

// The bookable weeks, starting with the current one, with who holds each.
export async function listFeaturedArtistWeeks(config, userId = null, now = new Date()) {
  const first = weekStartOf(now);
  const weeks = Array.from({ length: config.featured_artist_weeks_ahead }, (_, i) => addWeeks(first, i));
  const [rows] = await pool.execute(
    'SELECT week_start, user_id FROM featured_artist_bookings WHERE week_start >= ?::date AND week_start <= ?::date',
    [weeks[0], weeks[weeks.length - 1]]
  );
  const holders = new Map(rows.map((r) => [toDateString(r.week_start), r.user_id]));
  return weeks.map((week_start) => ({
    week_start,
    taken: holders.has(week_start),
    mine: userId != null && holders.get(week_start) === userId,
  }));
}

// This week's featured artist with a few of their live listings, or null when the slot is empty.
export async function getCurrentFeaturedArtist(now = new Date()) {
  const [rows] = await pool.execute(
    `SELECT b.week_start, u.id, u.auth_user_id, u.username, u.profile_image_url, u.bio, u.country,
       (SELECT COUNT(*) FROM listings WHERE user_id = u.id AND status = 'active') AS listing_count,
       COALESCE(u.business_name, CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')), u.username) AS artist_name
     FROM featured_artist_bookings b JOIN users u ON u.id = b.user_id
     WHERE b.week_start = ?::date AND COALESCE(u.blocked, FALSE) = FALSE AND COALESCE(u.active, TRUE) = TRUE`,
    [weekStartOf(now)]
  );
  const artist = rows[0];
  if (!artist) return null;
  const [listings] = await pool.execute(
    `SELECT id, title, price, primary_image_url, category
     FROM listings WHERE user_id = ? AND status = 'active'
     ORDER BY (featured_until IS NOT NULL AND featured_until > now()) DESC, COALESCE(bumped_at, created_at) DESC
     LIMIT 4`,
    [artist.id]
  );
  return {
    ...artist,
    week_start: toDateString(artist.week_start),
    week_end: addWeeks(toDateString(artist.week_start), 1),
    listing_count: Number(artist.listing_count || 0),
    listings: listings.map((l) => ({ ...l, price: l.price != null ? parseFloat(l.price) : null })),
  };
}

// Records a paid booking. If someone else paid for the same week first, the booking moves to the next free
// week and the artist is told. Idempotent per Stripe session, so the webhook and success page can both call it.
export async function applyFeaturedArtistBooking(session) {
  const metadata = session.metadata || {};
  const userId = parseInt(metadata.user_id, 10);
  const requested = metadata.week_start;
  const amount = (session.amount_total ?? 0) / 100;

  const findBySession = async () => {
    const [rows] = await pool.execute('SELECT week_start FROM featured_artist_bookings WHERE stripe_session_id = ?', [session.id]);
    return rows[0] ? toDateString(rows[0].week_start) : null;
  };

  const already = await findBySession();
  if (already) return { applied: false, week_start: already };

  // Never book a week that has already ended.
  let week = requested < weekStartOf() ? weekStartOf() : requested;
  for (let i = 0; i < MAX_WEEKS_TO_SEARCH; i++, week = addWeeks(week, 1)) {
    const [insert] = await pool.execute(
      `INSERT INTO featured_artist_bookings (user_id, week_start, amount, source, stripe_session_id)
       VALUES (?, ?::date, ?, 'stripe', ?)
       ON CONFLICT DO NOTHING`,
      [userId, week, amount, session.id]
    );
    if (insert.affectedRows) {
      if (week !== requested) {
        try {
          await createNotification({
            userId,
            type: 'promotion',
            title: 'Featured artist week moved',
            body: `The week you picked was booked moments before your payment went through, so you are featured the week of ${week} instead.`,
            link: '/dashboard',
            severity: 'warning',
          });
        } catch (err) {
          console.warn('Could not create notification:', err.message);
        }
      }
      return { applied: true, week_start: week, moved: week !== requested };
    }
    // The conflict may be this same session, recorded by a concurrent call.
    const recorded = await findBySession();
    if (recorded) return { applied: false, week_start: recorded };
  }
  throw new Error(`No free featured artist week found for session ${session.id}`);
}
