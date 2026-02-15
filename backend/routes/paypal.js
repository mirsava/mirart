import express from 'express';
import { client } from '../config/paypal.js';
import paypal from '@paypal/checkout-server-sdk';
import pool from '../config/database.js';

const router = express.Router();

router.post('/create-order', async (req, res) => {
  try {
    const { items, shipping_address, is_subscription } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    const totalAmount = items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);

    // Subscription payments use the plan price as-is; artwork orders add platform fee
    const platformFee = is_subscription ? 0 : items.length * 10.00;
    const totalWithFee = totalAmount + platformFee;

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: totalWithFee.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: 'USD',
              value: totalAmount.toFixed(2)
            },
            handling: {
              currency_code: 'USD',
              value: platformFee.toFixed(2)
            }
          }
        },
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity.toString(),
          unit_amount: {
            currency_code: 'USD',
            value: parseFloat(item.price).toFixed(2)
          }
        })),
        shipping: shipping_address ? {
          address: {
            address_line_1: shipping_address.address_line_1 || '',
            address_line_2: shipping_address.address_line_2 || '',
            admin_area_2: shipping_address.city || '',
            admin_area_1: shipping_address.state || '',
            postal_code: shipping_address.zipCode || '',
            country_code: shipping_address.country || 'US'
          }
        } : undefined
      }],
      application_context: {
        brand_name: 'ArtZyla',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order-success`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cart`
      }
    });

    const order = await client().execute(request);
    res.json({ id: order.result.id });
  } catch (error) {
    console.error('PayPal create order error:', error);
    res.status(500).json({ error: 'Failed to create PayPal order', details: error.message });
  }
});

router.post('/capture-order', async (req, res) => {
  try {
    const { orderId, orderData } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    const capture = await client().execute(request);

    if (capture.result.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    const transactionId = capture.result.purchase_units[0].payments.captures[0].id;
    const payerEmail = capture.result.payer.email_address;
    const payerName = capture.result.payer.name?.given_name + ' ' + capture.result.payer.name?.surname;

    if (orderData && orderData.isSubscription && orderData.subscriptionData) {
      const cognitoUsername = orderData.cognito_username;
      const { plan_id, billing_period } = orderData.subscriptionData;

      if (!cognitoUsername) {
        return res.status(400).json({ error: 'User information is required' });
      }

      const [users] = await pool.execute(
        'SELECT id FROM users WHERE cognito_username = ?',
        [cognitoUsername]
      );

      if (users.length === 0) {
        return res.json({
          success: true,
          transactionId,
          requiresUserCreation: true,
          subscriptionData: {
            plan_id,
            billing_period
          },
          payer: {
            email: payerEmail,
            name: payerName
          }
        });
      }

      const userId = users[0].id;

      const [plans] = await pool.execute(
        'SELECT * FROM subscription_plans WHERE id = ? AND is_active = TRUE',
        [plan_id]
      );

      if (plans.length === 0) {
        return res.status(404).json({ error: 'Subscription plan not found' });
      }

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
        [userId, plan_id, billing_period, startDate, endDate, true, transactionId]
      );

      const [newSubscription] = await pool.execute(
        `SELECT us.*, sp.name as plan_name, sp.tier, sp.max_listings
         FROM user_subscriptions us
         JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE us.id = ?`,
        [result.insertId]
      );

      return res.json({
        success: true,
        transactionId,
        subscription: newSubscription[0],
        payer: {
          email: payerEmail,
          name: payerName
        }
      });
    }

    if (orderData && orderData.items && orderData.items.length > 0) {
      const shippingAddress = orderData.shipping_address || '';
      const cognitoUsername = orderData.cognito_username;

      if (!cognitoUsername) {
        return res.status(400).json({ error: 'User information is required' });
      }

      const [buyers] = await pool.execute(
        'SELECT id FROM users WHERE cognito_username = ?',
        [cognitoUsername]
      );

      if (buyers.length === 0) {
        return res.status(404).json({ error: 'Buyer not found' });
      }
      const buyer_id = buyers[0].id;

      const createdOrders = [];

      for (const item of orderData.items) {
        const [listings] = await pool.execute(
          `SELECT l.*, u.id as seller_id 
           FROM listings l
           JOIN users u ON l.user_id = u.id
           WHERE l.id = ?`,
          [item.listing_id]
        );

        if (listings.length === 0) {
          continue;
        }

        const listing = listings[0];

        if (listing.status !== 'active' || !listing.in_stock) {
          continue;
        }

        const unit_price = parseFloat(listing.price);
        const total_price = unit_price * item.quantity;
        const platform_fee = 10.00;
        const artist_earnings = total_price - platform_fee;

        const order_number = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const [result] = await pool.execute(
          `INSERT INTO orders (
            order_number, buyer_id, seller_id, listing_id, quantity,
            unit_price, total_price, platform_fee, artist_earnings,
            status, shipping_address, payment_intent_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)`,
          [
            order_number,
            buyer_id,
            listing.user_id,
            item.listing_id,
            item.quantity,
            unit_price,
            total_price,
            platform_fee,
            artist_earnings,
            shippingAddress,
            transactionId
          ]
        );

        await pool.execute(
          'UPDATE listings SET status = ?, in_stock = ? WHERE id = ?',
          ['sold', false, item.listing_id]
        );

        try {
          await pool.execute(
            `UPDATE dashboard_stats 
             SET total_sales = total_sales + 1,
                 total_revenue = total_revenue + ?,
                 active_listings = GREATEST(active_listings - 1, 0)
             WHERE user_id = ?`,
            [artist_earnings, listing.user_id]
          );

          const [buyerStats] = await pool.execute(
            'SELECT id FROM dashboard_stats WHERE user_id = ?',
            [buyer_id]
          );
          if (buyerStats.length === 0) {
            await pool.execute(
              'INSERT INTO dashboard_stats (user_id) VALUES (?)',
              [buyer_id]
            );
          }
        } catch (statsError) {
          console.error('Error updating dashboard stats:', statsError);
        }

        const [newOrder] = await pool.execute(
          `SELECT o.*, 
            l.title as listing_title,
            u.email as buyer_email
           FROM orders o
           JOIN listings l ON o.listing_id = l.id
           JOIN users u ON o.buyer_id = u.id
           WHERE o.id = ?`,
          [result.insertId]
        );

        createdOrders.push(newOrder[0]);
      }

      res.json({
        success: true,
        transactionId,
        orders: createdOrders,
        payer: {
          email: payerEmail,
          name: payerName
        }
      });
    } else {
      res.json({
        success: true,
        transactionId,
        payer: {
          email: payerEmail,
          name: payerName
        }
      });
    }
  } catch (error) {
    console.error('PayPal capture order error:', error);
    res.status(500).json({ error: 'Failed to capture PayPal order', details: error.message });
  }
});

export default router;
