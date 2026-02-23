import express from 'express';
import pool from '../config/database.js';
import { stripe } from '../config/stripe.js';
import { createNotification } from '../services/notificationService.js';

const router = express.Router();

// Create new order
router.post('/', async (req, res) => {
  try {
    const {
      cognito_username,
      listing_id,
      quantity = 1,
      shipping_address,
      payment_intent_id,
      shippo_rate_id,
      shipping_cost
    } = req.body;

    if (!cognito_username) {
      return res.status(400).json({ error: 'cognito_username is required' });
    }
    if (!listing_id) {
      return res.status(400).json({ error: 'listing_id is required' });
    }

    // Get buyer user_id from cognito_username
    const [buyers] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognito_username]
    );

    if (buyers.length === 0) {
      return res.status(404).json({ error: 'Buyer not found' });
    }
    const buyer_id = buyers[0].id;

    // Get listing details
    const [listings] = await pool.execute(
      `SELECT l.*, u.id as seller_id 
       FROM listings l
       JOIN users u ON l.user_id = u.id
       WHERE l.id = ?`,
      [listing_id]
    );

    if (listings.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = listings[0];

    // Check if listing is available (active and in stock)
    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is not available for purchase' });
    }
    if (!listing.in_stock) {
      return res.status(400).json({ error: 'Listing is out of stock' });
    }

    const unit_price = parseFloat(listing.price);
    const total_price = unit_price * quantity;
    
    // Calculate platform fee ($10 per listing for fixed price)
    const platform_fee = 10.00;
    const artist_earnings = total_price - platform_fee;

    // Generate order number
    const order_number = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order
    const [result] = await pool.execute(
      `INSERT INTO orders (
        order_number, buyer_id, seller_id, listing_id, quantity,
        unit_price, total_price, platform_fee, artist_earnings,
        status, shipping_address, payment_intent_id,
        shippo_rate_id, shipping_cost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?)`,
      [
        order_number,
        buyer_id,
        listing.user_id,
        listing_id,
        quantity,
        unit_price,
        total_price,
        platform_fee,
        artist_earnings,
        shipping_address || null,
        payment_intent_id || null,
        shippo_rate_id || null,
        shipping_cost ? parseFloat(shipping_cost) : 0
      ]
    );

    // Update listing status to 'sold' and set in_stock to false
    await pool.execute(
      'UPDATE listings SET status = ?, in_stock = ? WHERE id = ?',
      ['sold', false, listing_id]
    );

    // Update dashboard stats
    try {
      // Update seller stats
      await pool.execute(
        `UPDATE dashboard_stats 
         SET total_sales = total_sales + 1,
             total_revenue = total_revenue + ?,
             active_listings = GREATEST(active_listings - 1, 0)
         WHERE user_id = ?`,
        [artist_earnings, listing.user_id]
      );

      // Update buyer stats if they have dashboard stats
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

    try {
      const [listingRow] = await pool.execute('SELECT title FROM listings WHERE id = ?', [listing_id]);
      const listingTitle = listingRow[0]?.title || 'Artwork';
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

    // Get created order
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

    res.status(201).json({
      ...newOrder[0],
      unit_price: parseFloat(newOrder[0].unit_price),
      total_price: parseFloat(newOrder[0].total_price),
      platform_fee: parseFloat(newOrder[0].platform_fee),
      artist_earnings: parseFloat(newOrder[0].artist_earnings)
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get orders for a user
router.get('/user/:cognitoUsername', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;
    const { type } = req.query; // 'buyer' or 'seller'

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user_id = users[0].id;

    let query = '';
    if (type === 'seller') {
      query = `SELECT o.*, 
        l.title as listing_title,
        l.primary_image_url,
        l.return_days,
        l.returns_info,
        u.email as buyer_email
       FROM orders o
       JOIN listings l ON o.listing_id = l.id
       JOIN users u ON o.buyer_id = u.id
       WHERE o.seller_id = ?
       ORDER BY o.created_at DESC`;
    } else {
      query = `SELECT o.*, 
        l.title as listing_title,
        l.primary_image_url,
        l.return_days,
        l.returns_info,
        u.email as seller_email
       FROM orders o
       JOIN listings l ON o.listing_id = l.id
       JOIN users u ON o.seller_id = u.id
       WHERE o.buyer_id = ?
       ORDER BY o.created_at DESC`;
    }

    const [orders] = await pool.execute(query, [user_id]);

    res.json(orders.map(order => ({
      ...order,
      unit_price: parseFloat(order.unit_price),
      total_price: parseFloat(order.total_price),
      platform_fee: parseFloat(order.platform_fee),
      artist_earnings: parseFloat(order.artist_earnings),
      shipping_cost: order.shipping_cost ? parseFloat(order.shipping_cost) : 0
    })));
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cognitoUsername } = req.query;

    if (!cognitoUsername) return res.status(400).json({ error: 'cognitoUsername required' });

    const [users] = await pool.execute('SELECT id FROM users WHERE cognito_username = ?', [cognitoUsername]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = users[0].id;

    const [orders] = await pool.execute(
      `SELECT o.*,
        l.title as listing_title, l.primary_image_url, l.description as listing_description,
        l.category, l.subcategory, l.medium, l.dimensions, l.year as listing_year,
        l.return_days, l.returns_info, l.shipping_preference,
        buyer.email as buyer_email, buyer.first_name as buyer_first_name, buyer.last_name as buyer_last_name,
        buyer.phone as buyer_phone, buyer.address_line1 as buyer_address_line1, buyer.address_city as buyer_address_city,
        buyer.address_state as buyer_address_state, buyer.address_zip as buyer_address_zip, buyer.address_country as buyer_address_country,
        seller.email as seller_email, seller.first_name as seller_first_name, seller.last_name as seller_last_name,
        seller.business_name as seller_business_name, seller.phone as seller_phone,
        seller.address_line1 as seller_address_line1, seller.address_city as seller_address_city,
        seller.address_state as seller_address_state, seller.address_zip as seller_address_zip, seller.address_country as seller_address_country
      FROM orders o
      JOIN listings l ON o.listing_id = l.id
      JOIN users buyer ON o.buyer_id = buyer.id
      JOIN users seller ON o.seller_id = seller.id
      WHERE o.id = ?`,
      [orderId]
    );

    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orders[0];
    if (order.buyer_id !== userId && order.seller_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      ...order,
      unit_price: parseFloat(order.unit_price),
      total_price: parseFloat(order.total_price),
      platform_fee: parseFloat(order.platform_fee),
      artist_earnings: parseFloat(order.artist_earnings),
      shipping_cost: order.shipping_cost ? parseFloat(order.shipping_cost) : 0,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark order as shipped (seller)
router.put('/:orderId/mark-shipped', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cognito_username } = req.body;
    if (!cognito_username) return res.status(400).json({ error: 'cognito_username is required' });

    const [users] = await pool.execute('SELECT id FROM users WHERE cognito_username = ?', [cognito_username]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const seller_id = users[0].id;

    const [orders] = await pool.execute(
      'SELECT id, seller_id, buyer_id, order_number, status FROM orders WHERE id = ? AND seller_id = ?',
      [orderId, seller_id]
    );
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (orders[0].status !== 'paid') {
      return res.status(400).json({ error: 'Only paid orders can be marked as shipped' });
    }
    const order = orders[0];

    await pool.execute("UPDATE orders SET status = 'shipped' WHERE id = ?", [orderId]);

    if (order.buyer_id) {
      try {
        await createNotification({
          userId: order.buyer_id,
          type: 'order',
          title: 'Order shipped',
          body: `Order ${order.order_number} has been shipped.`,
          link: `/orders?order=${orderId}`,
          referenceId: parseInt(orderId, 10),
        });
      } catch (nErr) {
        console.warn('Could not create notification:', nErr.message);
      }
    }

    res.json({ success: true, status: 'shipped' });
  } catch (error) {
    console.error('Error marking order shipped:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Confirm delivery (buyer) - captures payment and transfers funds to artist via Stripe Connect
router.put('/:orderId/confirm-delivery', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cognito_username } = req.body;
    if (!cognito_username) return res.status(400).json({ error: 'cognito_username is required' });

    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

    const [users] = await pool.execute('SELECT id FROM users WHERE cognito_username = ?', [cognito_username]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const buyer_id = users[0].id;

    const [orders] = await pool.execute(
      `SELECT o.*, u.stripe_account_id as seller_stripe_account_id
       FROM orders o JOIN users u ON o.seller_id = u.id
       WHERE o.id = ? AND o.buyer_id = ?`,
      [orderId, buyer_id]
    );
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orders[0];
    if (order.status === 'delivered') return res.json({ success: true, status: 'delivered', alreadyDone: true });
    if (!['paid', 'shipped'].includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be confirmed' });
    }

    const payment_intent_id = order.payment_intent_id;
    if (!payment_intent_id) return res.status(400).json({ error: 'Order has no payment intent' });

    let pi = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (pi.status === 'requires_capture') {
      await stripe.paymentIntents.capture(payment_intent_id);
      pi = await stripe.paymentIntents.retrieve(payment_intent_id);
    }

    // With destination charges (transfer_data), Stripe creates the transfer on capture.
    // With separate charges and transfers, we create the transfer ourselves.
    const artist_earnings_cents = Math.round(parseFloat(order.artist_earnings) * 100);
    if (artist_earnings_cents > 0 && order.seller_stripe_account_id && !order.stripe_transfer_id) {
      const chargeId = pi.latest_charge;
      const charge = chargeId ? await stripe.charges.retrieve(typeof chargeId === 'string' ? chargeId : chargeId.id) : null;
      const existingTransferId = charge?.transfer;

      if (existingTransferId) {
        // Destination charge: transfer already created on capture
        await pool.execute('UPDATE orders SET stripe_transfer_id = ? WHERE payment_intent_id = ?', [existingTransferId, payment_intent_id]);
      } else {
        // Separate charges and transfers: create transfer
        const sourceTransaction = typeof chargeId === 'string' ? chargeId : chargeId?.id;
        const transfer = await stripe.transfers.create({
          amount: artist_earnings_cents,
          currency: 'usd',
          destination: order.seller_stripe_account_id,
          transfer_group: `order-${order.order_number}`,
          ...(sourceTransaction && { source_transaction: sourceTransaction }),
        });
        await pool.execute('UPDATE orders SET stripe_transfer_id = ? WHERE id = ?', [transfer.id, orderId]);
      }
    }

    await pool.execute("UPDATE orders SET status = 'delivered' WHERE id = ?", [orderId]);

    if (order.seller_id) {
      try {
        await createNotification({
          userId: order.seller_id,
          type: 'order',
          title: 'Order delivered',
          body: `Order ${order.order_number} has been confirmed delivered.`,
          link: `/orders?order=${orderId}`,
          referenceId: parseInt(orderId, 10),
          severity: 'success',
        });
      } catch (nErr) {
        console.warn('Could not create notification:', nErr.message);
      }
    }

    try {
      await pool.execute(
        `UPDATE dashboard_stats SET total_revenue = total_revenue + ? WHERE user_id = ?`,
        [order.artist_earnings, order.seller_id]
      );
    } catch (e) {
      console.error('Dashboard stats update:', e);
    }

    res.json({ success: true, status: 'delivered' });
  } catch (error) {
    console.error('Error confirming delivery:', error);
    res.status(500).json({
      error: error.message || 'Failed to confirm delivery',
      details: error.type === 'StripeError' ? error.message : undefined,
    });
  }
});

router.post('/:orderId/return-request', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cognito_username, reason } = req.body;
    if (!cognito_username) return res.status(400).json({ error: 'cognito_username is required' });

    const [users] = await pool.execute('SELECT id FROM users WHERE cognito_username = ?', [cognito_username]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const buyer_id = users[0].id;

    const [orders] = await pool.execute(
      `SELECT o.*, l.return_days, l.returns_info
       FROM orders o JOIN listings l ON o.listing_id = l.id
       WHERE o.id = ? AND o.buyer_id = ?`,
      [orderId, buyer_id]
    );
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orders[0];

    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'Only delivered orders can be returned' });
    }
    if (order.return_status) {
      return res.status(400).json({ error: `Return already ${order.return_status}` });
    }

    const returnDays = order.return_days;
    if (!returnDays || returnDays <= 0) {
      return res.status(400).json({ error: 'This item does not accept returns' });
    }

    const deliveredDate = order.updated_at || order.created_at;
    const daysSinceDelivery = Math.floor((Date.now() - new Date(deliveredDate).getTime()) / 86400000);
    if (daysSinceDelivery > returnDays) {
      return res.status(400).json({ error: `Return window of ${returnDays} days has expired` });
    }

    await pool.execute(
      "UPDATE orders SET return_status = 'requested', return_reason = ?, return_requested_at = NOW() WHERE id = ?",
      [reason || null, orderId]
    );

    if (order.seller_id) {
      try {
        await createNotification({
          userId: order.seller_id,
          type: 'order',
          title: 'Return requested',
          body: `Buyer requested a return for order ${order.order_number}.${reason ? ' Reason: ' + reason : ''}`,
          link: `/orders?order=${order.id}`,
          referenceId: parseInt(orderId, 10),
          severity: 'warning',
        });
      } catch {}
    }

    res.json({ success: true, return_status: 'requested' });
  } catch (error) {
    console.error('Error requesting return:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:orderId/return-respond', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cognito_username, action } = req.body;
    if (!cognito_username) return res.status(400).json({ error: 'cognito_username is required' });
    if (!['approved', 'denied'].includes(action)) return res.status(400).json({ error: 'action must be approved or denied' });

    const [users] = await pool.execute('SELECT id FROM users WHERE cognito_username = ?', [cognito_username]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const seller_id = users[0].id;

    const [orders] = await pool.execute(
      'SELECT id, seller_id, buyer_id, order_number, return_status FROM orders WHERE id = ? AND seller_id = ?',
      [orderId, seller_id]
    );
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orders[0];

    if (order.return_status !== 'requested') {
      return res.status(400).json({ error: 'No pending return request' });
    }

    await pool.execute('UPDATE orders SET return_status = ? WHERE id = ?', [action, orderId]);

    if (order.buyer_id) {
      try {
        await createNotification({
          userId: order.buyer_id,
          type: 'order',
          title: action === 'approved' ? 'Return approved' : 'Return denied',
          body: `Your return request for order ${order.order_number} has been ${action}.`,
          link: `/orders?order=${order.id}`,
          referenceId: parseInt(orderId, 10),
          severity: action === 'approved' ? 'success' : 'error',
        });
      } catch {}
    }

    res.json({ success: true, return_status: action });
  } catch (error) {
    console.error('Error responding to return:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

