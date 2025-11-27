import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

router.get('/listing/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;

    const query = `
      SELECT 
        c.id,
        c.listing_id,
        c.user_id,
        c.comment,
        c.parent_comment_id,
        c.created_at,
        c.updated_at,
        u.cognito_username,
        COALESCE(
          u.business_name,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')),
          u.cognito_username
        ) as user_name,
        u.profile_image_url
      FROM listing_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.listing_id = ?
      ORDER BY c.created_at ASC
    `;

    const [comments] = await pool.execute(query, [listingId]);

    res.json({ comments: comments || [] });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { listingId, cognitoUsername, comment, parentCommentId } = req.body;

    if (!listingId || !cognitoUsername || !comment || !comment.trim()) {
      return res.status(400).json({ error: 'listingId, cognitoUsername, and comment are required' });
    }

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;

    const [listings] = await pool.execute(
      'SELECT allow_comments FROM listings WHERE id = ?',
      [listingId]
    );

    if (listings.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listings[0].allow_comments === 0 || listings[0].allow_comments === false) {
      return res.status(403).json({ error: 'Comments are disabled for this listing' });
    }

    let parentId = null;
    if (parentCommentId) {
      parentId = parseInt(parentCommentId);
      if (isNaN(parentId)) {
        return res.status(400).json({ error: 'Invalid parent comment ID' });
      }
      const [parentComments] = await pool.execute(
        'SELECT listing_id FROM listing_comments WHERE id = ?',
        [parentId]
      );
      if (parentComments.length === 0) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
      if (parentComments[0].listing_id !== parseInt(listingId)) {
        return res.status(400).json({ error: 'Parent comment does not belong to this listing' });
      }
    }
    const [result] = await pool.execute(
      'INSERT INTO listing_comments (listing_id, user_id, comment, parent_comment_id) VALUES (?, ?, ?, ?)',
      [parseInt(listingId), userId, comment.trim(), parentId]
    );

    const [newComment] = await pool.execute(
      `SELECT 
        c.id,
        c.listing_id,
        c.user_id,
        c.comment,
        c.parent_comment_id,
        c.created_at,
        c.updated_at,
        u.cognito_username,
        COALESCE(
          u.business_name,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')),
          u.cognito_username
        ) as user_name,
        u.profile_image_url
      FROM listing_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ comment: newComment[0] });
  } catch (error) {
    console.error('Error creating comment:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.delete('/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { cognitoUsername } = req.query;

    if (!cognitoUsername) {
      return res.status(400).json({ error: 'cognitoUsername is required' });
    }

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;

    const [comments] = await pool.execute(
      'SELECT user_id, listing_id FROM listing_comments WHERE id = ?',
      [commentId]
    );

    if (comments.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const comment = comments[0];

    const [listings] = await pool.execute(
      'SELECT user_id FROM listings WHERE id = ?',
      [comment.listing_id]
    );

    const isCommentOwner = comment.user_id === userId;
    const isListingOwner = listings.length > 0 && listings[0].user_id === userId;

    if (!isCommentOwner && !isListingOwner) {
      return res.status(403).json({ error: 'You do not have permission to delete this comment' });
    }

    await pool.execute('DELETE FROM listing_comments WHERE id = ?', [commentId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

