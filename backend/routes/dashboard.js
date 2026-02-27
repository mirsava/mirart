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
        COALESCE(SUM(CASE
          WHEN payout_amount IS NOT NULL THEN payout_amount + COALESCE(payout_stripe_fee, 0) + COALESCE(payout_label_cost, 0) + COALESCE(payout_commission_amount, 0)
          ELSE (total_price - platform_fee)
        END), 0) as total_gross_earnings,
        COALESCE(SUM(COALESCE(payout_amount, artist_earnings)), 0) as total_net_earnings,
        COALESCE(SUM(COALESCE(payout_stripe_fee, 0)), 0) as total_stripe_fees,
        COALESCE(SUM(COALESCE(payout_label_cost, 0)), 0) as total_label_costs,
        COALESCE(SUM(COALESCE(payout_commission_amount, 0)), 0) as total_commission,
        COALESCE(SUM(COALESCE(payout_stripe_fee, 0) + COALESCE(payout_label_cost, 0) + COALESCE(payout_commission_amount, 0)), 0) as total_deductions,
        COUNT(*) as total_orders,
        COALESCE(AVG(COALESCE(payout_amount, artist_earnings)), 0) as avg_order_value,
        COALESCE(SUM(CASE WHEN created_at >= ? THEN COALESCE(payout_amount, artist_earnings) ELSE 0 END), 0) as this_month,
        COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN COALESCE(payout_amount, artist_earnings) ELSE 0 END), 0) as last_month,
        COALESCE(SUM(CASE WHEN created_at >= ? THEN COALESCE(payout_amount, artist_earnings) ELSE 0 END), 0) as ytd
       FROM orders
       WHERE seller_id = ? AND status NOT IN ('cancelled')`,
      [thisMonthStart, lastMonthStart, lastMonthEnd, ytdStart, userId]
    );

    const [revenueOverTime] = await pool.execute(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
              COALESCE(SUM(CASE
                WHEN payout_amount IS NOT NULL THEN payout_amount + COALESCE(payout_stripe_fee, 0) + COALESCE(payout_label_cost, 0) + COALESCE(payout_commission_amount, 0)
                ELSE (total_price - platform_fee)
              END), 0) as gross_earnings,
              COALESCE(SUM(COALESCE(payout_amount, artist_earnings)), 0) as net_earnings,
              COALESCE(SUM(COALESCE(payout_stripe_fee, 0)), 0) as stripe_fees,
              COALESCE(SUM(COALESCE(payout_label_cost, 0)), 0) as label_costs,
              COALESCE(SUM(COALESCE(payout_commission_amount, 0)), 0) as commission_costs,
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
              COALESCE(SUM(COALESCE(o.payout_amount, o.artist_earnings)), 0) as total_revenue,
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
              COALESCE(SUM(COALESCE(o.payout_amount, o.artist_earnings)), 0) as earnings,
              COUNT(o.id) as orders
       FROM orders o
       JOIN listings l ON o.listing_id = l.id
       WHERE o.seller_id = ? AND o.status NOT IN ('cancelled')
       GROUP BY l.category
       ORDER BY earnings DESC`,
      [userId]
    );

    const [funnelViews] = await pool.execute(
      `SELECT COALESCE(SUM(views), 0) as views
       FROM listings
       WHERE user_id = ?`,
      [userId]
    );

    const [funnelLikes] = await pool.execute(
      `SELECT COUNT(*) as likes
       FROM likes lk
       JOIN listings li ON lk.listing_id = li.id
       WHERE li.user_id = ?`,
      [userId]
    );

    const [funnelInquiries] = await pool.execute(
      `SELECT COUNT(DISTINCT c.id) as inquiries
       FROM chat_conversations c
       JOIN listings l ON c.listing_id = l.id
       WHERE l.user_id = ?`,
      [userId]
    );

    const [funnelOrders] = await pool.execute(
      `SELECT COUNT(*) as orders
       FROM orders
       WHERE seller_id = ? AND status IN ('paid', 'shipped', 'delivered')`,
      [userId]
    );

    const viewsCount = Number(funnelViews[0]?.views || 0);
    const likesCount = Number(funnelLikes[0]?.likes || 0);
    const inquiriesCount = Number(funnelInquiries[0]?.inquiries || 0);
    const ordersCount = Number(funnelOrders[0]?.orders || 0);
    const benchmarkConversionRate = viewsCount > 0 ? ordersCount / viewsCount : 0.01;

    const [missedOpportunities] = await pool.execute(
      `SELECT
          l.id,
          l.title,
          l.price,
          l.views,
          l.status,
          COUNT(o.id) as orders_count
       FROM listings l
       LEFT JOIN orders o ON o.listing_id = l.id AND o.status IN ('paid', 'shipped', 'delivered')
       WHERE l.user_id = ?
       GROUP BY l.id, l.title, l.price, l.views, l.status
       HAVING l.views >= 20
       ORDER BY l.views DESC, orders_count ASC
       LIMIT 20`,
      [userId]
    );

    const [pricingInsights] = await pool.execute(
      `SELECT
          l.id,
          l.title,
          l.category,
          l.medium,
          l.price,
          l.views,
          COUNT(o.id) as sold_orders,
          cat.market_avg_price,
          cat.market_sales
       FROM listings l
       LEFT JOIN orders o ON o.listing_id = l.id AND o.status IN ('paid', 'shipped', 'delivered')
       LEFT JOIN (
         SELECT l2.category, AVG(o2.unit_price) as market_avg_price, COUNT(*) as market_sales
         FROM orders o2
         JOIN listings l2 ON o2.listing_id = l2.id
         WHERE o2.status IN ('paid', 'shipped', 'delivered')
         GROUP BY l2.category
       ) cat ON cat.category = l.category
       WHERE l.user_id = ? AND l.status IN ('active', 'inactive')
       GROUP BY l.id, l.title, l.category, l.medium, l.price, l.views, cat.market_avg_price, cat.market_sales
       ORDER BY l.views DESC, l.created_at DESC
       LIMIT 12`,
      [userId]
    );

    res.json({
      summary: {
        totalEarnings: parseFloat(summary[0].total_net_earnings),
        totalGrossEarnings: parseFloat(summary[0].total_gross_earnings),
        totalNetEarnings: parseFloat(summary[0].total_net_earnings),
        totalStripeFees: parseFloat(summary[0].total_stripe_fees),
        totalLabelCosts: parseFloat(summary[0].total_label_costs),
        totalCommission: parseFloat(summary[0].total_commission),
        totalDeductions: parseFloat(summary[0].total_deductions),
        netMarginPercent: parseFloat(summary[0].total_gross_earnings) > 0
          ? (parseFloat(summary[0].total_net_earnings) / parseFloat(summary[0].total_gross_earnings)) * 100
          : 0,
        totalOrders: summary[0].total_orders,
        avgOrderValue: parseFloat(summary[0].avg_order_value),
        thisMonth: parseFloat(summary[0].this_month),
        lastMonth: parseFloat(summary[0].last_month),
        ytd: parseFloat(summary[0].ytd),
      },
      revenueOverTime: revenueOverTime.map(r => ({
        month: r.month,
        earnings: parseFloat(r.net_earnings),
        grossEarnings: parseFloat(r.gross_earnings),
        netEarnings: parseFloat(r.net_earnings),
        stripeFees: parseFloat(r.stripe_fees),
        labelCosts: parseFloat(r.label_costs),
        commissionCosts: parseFloat(r.commission_costs),
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
      conversionFunnel: {
        views: viewsCount,
        likes: likesCount,
        inquiries: inquiriesCount,
        orders: ordersCount,
        viewToLikeRate: viewsCount > 0 ? (likesCount / viewsCount) * 100 : 0,
        likeToInquiryRate: likesCount > 0 ? (inquiriesCount / likesCount) * 100 : 0,
        inquiryToOrderRate: inquiriesCount > 0 ? (ordersCount / inquiriesCount) * 100 : 0,
        viewToOrderRate: viewsCount > 0 ? (ordersCount / viewsCount) * 100 : 0,
      },
      missedRevenueOpportunities: (missedOpportunities || [])
        .map((item) => {
          const price = parseFloat(item.price) || 0;
          const views = Number(item.views || 0);
          const ordersForListing = Number(item.orders_count || 0);
          const expectedOrders = views * benchmarkConversionRate;
          const potentialIncrementalOrders = Math.max(0, expectedOrders - ordersForListing);
          return {
            id: item.id,
            title: item.title,
            status: item.status,
            views,
            currentOrders: ordersForListing,
            estimatedExtraOrders: potentialIncrementalOrders,
            estimatedExtraRevenue: potentialIncrementalOrders * price,
          };
        })
        .sort((a, b) => b.estimatedExtraRevenue - a.estimatedExtraRevenue)
        .slice(0, 6),
      pricingIntelligence: (pricingInsights || []).map((item) => {
        const price = parseFloat(item.price) || 0;
        const marketAvgPrice = item.market_avg_price != null ? parseFloat(item.market_avg_price) : null;
        const soldOrders = Number(item.sold_orders || 0);
        const views = Number(item.views || 0);
        const listingConversionRate = views > 0 ? (soldOrders / views) * 100 : 0;
        const suggestedMin = marketAvgPrice != null ? marketAvgPrice * 0.9 : null;
        const suggestedMax = marketAvgPrice != null ? marketAvgPrice * 1.1 : null;
        const priceDeltaPercent = marketAvgPrice && marketAvgPrice > 0
          ? ((price - marketAvgPrice) / marketAvgPrice) * 100
          : null;
        return {
          id: item.id,
          title: item.title,
          category: item.category || 'Uncategorized',
          medium: item.medium || '',
          listingPrice: price,
          marketAvgPrice,
          suggestedMin,
          suggestedMax,
          priceDeltaPercent,
          listingConversionRate,
          soldOrders,
          views,
          marketSales: Number(item.market_sales || 0),
        };
      }),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

