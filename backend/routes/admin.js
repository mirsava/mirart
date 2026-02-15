import express from 'express';
import pool from '../config/database.js';
import UserRole from '../constants/userRoles.js';
import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';

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
    try {
      [orderStats] = await pool.execute('SELECT COUNT(*) as total, status FROM orders GROUP BY status');
    } catch (orderError) {
      console.warn('Orders table may not exist:', orderError.message);
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
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users', checkAdminAccess, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT * FROM users WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (email LIKE ? OR cognito_username LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR business_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;

    const [users] = await pool.execute(query, params);
    
    // Add active field if column doesn't exist (default to true)
    // Convert MySQL TINYINT (0/1) to boolean
    const usersWithActive = users.map(user => ({
      ...user,
      active: user.active !== undefined ? Boolean(user.active) : true
    }));
    const [countResult] = await pool.execute(
      search 
        ? 'SELECT COUNT(*) as total FROM users WHERE (email LIKE ? OR cognito_username LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR business_name LIKE ?)'
        : 'SELECT COUNT(*) as total FROM users',
      search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : []
    );

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
      'SELECT cognito_username, user_type FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const cognitoUsername = user.cognito_username;

    if (cognitoUsername === adminCognitoUsername) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    if (!cognitoUsername) {
      return res.status(400).json({ error: 'User does not have a Cognito username' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute('DELETE FROM orders WHERE buyer_id = ? OR seller_id = ?', [userId, userId]);
      
      await connection.execute('DELETE FROM users WHERE id = ?', [userId]);

      await connection.commit();

      try {
        const command = new AdminDeleteUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: cognitoUsername,
        });

        await cognitoClient.send(command);
      } catch (cognitoError) {
        if (cognitoError.name === 'UserNotFoundException') {
          console.warn(`User ${cognitoUsername} not found in Cognito, database deletion completed`);
        } else if (cognitoError.name === 'CredentialsProviderError' || cognitoError.message?.includes('credentials')) {
          console.warn('AWS credentials not configured. Cannot delete from Cognito.');
          console.warn('Database deletion completed.');
        } else {
          console.error('Error deleting from Cognito:', cognitoError);
        }
      }

      res.json({ success: true, message: 'User deleted successfully' });
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

export default router;




