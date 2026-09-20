import pool from '../config/database.js';
import { getBillingConfig, describeAccess } from './billing.js';

/**
 * Expires subscriptions that have passed their end_date. Artists lose their active
 * listings only once free access has ended (billing on and the grace period over).
 */
export async function runSubscriptionExpirationJob() {
  try {
    const freeAccess = describeAccess(await getBillingConfig()).free_access;

    const [expiredSubs] = await pool.execute(
      `SELECT us.id, us.user_id
       FROM user_subscriptions us
       WHERE us.end_date < CURRENT_DATE
         AND us.status IN ('active', 'cancelled')
       ORDER BY us.id`
    );

    if (expiredSubs.length > 0) {
      await pool.execute(
        `UPDATE user_subscriptions
         SET status = 'expired'
         WHERE end_date < CURRENT_DATE AND status IN ('active', 'cancelled')`
      );
    }

    let totalDeactivated = 0;
    if (!freeAccess) {
      // Billing is on and the grace period is over: artists without a live subscription cannot keep listings active.
      const [result] = await pool.execute(
        `UPDATE listings
         SET status = 'inactive'
         WHERE status = 'active'
           AND user_id IN (SELECT id FROM users WHERE user_type = 'artist')
           AND NOT EXISTS (
             SELECT 1 FROM user_subscriptions us
             WHERE us.user_id = listings.user_id AND us.status = 'active' AND us.end_date >= CURRENT_DATE
           )`
      );
      totalDeactivated = result.affectedRows || 0;
    }

    if (expiredSubs.length > 0 || totalDeactivated > 0) {
      console.log(
        `[Subscription expiration] Expired ${expiredSubs.length} subscription(s), deactivated ${totalDeactivated} listing(s)`
      );
    }

    return { expired: expiredSubs.length, listingsDeactivated: totalDeactivated };
  } catch (error) {
    console.error('[Subscription expiration] Job failed:', error.message);
    throw error;
  }
}
