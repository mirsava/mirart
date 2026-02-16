import pool from '../config/database.js';

/**
 * Expires subscriptions that have passed their end_date and deactivates
 * all active listings for those users.
 */
export async function runSubscriptionExpirationJob() {
  try {
    const [expiredSubs] = await pool.execute(
      `SELECT us.id, us.user_id 
       FROM user_subscriptions us 
       WHERE us.end_date < CURDATE() 
         AND us.status IN ('active', 'cancelled')
       ORDER BY us.id`
    );

    if (expiredSubs.length === 0) {
      return { expired: 0, listingsDeactivated: 0 };
    }

    const userIds = [...new Set(expiredSubs.map((s) => s.user_id))];

    await pool.execute(
      `UPDATE user_subscriptions 
       SET status = 'expired' 
       WHERE end_date < CURDATE() AND status IN ('active', 'cancelled')`
    );

    let totalDeactivated = 0;
    for (const userId of userIds) {
      const [result] = await pool.execute(
        `UPDATE listings 
         SET status = 'inactive' 
         WHERE user_id = ? AND status = 'active'`,
        [userId]
      );
      totalDeactivated += result.affectedRows || 0;
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
