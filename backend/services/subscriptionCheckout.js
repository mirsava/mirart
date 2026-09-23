import pool from '../config/database.js';
import { isUuid } from '../middleware/auth.js';

const stripeId = (value) => (typeof value === 'string' ? value : value?.id || null);

const loadSubscription = async (id) => {
  const [rows] = await pool.execute(
    `SELECT us.*, sp.name as plan_name, sp.tier, sp.max_listings
     FROM user_subscriptions us JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE us.id = ?`,
    [id]
  );
  return rows[0] || null;
};

// Records the plan a completed subscription Checkout Session paid for. Called by both the success page and the
// Stripe webhook, so it is idempotent: a session whose Stripe subscription is already recorded returns that row.
export async function activateSubscriptionFromSession(session) {
  const metadata = session.metadata || {};
  const authUserId = metadata.auth_user_id;
  const planId = parseInt(metadata.plan_id, 10);
  const billingPeriod = metadata.billing_period === 'yearly' ? 'yearly' : 'monthly';
  const transactionId = (stripeId(session.subscription) || stripeId(session.payment_intent) || session.id || '').slice(0, 255);

  if (!isUuid(authUserId)) return { error: 'User information is required', status: 400 };

  const [users] = await pool.execute('SELECT id FROM users WHERE auth_user_id = ?', [authUserId]);
  if (users.length === 0) {
    return { requiresUserCreation: true, subscriptionData: { plan_id: planId, billing_period: billingPeriod } };
  }
  const userId = users[0].id;

  const [existing] = await pool.execute(
    'SELECT id FROM user_subscriptions WHERE user_id = ? AND payment_intent_id = ? ORDER BY id DESC LIMIT 1',
    [userId, transactionId]
  );
  if (existing.length) return { subscription: await loadSubscription(existing[0].id), alreadyRecorded: true };

  const [plans] = await pool.execute('SELECT id FROM subscription_plans WHERE id = ? AND is_active = TRUE', [planId]);
  if (plans.length === 0) return { error: 'Subscription plan not found', status: 404 };

  const startDate = new Date();
  const endDate = new Date();
  if (billingPeriod === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
  else endDate.setFullYear(endDate.getFullYear() + 1);

  await pool.execute(`UPDATE user_subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'`, [userId]);
  const [result] = await pool.execute(
    `INSERT INTO user_subscriptions (user_id, plan_id, billing_period, start_date, end_date, auto_renew, payment_intent_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
    [userId, planId, billingPeriod, startDate, endDate, true, transactionId]
  );
  return { subscription: await loadSubscription(result.insertId) };
}
