import express from 'express';
import pool from '../config/database.js';
import { requireAuth, requireSelf } from '../middleware/auth.js';

const router = express.Router();

const isListingId = (value) => /^\d+$/.test(String(value));

const countLikes = async (listingId) => {
  const [rows] = await pool.execute('SELECT COUNT(*) as count FROM likes WHERE listing_id = ?', [listingId]);
  return rows[0].count;
};

router.post('/:listingId', requireAuth, async (req, res) => {
  try {
    const { listingId } = req.params;
    const userId = req.auth.userId;

    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!isListingId(listingId)) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const [inserted] = await pool.execute(
      'INSERT INTO likes (user_id, listing_id) VALUES (?, ?) ON CONFLICT (user_id, listing_id) DO NOTHING',
      [userId, listingId]
    );
    if (inserted.affectedRows === 0) {
      return res.status(400).json({ error: 'Already liked' });
    }

    res.json({ liked: true, likeCount: await countLikes(listingId) });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:listingId', requireAuth, async (req, res) => {
  try {
    const { listingId } = req.params;
    const userId = req.auth.userId;

    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!isListingId(listingId)) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    await pool.execute('DELETE FROM likes WHERE user_id = ? AND listing_id = ?', [userId, listingId]);

    res.json({ liked: false, likeCount: await countLikes(listingId) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/user/:authUserId', requireSelf(), async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT id FROM users WHERE auth_user_id = ?', [req.params.authUserId]);
    if (users.length === 0) {
      return res.json({ likedListings: [] });
    }

    const [likes] = await pool.execute('SELECT listing_id FROM likes WHERE user_id = ?', [users[0].id]);

    res.json({ likedListings: likes.map(like => like.listing_id) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/user/:authUserId/listings', requireSelf(), async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT id FROM users WHERE auth_user_id = ?', [req.params.authUserId]);
    if (users.length === 0) {
      return res.json({ listings: [] });
    }

    const [listings] = await pool.execute(
      `SELECT l.id, l.title, l.price, l.primary_image_url, l.category, l.in_stock, l.status,
              u.auth_user_id,
              COALESCE(u.business_name, NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.username) as artist_name,
              (SELECT COUNT(*) FROM likes WHERE listing_id = l.id) as like_count,
              lk.created_at as favorited_at
       FROM likes lk
       JOIN listings l ON l.id = lk.listing_id
       JOIN users u ON u.id = l.user_id
       WHERE lk.user_id = ?
       ORDER BY lk.created_at DESC`,
      [users[0].id]
    );

    res.json({ listings });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
