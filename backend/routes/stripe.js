import express from 'express';
import pool from '../config/database.js';
import { stripe } from '../config/stripe.js';
import { createNotification } from '../services/notificationService.js';

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// --- Stripe Connect onboarding (artists receive payouts when buyer confirms delivery) ---
router.post('/connect/create-account', async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const { cognito_username, email, business_name } = req.body;
    if (!cognito_username || !email) {
      return res.status(400).json({ error: 'cognito_username and email are required' });
    }
    const [users] = await pool.execute('SELECT id, stripe_account_id FROM users WHERE cognito_username = ?', [cognito_username]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = users[0];
    if (user.stripe_account_id) {
      return res.json({ accountId: user.stripe_account_id, existing: true });
    }
    // card_payments requires transfers - see https://stripe.com/docs/connect/account-capabilities#card-payments
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    await pool.execute('UPDATE users SET stripe_account_id = ? WHERE id = ?', [account.id, user.id]);
    res.json({ accountId: account.id });
  } catch (error) {
    console.error('Stripe Connect create account error:', error);
    res.status(500).json({ error: error.message || 'Failed to create Connect account' });
  }
});

router.post('/connect/create-account-link', async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const { cognito_username, return_url, refresh_url } = req.body;
    if (!cognito_username) return res.status(400).json({ error: 'cognito_username is required' });
    const [users] = await pool.execute('SELECT id, stripe_account_id FROM users WHERE cognito_username = ?', [cognito_username]);
    if (users.length === 0 || !users[0].stripe_account_id) {
      return res.status(400).json({ error: 'Connect account not created. Call create-account first.' });
    }
    const base = (req.body.return_url_base || process.env.FRONTEND_URL || FRONTEND_URL).replace(/\/$/, '');
    const defaultReturn = `${base}/artist-dashboard?stripe_return=1`;
    const defaultRefresh = `${base}/artist-dashboard?stripe_refresh=1`;
    const resolveUrl = (url) => (url && url.startsWith('http') ? url : `${base}${url && url.startsWith('/') ? url : '/' + (url || '')}`);
    const link = await stripe.accountLinks.create({
      account: users[0].stripe_account_id,
      return_url: return_url ? resolveUrl(return_url) : defaultReturn,
      refresh_url: refresh_url ? resolveUrl(refresh_url) : defaultRefresh,
      type: 'account_onboarding',
    });
    res.json({ url: link.url });
  } catch (error) {
    console.error('Stripe Connect account link error:', error);
    res.status(500).json({ error: error.message || 'Failed to create account link' });
  }
});

router.get('/connect/status', async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    const { cognito_username } = req.query;
    if (!cognito_username) return res.status(400).json({ error: 'cognito_username is required' });
    const [users] = await pool.execute('SELECT stripe_account_id FROM users WHERE cognito_username = ?', [cognito_username]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const accountId = users[0].stripe_account_id;
    if (!accountId) return res.json({ connected: false, chargesEnabled: false });
    const account = await stripe.accounts.retrieve(accountId);
    res.json({
      connected: true,
      chargesEnabled: account.charges_enabled || false,
      detailsSubmitted: account.details_submitted || false,
    });
  } catch (error) {
    console.error('Stripe Connect status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get Connect status' });
  }
});

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
    let artworkTransferData = null;

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
      // One-time payment (artwork) - Stripe Connect: use destination charge with manual capture
      // (Stripe requires transfer_data for Connect - "card-payments without transfer" not supported)
      const orderDataJson = metadata?.order_data ?? metadata?.orderData;
      if (!orderDataJson) {
        return res.status(400).json({
          error: 'Checkout configuration error',
          details: 'Order data is required. Please go back to the cart and try checkout again.',
        });
      }
      {
        const orderData = typeof orderDataJson === 'string' ? JSON.parse(orderDataJson) : orderDataJson;
        const orderItems = orderData?.items || [];
        const totalAmountCents = Math.round(
          items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity * 100, 0)
        );
        const platformFeeCents = items.length * 1000;
        const artistTotalCents = totalAmountCents - platformFeeCents;
        const uniqueSellers = new Map();
        for (const item of orderItems) {
          const [listings] = await pool.execute(
            `SELECT l.user_id, u.stripe_account_id FROM listings l JOIN users u ON l.user_id = u.id WHERE l.id = ?`,
            [item.listing_id]
          );
          if (listings.length > 0 && !listings[0].stripe_account_id) {
            const [seller] = await pool.execute('SELECT cognito_username, email, first_name, last_name, business_name FROM users WHERE id = ?', [listings[0].user_id]);
            const name = seller[0]?.business_name || [seller[0]?.first_name, seller[0]?.last_name].filter(Boolean).join(' ') || 'Artist';
            const sellerCognito = seller[0]?.cognito_username;
            const buyerCognito = orderData?.cognito_username;
            const sellerIsCurrentUser = !!(buyerCognito && sellerCognito && buyerCognito === sellerCognito);
            return res.status(400).json({
              error: 'Artist has not set up payouts',
              details: sellerIsCurrentUser
                ? 'Complete your payout setup to receive this payment. You can set it up now and return to checkout.'
                : `${name} must complete Stripe Connect onboarding before they can receive payments. Please ask them to set up their payout account in their dashboard.`,
              seller_is_current_user: sellerIsCurrentUser,
              seller_cognito_username: sellerCognito || undefined,
              artist_name: name,
              artist_email: seller[0]?.email,
            });
          }
          if (listings.length > 0 && listings[0].stripe_account_id) {
            const sellerId = listings[0].user_id;
            const [[row]] = await pool.execute('SELECT price FROM listings WHERE id = ?', [item.listing_id]);
            const unitPrice = parseFloat(row?.price || 0);
            const itemTotal = Math.round(unitPrice * (item.quantity || 1) * 100);
            const itemPlatformFee = 1000;
            const itemArtist = itemTotal - itemPlatformFee;
            const existing = uniqueSellers.get(sellerId) || { stripe_account_id: listings[0].stripe_account_id, amount: 0 };
            uniqueSellers.set(sellerId, { stripe_account_id: existing.stripe_account_id, amount: existing.amount + itemArtist });
          }
        }
        const sellerEntries = Array.from(uniqueSellers.entries());
        if (sellerEntries.length === 0) {
          return res.status(400).json({
            error: 'Invalid order',
            details: 'Could not resolve sellers for the items. Please try again.',
          });
        }
        if (sellerEntries.length === 1) {
          const [, sellerInfo] = sellerEntries[0];
          artworkTransferData = { destination: sellerInfo.stripe_account_id, amount: sellerInfo.amount };
        } else {
          return res.status(400).json({
            error: 'Multi-artist checkout not supported',
            details: 'Please checkout items from one artist at a time. Stripe Connect requires a single destination for card payments.',
          });
        }
      }
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

    // Artwork: destination charge with manual capture (funds held until buyer confirms delivery)
    // Stripe requires transfer_data for Connect - "card_payments without transfers" not supported
    if (mode === 'payment' && !isSubscription) {
      if (!artworkTransferData) {
        return res.status(400).json({
          error: 'Checkout configuration error',
          details: 'Order data is required for artwork checkout. Please try again from the cart.',
        });
      }
      const transferGroup = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionConfig.payment_intent_data = {
        capture_method: 'manual',
        transfer_group: transferGroup,
        transfer_data: artworkTransferData,
      };
      if (sessionMetadata.order_data) {
        sessionMetadata.transfer_group = transferGroup;
      }
    }

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
    const message = error?.message || 'Unknown error';
    res.status(500).json({
      error: 'Failed to create checkout session',
      details: message,
    });
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
      expand: ['line_items', 'subscription', 'payment_intent'],
    });

    const metadata = session.metadata || {};
    const isSubscription = metadata.is_subscription === 'true' || metadata.is_subscription === true;
    const isArtwork = Boolean(metadata.order_data);

    // For subscriptions: accept 'paid' or 'complete' session
    // For artwork (manual capture): accept 'unpaid' when payment_intent status is 'requires_capture'
    // For other one-time: require 'paid'
    let paymentOk = session.payment_status === 'paid' ||
      (isSubscription && session.status === 'complete' && session.subscription);

    if (!paymentOk && isArtwork && session.payment_status === 'unpaid') {
      const pi = session.payment_intent;
      const piId = typeof pi === 'string' ? pi : pi?.id;
      if (piId) {
        const piObj = typeof pi === 'object' ? pi : await stripe.paymentIntents.retrieve(piId);
        if (piObj?.status === 'requires_capture') {
          paymentOk = true; // Authorized, funds held until delivery
        }
      }
    }

    if (!paymentOk) {
      console.warn('Stripe confirm-session: payment not ready', {
        session_id,
        payment_status: session.payment_status,
        status: session.status,
        isSubscription,
        isArtwork,
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
          // total_revenue is updated when buyer confirms delivery (funds released to artist)
          await pool.execute(
            `UPDATE dashboard_stats SET total_sales = total_sales + 1, active_listings = GREATEST(active_listings - 1, 0) WHERE user_id = ?`,
            [listing.user_id]
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

        try {
          const listingTitle = listing.title || 'Artwork';
          await createNotification({
            userId: listing.user_id,
            type: 'order',
            title: 'New sale',
            body: `Order ${order_number} for ${listingTitle}`,
            link: `/orders?order=${result.insertId}`,
            referenceId: result.insertId,
          });
          await createNotification({
            userId: buyer_id,
            type: 'order',
            title: 'Order confirmed',
            body: `Order ${order_number} for ${listingTitle}`,
            link: `/orders?order=${result.insertId}`,
            referenceId: result.insertId,
          });
        } catch (nErr) {
          console.warn('Could not create notification:', nErr.message);
        }
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
