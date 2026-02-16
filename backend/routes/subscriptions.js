import express from 'express';
import pool from '../config/database.js';
import { stripe } from '../config/stripe.js';

const router = express.Router();

// Test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Subscriptions router is working', path: req.path, url: req.url });
});

// Admin routes must come BEFORE public routes to avoid route matching conflicts
// Admin: Get all subscription plans
router.get('/admin/plans', async (req, res) => {
  console.log('=== ADMIN PLANS ROUTE HIT ===');
  console.log('Request method:', req.method);
  console.log('Request path:', req.path);
  console.log('Request URL:', req.url);
  console.log('Request originalUrl:', req.originalUrl);
  console.log('Request query:', req.query);
  console.log('Router mounted at:', req.baseUrl);
  
  try {
    const { cognitoUsername, groups } = req.query;
    
    console.log('Admin subscription plans request received:', {
      cognitoUsername,
      groups,
      query: req.query,
      url: req.url,
      path: req.path
    });

    if (!cognitoUsername) {
      console.log('Missing cognitoUsername in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    let userGroups = [];
    if (groups) {
      try {
        if (typeof groups === 'string') {
          userGroups = JSON.parse(groups);
        } else if (Array.isArray(groups)) {
          userGroups = groups;
        } else {
          userGroups = [groups];
        }
      } catch (parseError) {
        console.error('Error parsing groups:', parseError);
        userGroups = Array.isArray(groups) ? groups : [groups];
      }
    }

    console.log('Parsed userGroups:', userGroups);

    const isAdmin = userGroups.includes('site_admin') || userGroups.includes('admin');

    if (!isAdmin) {
      console.log('User is not admin. Groups:', userGroups);
      return res.status(403).json({ error: 'Admin access required', receivedGroups: userGroups });
    }

    // Check if table exists, if not return empty array
    try {
      await pool.execute('SELECT 1 FROM subscription_plans LIMIT 1');
    } catch (tableError) {
      if (tableError.code === 'ER_NO_SUCH_TABLE') {
        console.warn('subscription_plans table does not exist. Please run the migration.');
        return res.json([]);
      }
      throw tableError;
    }

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

// Get all subscription plans (public)
router.get('/plans', async (req, res) => {
  try {
    // Check if table exists, if not return empty array
    try {
      await pool.execute('SELECT 1 FROM subscription_plans LIMIT 1');
    } catch (tableError) {
      if (tableError.code === 'ER_NO_SUCH_TABLE') {
        console.warn('subscription_plans table does not exist. Please run the migration.');
        return res.json([]);
      }
      throw tableError;
    }

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
router.get('/user/:cognitoUsername', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;

    const [subscriptions] = await pool.execute(
      `SELECT us.*, sp.name as plan_name, sp.tier, sp.max_listings, sp.price_monthly, sp.price_yearly
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = ? AND us.status = 'active' AND us.end_date >= CURDATE()
       ORDER BY us.created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (subscriptions.length === 0) {
      return res.json({ subscription: null });
    }

    const subscription = subscriptions[0];

    const [activeListings] = await pool.execute(
      'SELECT COUNT(*) as count FROM listings WHERE user_id = ? AND status = "active"',
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
router.post('/user/:cognitoUsername', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;
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

    if (metadata.cognito_username && metadata.cognito_username !== cognitoUsername) {
      return res.status(403).json({
        error: 'User mismatch',
        message: 'This payment was made by a different user.',
      });
    }

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
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
router.put('/user/:cognitoUsername/cancel', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;

    // Only stop auto-renewal; user keeps access until end_date
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

// Admin: Create or update subscription plan
router.post('/admin/plans', async (req, res) => {
  try {
    const { cognitoUsername, groups } = req.query;
    const { id, name, tier, max_listings, price_monthly, price_yearly, features, is_active, display_order } = req.body;

    if (!cognitoUsername) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let userGroups = [];
    if (groups) {
      try {
        userGroups = JSON.parse(groups);
      } catch (parseError) {
        userGroups = Array.isArray(groups) ? groups : [groups];
      }
    }

    const isAdmin = userGroups.includes('site_admin') || userGroups.includes('admin');

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!name || !tier || !max_listings || price_monthly === undefined || price_yearly === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (id) {
      await pool.execute(
        `UPDATE subscription_plans 
         SET name = ?, tier = ?, max_listings = ?, price_monthly = ?, price_yearly = ?, 
             features = ?, is_active = ?, display_order = ?
         WHERE id = ?`,
        [name, tier, max_listings, price_monthly, price_yearly, features || null, is_active !== false, display_order || 0, id]
      );
      res.json({ message: 'Plan updated successfully', id });
    } else {
      const [result] = await pool.execute(
        `INSERT INTO subscription_plans 
         (name, tier, max_listings, price_monthly, price_yearly, features, is_active, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, tier, max_listings, price_monthly, price_yearly, features || null, is_active !== false, display_order || 0]
      );
      res.json({ message: 'Plan created successfully', id: result.insertId });
    }
  } catch (error) {
    console.error('Error saving subscription plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Delete subscription plan
router.delete('/admin/plans/:id', async (req, res) => {
  try {
    const { cognitoUsername, groups } = req.query;
    const { id } = req.params;

    if (!cognitoUsername) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let userGroups = [];
    if (groups) {
      try {
        userGroups = JSON.parse(groups);
      } catch (parseError) {
        userGroups = Array.isArray(groups) ? groups : [groups];
      }
    }

    const isAdmin = userGroups.includes('site_admin') || userGroups.includes('admin');

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

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
