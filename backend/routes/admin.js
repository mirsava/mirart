import express from 'express';
import pool from '../config/database.js';
import UserRole from '../constants/userRoles.js';
import { CognitoIdentityProviderClient, AdminDeleteUserCommand, AdminDisableUserCommand, AdminEnableUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_c9TqRAcz9';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const cognitoClient = new CognitoIdentityProviderClient({ 
  region: AWS_REGION
});

const router = express.Router();

const checkAdminAccess = async (req, res, next) => {
  try {
    const { cognitoUsername, groups } = req.query;
    
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

    const isAdmin = userGroups.includes(UserRole.SITE_ADMIN) || 
                   userGroups.includes('site_admin') || 
                   userGroups.includes('admin');

    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'Admin access required',
        message: `You must be a member of the '${UserRole.SITE_ADMIN}' group to access this resource.`
      });
    }

    next();
  } catch (error) {
    console.error('Admin access check error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

router.get('/stats', checkAdminAccess, async (req, res) => {
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
        + ` FROM orders WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
      );
      const [ytdRev] = await pool.execute(
        `SELECT 
          COALESCE(SUM(CASE WHEN status IN ('paid','shipped','delivered') THEN total_price ELSE 0 END), 0) as total,
          COALESCE(SUM(CASE WHEN status IN ('paid','shipped','delivered') THEN platform_fee ELSE 0 END), 0) as fees`
        + ` FROM orders WHERE YEAR(created_at) = YEAR(CURDATE())`
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
        "SELECT COUNT(*) as total FROM user_subscriptions WHERE status = 'active' AND end_date >= CURDATE()"
      );
      const [subExpired] = await pool.execute(
        "SELECT COUNT(*) as total FROM user_subscriptions WHERE status = 'expired'"
      );
      const [subCancelled] = await pool.execute(
        "SELECT COUNT(*) as total FROM user_subscriptions WHERE status = 'cancelled'"
      );
      const [subThisMonth] = await pool.execute(
        "SELECT COUNT(*) as total FROM user_subscriptions WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())"
      );
      const [subYtd] = await pool.execute(
        "SELECT COUNT(*) as total FROM user_subscriptions WHERE YEAR(created_at) = YEAR(CURDATE())"
      );
      const [subByPlan] = await pool.execute(
        `SELECT sp.name, COUNT(*) as total FROM user_subscriptions us
         JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE us.status = 'active' AND us.end_date >= CURDATE()
         GROUP BY sp.id, sp.name`
      );
      const [subByBilling] = await pool.execute(
        `SELECT billing_period, COUNT(*) as total FROM user_subscriptions
         WHERE status = 'active' AND end_date >= CURDATE()
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

router.get('/users', checkAdminAccess, async (req, res) => {
  try {
    // Ensure blocked column exists (auto-migrate if missing)
    try {
      await pool.execute('SELECT blocked FROM users LIMIT 1');
    } catch (colError) {
      if (colError.code === 'ER_BAD_FIELD_ERROR' && colError.message?.includes('blocked')) {
        try {
          await pool.execute('ALTER TABLE users ADD COLUMN blocked TINYINT(1) DEFAULT 0');
        } catch (alterError) {
          if (alterError.code !== 'ER_DUP_FIELDNAME') {
            console.warn('Could not add blocked column:', alterError.message);
          }
        }
      }
    }

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
        query += " AND us.status = 'active' AND us.end_date >= CURDATE()";
        countQuery += " AND us.status = 'active' AND us.end_date >= CURDATE()";
      } else if (subscriptionFilter === 'expired') {
        query += " AND us.status = 'expired'";
        countQuery += " AND us.status = 'expired'";
      } else if (subscriptionFilter === 'this_month') {
        query += ' AND YEAR(us.created_at) = YEAR(CURDATE()) AND MONTH(us.created_at) = MONTH(CURDATE())';
        countQuery += ' AND YEAR(us.created_at) = YEAR(CURDATE()) AND MONTH(us.created_at) = MONTH(CURDATE())';
      } else if (subscriptionFilter === 'ytd') {
        query += ' AND YEAR(us.created_at) = YEAR(CURDATE())';
        countQuery += ' AND YEAR(us.created_at) = YEAR(CURDATE())';
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
        query += ' AND (u.email LIKE ? OR u.cognito_username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.business_name LIKE ?)';
        countQuery += ' AND (u.email LIKE ? OR u.cognito_username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.business_name LIKE ?)';
      } else {
        query += ' AND (email LIKE ? OR cognito_username LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR business_name LIKE ?)';
        countQuery += ' AND (email LIKE ? OR cognito_username LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR business_name LIKE ?)';
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
    
    // Add active and blocked fields, convert MySQL TINYINT to boolean
    const usersWithActive = users.map(user => ({
      ...user,
      active: user.active !== undefined ? Boolean(user.active) : true,
      blocked: user.blocked === 1 || user.blocked === true || user.blocked === '1'
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

router.get('/listings', checkAdminAccess, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT l.*, 
        COALESCE(
          u.business_name,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')),
          u.cognito_username,
          u.email
        ) as artist_name,
        u.cognito_username,
        u.email as artist_email
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

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

    const listingsWithParsedUrls = listings.map(listing => {
      let parsedImageUrls = null;
      if (listing.image_urls && listing.image_urls !== 'null' && listing.image_urls !== '') {
        try {
          const imageUrlsStr = String(listing.image_urls).trim();
          if (imageUrlsStr.startsWith('[') || imageUrlsStr.startsWith('{')) {
            parsedImageUrls = JSON.parse(imageUrlsStr);
          } else if (imageUrlsStr.startsWith('http://') || imageUrlsStr.startsWith('https://') || imageUrlsStr.startsWith('/')) {
            parsedImageUrls = [imageUrlsStr];
          } else {
            parsedImageUrls = JSON.parse(imageUrlsStr);
          }
        } catch (parseError) {
          parsedImageUrls = null;
        }
      }
      return {
        ...listing,
        price: listing.price ? parseFloat(listing.price) : null,
        image_urls: parsedImageUrls,
      };
    });

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

router.get('/messages', checkAdminAccess, async (req, res) => {
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
          u_sender.cognito_username,
          m.sender_name
        ) as sender_name_display,
        COALESCE(
          u_recipient.business_name,
          CONCAT(COALESCE(u_recipient.first_name, ''), ' ', COALESCE(u_recipient.last_name, '')),
          u_recipient.cognito_username
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

router.get('/orders', checkAdminAccess, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    let baseQuery = `
      SELECT o.*,
        l.title as listing_title,
        l.primary_image_url,
        u_buyer.email as buyer_email,
        u_seller.email as seller_email,
        COALESCE(u_buyer.business_name, CONCAT(COALESCE(u_buyer.first_name, ''), ' ', COALESCE(u_buyer.last_name, '')), u_buyer.cognito_username) as buyer_name,
        COALESCE(u_seller.business_name, CONCAT(COALESCE(u_seller.first_name, ''), ' ', COALESCE(u_seller.last_name, '')), u_seller.cognito_username) as seller_name
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

    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      baseQuery += ' AND (o.order_number LIKE ? OR l.title LIKE ? OR u_buyer.email LIKE ? OR u_seller.email LIKE ? OR u_buyer.cognito_username LIKE ? OR u_seller.cognito_username LIKE ?)';
      params.push(term, term, term, term, term, term);
      countParams.push(term, term, term, term, term, term);
    }

    let countQuery = `SELECT COUNT(*) as total FROM orders o
      JOIN listings l ON o.listing_id = l.id
      JOIN users u_buyer ON o.buyer_id = u_buyer.id
      JOIN users u_seller ON o.seller_id = u_seller.id
      WHERE 1=1`;
    if (status && status !== 'all') countQuery += ' AND o.status = ?';
    if (search && String(search).trim()) countQuery += ' AND (o.order_number LIKE ? OR l.title LIKE ? OR u_buyer.email LIKE ? OR u_seller.email LIKE ? OR u_buyer.cognito_username LIKE ? OR u_seller.cognito_username LIKE ?)';
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

router.put('/users/:cognitoUsername/user-type', checkAdminAccess, async (req, res) => {
  try {
    const { cognitoUsername } = req.params;
    const { user_type } = req.body;

    const validUserTypes = [UserRole.ARTIST, UserRole.BUYER, UserRole.SITE_ADMIN];
    if (!validUserTypes.includes(user_type)) {
      return res.status(400).json({ error: 'Invalid user_type' });
    }

    await pool.execute(
      'UPDATE users SET user_type = ? WHERE cognito_username = ?',
      [user_type, cognitoUsername]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/listings/:id/inactivate', checkAdminAccess, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.execute('UPDATE listings SET status = ? WHERE id = ?', ['archived', id]);

    res.json({ success: true, message: 'Listing inactivated successfully' });
  } catch (error) {
    console.error('Error inactivating listing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/listings/:id/status', checkAdminAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'active', 'inactive', 'sold', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: draft, active, inactive, sold, archived' });
    }

    await pool.execute('UPDATE listings SET status = ? WHERE id = ?', [status, id]);

    res.json({ success: true, message: `Listing status updated to ${status} successfully` });
  } catch (error) {
    console.error('Error updating listing status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/listings/:id', checkAdminAccess, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.execute('DELETE FROM listings WHERE id = ?', [id]);

    res.json({ success: true, message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/users/:userId', checkAdminAccess, async (req, res) => {
  let connection;
  try {
    const { userId } = req.params;
    const { cognitoUsername: adminCognitoUsername } = req.query;

    const [users] = await pool.execute(
      'SELECT cognito_username, email, user_type FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const cognitoUsername = user.cognito_username;
    const userEmail = user.email;
    const cognitoUsernameToUse = cognitoUsername || userEmail;

    if (cognitoUsername === adminCognitoUsername) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    if (!cognitoUsernameToUse) {
      return res.status(400).json({ error: 'User does not have a Cognito username or email' });
    }

    // Try to delete from Cognito (requires IAM). If credentials not configured, proceed with DB-only delete.
    let cognitoDeleted = false;
    try {
      const command = new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: cognitoUsernameToUse,
      });
      await cognitoClient.send(command);
      cognitoDeleted = true;
    } catch (cognitoError) {
      if (cognitoError.name === 'UserNotFoundException') {
        console.warn(`User ${cognitoUsernameToUse} not found in Cognito, proceeding with database deletion`);
      } else if (cognitoError.name === 'CredentialsProviderError' || cognitoError.message?.includes('credentials')) {
        console.warn('AWS credentials not configured. Deleting from database only. User may still exist in Cognito.');
      } else {
        console.error('Cognito delete error:', cognitoError);
        return res.status(502).json({
          error: 'Failed to delete user from Cognito',
          details: cognitoError.message || 'Cognito API error',
        });
      }
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute('DELETE FROM orders WHERE buyer_id = ? OR seller_id = ?', [userId, userId]);
      await connection.execute('DELETE FROM users WHERE id = ?', [userId]);
      await connection.commit();

      res.json({
        success: true,
        message: cognitoDeleted ? 'User deleted successfully' : 'User removed from database. (Cognito deletion skipped — add AWS credentials to delete from Cognito too.)',
      });
    } catch (dbError) {
      if (connection) {
        await connection.rollback();
      }
      throw dbError;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    const errorMessage = error.message || 'Unknown error occurred';
    const errorCode = error.code || 'UNKNOWN_ERROR';
    
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.message?.includes('foreign key constraint')) {
      return res.status(400).json({ 
        error: 'Cannot delete user', 
        details: 'User has related records that prevent deletion. Please contact support.',
        code: errorCode
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error', 
      details: errorMessage,
      code: errorCode
    });
  }
});

router.put('/users/:userId/activate', checkAdminAccess, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if active column exists
    try {
      await pool.execute('UPDATE users SET active = 1 WHERE id = ?', [userId]);
      res.json({ success: true, message: 'User activated successfully' });
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR' || error.message.includes('active')) {
        res.status(400).json({ error: 'Active column does not exist. Please run the migration first.' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error activating user:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.put('/users/:userId/deactivate', checkAdminAccess, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if active column exists
    try {
      await pool.execute('UPDATE users SET active = 0 WHERE id = ?', [userId]);
      res.json({ success: true, message: 'User deactivated successfully' });
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR' || error.message.includes('active')) {
        res.status(400).json({ error: 'Active column does not exist. Please run the migration first.' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Block user: disables in Cognito so they cannot sign in. Prevents creating account with same credential.
router.put('/users/:userId/block', checkAdminAccess, async (req, res) => {
  try {
    const { userId } = req.params;

    const [users] = await pool.execute(
      'SELECT cognito_username, email FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cognitoUsername = users[0].cognito_username || users[0].email;
    if (!cognitoUsername) {
      return res.status(400).json({ error: 'User does not have Cognito username or email' });
    }

    // Disable user in Cognito (prevents sign-in)
    try {
      await cognitoClient.send(new AdminDisableUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: cognitoUsername,
      }));
    } catch (cognitoError) {
      if (cognitoError.name === 'UserNotFoundException') {
        console.warn(`User ${cognitoUsername} not found in Cognito, proceeding with DB update`);
      } else if (cognitoError.name === 'CredentialsProviderError' || cognitoError.message?.includes('credentials')) {
        console.warn('AWS credentials not configured. Updating database only.');
      } else {
        console.error('Cognito disable error:', cognitoError);
        return res.status(502).json({
          error: 'Failed to block user in Cognito',
          details: cognitoError.message || 'Cognito API error',
        });
      }
    }

    // Ensure blocked column exists, then update
    try {
      await pool.execute('SELECT blocked FROM users LIMIT 1');
    } catch (colErr) {
      if (colErr.code === 'ER_BAD_FIELD_ERROR' && colErr.message?.includes('blocked')) {
        await pool.execute('ALTER TABLE users ADD COLUMN blocked TINYINT(1) DEFAULT 0');
      }
    }
    await pool.execute('UPDATE users SET active = 0, blocked = 1 WHERE id = ?', [userId]);

    res.json({ success: true, message: 'User blocked successfully. They cannot sign in or create an account with the same credentials.' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Unblock user: re-enables in Cognito
router.put('/users/:userId/unblock', checkAdminAccess, async (req, res) => {
  try {
    const { userId } = req.params;

    const [users] = await pool.execute(
      'SELECT cognito_username, email FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cognitoUsername = users[0].cognito_username || users[0].email;
    if (!cognitoUsername) {
      return res.status(400).json({ error: 'User does not have Cognito username or email' });
    }

    // Enable user in Cognito
    try {
      await cognitoClient.send(new AdminEnableUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: cognitoUsername,
      }));
    } catch (cognitoError) {
      if (cognitoError.name === 'UserNotFoundException') {
        console.warn(`User ${cognitoUsername} not found in Cognito, proceeding with DB update`);
      } else if (cognitoError.name === 'CredentialsProviderError' || cognitoError.message?.includes('credentials')) {
        console.warn('AWS credentials not configured. Updating database only.');
      } else {
        console.error('Cognito enable error:', cognitoError);
        return res.status(502).json({
          error: 'Failed to unblock user in Cognito',
          details: cognitoError.message || 'Cognito API error',
        });
      }
    }

    // Update DB: set active=1, blocked=0
    try {
      await pool.execute('UPDATE users SET active = 1, blocked = 0 WHERE id = ?', [userId]);
    } catch (dbError) {
      if (dbError.code === 'ER_BAD_FIELD_ERROR' && dbError.message?.includes('blocked')) {
        await pool.execute('UPDATE users SET active = 1 WHERE id = ?', [userId]);
      } else {
        throw dbError;
      }
    }

    res.json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;




