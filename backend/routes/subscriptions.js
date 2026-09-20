import express from 'express';
import pool from '../config/database.js';
import { stripe } from '../config/stripe.js';
import { requireAdmin, requireSelf } from '../middleware/auth.js';
import { getBillingConfig, saveBillingConfig, describeAccess } from '../services/billing.js';

const router = express.Router();

// Test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Subscriptions router is working', path: req.path, url: req.url });
});

// Admin routes must come BEFORE public routes to avoid route matching conflicts
router.get('/admin/subscriptions', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, plan, search } = req.query;


    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let baseQuery = `
      SELECT us.*, sp.name as plan_name, sp.tier, sp.max_listings,
        u.email, u.auth_user_id,
        COALESCE(u.business_name, CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')), u.username) as user_name
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      JOIN users u ON us.user_id = u.id
      WHERE u.user_type != 'buyer'
    `;
    const params = [];
    const countParams = [];

    if (status && status !== 'all') {
      baseQuery += ' AND us.status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (plan) {
      baseQuery += ' AND sp.name = ?';
      params.push(plan);
      countParams.push(plan);
    }

    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      baseQuery += ' AND (u.email ILIKE ? OR u.username ILIKE ? OR u.first_name ILIKE ? OR u.last_name ILIKE ? OR u.business_name ILIKE ?)';
      params.push(term, term, term, term, term);
      countParams.push(term, term, term, term, term);
    }

    let countQuery = `
      SELECT COUNT(*) as total FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      JOIN users u ON us.user_id = u.id
      WHERE u.user_type != 'buyer'
    `;
    if (status && status !== 'all') countQuery += ' AND us.status = ?';
    if (plan) countQuery += ' AND sp.name = ?';
    if (search && String(search).trim()) countQuery += ' AND (u.email ILIKE ? OR u.username ILIKE ? OR u.first_name ILIKE ? OR u.last_name ILIKE ? OR u.business_name ILIKE ?)';

    const [countResult] = await pool.execute(countQuery, countParams);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limitNum);

    baseQuery += ' ORDER BY us.created_at DESC';
    baseQuery += ` LIMIT ${limitNum} OFFSET ${offset}`;

    const [subscriptions] = await pool.execute(baseQuery, params);

    const formatted = subscriptions.map(s => ({
      ...s,
      auto_renew: Boolean(s.auto_renew),
      max_listings: parseInt(s.max_listings),
    }));

    res.json({
      subscriptions: formatted,
      pagination: { page: pageNum, limit: limitNum, total, totalPages },
    });
  } catch (error) {
    console.error('Error fetching admin subscriptions:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/admin/subscriptions/:userId/cancel', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;


    const [users] = await pool.execute('SELECT auth_user_id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [subs] = await pool.execute(
      `SELECT id, payment_intent_id FROM user_subscriptions
       WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (subs.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const stripeSubId = subs[0].payment_intent_id ? String(subs[0].payment_intent_id).trim() : null;
    if (stripe && stripeSubId && stripeSubId.startsWith('sub_')) {
      try {
        await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true });
      } catch (stripeErr) {
        console.error('Stripe cancel failed:', stripeErr.message);
      }
    }

    await pool.execute(
      `UPDATE user_subscriptions SET auto_renew = FALSE WHERE user_id = ? AND status = 'active'`,
      [userId]
    );

    res.json({ message: 'Subscription cancelled. User retains access until end of billing period.' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/admin/subscriptions/:userId/resume', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;


    const [subs] = await pool.execute(
      `SELECT id, payment_intent_id FROM user_subscriptions
       WHERE user_id = ? AND status = 'active' AND end_date >= CURRENT_DATE ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (subs.length === 0) {
      return res.status(404).json({ error: 'No active subscription found to resume' });
    }

    const stripeSubId = subs[0].payment_intent_id ? String(subs[0].payment_intent_id).trim() : null;
    if (stripe && stripeSubId && stripeSubId.startsWith('sub_')) {
      try {
        await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: false });
      } catch (stripeErr) {
        console.error('Stripe resume failed:', stripeErr.message);
      }
    }

    await pool.execute(
      `UPDATE user_subscriptions SET auto_renew = TRUE WHERE user_id = ? AND status = 'active'`,
      [userId]
    );

    res.json({ message: 'Subscription resumed. Auto-renewal enabled.' });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/admin/subscriptions/:userId/expire', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;


    const [result] = await pool.execute(
      `UPDATE user_subscriptions SET status = 'expired'
       WHERE user_id = ? AND status = 'active'`,
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    res.json({ message: 'Subscription expired immediately.' });
  } catch (error) {
    console.error('Error expiring subscription:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/admin/subscriptions/:userId/extend', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { days } = req.body;


    const extendDays = Math.min(365, Math.max(1, parseInt(days) || 30));

    const [subs] = await pool.execute(
      `SELECT id, end_date FROM user_subscriptions
       WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (subs.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const currentEnd = new Date(subs[0].end_date);
    currentEnd.setDate(currentEnd.getDate() + extendDays);
    const newEndStr = currentEnd.toISOString().slice(0, 10);

    await pool.execute(
      `UPDATE user_subscriptions SET end_date = ? WHERE id = ?`,
      [newEndStr, subs[0].id]
    );

    res.json({ message: `Subscription extended by ${extendDays} days. New end date: ${newEndStr}` });
  } catch (error) {
    console.error('Error extending subscription:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Admin: billing switch (off = free launch access for everyone)
router.get('/admin/billing-config', requireAdmin, async (req, res) => {
  try {
    const config = await getBillingConfig();
    res.json({ config, status: describeAccess(config) });
  } catch (error) {
    console.error('Error fetching billing config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/admin/billing-config', requireAdmin, async (req, res) => {
  try {
    const { enabled, free_listing_limit, grace_days } = req.body || {};
    const patch = {};
    if (enabled !== undefined) patch.enabled = enabled === true;
    if (free_listing_limit !== undefined) patch.free_listing_limit = free_listing_limit;
    if (grace_days !== undefined) patch.grace_days = grace_days;
    const config = await saveBillingConfig(patch);
    res.json({ config, status: describeAccess(config) });
  } catch (error) {
    console.error('Error saving billing config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get all subscription plans
router.get('/admin/plans', requireAdmin, async (req, res) => {
  try {
    const [plans] = await pool.execute(
      'SELECT * FROM subscription_plans ORDER BY display_order ASC'
    );
    
    // Convert DECIMAL to number for JSON response
    const formattedPlans = plans.map(plan => ({
      ...plan,
      price_monthly: parseFloat(plan.price_monthly),
      price_yearly: parseFloat(plan.price_yearly),
      max_listings: parseInt(plan.max_listings),
      is_active: Boolean(plan.is_active),
      display_order: parseInt(plan.display_order),
    }));
    
    console.log('Returning plans:', formattedPlans.length);
    res.json(formattedPlans);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Whether billing is on and what an artist without a paid plan can do right now (public)
router.get('/billing-status', async (req, res) => {
  try {
    res.json(describeAccess(await getBillingConfig()));
  } catch (error) {
    console.error('Error fetching billing status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all subscription plans (public)
router.get('/plans', async (req, res) => {
  try {
    const [plans] = await pool.execute(
      'SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY display_order ASC'
    );
    res.json(plans);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get user's current subscription
router.get('/user/:authUserId', requireSelf(), async (req, res) => {
  try {
    const { authUserId } = req.params;

    const [users] = await pool.execute(
      'SELECT id, user_type, created_at FROM users WHERE auth_user_id = ?',
      [authUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;
    const userType = users[0].user_type;
    const userCreatedAt = users[0].created_at || new Date(0);

    if (userType === 'buyer') {
      return res.json({ subscription: null });
    }

    const [subscriptions] = await pool.execute(
      `SELECT us.*, sp.name as plan_name, sp.tier, sp.max_listings, sp.price_monthly, sp.price_yearly
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = ? AND us.status = 'active' AND us.end_date >= CURRENT_DATE AND us.created_at >= ?
       ORDER BY us.created_at DESC
       LIMIT 1`,
      [userId, userCreatedAt]
    );

    if (subscriptions.length === 0) {
      // With ?free_access=1 the dashboard gets a launch-access pseudo-subscription while billing is off or in grace
      if (req.query.free_access === '1') {
        const access = describeAccess(await getBillingConfig());
        if (access.free_access) {
          const [active] = await pool.execute(
            "SELECT COUNT(*) as count FROM listings WHERE user_id = ? AND status = 'active'",
            [userId]
          );
          return res.json({
            subscription: {
              id: 0,
              user_id: userId,
              plan_id: 0,
              billing_period: 'monthly',
              status: 'active',
              start_date: null,
              end_date: access.in_grace ? access.grace_ends_at : null,
              auto_renew: false,
              plan_name: 'Launch Access',
              tier: 'launch',
              max_listings: access.free_listing_limit,
              current_listings: active[0].count,
              listings_remaining: Math.max(0, access.free_listing_limit - active[0].count),
              price_monthly: 0,
              price_yearly: 0,
              is_free_access: true,
            },
          });
        }
      }
      return res.json({ subscription: null });
    }

    const subscription = subscriptions[0];

    const [activeListings] = await pool.execute(
      "SELECT COUNT(*) as count FROM listings WHERE user_id = ? AND status = 'active'",
      [userId]
    );

    res.json({
      subscription: {
        ...subscription,
        current_listings: activeListings[0].count,
        listings_remaining: Math.max(0, subscription.max_listings - activeListings[0].count),
      },
    });
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user subscription - REQUIRES valid Stripe checkout session (payment verification)
// Subscriptions can only be created after successful Stripe payment
router.post('/user/:authUserId', async (req, res) => {
  try {
    const { authUserId } = req.params;
    const { plan_id, billing_period, session_id, auto_renew = true } = req.body;

    if (!plan_id || !billing_period) {
      return res.status(400).json({ error: 'plan_id and billing_period are required' });
    }

    if (!session_id) {
      return res.status(400).json({
        error: 'Stripe payment required',
        message: 'Subscription requires payment. Please complete checkout via Stripe.',
      });
    }

    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    // Verify Stripe session - payment must be completed
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items'],
    });

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        error: 'Payment not completed',
        message: 'Please complete your payment before activating your subscription.',
      });
    }

    const metadata = session.metadata || {};
    if (metadata.is_subscription !== 'true' || !metadata.plan_id || !metadata.billing_period) {
      return res.status(400).json({
        error: 'Invalid session',
        message: 'This checkout session is not for a subscription. Please subscribe through the subscription plans page.',
      });
    }

    const sessionPlanId = parseInt(metadata.plan_id, 10);
    const sessionBillingPeriod = metadata.billing_period;
    if (sessionPlanId !== parseInt(plan_id, 10) || sessionBillingPeriod !== billing_period) {
      return res.status(400).json({
        error: 'Session mismatch',
        message: 'Checkout session does not match the requested plan.',
      });
    }

    if (metadata.auth_user_id && metadata.auth_user_id !== authUserId) {
      return res.status(403).json({
        error: 'User mismatch',
        message: 'This payment was made by a different user.',
      });
    }

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE auth_user_id = ?',
      [authUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;

    const [plans] = await pool.execute(
      'SELECT * FROM subscription_plans WHERE id = ? AND is_active = TRUE',
      [plan_id]
    );

    if (plans.length === 0) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    const getStripeId = (val) => {
      if (!val) return null;
      if (typeof val === 'string') return val;
      return val?.id || null;
    };
    const transactionId = (getStripeId(session.subscription) || getStripeId(session.payment_intent) || session.id || '').slice(0, 255);

    const startDate = new Date();
    const endDate = new Date();
    if (billing_period === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    await pool.execute(
      `UPDATE user_subscriptions 
       SET status = 'expired' 
       WHERE user_id = ? AND status = 'active'`,
      [userId]
    );

    const [result] = await pool.execute(
      `INSERT INTO user_subscriptions 
       (user_id, plan_id, billing_period, start_date, end_date, auto_renew, payment_intent_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [userId, plan_id, billing_period, startDate, endDate, auto_renew, transactionId]
    );

    const [newSubscription] = await pool.execute(
      `SELECT us.*, sp.name as plan_name, sp.tier, sp.max_listings
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.id = ?`,
      [result.insertId]
    );

    res.json({ subscription: newSubscription[0] });
  } catch (error) {
    console.error('Error creating subscription:', error);
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Invalid Stripe session', message: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel user subscription
router.put('/user/:authUserId/cancel', requireSelf(), async (req, res) => {
  try {
    const { authUserId } = req.params;

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE auth_user_id = ?',
      [authUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;

    // Get current subscription to find Stripe subscription ID
    const [subs] = await pool.execute(
      `SELECT id, payment_intent_id FROM user_subscriptions 
       WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    const stripeSubId = subs.length > 0 && subs[0].payment_intent_id
      ? String(subs[0].payment_intent_id).trim()
      : null;

    // Cancel at period end in Stripe if we have a subscription ID (sub_xxx)
    if (stripe && stripeSubId && stripeSubId.startsWith('sub_')) {
      try {
        await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true });
      } catch (stripeErr) {
        console.error('Stripe cancel_at_period_end failed (continuing with DB update):', stripeErr.message);
        // Still update our DB so user sees cancelled; Stripe may need manual handling
      }
    }

    // Only stop auto-renewal in our DB; user keeps access until end_date
    await pool.execute(
      `UPDATE user_subscriptions 
       SET auto_renew = FALSE
       WHERE user_id = ? AND status = 'active'`,
      [userId]
    );

    res.json({ message: 'Subscription cancelled. You will retain access until the end of your billing period.' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Undo cancellation / resume subscription
router.put('/user/:authUserId/resume', requireSelf(), async (req, res) => {
  try {
    const { authUserId } = req.params;

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE auth_user_id = ?',
      [authUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;

    const [subs] = await pool.execute(
      `SELECT id, payment_intent_id FROM user_subscriptions 
       WHERE user_id = ? AND status = 'active' AND end_date >= CURRENT_DATE ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (subs.length === 0) {
      return res.status(404).json({ error: 'No active subscription found to resume' });
    }

    const stripeSubId = subs[0].payment_intent_id
      ? String(subs[0].payment_intent_id).trim()
      : null;

    if (stripe && stripeSubId && stripeSubId.startsWith('sub_')) {
      try {
        await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: false });
      } catch (stripeErr) {
        console.error('Stripe resume failed (continuing with DB update):', stripeErr.message);
      }
    }

    await pool.execute(
      `UPDATE user_subscriptions 
       SET auto_renew = TRUE
       WHERE user_id = ? AND status = 'active'`,
      [userId]
    );

    res.json({ message: 'Subscription resumed. Your subscription will renew automatically at the end of your billing period.' });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/stripe-plans', requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

    const products = await stripe.products.list({ active: true, limit: 100, expand: ['data.default_price'] });
    const subscriptionProducts = products.data.filter(p => p.metadata?.active_listing_limit);

    const plans = [];
    for (const product of subscriptionProducts) {
      const prices = await stripe.prices.list({ product: product.id, active: true, limit: 20 });
      const monthlyPrice = prices.data.find(p => p.recurring?.interval === 'month');
      const yearlyPrice = prices.data.find(p => p.recurring?.interval === 'year');

      plans.push({
        stripe_product_id: product.id,
        name: product.name,
        description: product.description || '',
        active_listing_limit: product.metadata.active_listing_limit,
        features: product.marketing_features?.map(f => f.name).join('\n') || '',
        price_monthly: monthlyPrice ? monthlyPrice.unit_amount / 100 : 0,
        price_monthly_id: monthlyPrice?.id || null,
        price_yearly: yearlyPrice ? yearlyPrice.unit_amount / 100 : 0,
        price_yearly_id: yearlyPrice?.id || null,
        metadata: product.metadata,
      });
    }

    plans.sort((a, b) => {
      const aLimit = a.active_listing_limit === 'unlimited' ? 999999 : parseInt(a.active_listing_limit) || 0;
      const bLimit = b.active_listing_limit === 'unlimited' ? 999999 : parseInt(b.active_listing_limit) || 0;
      return aLimit - bLimit;
    });

    res.json({ plans });
  } catch (error) {
    console.error('Error fetching Stripe plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans from Stripe' });
  }
});

router.post('/admin/sync-stripe-plans', requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

    const products = await stripe.products.list({ active: true, limit: 100 });
    const subscriptionProducts = products.data.filter(p => p.metadata?.active_listing_limit);

    let synced = 0;
    for (const product of subscriptionProducts) {
      const prices = await stripe.prices.list({ product: product.id, active: true, limit: 20 });
      const monthlyPrice = prices.data.find(p => p.recurring?.interval === 'month');
      const yearlyPrice = prices.data.find(p => p.recurring?.interval === 'year');
      const limit = product.metadata.active_listing_limit;
      const maxListings = limit === 'unlimited' ? 999999 : parseInt(limit) || 5;

      const desc = product.description || '';
      const [existing] = await pool.execute('SELECT id FROM subscription_plans WHERE stripe_product_id = ?', [product.id]);
      if (existing.length > 0) {
        await pool.execute(
          `UPDATE subscription_plans SET name = ?, description = ?, max_listings = ?, price_monthly = ?, price_yearly = ?, features = ?, is_active = TRUE WHERE stripe_product_id = ?`,
          [product.name, desc, maxListings, monthlyPrice ? monthlyPrice.unit_amount / 100 : 0, yearlyPrice ? yearlyPrice.unit_amount / 100 : 0, product.marketing_features?.map(f => f.name).join('\n') || '', product.id]
        );
      } else {
        const tier = product.name.toLowerCase().replace(/\s+/g, '_');
        await pool.execute(
          `INSERT INTO subscription_plans (name, description, tier, max_listings, price_monthly, price_yearly, features, is_active, display_order, stripe_product_id) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)`,
          [product.name, desc, tier, maxListings, monthlyPrice ? monthlyPrice.unit_amount / 100 : 0, yearlyPrice ? yearlyPrice.unit_amount / 100 : 0, product.marketing_features?.map(f => f.name).join('\n') || '', synced + 1, product.id]
        );
      }
      synced++;
    }

    res.json({ success: true, synced, message: `${synced} plan(s) synced from Stripe` });
  } catch (error) {
    console.error('Error syncing Stripe plans:', error);
    res.status(500).json({ error: 'Failed to sync plans from Stripe' });
  }
});

router.put('/admin/stripe-plans/:productId/prices', requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

    const { productId } = req.params;
    const { price_monthly, price_yearly } = req.body;

    if (price_monthly !== undefined && price_monthly > 0) {
      const existingPrices = await stripe.prices.list({ product: productId, active: true, limit: 20 });
      const oldMonthly = existingPrices.data.find(p => p.recurring?.interval === 'month');
      
      const newMonthlyPrice = await stripe.prices.create({
        product: productId,
        unit_amount: Math.round(price_monthly * 100),
        currency: 'usd',
        recurring: { interval: 'month' },
      });
      
      if (oldMonthly) await stripe.prices.update(oldMonthly.id, { active: false });
      
      await stripe.products.update(productId, { default_price: newMonthlyPrice.id });
    }

    if (price_yearly !== undefined && price_yearly > 0) {
      const existingPrices = await stripe.prices.list({ product: productId, active: true, limit: 20 });
      const oldYearly = existingPrices.data.find(p => p.recurring?.interval === 'year');
      
      const newYearlyPrice = await stripe.prices.create({
        product: productId,
        unit_amount: Math.round(price_yearly * 100),
        currency: 'usd',
        recurring: { interval: 'year' },
      });
      
      if (oldYearly) await stripe.prices.update(oldYearly.id, { active: false });
    }

    await pool.execute(
      'UPDATE subscription_plans SET price_monthly = ?, price_yearly = ? WHERE stripe_product_id = ?',
      [price_monthly || 0, price_yearly || 0, productId]
    );

    res.json({ success: true, message: 'Prices updated in Stripe and database' });
  } catch (error) {
    console.error('Error updating Stripe prices:', error);
    res.status(500).json({ error: 'Failed to update prices' });
  }
});

// Admin: Create or update subscription plan
router.post('/admin/plans', requireAdmin, async (req, res) => {
  try {
    const { id, name, description, tier, max_listings, price_monthly, price_yearly, features, is_active, display_order } = req.body;


    if (!name || !tier || !max_listings || price_monthly === undefined || price_yearly === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (id) {
      await pool.execute(
        `UPDATE subscription_plans 
         SET name = ?, description = ?, tier = ?, max_listings = ?, price_monthly = ?, price_yearly = ?, 
             features = ?, is_active = ?, display_order = ?
         WHERE id = ?`,
        [name, description || null, tier, max_listings, price_monthly, price_yearly, features || null, is_active !== false, display_order || 0, id]
      );
      res.json({ message: 'Plan updated successfully', id });
    } else {
      const [result] = await pool.execute(
        `INSERT INTO subscription_plans 
         (name, description, tier, max_listings, price_monthly, price_yearly, features, is_active, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, description || null, tier, max_listings, price_monthly, price_yearly, features || null, is_active !== false, display_order || 0]
      );
      res.json({ message: 'Plan created successfully', id: result.insertId });
    }
  } catch (error) {
    console.error('Error saving subscription plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Delete subscription plan
router.delete('/admin/plans/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;


    await pool.execute('DELETE FROM subscription_plans WHERE id = ?', [id]);
    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug: Log registered routes when module loads
console.log('=== SUBSCRIPTIONS ROUTER LOADED ===');
console.log('Router stack length:', router.stack.length);
router.stack.forEach((layer, index) => {
  if (layer.route) {
    const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
    console.log(`  Route ${index + 1}: ${methods} ${layer.route.path}`);
  } else if (layer.name === 'router') {
    console.log(`  Nested router ${index + 1}: ${layer.regexp}`);
  }
});

export default router;
