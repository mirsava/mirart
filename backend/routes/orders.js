import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Create new order
router.post('/', async (req, res) => {
  try {
    const {
      cognito_username,
      listing_id,
      quantity = 1,
      shipping_address,
      payment_intent_id
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

    // Only allow fixed price listings
    if (listing.listing_type !== 'fixed_price') {
      return res.status(400).json({ error: 'Only fixed price listings can be purchased through checkout' });
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
        status, shipping_address, payment_intent_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)`,
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
        payment_intent_id || null
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
      artist_earnings: parseFloat(order.artist_earnings)
    })));
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

