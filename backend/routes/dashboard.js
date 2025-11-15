import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get dashboard stats for a user
router.get('/:cognitoUsername', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;
    
    // Get user_id
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );
    
    let user_id;
    if (users.length === 0) {
      // User doesn't exist in database yet - return empty stats
      // This can happen if user signed up but database save failed
      return res.json({
        stats: {
          totalListings: 0,
          activeListings: 0,
          totalSales: 0,
          totalRevenue: 0,
          pendingOrders: 0,
          totalViews: 0,
        },
        recentListings: [],
        recentOrders: []
      });
    }
    
    user_id = users[0].id;
    
    // Get or create dashboard stats
    let [stats] = await pool.execute(
      'SELECT * FROM dashboard_stats WHERE user_id = ?',
      [user_id]
    );
    
    if (stats.length === 0) {
      // Initialize stats
      await pool.execute(
        'INSERT INTO dashboard_stats (user_id) VALUES (?)',
        [user_id]
      );
      [stats] = await pool.execute(
        'SELECT * FROM dashboard_stats WHERE user_id = ?',
        [user_id]
      );
    }
    
    // Calculate real-time stats
    const [listingCounts] = await pool.execute(
      `SELECT 
        COUNT(*) as total_listings,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_listings
       FROM listings WHERE user_id = ?`,
      [user_id]
    );
    
    const [salesData] = await pool.execute(
      `SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(artist_earnings), 0) as total_revenue
       FROM orders WHERE seller_id = ? AND status IN ('paid', 'shipped', 'delivered')`,
      [user_id]
    );
    
    const [pendingOrders] = await pool.execute(
      `SELECT COUNT(*) as pending_orders
       FROM orders WHERE seller_id = ? AND status = 'pending'`,
      [user_id]
    );
    
    const [totalViews] = await pool.execute(
      `SELECT COALESCE(SUM(views), 0) as total_views
       FROM listings WHERE user_id = ?`,
      [user_id]
    );
    
    // Update cached stats
    await pool.execute(
      `UPDATE dashboard_stats SET
        total_listings = ?,
        active_listings = ?,
        total_sales = ?,
        total_revenue = ?,
        pending_orders = ?,
        total_views = ?
      WHERE user_id = ?`,
      [
        listingCounts[0].total_listings || 0,
        listingCounts[0].active_listings || 0,
        salesData[0].total_sales || 0,
        salesData[0].total_revenue || 0,
        pendingOrders[0].pending_orders || 0,
        totalViews[0].total_views || 0,
        user_id
      ]
    );
    
    // Get recent listings
    const [recentListings] = await pool.execute(
      `SELECT id, title, price, status, views, created_at
       FROM listings
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [user_id]
    );
    
    // Get recent orders
    const [recentOrders] = await pool.execute(
      `SELECT o.*, l.title as listing_title, u.email as buyer_email
       FROM orders o
       JOIN listings l ON o.listing_id = l.id
       JOIN users u ON o.buyer_id = u.id
       WHERE o.seller_id = ?
       ORDER BY o.created_at DESC
       LIMIT 10`,
      [user_id]
    );
    
    res.json({
      stats: {
        totalListings: listingCounts[0].total_listings || 0,
        activeListings: listingCounts[0].active_listings || 0,
        totalSales: salesData[0].total_sales || 0,
        totalRevenue: parseFloat(salesData[0].total_revenue || 0),
        pendingOrders: pendingOrders[0].pending_orders || 0,
        totalViews: totalViews[0].total_views || 0,
      },
      recentListings: recentListings.map(listing => ({
        ...listing,
        price: parseFloat(listing.price)
      })),
      recentOrders: recentOrders.map(order => ({
        ...order,
        unit_price: parseFloat(order.unit_price),
        total_price: parseFloat(order.total_price),
        platform_fee: parseFloat(order.platform_fee),
        artist_earnings: parseFloat(order.artist_earnings)
      }))
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

