import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

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
      profile_image_url
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
          experience_level = ?, bio = ?, profile_image_url = ?
        WHERE cognito_username = ?`,
        [
          email, first_name, last_name, business_name,
          phone, country, website, JSON.stringify(specialties || []),
          experience_level, bio, profile_image_url, cognito_username
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
          phone, country, website, specialties, experience_level, bio, profile_image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cognito_username, email, first_name, last_name, business_name,
          phone, country, website, JSON.stringify(specialties || []),
          experience_level, bio, profile_image_url
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
      profile_image_url
    } = req.body;
    
    await pool.execute(
      `UPDATE users SET 
        first_name = ?, last_name = ?, business_name = ?, 
        phone = ?, country = ?, website = ?, specialties = ?, 
        experience_level = ?, bio = ?, profile_image_url = ?
      WHERE cognito_username = ?`,
      [
        first_name, last_name, business_name,
        phone, country, website, JSON.stringify(specialties || []),
        experience_level, bio, profile_image_url, cognitoUsername
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

