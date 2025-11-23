import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

router.get('/user/:cognitoUsername', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;
    const { type = 'all' } = req.query;

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;
    let query;
    let params;

    if (type === 'sent') {
      query = `
        SELECT m.*, 
          l.title as listing_title,
          l.primary_image_url as listing_image,
          u_sender.email as sender_email_display,
          u_recipient.email as recipient_email_display,
          COALESCE(
            u_recipient.business_name,
            CONCAT(COALESCE(u_recipient.first_name, ''), ' ', COALESCE(u_recipient.last_name, '')),
            u_recipient.cognito_username
          ) as recipient_name
        FROM messages m
        JOIN listings l ON m.listing_id = l.id
        JOIN users u_sender ON m.sender_id = u_sender.id
        JOIN users u_recipient ON m.recipient_id = u_recipient.id
        WHERE m.sender_id = ?
        ORDER BY m.created_at DESC
      `;
      params = [userId];
    } else if (type === 'received') {
      query = `
        SELECT m.*, 
          l.title as listing_title,
          l.primary_image_url as listing_image,
          u_sender.email as sender_email_display,
          u_recipient.email as recipient_email_display,
          COALESCE(
            u_sender.business_name,
            CONCAT(COALESCE(u_sender.first_name, ''), ' ', COALESCE(u_sender.last_name, '')),
            u_sender.cognito_username,
            m.sender_name
          ) as sender_name_display
        FROM messages m
        JOIN listings l ON m.listing_id = l.id
        JOIN users u_sender ON m.sender_id = u_sender.id
        JOIN users u_recipient ON m.recipient_id = u_recipient.id
        WHERE m.recipient_id = ?
        ORDER BY m.created_at DESC
      `;
      params = [userId];
    } else {
      query = `
        SELECT m.*, 
          l.title as listing_title,
          l.primary_image_url as listing_image,
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
        JOIN listings l ON m.listing_id = l.id
        JOIN users u_sender ON m.sender_id = u_sender.id
        JOIN users u_recipient ON m.recipient_id = u_recipient.id
        WHERE m.sender_id = ? OR m.recipient_id = ?
        ORDER BY m.created_at DESC
      `;
      params = [userId, userId];
    }

    const [messages] = await pool.execute(query, params);

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { cognitoUsername } = req.body;

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;

    await pool.execute(
      'UPDATE messages SET status = ? WHERE id = ? AND recipient_id = ?',
      ['read', messageId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

