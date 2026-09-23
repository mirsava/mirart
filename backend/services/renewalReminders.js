import pool from '../config/database.js';
import { createNotification } from './notificationService.js';
import { sendEmail, templates } from './emailService.js';

const SITE_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const DAY_MS = 24 * 60 * 60 * 1000;

// Which reminder is due for something ending at expiresAt: '1d' inside the last day, '7d' inside the last week.
export function reminderStage(expiresAt, now = new Date()) {
  const left = new Date(expiresAt).getTime() - now.getTime();
  if (left <= 0 || left > 7 * DAY_MS) return null;
  return left <= DAY_MS ? '1d' : '7d';
}

// Emails (and notifies) artists whose listing pass or featured spot ends within a week, then again within a day.
// Each reminder is recorded, so running this every hour sends each one once. Extending re-arms the reminders.
export async function runRenewalReminderJob(now = new Date()) {
  const [rows] = await pool.execute(
    `SELECT l.id, l.title, l.user_id, l.paid_until, l.featured_until, u.email, u.email_notifications,
       COALESCE(NULLIF(u.first_name, ''), u.business_name, u.username) AS user_name
     FROM listings l JOIN users u ON u.id = l.user_id
     WHERE l.status = 'active' AND COALESCE(u.blocked, FALSE) = FALSE
       AND ((l.paid_until > now() AND l.paid_until <= now() + interval '7 days')
         OR (l.featured_until > now() AND l.featured_until <= now() + interval '7 days'))`
  );

  let sent = 0;
  for (const listing of rows) {
    for (const [kind, expiresAt] of [['listing_pass', listing.paid_until], ['feature', listing.featured_until]]) {
      const stage = expiresAt ? reminderStage(expiresAt, now) : null;
      if (!stage) continue;
      const [insert] = await pool.execute(
        `INSERT INTO listing_reminders (listing_id, kind, expires_at, stage) VALUES (?, ?, ?, ?)
         ON CONFLICT ON CONSTRAINT unique_listing_reminder DO NOTHING`,
        [listing.id, kind, expiresAt, stage]
      );
      if (!insert.affectedRows) continue;

      const renewUrl = `${SITE_URL}/dashboard?promote=${listing.id}`;
      const what = kind === 'listing_pass' ? 'listing pass' : 'featured spot';
      try {
        await createNotification({
          userId: listing.user_id,
          type: 'promotion',
          title: `Your ${what} ends ${stage === '1d' ? 'tomorrow' : 'this week'}`,
          body: `"${listing.title}": renew it from your dashboard to keep it ${kind === 'listing_pass' ? 'live' : 'featured'}.`,
          link: `/dashboard?promote=${listing.id}`,
          referenceId: listing.id,
          severity: 'warning',
        });
      } catch (err) {
        console.warn('Could not create reminder notification:', err.message);
      }
      if (listing.email && listing.email_notifications !== false) {
        try {
          await sendEmail({
            to: listing.email,
            subject: `Your ${what} for "${listing.title}" ends ${stage === '1d' ? 'tomorrow' : 'soon'}`,
            template: templates.renewalReminder({ userName: listing.user_name, listingTitle: listing.title, kind, expiresAt, renewUrl }),
          });
        } catch (err) {
          console.warn(`Could not email renewal reminder for listing ${listing.id}:`, err.message);
        }
      }
      sent += 1;
    }
  }
  if (sent) console.log(`[Renewal reminders] Sent ${sent} reminder(s)`);
  return { sent };
}
