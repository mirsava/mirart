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
          totalViews: 0,
          draftListings: 0,
          messagesReceived: 0,
          totalLikes: 0,
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
    
    const [totalViews] = await pool.execute(
      `SELECT COALESCE(SUM(views), 0) as total_views
       FROM listings WHERE user_id = ?`,
      [user_id]
    );
    
    const [draftListings] = await pool.execute(
      `SELECT COUNT(*) as draft_listings
       FROM listings WHERE user_id = ? AND status = 'draft'`,
      [user_id]
    );
    
    const [messagesReceived] = await pool.execute(
      `SELECT COUNT(*) as messages_received
       FROM messages WHERE recipient_id = ? AND status = 'sent'`,
      [user_id]
    );
    
    const [totalLikes] = await pool.execute(
      `SELECT COUNT(*) as total_likes
       FROM likes l
       JOIN listings li ON l.listing_id = li.id
       WHERE li.user_id = ?`,
      [user_id]
    );
    
    // Update cached stats
    await pool.execute(
      `UPDATE dashboard_stats SET
        total_listings = ?,
        active_listings = ?,
        total_views = ?
      WHERE user_id = ?`,
      [
        listingCounts[0].total_listings || 0,
        listingCounts[0].active_listings || 0,
        totalViews[0].total_views || 0,
        user_id
      ]
    );
    
    // Get recent listings
    const [recentListings] = await pool.execute(
      `SELECT id, title, price, status, views, created_at, primary_image_url, image_urls
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
        totalViews: totalViews[0].total_views || 0,
        draftListings: draftListings[0].draft_listings || 0,
        messagesReceived: messagesReceived[0].messages_received || 0,
        totalLikes: totalLikes[0].total_likes || 0,
      },
      recentListings: recentListings.map(listing => {
          let parsedImageUrls = null;
          if (listing.image_urls && listing.image_urls !== 'null' && listing.image_urls !== '') {
            try {
              const imageUrlsStr = String(listing.image_urls).trim();
              if (!imageUrlsStr || imageUrlsStr === 'null' || imageUrlsStr === '') {
                parsedImageUrls = null;
              } else if (imageUrlsStr.startsWith('[') || imageUrlsStr.startsWith('{')) {
                parsedImageUrls = JSON.parse(imageUrlsStr);
              } else if (imageUrlsStr.startsWith('http://') || imageUrlsStr.startsWith('https://') || imageUrlsStr.startsWith('/')) {
                parsedImageUrls = [imageUrlsStr];
              } else {
                parsedImageUrls = JSON.parse(imageUrlsStr);
              }
            } catch (parseError) {
              console.error('Error parsing image_urls JSON:', parseError);
              const imageUrlsStr = String(listing.image_urls).trim();
              if (imageUrlsStr && imageUrlsStr !== 'null' && imageUrlsStr !== '' && (imageUrlsStr.startsWith('http://') || imageUrlsStr.startsWith('https://') || imageUrlsStr.startsWith('/'))) {
                parsedImageUrls = [imageUrlsStr];
              } else {
                parsedImageUrls = null;
              }
            }
          }
        return {
          ...listing,
          price: parseFloat(listing.price),
          image_urls: parsedImageUrls
        };
      }),
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

router.get('/:cognitoUsername/analytics', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = users[0].id;

    const [subRows] = await pool.execute(
      `SELECT sp.tier FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = ? AND us.status = 'active'
       ORDER BY us.created_at DESC LIMIT 1`,
      [userId]
    );
    if (subRows.length === 0 || subRows[0].tier !== 'enterprise') {
      return res.status(403).json({ error: 'Enterprise subscription required' });
    }

    const now = new Date();
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStart = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;
    const lastMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const ytdStart = `${now.getFullYear()}-01-01`;

    const [summary] = await pool.execute(
      `SELECT
        COALESCE(SUM(artist_earnings), 0) as total_earnings,
        COUNT(*) as total_orders,
        COALESCE(AVG(artist_earnings), 0) as avg_order_value,
        COALESCE(SUM(CASE WHEN created_at >= ? THEN artist_earnings ELSE 0 END), 0) as this_month,
        COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN artist_earnings ELSE 0 END), 0) as last_month,
        COALESCE(SUM(CASE WHEN created_at >= ? THEN artist_earnings ELSE 0 END), 0) as ytd
       FROM orders
       WHERE seller_id = ? AND status NOT IN ('cancelled')`,
      [thisMonthStart, lastMonthStart, lastMonthEnd, ytdStart, userId]
    );

    const [revenueOverTime] = await pool.execute(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
              COALESCE(SUM(artist_earnings), 0) as earnings,
              COUNT(*) as orders
       FROM orders
       WHERE seller_id = ? AND status NOT IN ('cancelled')
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month ASC`,
      [userId]
    );

    const [topListings] = await pool.execute(
      `SELECT l.id, l.title, l.primary_image_url, l.category,
              COALESCE(SUM(o.artist_earnings), 0) as total_revenue,
              COUNT(o.id) as order_count
       FROM orders o
       JOIN listings l ON o.listing_id = l.id
       WHERE o.seller_id = ? AND o.status NOT IN ('cancelled')
       GROUP BY l.id, l.title, l.primary_image_url, l.category
       ORDER BY total_revenue DESC
       LIMIT 10`,
      [userId]
    );

    const [revenueByCategory] = await pool.execute(
      `SELECT l.category,
              COALESCE(SUM(o.artist_earnings), 0) as earnings,
              COUNT(o.id) as orders
       FROM orders o
       JOIN listings l ON o.listing_id = l.id
       WHERE o.seller_id = ? AND o.status NOT IN ('cancelled')
       GROUP BY l.category
       ORDER BY earnings DESC`,
      [userId]
    );

    res.json({
      summary: {
        totalEarnings: parseFloat(summary[0].total_earnings),
        totalOrders: summary[0].total_orders,
        avgOrderValue: parseFloat(summary[0].avg_order_value),
        thisMonth: parseFloat(summary[0].this_month),
        lastMonth: parseFloat(summary[0].last_month),
        ytd: parseFloat(summary[0].ytd),
      },
      revenueOverTime: revenueOverTime.map(r => ({
        month: r.month,
        earnings: parseFloat(r.earnings),
        orders: r.orders,
      })),
      topListings: topListings.map(l => ({
        id: l.id,
        title: l.title,
        primaryImageUrl: l.primary_image_url,
        category: l.category,
        totalRevenue: parseFloat(l.total_revenue),
        orderCount: l.order_count,
      })),
      revenueByCategory: revenueByCategory.map(c => ({
        category: c.category || 'Uncategorized',
        earnings: parseFloat(c.earnings),
        orders: c.orders,
      })),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

