import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Search users (for chat)
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    const searchLimit = parseInt(limit) || 20;
    
    if (!q || q.trim().length === 0) {
      return res.json({ users: [] });
    }

    const searchTerm = `%${q.trim()}%`;
    
    const [users] = await pool.execute(
      `SELECT 
        id,
        cognito_username,
        first_name,
        last_name,
        business_name,
        profile_image_url,
        created_at
      FROM users 
      WHERE 
        (email LIKE ? OR 
         cognito_username LIKE ? OR 
         first_name LIKE ? OR 
         last_name LIKE ? OR 
         business_name LIKE ?)
      ORDER BY 
        CASE 
          WHEN business_name LIKE ? THEN 1
          WHEN first_name LIKE ? OR last_name LIKE ? THEN 2
          WHEN email LIKE ? THEN 3
          ELSE 4
        END,
        created_at DESC
      LIMIT ${searchLimit}`,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
    );
    
    res.json({ users: users || [] });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all artists (users with active listings)
router.get('/artists/list', async (req, res) => {
  try {
    const [artists] = await pool.execute(
      `SELECT DISTINCT
        u.id,
        u.cognito_username,
        u.first_name,
        u.last_name,
        u.business_name,
        u.profile_image_url,
        COALESCE(
          u.business_name,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')),
          u.cognito_username
        ) as artist_name
      FROM users u
      INNER JOIN listings l ON u.id = l.user_id
      WHERE l.status = 'active' AND (COALESCE(u.blocked, 0) = 0)
      ORDER BY artist_name ASC`
    );
    
    res.json({ artists: artists || [] });
  } catch (error) {
    console.error('Error fetching artists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by Cognito username
router.get('/:cognitoUsername', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;
    const { requestingUser } = req.query;
    
    const [rows] = await pool.execute(
      'SELECT *, COALESCE(active, 1) as active FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = rows[0];
    // Convert MySQL TINYINT (0/1) to boolean
    user.active = Boolean(user.active);
    
    if (requestingUser && requestingUser === cognitoUsername) {
      res.json(user);
    } else {
      const { email, ...userWithoutEmail } = user;
      res.json(userWithoutEmail);
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update user profile
router.post('/', async (req, res) => {
  try {
    const {
      cognito_username,
      email,
      first_name,
      last_name,
      business_name,
      phone,
      country,
      website,
      specialties,
      experience_level,
      bio,
      profile_image_url,
      signature_url
    } = req.body;
    
    // Check if user exists
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognito_username]
    );
    
    if (existing.length > 0) {
      // Update existing user
      await pool.execute(
        `UPDATE users SET 
          email = ?, first_name = ?, last_name = ?, business_name = ?, 
          phone = ?, country = ?, website = ?, specialties = ?, 
          experience_level = ?, bio = ?, profile_image_url = ?, signature_url = ?
        WHERE cognito_username = ?`,
        [
          (email && email.trim()) || null, 
          (first_name && first_name.trim()) || null, 
          (last_name && last_name.trim()) || null, 
          (business_name && business_name.trim()) || null,
          (phone && phone.trim()) || null, 
          (country && country.trim()) || null, 
          (website && website.trim()) || null, 
          specialties ? JSON.stringify(specialties) : null,
          (experience_level && experience_level.trim()) || null, 
          (bio && bio.trim()) || null, 
          (profile_image_url && profile_image_url.trim()) || null,
          (signature_url && signature_url.trim()) || null,
          cognito_username
        ]
      );
      
      const [updated] = await pool.execute(
        'SELECT * FROM users WHERE cognito_username = ?',
        [cognito_username]
      );
      
      return res.json(updated[0]);
    } else {
      // Create new user
      const [result] = await pool.execute(
        `INSERT INTO users (
          cognito_username, email, first_name, last_name, business_name,
          phone, country, website, specialties, experience_level, bio, profile_image_url, signature_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cognito_username, 
          (email && email.trim()) || null, 
          (first_name && first_name.trim()) || null, 
          (last_name && last_name.trim()) || null, 
          (business_name && business_name.trim()) || null,
          (phone && phone.trim()) || null, 
          (country && country.trim()) || null, 
          (website && website.trim()) || null, 
          specialties ? JSON.stringify(specialties) : null,
          (experience_level && experience_level.trim()) || null, 
          (bio && bio.trim()) || null, 
          (profile_image_url && profile_image_url.trim()) || null,
          (signature_url && signature_url.trim()) || null
        ]
      );
      
      // Initialize dashboard stats
      await pool.execute(
        'INSERT INTO dashboard_stats (user_id) VALUES (?)',
        [result.insertId]
      );
      
      const [newUser] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [result.insertId]
      );
      
      res.status(201).json(newUser[0]);
    }
  } catch (error) {
    console.error('Error creating/updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user settings
router.get('/:cognitoUsername/settings', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;
    
    const [rows] = await pool.execute(
      'SELECT default_allow_comments, email_notifications, comment_notifications, default_special_instructions FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const specialInstructions = rows[0].default_special_instructions !== null && rows[0].default_special_instructions !== undefined
      ? String(rows[0].default_special_instructions)
      : '';
    
    const responseData = {
      default_allow_comments: rows[0].default_allow_comments !== 0,
      email_notifications: rows[0].email_notifications !== 0,
      comment_notifications: rows[0].comment_notifications !== 0,
      default_special_instructions: specialInstructions,
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user settings
router.put('/:cognitoUsername/settings', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;
    const { default_allow_comments, email_notifications, comment_notifications, default_special_instructions } = req.body;
    
    let specialInstructionsValue = null;
    if (default_special_instructions !== undefined && default_special_instructions !== null) {
      if (typeof default_special_instructions === 'string') {
        const trimmed = default_special_instructions.trim();
        specialInstructionsValue = trimmed.length > 0 ? trimmed : null;
      } else {
        specialInstructionsValue = String(default_special_instructions);
      }
    }
    
    const updateParams = [
      default_allow_comments !== undefined ? (default_allow_comments ? 1 : 0) : null,
      email_notifications !== undefined ? (email_notifications ? 1 : 0) : null,
      comment_notifications !== undefined ? (comment_notifications ? 1 : 0) : null,
      specialInstructionsValue,
      cognitoUsername
    ];
    
    let updateResult;
    try {
      updateResult = await pool.execute(
        `UPDATE users SET 
          default_allow_comments = ?,
          email_notifications = ?,
          comment_notifications = ?,
          default_special_instructions = ?
        WHERE cognito_username = ?`,
        updateParams
      );
    } catch (updateError) {
      if (updateError.code === 'ER_BAD_FIELD_ERROR' && updateError.message?.includes('default_special_instructions')) {
        updateResult = await pool.execute(
          `UPDATE users SET 
            default_allow_comments = ?,
            email_notifications = ?,
            comment_notifications = ?
          WHERE cognito_username = ?`,
          [
            default_allow_comments !== undefined ? (default_allow_comments ? 1 : 0) : null,
            email_notifications !== undefined ? (email_notifications ? 1 : 0) : null,
            comment_notifications !== undefined ? (comment_notifications ? 1 : 0) : null,
            cognitoUsername
          ]
        );
      } else {
        throw updateError;
      }
    }
    
    let updated;
    let hasSpecialInstructionsColumn = false;
    try {
      [updated] = await pool.execute(
        'SELECT default_allow_comments, email_notifications, comment_notifications, default_special_instructions FROM users WHERE cognito_username = ?',
        [cognitoUsername]
      );
      hasSpecialInstructionsColumn = updated.length > 0 && 'default_special_instructions' in updated[0];
    } catch (selectError) {
      if (selectError.code === 'ER_BAD_FIELD_ERROR' && selectError.message?.includes('default_special_instructions')) {
        [updated] = await pool.execute(
          'SELECT default_allow_comments, email_notifications, comment_notifications FROM users WHERE cognito_username = ?',
          [cognitoUsername]
        );
        hasSpecialInstructionsColumn = false;
      } else {
        throw selectError;
      }
    }
    
    if (updated.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // ALWAYS include default_special_instructions in response
    const responseData = {
      default_allow_comments: updated[0].default_allow_comments !== 0,
      email_notifications: updated[0].email_notifications !== 0,
      comment_notifications: updated[0].comment_notifications !== 0,
    };
    
    // Get default_special_instructions value
    if (hasSpecialInstructionsColumn && 'default_special_instructions' in updated[0]) {
      const dbValue = updated[0].default_special_instructions;
      responseData.default_special_instructions = (dbValue !== null && dbValue !== undefined) 
        ? String(dbValue) 
        : '';
    } else {
      // Column not in SELECT result - use value from request if available
      const requestValue = (default_special_instructions && typeof default_special_instructions === 'string') 
        ? default_special_instructions.trim() 
        : '';
      responseData.default_special_instructions = requestValue;
    }
    
    res.json(responseData);
  } catch (error) {
    console.error('Error updating user settings:', error);
    if (error.code === 'ER_BAD_FIELD_ERROR' || error.message?.includes('default_special_instructions')) {
      return res.status(500).json({ 
        error: 'Database column missing. Please run the migration: ALTER TABLE users ADD COLUMN default_special_instructions TEXT DEFAULT NULL AFTER comment_notifications;' 
      });
    }
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Update user profile
router.put('/:cognitoUsername', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;
    const {
      first_name,
      last_name,
      business_name,
      phone,
      country,
      website,
      specialties,
      experience_level,
      bio,
      profile_image_url,
      signature_url
    } = req.body;
    
    await pool.execute(
      `UPDATE users SET 
        first_name = ?, last_name = ?, business_name = ?, 
        phone = ?, country = ?, website = ?, specialties = ?, 
        experience_level = ?, bio = ?, profile_image_url = ?, signature_url = ?
      WHERE cognito_username = ?`,
      [
        (first_name && first_name.trim()) || null, 
        (last_name && last_name.trim()) || null, 
        (business_name && business_name.trim()) || null,
        (phone && phone.trim()) || null, 
        (country && country.trim()) || null, 
        (website && website.trim()) || null, 
        specialties ? JSON.stringify(specialties) : null,
        (experience_level && experience_level.trim()) || null, 
        (bio && bio.trim()) || null, 
        (profile_image_url && profile_image_url.trim()) || null,
        (signature_url && signature_url.trim()) || null,
        cognitoUsername
      ]
    );
    
    const [updated] = await pool.execute(
      'SELECT * FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reactivate user account (self-service)
router.put('/:cognitoUsername/reactivate', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;
    const { requestingUser } = req.query;
    
    // Only allow users to reactivate themselves
    if (!requestingUser || requestingUser !== cognitoUsername) {
      return res.status(403).json({ error: 'You can only reactivate your own account' });
    }
    
    // Check if user is blocked - blocked users cannot self-reactivate
    try {
      const [existing] = await pool.execute(
        'SELECT id, blocked FROM users WHERE cognito_username = ?',
        [cognitoUsername]
      );
      if (existing.length > 0 && (existing[0].blocked === 1 || existing[0].blocked === true)) {
        return res.status(403).json({ error: 'Your account has been blocked. Please contact support.' });
      }
    } catch (colErr) {
      if (colErr.code === 'ER_BAD_FIELD_ERROR' && colErr.message?.includes('blocked')) {
        // blocked column not yet migrated, proceed
      } else {
        throw colErr;
      }
    }
    
    // Check if active column exists
    try {
      await pool.execute('UPDATE users SET active = 1 WHERE cognito_username = ?', [cognitoUsername]);
      
      const [updated] = await pool.execute(
        'SELECT *, COALESCE(active, 1) as active FROM users WHERE cognito_username = ?',
        [cognitoUsername]
      );
      
      if (updated.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = updated[0];
      user.active = Boolean(user.active);
      
      res.json({ success: true, message: 'Account reactivated successfully', user });
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR' || error.message.includes('active')) {
        res.status(400).json({ error: 'Active column does not exist. Please contact support.' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error reactivating user:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;

