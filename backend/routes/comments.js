import express from 'express';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/listing/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;

    const [reviews] = await pool.execute(
      `SELECT 
        c.id, c.listing_id, c.user_id, c.comment, c.rating, c.created_at, c.updated_at,
        u.auth_user_id,
        COALESCE(u.business_name, CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')), u.username) as user_name,
        u.profile_image_url
      FROM listing_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.listing_id = ?
      ORDER BY c.created_at DESC`,
      [listingId]
    );

    const [avgResult] = await pool.execute(
      'SELECT AVG(rating) as average_rating, COUNT(*) as review_count FROM listing_comments WHERE listing_id = ? AND rating IS NOT NULL',
      [listingId]
    );

    res.json({
      reviews: reviews || [],
      averageRating: avgResult[0]?.average_rating ? parseFloat(Number(avgResult[0].average_rating).toFixed(1)) : 0,
      reviewCount: avgResult[0]?.review_count || 0,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/average/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const [avgResult] = await pool.execute(
      'SELECT AVG(rating) as average_rating, COUNT(*) as review_count FROM listing_comments WHERE listing_id = ? AND rating IS NOT NULL',
      [listingId]
    );
    res.json({
      averageRating: avgResult[0]?.average_rating ? parseFloat(Number(avgResult[0].average_rating).toFixed(1)) : 0,
      reviewCount: avgResult[0]?.review_count || 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { listingId, comment, rating } = req.body;
    const safeComment = typeof comment === 'string' ? comment.trim() : '';

    if (!listingId || !rating) {
      return res.status(400).json({ error: 'listingId and rating are required' });
    }

    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const userId = req.auth.userId;
    if (!userId) return res.status(404).json({ error: 'User not found' });

    const [listings] = await pool.execute('SELECT allow_comments, user_id FROM listings WHERE id = ?', [listingId]);
    if (listings.length === 0) return res.status(404).json({ error: 'Listing not found' });
    if (listings[0].allow_comments === false) {
      return res.status(403).json({ error: 'Reviews are disabled for this listing' });
    }
    if (listings[0].user_id === userId) {
      return res.status(403).json({ error: 'You cannot review your own listing' });
    }

    const [existing] = await pool.execute(
      'SELECT id FROM listing_comments WHERE listing_id = ? AND user_id = ?',
      [parseInt(listingId), userId]
    );
    if (existing.length > 0) {
      await pool.execute(
        'UPDATE listing_comments SET comment = ?, rating = ? WHERE id = ?',
        [safeComment, ratingNum, existing[0].id]
      );
      const [updated] = await pool.execute(
        `SELECT c.id, c.listing_id, c.user_id, c.comment, c.rating, c.created_at, c.updated_at,
          u.auth_user_id,
          COALESCE(u.business_name, CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')), u.username) as user_name,
          u.profile_image_url
        FROM listing_comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
        [existing[0].id]
      );
      return res.json({ review: updated[0], updated: true });
    }

    const [result] = await pool.execute(
      'INSERT INTO listing_comments (listing_id, user_id, comment, rating) VALUES (?, ?, ?, ?)',
      [parseInt(listingId), userId, safeComment, ratingNum]
    );

    const [newReview] = await pool.execute(
      `SELECT c.id, c.listing_id, c.user_id, c.comment, c.rating, c.created_at, c.updated_at,
        u.auth_user_id,
        COALESCE(u.business_name, CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')), u.username) as user_name,
        u.profile_image_url
      FROM listing_comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ review: newReview[0] });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.delete('/:commentId', requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.auth.userId;

    const [comments] = await pool.execute('SELECT user_id, listing_id FROM listing_comments WHERE id = ?', [commentId]);
    if (comments.length === 0) return res.status(404).json({ error: 'Review not found' });

    const review = comments[0];
    const [listings] = await pool.execute('SELECT user_id FROM listings WHERE id = ?', [review.listing_id]);

    const isReviewOwner = review.user_id === userId;
    const isListingOwner = listings.length > 0 && listings[0].user_id === userId;

    if (!isReviewOwner && !isListingOwner) {
      return res.status(403).json({ error: 'You do not have permission to delete this review' });
    }

    await pool.execute('DELETE FROM listing_comments WHERE id = ?', [commentId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
