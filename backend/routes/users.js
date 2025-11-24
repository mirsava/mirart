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
        email,
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

// Get user by Cognito username
router.get('/:cognitoUsername', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;
    
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(rows[0]);
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
      'SELECT default_allow_comments, email_notifications, comment_notifications FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      default_allow_comments: rows[0].default_allow_comments !== 0,
      email_notifications: rows[0].email_notifications !== 0,
      comment_notifications: rows[0].comment_notifications !== 0,
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user settings
router.put('/:cognitoUsername/settings', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;
    const { default_allow_comments, email_notifications, comment_notifications } = req.body;
    
    await pool.execute(
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
    
    const [updated] = await pool.execute(
      'SELECT default_allow_comments, email_notifications, comment_notifications FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );
    
    if (updated.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      default_allow_comments: updated[0].default_allow_comments !== 0,
      email_notifications: updated[0].email_notifications !== 0,
      comment_notifications: updated[0].comment_notifications !== 0,
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Internal server error' });
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

export default router;

