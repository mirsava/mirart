import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

router.get('/conversations/:cognitoUsername', async (req, res) => {
  try {
    const { cognitoUsername } = req.params;

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;

    const query = `
      SELECT 
        c.id,
        c.listing_id,
        c.last_message_at,
        CASE 
          WHEN c.user1_id = ? THEN c.user2_id
          ELSE c.user1_id
        END as other_user_id,
        CASE 
          WHEN c.user1_id = ? THEN u2.business_name
          ELSE u1.business_name
        END as other_user_business_name,
        CASE 
          WHEN c.user1_id = ? THEN CONCAT(COALESCE(u2.first_name, ''), ' ', COALESCE(u2.last_name, ''))
          ELSE CONCAT(COALESCE(u1.first_name, ''), ' ', COALESCE(u1.last_name, ''))
        END as other_user_name,
        CASE 
          WHEN c.user1_id = ? THEN u2.email
          ELSE u1.email
        END as other_user_email,
        l.title as listing_title,
        l.primary_image_url as listing_image,
        (
          SELECT message 
          FROM chat_messages 
          WHERE conversation_id = c.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT COUNT(*) 
          FROM chat_messages 
          WHERE conversation_id = c.id 
          AND sender_id != ? 
          AND read_at IS NULL
        ) as unread_count
      FROM chat_conversations c
      LEFT JOIN users u1 ON c.user1_id = u1.id
      LEFT JOIN users u2 ON c.user2_id = u2.id
      LEFT JOIN listings l ON c.listing_id = l.id
      WHERE c.user1_id = ? OR c.user2_id = ?
      ORDER BY c.last_message_at DESC
    `;

    const [conversations] = await pool.execute(query, [userId, userId, userId, userId, userId, userId, userId]);

    res.json({ conversations: conversations || [] });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { cognitoUsername } = req.query;

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;

    const [conversations] = await pool.execute(
      `SELECT * FROM chat_conversations 
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [conversationId, userId, userId]
    );

    if (conversations.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const query = `
      SELECT 
        m.*,
        u.business_name as sender_business_name,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as sender_name,
        u.email as sender_email
      FROM chat_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
    `;

    const [messages] = await pool.execute(query, [conversationId]);

    res.json({ conversation: conversations[0], messages: messages || [] });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/conversation', async (req, res) => {
  try {
    const { cognitoUsername, otherUserId, otherUserCognitoUsername, listingId, message } = req.body;

    if ((!otherUserId && !otherUserCognitoUsername) || !message) {
      return res.status(400).json({ error: 'otherUserId (or otherUserCognitoUsername) and message are required' });
    }

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;

    let otherUserDbId = otherUserId;
    if (otherUserCognitoUsername && !otherUserId) {
      const [otherUsers] = await pool.execute(
        'SELECT id FROM users WHERE cognito_username = ?',
        [otherUserCognitoUsername]
      );
      if (otherUsers.length === 0) {
        return res.status(404).json({ error: 'Other user not found' });
      }
      otherUserDbId = otherUsers[0].id;
    }

    if (!otherUserDbId) {
      return res.status(400).json({ error: 'Could not determine other user ID' });
    }

    const user1Id = Math.min(userId, otherUserDbId);
    const user2Id = Math.max(userId, otherUserDbId);

    let [conversations] = await pool.execute(
      `SELECT id FROM chat_conversations 
       WHERE user1_id = ? AND user2_id = ? AND (listing_id = ? OR (listing_id IS NULL AND ? IS NULL))`,
      [user1Id, user2Id, listingId || null, listingId || null]
    );

    let conversationId;
    if (conversations.length === 0) {
      const [result] = await pool.execute(
        `INSERT INTO chat_conversations (user1_id, user2_id, listing_id) 
         VALUES (?, ?, ?)`,
        [user1Id, user2Id, listingId || null]
      );
      conversationId = result.insertId;
    } else {
      conversationId = conversations[0].id;
    }

    await pool.execute(
      `INSERT INTO chat_messages (conversation_id, sender_id, message) 
       VALUES (?, ?, ?)`,
      [conversationId, userId, message]
    );

    await pool.execute(
      `UPDATE chat_conversations 
       SET last_message_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [conversationId]
    );

    res.json({ success: true, conversationId });
  } catch (error) {
    console.error('Error creating conversation/message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/message', async (req, res) => {
  try {
    const { cognitoUsername, conversationId, message } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({ error: 'conversationId and message are required' });
    }

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;

    const [conversations] = await pool.execute(
      `SELECT * FROM chat_conversations 
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [conversationId, userId, userId]
    );

    if (conversations.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await pool.execute(
      `INSERT INTO chat_messages (conversation_id, sender_id, message) 
       VALUES (?, ?, ?)`,
      [conversationId, userId, message]
    );

    await pool.execute(
      `UPDATE chat_conversations 
       SET last_message_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [conversationId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/messages/read/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
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
      `UPDATE chat_messages 
       SET read_at = CURRENT_TIMESTAMP 
       WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL`,
      [conversationId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

