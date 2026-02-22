import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

router.post('/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { cognitoUsername } = req.body;

    if (!cognitoUsername) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;

    const [existing] = await pool.execute(
      'SELECT id FROM likes WHERE user_id = ? AND listing_id = ?',
      [userId, listingId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already liked' });
    }

    await pool.execute(
      'INSERT INTO likes (user_id, listing_id) VALUES (?, ?)',
      [userId, listingId]
    );

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM likes WHERE listing_id = ?',
      [listingId]
    );

    res.json({ 
      liked: true, 
      likeCount: countResult[0].count 
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { cognitoUsername } = req.body;

    if (!cognitoUsername) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;

    await pool.execute(
      'DELETE FROM likes WHERE user_id = ? AND listing_id = ?',
      [userId, listingId]
    );

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM likes WHERE listing_id = ?',
      [listingId]
    );

    res.json({ 
      liked: false, 
      likeCount: countResult[0].count 
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/user/:cognitoUsername', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );

    if (users.length === 0) {
      return res.json({ likedListings: [] });
    }

    const userId = users[0].id;

    const [likes] = await pool.execute(
      'SELECT listing_id FROM likes WHERE user_id = ?',
      [userId]
    );

    res.json({ 
      likedListings: likes.map(like => like.listing_id) 
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/user/:cognitoUsername/listings', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );

    if (users.length === 0) {
      return res.json({ listings: [] });
    }

    const userId = users[0].id;

    const [listings] = await pool.execute(
      `SELECT l.id, l.title, l.price, l.primary_image_url, l.category, l.in_stock, l.status,
              u.cognito_username, COALESCE(CONCAT(u.first_name, ' ', u.last_name), u.business_name, u.email) as artist_name,
              (SELECT COUNT(*) FROM likes WHERE listing_id = l.id) as like_count,
              lk.created_at as favorited_at
       FROM likes lk
       JOIN listings l ON l.id = lk.listing_id
       JOIN users u ON u.id = l.user_id
       WHERE lk.user_id = ?
       ORDER BY lk.created_at DESC`,
      [userId]
    );

    res.json({ listings });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

