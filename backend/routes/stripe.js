import express from 'express';
import pool from '../config/database.js';
import { stripe } from '../config/stripe.js';

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

router.post('/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured', details: 'Add STRIPE_SECRET_KEY to .env' });
    }

    const { items, shipping_address, metadata, return_url_base } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    const baseUrl = (return_url_base || FRONTEND_URL).replace(/\/$/, '');
    const isSubscription = metadata?.is_subscription === 'true' || metadata?.is_subscription === true;

    let lineItems;
    let mode = 'payment';

    if (isSubscription && metadata?.plan_id && metadata?.billing_period) {
      // Stripe subscription mode: use Stripe Products
      const planId = parseInt(metadata.plan_id, 10);
      const [plans] = await pool.execute(
        'SELECT id, name, tier, stripe_product_id, price_monthly, price_yearly FROM subscription_plans WHERE id = ? AND is_active = TRUE',
        [planId]
      );
      if (plans.length === 0) {
        return res.status(404).json({ error: 'Subscription plan not found' });
      }
      const plan = plans[0];
      const stripeProductId = plan.stripe_product_id;
      if (!stripeProductId) {
        return res.status(400).json({
          error: 'Stripe product not configured for this plan',
          details: 'Run migration: node database/run-stripe-product-migration.js',
        });
      }
      const price = metadata.billing_period === 'yearly'
        ? parseFloat(plan.price_yearly)
        : parseFloat(plan.price_monthly);
      const interval = metadata.billing_period === 'yearly' ? 'year' : 'month';

      mode = 'subscription';
      lineItems = [{
        price_data: {
          currency: 'usd',
          product: stripeProductId,
          unit_amount: Math.round(price * 100),
          recurring: { interval },
        },
        quantity: 1,
      }];
    } else {
      // One-time payment (artwork)
      const totalAmountCents = Math.round(
        items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity * 100, 0)
      );
      const platformFeeCents = items.length * 1000;
      lineItems = items.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name || 'Artwork',
            images: item.image_url ? [item.image_url] : undefined,
          },
          unit_amount: Math.round(parseFloat(item.price) * 100),
        },
        quantity: item.quantity,
      }));
      if (platformFeeCents > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: { name: 'Platform fee' },
            unit_amount: platformFeeCents,
          },
          quantity: 1,
        });
      }
    }

    const sessionMetadata = {};
    if (metadata) {
      Object.keys(metadata).forEach((k) => {
        sessionMetadata[k] = typeof metadata[k] === 'object' ? JSON.stringify(metadata[k]) : String(metadata[k]);
      });
    }

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode,
      success_url: `${baseUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: metadata?.cancel_url ? `${baseUrl}${metadata.cancel_url}` : `${baseUrl}/cart`,
      metadata: sessionMetadata,
    };

    if (mode === 'payment' && shipping_address && Object.keys(shipping_address).length > 0) {
      sessionConfig.shipping_address_collection = {
        allowed_countries: ['US', 'CA', 'GB', 'AU'],
      };
      sessionConfig.shipping_options = [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: 0, currency: 'usd' }, display_name: 'Free shipping' } }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe create session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
});

router.get('/confirm-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'subscription'],
    });

    const metadata = session.metadata || {};
    const isSubscription = metadata.is_subscription === 'true' || metadata.is_subscription === true;

    // For subscriptions: accept 'paid' or 'complete' session (redirect only happens on success)
    // For one-time payments: require 'paid'
    const paymentOk = session.payment_status === 'paid' ||
      (isSubscription && session.status === 'complete' && session.subscription);

    if (!paymentOk) {
      console.warn('Stripe confirm-session: payment not ready', {
        session_id,
        payment_status: session.payment_status,
        status: session.status,
        isSubscription,
      });
      return res.status(400).json({
        error: 'Payment not completed. Your payment may still be processing—please wait a moment and refresh the page, or check your email for confirmation.',
      });
    }

    // Extract ID string (expanded objects have .id; otherwise it's already a string)
    const getStripeId = (val) => {
      if (!val) return null;
      if (typeof val === 'string') return val;
      return val?.id || null;
    };
    const transactionId = (getStripeId(session.subscription) || getStripeId(session.payment_intent) || session.id || '').slice(0, 255);
    const payerEmail = session.customer_details?.email || session.customer_email || '';
    const payerName = session.customer_details?.name || '';

    if (metadata.is_subscription === 'true' && metadata.plan_id && metadata.billing_period) {
      const cognitoUsername = metadata.cognito_username;
      const plan_id = parseInt(metadata.plan_id, 10);

      if (!cognitoUsername) {
        return res.status(400).json({ error: 'User information is required' });
      }

      const [users] = await pool.execute('SELECT id FROM users WHERE cognito_username = ?', [cognitoUsername]);

      if (users.length === 0) {
        return res.json({
          success: true,
          transactionId,
          requiresUserCreation: true,
          subscriptionData: { plan_id, billing_period: metadata.billing_period },
          payer: { email: payerEmail, name: payerName },
        });
      }

      const userId = users[0].id;

      const [plans] = await pool.execute('SELECT * FROM subscription_plans WHERE id = ? AND is_active = TRUE', [plan_id]);
      if (plans.length === 0) {
        return res.status(404).json({ error: 'Subscription plan not found' });
      }

      const startDate = new Date();
      const endDate = new Date();
      if (metadata.billing_period === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      await pool.execute(
        `UPDATE user_subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'`,
        [userId]
      );

      const [result] = await pool.execute(
        `INSERT INTO user_subscriptions (user_id, plan_id, billing_period, start_date, end_date, auto_renew, payment_intent_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [userId, plan_id, metadata.billing_period, startDate, endDate, true, transactionId]
      );

      const [newSubscription] = await pool.execute(
        `SELECT us.*, sp.name as plan_name, sp.tier, sp.max_listings
         FROM user_subscriptions us JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE us.id = ?`,
        [result.insertId]
      );

      return res.json({
        success: true,
        transactionId,
        subscription: newSubscription[0],
        payer: { email: payerEmail, name: payerName },
      });
    }

    const orderDataJson = metadata.order_data;
    if (orderDataJson) {
      const orderData = JSON.parse(orderDataJson);
      const { items: orderItems, cognito_username, shipping_address } = orderData;

      if (!cognito_username) {
        return res.status(400).json({ error: 'User information is required' });
      }

      const [buyers] = await pool.execute('SELECT id FROM users WHERE cognito_username = ?', [cognito_username]);
      if (buyers.length === 0) {
        return res.status(404).json({ error: 'Buyer not found' });
      }
      const buyer_id = buyers[0].id;
      const createdOrders = [];

      for (const item of orderItems || []) {
        const [listings] = await pool.execute(
          `SELECT l.*, u.id as seller_id FROM listings l JOIN users u ON l.user_id = u.id WHERE l.id = ?`,
          [item.listing_id]
        );

        if (listings.length === 0) continue;
        const listing = listings[0];
        if (listing.status !== 'active' || !listing.in_stock) continue;

        const unit_price = parseFloat(listing.price);
        const total_price = unit_price * item.quantity;
        const platform_fee = 10.0;
        const artist_earnings = total_price - platform_fee;
        const order_number = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const [result] = await pool.execute(
          `INSERT INTO orders (order_number, buyer_id, seller_id, listing_id, quantity, unit_price, total_price, platform_fee, artist_earnings, status, shipping_address, payment_intent_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)`,
          [order_number, buyer_id, listing.user_id, item.listing_id, item.quantity, unit_price, total_price, platform_fee, artist_earnings, shipping_address || '', transactionId]
        );

        await pool.execute('UPDATE listings SET status = ?, in_stock = ? WHERE id = ?', ['sold', false, item.listing_id]);

        try {
          await pool.execute(
            `UPDATE dashboard_stats SET total_sales = total_sales + 1, total_revenue = total_revenue + ?, active_listings = GREATEST(active_listings - 1, 0) WHERE user_id = ?`,
            [artist_earnings, listing.user_id]
          );
          const [buyerStats] = await pool.execute('SELECT id FROM dashboard_stats WHERE user_id = ?', [buyer_id]);
          if (buyerStats.length === 0) {
            await pool.execute('INSERT INTO dashboard_stats (user_id) VALUES (?)', [buyer_id]);
          }
        } catch (statsError) {
          console.error('Error updating dashboard stats:', statsError);
        }

        const [newOrder] = await pool.execute(
          `SELECT o.*, l.title as listing_title, u.email as buyer_email
           FROM orders o JOIN listings l ON o.listing_id = l.id JOIN users u ON o.buyer_id = u.id WHERE o.id = ?`,
          [result.insertId]
        );
        createdOrders.push(newOrder[0]);
      }

      return res.json({
        success: true,
        transactionId,
        orders: createdOrders,
        payer: { email: payerEmail, name: payerName },
      });
    }

    res.json({ success: true, transactionId, payer: { email: payerEmail, name: payerName } });
  } catch (error) {
    console.error('Stripe confirm session error:', error);
    const isStripeError = error.type && error.type.startsWith('Stripe');
    const message = isStripeError
      ? (error.message || 'Invalid or expired checkout session. Please try again from the cart or subscription page.')
      : (error.message || 'Failed to confirm payment');
    res.status(500).json({ error: message });
  }
});

export default router;
