import express from 'express';
import pool from '../config/database.js';
import { createNotification } from '../services/notificationService.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import { requireAdmin, clearAuthCache } from '../middleware/auth.js';
import { parseImageUrls } from '../utils/json.js';
import { logActivity, logListingActivity } from '../services/activityLog.js';
import { getUserHistory } from '../services/userHistory.js';

const router = express.Router();

router.use(requireAdmin);

// Supabase returns { error } instead of throwing; "not found" is fine when the target is already gone.
const isAuthUserNotFound = (error) => error?.status === 404 || error?.code === 'user_not_found';

router.post('/notifications/send', async (req, res) => {
  try {
    const { title, body, link, target, user_ids, severity } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    let userIds = [];
    if (target === 'all') {
      const [rows] = await pool.execute('SELECT id FROM users');
      userIds = rows.map((r) => r.id);
    } else if (target === 'specific' && Array.isArray(user_ids) && user_ids.length > 0) {
      userIds = user_ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
    } else {
      return res.status(400).json({ error: 'Invalid target. Use "all" or "specific" with user_ids array.' });
    }
    if (userIds.length === 0) {
      return res.status(400).json({ error: 'No users to notify' });
    }
    let created = 0;
    for (const userId of userIds) {
      try {
        await createNotification({
          userId,
          type: 'admin',
          title: title.trim(),
          body: body?.trim() || null,
          link: link?.trim() || null,
          referenceId: null,
          severity: ['info', 'warning', 'success', 'error'].includes(severity) ? severity : 'info',
        });
        created++;
      } catch (err) {
        console.warn('Failed to notify user', userId, err.message);
      }
    }
    res.json({ success: true, sent: created, total: userIds.length });
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [userStats] = await pool.execute('SELECT COUNT(*) as total FROM users');
    const [listingStats] = await pool.execute('SELECT COUNT(*) as total, status FROM listings GROUP BY status');
    const [messageStats] = await pool.execute('SELECT COUNT(*) as total FROM messages');
    
    let orderStats = [];
    let orderRevenue = { total: 0, platformFees: 0, thisMonth: 0, thisMonthFees: 0, ytd: 0, ytdFees: 0 };
    try {
      [orderStats] = await pool.execute('SELECT COUNT(*) as total, status FROM orders GROUP BY status');
      const [rev] = await pool.execute(
        `SELECT 
          COALESCE(SUM(CASE WHEN status IN ('paid','shipped','delivered') THEN total_price ELSE 0 END), 0) as total,
          COALESCE(SUM(CASE WHEN status IN ('paid','shipped','delivered') THEN platform_fee ELSE 0 END), 0) as fees`
        + ` FROM orders`
      );
      const [monthRev] = await pool.execute(
        `SELECT 
          COALESCE(SUM(CASE WHEN status IN ('paid','shipped','delivered') THEN total_price ELSE 0 END), 0) as total,
          COALESCE(SUM(CASE WHEN status IN ('paid','shipped','delivered') THEN platform_fee ELSE 0 END), 0) as fees`
        + ` FROM orders WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)`
      );
      const [ytdRev] = await pool.execute(
        `SELECT 
          COALESCE(SUM(CASE WHEN status IN ('paid','shipped','delivered') THEN total_price ELSE 0 END), 0) as total,
          COALESCE(SUM(CASE WHEN status IN ('paid','shipped','delivered') THEN platform_fee ELSE 0 END), 0) as fees`
        + ` FROM orders WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)`
      );
      orderRevenue = {
        total: parseFloat(rev[0]?.total || 0),
        platformFees: parseFloat(rev[0]?.fees || 0),
        thisMonth: parseFloat(monthRev[0]?.total || 0),
        thisMonthFees: parseFloat(monthRev[0]?.fees || 0),
        ytd: parseFloat(ytdRev[0]?.total || 0),
        ytdFees: parseFloat(ytdRev[0]?.fees || 0),
      };
    } catch (orderError) {
      console.warn('Orders table may not exist:', orderError.message);
    }

    let subscriptionStats = {
      total: 0,
      thisMonth: 0,
      ytd: 0,
      active: 0,
      expired: 0,
      cancelled: 0,
      byPlan: {},
      byBilling: { monthly: 0, yearly: 0 },
    };
    try {
      const [subActive] = await pool.execute(
        "SELECT COUNT(*) as total FROM user_subscriptions WHERE status = 'active' AND end_date >= CURRENT_DATE"
      );
      const [subExpired] = await pool.execute(
        "SELECT COUNT(*) as total FROM user_subscriptions WHERE status = 'expired'"
      );
      const [subCancelled] = await pool.execute(
        "SELECT COUNT(*) as total FROM user_subscriptions WHERE status = 'cancelled'"
      );
      const [subThisMonth] = await pool.execute(
        "SELECT COUNT(*) as total FROM user_subscriptions WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)"
      );
      const [subYtd] = await pool.execute(
        "SELECT COUNT(*) as total FROM user_subscriptions WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)"
      );
      const [subByPlan] = await pool.execute(
        `SELECT sp.name, COUNT(*) as total FROM user_subscriptions us
         JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE us.status = 'active' AND us.end_date >= CURRENT_DATE
         GROUP BY sp.id, sp.name`
      );
      const [subByBilling] = await pool.execute(
        `SELECT billing_period, COUNT(*) as total FROM user_subscriptions
         WHERE status = 'active' AND end_date >= CURRENT_DATE
         GROUP BY billing_period`
      );
      const byPlan = {};
      subByPlan.forEach(p => { byPlan[p.name] = p.total; });
      const byBilling = { monthly: 0, yearly: 0 };
      subByBilling.forEach(b => { byBilling[b.billing_period] = b.total; });
      subscriptionStats = {
        total: (subActive[0]?.total || 0) + (subExpired[0]?.total || 0) + (subCancelled[0]?.total || 0),
        thisMonth: subThisMonth[0]?.total || 0,
        ytd: subYtd[0]?.total || 0,
        active: subActive[0]?.total || 0,
        expired: subExpired[0]?.total || 0,
        cancelled: subCancelled[0]?.total || 0,
        byPlan,
        byBilling,
      };
    } catch (subError) {
      console.warn('user_subscriptions table may not exist:', subError.message);
    }

    const listingsByStatus = {};
    listingStats.forEach(stat => {
      listingsByStatus[stat.status] = stat.total;
    });

    const ordersByStatus = {};
    orderStats.forEach(stat => {
      ordersByStatus[stat.status] = stat.total;
    });

    res.json({
      users: {
        total: userStats[0].total,
      },
      listings: {
        total: Object.values(listingsByStatus).reduce((a, b) => a + b, 0),
        byStatus: listingsByStatus,
      },
      messages: {
        total: messageStats[0].total,
      },
      orders: {
        total: Object.values(ordersByStatus).reduce((a, b) => a + b, 0),
        byStatus: ordersByStatus,
        revenue: orderRevenue,
      },
      subscriptions: subscriptionStats,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Full history for the admin "User details" panel.
router.get('/users/:id/history', async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'User not found' });
    const history = await getUserHistory(Number(req.params.id));
    if (!history) return res.status(404).json({ error: 'User not found' });
    res.json(history);
  } catch (error) {
    console.error('Error fetching user history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = rows[0];
    res.json({
      ...user,
      active: user.active !== undefined ? Boolean(user.active) : true,
      blocked: Boolean(user.blocked),
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, subscriptionFilter, subscriptionPlan, subscriptionBilling } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    let query, countQuery;
    const params = [];
    const countParams = [];

    if (subscriptionFilter || subscriptionPlan || subscriptionBilling) {
      query = `SELECT DISTINCT u.* FROM users u
        JOIN user_subscriptions us ON u.id = us.user_id
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE 1=1`;
      countQuery = `SELECT COUNT(DISTINCT u.id) as total FROM users u
        JOIN user_subscriptions us ON u.id = us.user_id
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE 1=1`;
      if (subscriptionFilter === 'active') {
        query += " AND us.status = 'active' AND us.end_date >= CURRENT_DATE";
        countQuery += " AND us.status = 'active' AND us.end_date >= CURRENT_DATE";
      } else if (subscriptionFilter === 'expired') {
        query += " AND us.status = 'expired'";
        countQuery += " AND us.status = 'expired'";
      } else if (subscriptionFilter === 'this_month') {
        query += ' AND EXTRACT(YEAR FROM us.created_at) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM us.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)';
        countQuery += ' AND EXTRACT(YEAR FROM us.created_at) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM us.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)';
      } else if (subscriptionFilter === 'ytd') {
        query += ' AND EXTRACT(YEAR FROM us.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)';
        countQuery += ' AND EXTRACT(YEAR FROM us.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)';
      }
      if (subscriptionPlan) {
        query += ' AND sp.name = ?';
        countQuery += ' AND sp.name = ?';
        params.push(subscriptionPlan);
        countParams.push(subscriptionPlan);
      }
      if (subscriptionBilling) {
        query += ' AND us.billing_period = ?';
        countQuery += ' AND us.billing_period = ?';
        params.push(subscriptionBilling);
        countParams.push(subscriptionBilling);
      }
    } else {
      query = 'SELECT * FROM users WHERE 1=1';
      countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    }

    const hasSubscriptionFilter = subscriptionFilter || subscriptionPlan || subscriptionBilling;
    if (search) {
      const searchTerm = `%${search}%`;
      if (hasSubscriptionFilter) {
        query += ' AND (u.email ILIKE ? OR u.username ILIKE ? OR u.first_name ILIKE ? OR u.last_name ILIKE ? OR u.business_name ILIKE ?)';
        countQuery += ' AND (u.email ILIKE ? OR u.username ILIKE ? OR u.first_name ILIKE ? OR u.last_name ILIKE ? OR u.business_name ILIKE ?)';
      } else {
        query += ' AND (email ILIKE ? OR username ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ? OR business_name ILIKE ?)';
        countQuery += ' AND (email ILIKE ? OR username ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ? OR business_name ILIKE ?)';
      }
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (hasSubscriptionFilter) {
      query += ' ORDER BY u.created_at DESC';
    } else {
      query += ' ORDER BY created_at DESC';
    }
    query += ` LIMIT ${limitNum} OFFSET ${offset}`;

    const [users] = await pool.execute(query, params);
    
    const usersWithActive = users.map(user => ({
      ...user,
      active: user.active !== undefined ? Boolean(user.active) : true,
      blocked: Boolean(user.blocked)
    }));

    const countParamsToUse = hasSubscriptionFilter ? countParams : (search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : []);
    const [countResult] = await pool.execute(countQuery, countParamsToUse);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      users: usersWithActive,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.get('/listings', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category, search } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT l.*, 
        COALESCE(
          u.business_name,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')),
          u.username,
          u.email
        ) as artist_name,
        u.auth_user_id,
        u.email as artist_email
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (l.title ILIKE ? OR l.description ILIKE ? OR u.business_name ILIKE ? OR u.first_name ILIKE ? OR u.last_name ILIKE ? OR u.email ILIKE ?)';
      const term = `%${String(search)}%`;
      params.push(term, term, term, term, term, term);
    }

    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }

    if (category) {
      query += ' AND l.category = ?';
      params.push(category);
    }

    query += ` ORDER BY l.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;

    const [listings] = await pool.execute(query, params);
    
    let countQuery = `
      SELECT COUNT(*) as total
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    const countParams = [];

    if (search) {
      countQuery += ' AND (l.title ILIKE ? OR l.description ILIKE ? OR u.business_name ILIKE ? OR u.first_name ILIKE ? OR u.last_name ILIKE ? OR u.email ILIKE ?)';
      const term = `%${String(search)}%`;
      countParams.push(term, term, term, term, term, term);
    }

    if (status) {
      countQuery += ' AND l.status = ?';
      countParams.push(status);
    }

    if (category) {
      countQuery += ' AND l.category = ?';
      countParams.push(category);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limitNum);

    const listingsWithParsedUrls = listings.map(listing => ({
      ...listing,
      price: listing.price ? parseFloat(listing.price) : null,
      image_urls: parseImageUrls(listing.image_urls),
    }));

    res.json({
      listings: listingsWithParsedUrls,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.get('/messages', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    const query = `
      SELECT m.*, 
        l.title as listing_title,
        u_sender.email as sender_email_display,
        u_recipient.email as recipient_email_display,
        COALESCE(
          u_sender.business_name,
          CONCAT(COALESCE(u_sender.first_name, ''), ' ', COALESCE(u_sender.last_name, '')),
          u_sender.username,
          m.sender_name
        ) as sender_name_display,
        COALESCE(
          u_recipient.business_name,
          CONCAT(COALESCE(u_recipient.first_name, ''), ' ', COALESCE(u_recipient.last_name, '')),
          u_recipient.username
        ) as recipient_name
      FROM messages m
      LEFT JOIN listings l ON m.listing_id = l.id
      LEFT JOIN users u_sender ON m.sender_id = u_sender.id
      LEFT JOIN users u_recipient ON m.recipient_id = u_recipient.id
      ORDER BY m.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const [messages] = await pool.execute(query);
    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM messages');
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      messages: messages || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, buyer_id, seller_id, user_id } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    let baseQuery = `
      SELECT o.*,
        l.title as listing_title,
        l.primary_image_url,
        u_buyer.email as buyer_email,
        u_seller.email as seller_email,
        COALESCE(u_buyer.business_name, CONCAT(COALESCE(u_buyer.first_name, ''), ' ', COALESCE(u_buyer.last_name, '')), u_buyer.username) as buyer_name,
        COALESCE(u_seller.business_name, CONCAT(COALESCE(u_seller.first_name, ''), ' ', COALESCE(u_seller.last_name, '')), u_seller.username) as seller_name
      FROM orders o
      JOIN listings l ON o.listing_id = l.id
      JOIN users u_buyer ON o.buyer_id = u_buyer.id
      JOIN users u_seller ON o.seller_id = u_seller.id
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];

    if (status && status !== 'all') {
      baseQuery += ' AND o.status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (user_id) {
      const uid = parseInt(user_id, 10);
      baseQuery += ' AND (o.buyer_id = ? OR o.seller_id = ?)';
      params.push(uid, uid);
      countParams.push(uid, uid);
    } else {
      if (buyer_id) {
        baseQuery += ' AND o.buyer_id = ?';
        params.push(parseInt(buyer_id, 10));
        countParams.push(parseInt(buyer_id, 10));
      }
      if (seller_id) {
        baseQuery += ' AND o.seller_id = ?';
        params.push(parseInt(seller_id, 10));
        countParams.push(parseInt(seller_id, 10));
      }
    }
    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      baseQuery += ' AND (o.order_number ILIKE ? OR l.title ILIKE ? OR u_buyer.email ILIKE ? OR u_seller.email ILIKE ? OR u_buyer.username ILIKE ? OR u_seller.username ILIKE ?)';
      params.push(term, term, term, term, term, term);
      countParams.push(term, term, term, term, term, term);
    }

    let countQuery = `SELECT COUNT(*) as total FROM orders o
      JOIN listings l ON o.listing_id = l.id
      JOIN users u_buyer ON o.buyer_id = u_buyer.id
      JOIN users u_seller ON o.seller_id = u_seller.id
      WHERE 1=1`;
    if (status && status !== 'all') countQuery += ' AND o.status = ?';
    if (user_id) countQuery += ' AND (o.buyer_id = ? OR o.seller_id = ?)';
    else {
      if (buyer_id) countQuery += ' AND o.buyer_id = ?';
      if (seller_id) countQuery += ' AND o.seller_id = ?';
    }
    if (search && String(search).trim()) countQuery += ' AND (o.order_number ILIKE ? OR l.title ILIKE ? OR u_buyer.email ILIKE ? OR u_seller.email ILIKE ? OR u_buyer.username ILIKE ? OR u_seller.username ILIKE ?)';
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limitNum);

    baseQuery += ' ORDER BY o.created_at DESC';
    baseQuery += ` LIMIT ${limitNum} OFFSET ${offset}`;

    const [orders] = await pool.execute(baseQuery, params);

    res.json({
      orders: orders.map(o => ({
        ...o,
        unit_price: parseFloat(o.unit_price),
        total_price: parseFloat(o.total_price),
        platform_fee: parseFloat(o.platform_fee),
        artist_earnings: parseFloat(o.artist_earnings),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/orders/:orderId/shipping', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { tracking_number, tracking_url, status } = req.body;

    const [orders] = await pool.execute('SELECT id, status, buyer_id, order_number FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orders[0];

    const updates = [];
    const params = [];

    if (tracking_number !== undefined) {
      updates.push('tracking_number = ?');
      params.push(tracking_number || null);
    }
    if (tracking_url !== undefined) {
      updates.push('tracking_url = ?');
      params.push(tracking_url || null);
    }
    if (status && ['paid', 'shipped', 'delivered'].includes(status)) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(orderId);
    await pool.execute(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    if (status && ['shipped', 'delivered'].includes(status) && order.buyer_id) {
      try {
        await createNotification({
          userId: order.buyer_id,
          type: 'order',
          title: status === 'shipped' ? 'Order shipped' : 'Order delivered',
          body: `Order ${order.order_number} has been ${status}.`,
          link: '/orders',
          referenceId: orderId,
        });
      } catch (nErr) {
        console.warn('Could not create notification:', nErr.message);
      }
    }

    res.json({ success: true, message: 'Shipping updated' });
  } catch (error) {
    console.error('Error updating order shipping:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/users/:authUserId/user-type', async (req, res) => {
  try {
    const { authUserId } = req.params;
    const { user_type } = req.body;

    const dbType = user_type === 'site_admin' ? 'admin' : user_type;
    if (!['artist', 'buyer', 'admin'].includes(dbType)) {
      return res.status(400).json({ error: 'Invalid user_type' });
    }
    if (authUserId === req.auth.authUserId && dbType !== 'admin') {
      return res.status(400).json({ error: 'You cannot remove your own admin role' });
    }

    const [before] = await pool.execute('SELECT id, user_type FROM users WHERE auth_user_id = ?', [authUserId]);
    await pool.execute(
      'UPDATE users SET user_type = ? WHERE auth_user_id = ?',
      [dbType, authUserId]
    );
    clearAuthCache();
    if (before[0] && before[0].user_type !== dbType) {
      await logActivity({ userId: before[0].id, actorId: req.auth.userId, action: 'user_type_changed', details: { from: before[0].user_type, to: dbType } });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/listings/:id/inactivate', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.execute('UPDATE listings SET status = ? WHERE id = ?', ['archived', id]);
    await logListingActivity(id, { actorId: req.auth.userId, action: 'listing_status_changed', details: { to: 'archived', by_admin: true } });

    res.json({ success: true, message: 'Listing inactivated successfully' });
  } catch (error) {
    console.error('Error inactivating listing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/listings/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'active', 'inactive', 'sold', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: draft, active, inactive, sold, archived' });
    }

    const [before] = await pool.execute('SELECT user_id, title, status FROM listings WHERE id = ?', [id]);
    await pool.execute('UPDATE listings SET status = ? WHERE id = ?', [status, id]);
    if (before[0] && before[0].status !== status) {
      await logListingActivity(id, { actorId: req.auth.userId, action: 'listing_status_changed', listing: before[0], details: { from: before[0].status, to: status, by_admin: true } });
    }

    res.json({ success: true, message: `Listing status updated to ${status} successfully` });
  } catch (error) {
    console.error('Error updating listing status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [before] = await pool.execute('SELECT user_id, title FROM listings WHERE id = ?', [id]);
    await pool.execute('DELETE FROM listings WHERE id = ?', [id]);
    if (before[0]) await logListingActivity(id, { actorId: req.auth.userId, action: 'listing_deleted', listing: before[0], details: { by_admin: true } });

    res.json({ success: true, message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [users] = await pool.execute('SELECT auth_user_id, email FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { auth_user_id: authUserId } = users[0];
    if (authUserId === req.auth.authUserId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await pool.execute('DELETE FROM orders WHERE buyer_id = ? OR seller_id = ?', [userId, userId]);

    // Deleting the auth user cascades to the profile row and everything hanging off it.
    const { error: authError } = await getSupabaseAdmin().auth.admin.deleteUser(authUserId);
    if (authError && !isAuthUserNotFound(authError)) {
      console.error('Supabase delete user error:', authError);
      return res.status(502).json({ error: 'Failed to delete user from Supabase Auth', details: authError.message });
    }
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    // Kept after deletion (activity_log has no foreign key), so there is a record of who removed the account.
    await logActivity({ userId: Number(userId), actorId: req.auth.userId, action: 'user_deleted', details: { email: users[0].email } });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Cannot delete user',
        details: 'User has related records that prevent deletion. Please contact support.',
        code: error.code,
      });
    }
    res.status(500).json({ error: 'Internal server error', details: error.message, code: error.code || 'UNKNOWN_ERROR' });
  }
});

router.put('/users/:userId/activate', async (req, res) => {
  try {
    await pool.execute('UPDATE users SET active = TRUE WHERE id = ?', [req.params.userId]);
    await logActivity({ userId: Number(req.params.userId), actorId: req.auth.userId, action: 'user_activated' });
    res.json({ success: true, message: 'User activated successfully' });
  } catch (error) {
    console.error('Error activating user:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/users/:userId/deactivate', async (req, res) => {
  try {
    await pool.execute('UPDATE users SET active = FALSE WHERE id = ?', [req.params.userId]);
    await logActivity({ userId: Number(req.params.userId), actorId: req.auth.userId, action: 'user_deactivated' });
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Ban duration long enough to be permanent; 'none' lifts it.
const setBanned = async (authUserId, banned) => {
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(authUserId, {
    ban_duration: banned ? '876000h' : 'none',
  });
  if (error && !isAuthUserNotFound(error)) throw error;
};

// Block user: bans them in Supabase Auth so they cannot sign in.
router.put('/users/:userId/block', async (req, res) => {
  try {
    const { userId } = req.params;

    const [users] = await pool.execute('SELECT auth_user_id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (users[0].auth_user_id === req.auth.authUserId) {
      return res.status(400).json({ error: 'Cannot block your own account' });
    }

    try {
      await setBanned(users[0].auth_user_id, true);
    } catch (authError) {
      console.error('Supabase ban error:', authError);
      return res.status(502).json({ error: 'Failed to block user in Supabase Auth', details: authError.message });
    }

    await pool.execute('UPDATE users SET active = FALSE, blocked = TRUE WHERE id = ?', [userId]);
    clearAuthCache();
    await logActivity({ userId: Number(userId), actorId: req.auth.userId, action: 'user_blocked' });

    res.json({ success: true, message: 'User blocked successfully. They cannot sign in.' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Unblock user: lifts the Supabase Auth ban.
router.put('/users/:userId/unblock', async (req, res) => {
  try {
    const { userId } = req.params;

    const [users] = await pool.execute('SELECT auth_user_id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    try {
      await setBanned(users[0].auth_user_id, false);
    } catch (authError) {
      console.error('Supabase unban error:', authError);
      return res.status(502).json({ error: 'Failed to unblock user in Supabase Auth', details: authError.message });
    }

    await pool.execute('UPDATE users SET active = TRUE, blocked = FALSE WHERE id = ?', [userId]);
    clearAuthCache();
    await logActivity({ userId: Number(userId), actorId: req.auth.userId, action: 'user_unblocked' });

    res.json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
