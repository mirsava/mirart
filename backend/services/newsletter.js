import pool from '../config/database.js';
import { sendEmailBatch, templates } from './emailService.js';
import { getCurrentFeaturedArtist, weekStartOf } from './featuredArtist.js';

const SITE_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const SETTING_KEY = 'newsletter_config';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// The weekly email goes out on Mondays from this hour (UTC) onward.
const SEND_HOUR_UTC = 14;

export class NewsletterError extends Error {}

// Off until an admin turns it on, so nobody gets email before the content is reviewed.
export async function getNewsletterConfig() {
  const [rows] = await pool.execute('SELECT setting_value FROM site_settings WHERE setting_key = ?', [SETTING_KEY]);
  const raw = rows[0]?.setting_value || {};
  return { enabled: raw.enabled === true, last_sent_week: raw.last_sent_week || null, last_sent_count: Number(raw.last_sent_count || 0) };
}

async function saveNewsletterConfig(patch) {
  const next = { ...(await getNewsletterConfig()), ...patch };
  await pool.execute(
    'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value',
    [SETTING_KEY, JSON.stringify(next)]
  );
  return next;
}

export const setNewsletterEnabled = (enabled) => saveNewsletterConfig({ enabled: enabled === true });

export async function subscribe(email, userId = null) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalized) || normalized.length > 255) throw new NewsletterError('Please enter a valid email address');
  await pool.execute(
    `INSERT INTO newsletter_subscribers (email, user_id) VALUES (?, ?)
     ON CONFLICT (email) DO UPDATE SET unsubscribed_at = NULL, user_id = COALESCE(newsletter_subscribers.user_id, EXCLUDED.user_id)`,
    [normalized, userId]
  );
}

export async function unsubscribe(token) {
  if (!/^[0-9a-f-]{36}$/i.test(String(token || ''))) return false;
  const [result] = await pool.execute(
    'UPDATE newsletter_subscribers SET unsubscribed_at = COALESCE(unsubscribed_at, now()) WHERE token = ?',
    [token]
  );
  return result.affectedRows > 0;
}

export async function unsubscribeEmail(email) {
  await pool.execute(
    'UPDATE newsletter_subscribers SET unsubscribed_at = COALESCE(unsubscribed_at, now()) WHERE lower(email) = lower(?)',
    [String(email || '')]
  );
}

export async function isSubscribed(email) {
  const [rows] = await pool.execute(
    'SELECT 1 FROM newsletter_subscribers WHERE lower(email) = lower(?) AND unsubscribed_at IS NULL',
    [String(email || '')]
  );
  return rows.length > 0;
}

export async function countSubscribers() {
  const [rows] = await pool.execute('SELECT COUNT(*) AS count FROM newsletter_subscribers WHERE unsubscribed_at IS NULL');
  return Number(rows[0]?.count || 0);
}

const imageUrl = (url) => (url && /^https?:\/\//.test(url) ? url : null);
const listingUrl = (id) => `${SITE_URL}/painting/${id}`;
const toCard = (l) => ({ title: l.title, url: listingUrl(l.id), image: imageUrl(l.primary_image_url), price: l.price, artist: l.artist_name });

// What goes in this week's email, or null when there is nothing worth sending.
export async function buildWeeklyDigest(now = new Date()) {
  const artist = await getCurrentFeaturedArtist(now);
  const [featured] = await pool.execute(
    `SELECT l.id, l.title, l.price, l.primary_image_url,
       COALESCE(u.business_name, CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')), u.username) AS artist_name
     FROM listings l JOIN users u ON u.id = l.user_id
     WHERE l.status = 'active' AND l.featured_until > now() AND COALESCE(u.blocked, FALSE) = FALSE
     ORDER BY l.featured_until DESC LIMIT 6`
  );
  const [fresh] = await pool.execute(
    `SELECT l.id, l.title, l.price, l.primary_image_url,
       COALESCE(u.business_name, CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')), u.username) AS artist_name
     FROM listings l JOIN users u ON u.id = l.user_id
     WHERE l.status = 'active' AND COALESCE(u.blocked, FALSE) = FALSE
       AND COALESCE(l.bumped_at, l.created_at) > now() - interval '7 days'
       AND (l.featured_until IS NULL OR l.featured_until <= now())
     ORDER BY COALESCE(l.bumped_at, l.created_at) DESC LIMIT 6`
  );
  if (!artist && !featured.length && !fresh.length) return null;
  return {
    featuredArtist: artist
      ? {
          name: artist.artist_name,
          bio: artist.bio || '',
          url: artist.username ? `${SITE_URL}/artist/${artist.username}` : null,
          listings: artist.listings.map((l) => toCard({ ...l, artist_name: artist.artist_name })),
        }
      : null,
    featuredListings: featured.map(toCard),
    newListings: fresh.map(toCard),
  };
}

const unsubscribeUrl = (token) => `${SITE_URL}/unsubscribe?token=${token}`;

const buildMessage = (digest, to, token) => ({
  to,
  subject: digest.featuredArtist ? `New art this week, featuring ${digest.featuredArtist.name}` : 'New art this week on ArtZyla',
  template: templates.weeklyDigest({ ...digest, galleryUrl: `${SITE_URL}/gallery`, unsubscribeUrl: unsubscribeUrl(token) }),
  headers: { 'List-Unsubscribe': `<${unsubscribeUrl(token)}>` },
});

// Sends one copy to `to` (an admin preview). The unsubscribe link in a test copy is a placeholder.
export async function sendTestNewsletter(to) {
  const digest = await buildWeeklyDigest();
  if (!digest) throw new NewsletterError('Nothing to send yet: no featured artist, featured listings or new listings this week');
  await sendEmailBatch([buildMessage(digest, to, '00000000-0000-0000-0000-000000000000')]);
}

// Hourly check: on Mondays after SEND_HOUR_UTC, send this week's email once (if enabled). `force` sends now,
// even if this week's email already went out; admins use it for "Send now".
export async function runWeeklyNewsletterJob({ force = false, now = new Date() } = {}) {
  const config = await getNewsletterConfig();
  const week = weekStartOf(now);
  if (!force) {
    if (!config.enabled || config.last_sent_week === week) return { skipped: 'not due' };
    if (now.getUTCDay() !== 1 || now.getUTCHours() < SEND_HOUR_UTC) return { skipped: 'not due' };
  }

  const digest = await buildWeeklyDigest(now);
  if (!digest) {
    await saveNewsletterConfig({ last_sent_week: week, last_sent_count: 0 });
    return { skipped: 'nothing new' };
  }
  const [subscribers] = await pool.execute('SELECT email, token FROM newsletter_subscribers WHERE unsubscribed_at IS NULL ORDER BY id');
  // Mark the week first, so a crash mid-send cannot cause a second full send on the next hourly run.
  await saveNewsletterConfig({ last_sent_week: week, last_sent_count: subscribers.length });
  const { sent } = await sendEmailBatch(subscribers.map((s) => buildMessage(digest, s.email, s.token)));
  console.log(`[Newsletter] Sent the weekly email to ${sent} subscriber(s)`);
  return { sent };
}
