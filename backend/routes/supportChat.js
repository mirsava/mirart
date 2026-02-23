import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

router.get('/config', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'support_chat_config'"
    );
    if (rows.length === 0) {
      return res.json({ enabled: true, hours_start: 9, hours_end: 17, timezone: 'America/Los_Angeles', offline_message: 'Support is currently offline.', welcome_message: 'Hi! How can we help you today?' });
    }
    const val = typeof rows[0].setting_value === 'string' ? JSON.parse(rows[0].setting_value) : rows[0].setting_value;
    res.json(val);
  } catch (error) {
    console.error('Error fetching support chat config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/config', async (req, res) => {
  try {
    const config = req.body;
    await pool.execute(
      "INSERT INTO site_settings (setting_key, setting_value) VALUES ('support_chat_config', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
      [JSON.stringify(config), JSON.stringify(config)]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating support chat config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/messages', async (req, res) => {
  try {
    const { cognitoUsername, userId } = req.query;
    let userIdResolved = userId;
    if (!userIdResolved && cognitoUsername) {
      const [users] = await pool.execute('SELECT id FROM users WHERE cognito_username = ?', [cognitoUsername]);
      if (users.length > 0) userIdResolved = users[0].id;
    }
    if (!userIdResolved) return res.json([]);
    const [msgs] = await pool.execute(
      'SELECT * FROM support_chat_messages WHERE user_id = ? ORDER BY created_at ASC',
      [userIdResolved]
    );
    res.json(msgs);
  } catch (error) {
    console.error('Error fetching support messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/messages', async (req, res) => {
  try {
    const { cognitoUsername, message, sender, adminCognitoUsername, targetUserId } = req.body;
    let userId = targetUserId || null;
    let userEmail = null;
    let userName = null;
    let adminId = null;

    if (sender === 'user' && cognitoUsername) {
      const [users] = await pool.execute('SELECT id, email, first_name, last_name FROM users WHERE cognito_username = ?', [cognitoUsername]);
      if (users.length > 0) {
        userId = users[0].id;
        userEmail = users[0].email;
        userName = [users[0].first_name, users[0].last_name].filter(Boolean).join(' ') || users[0].email;
      }
    }
    if (sender === 'admin' && adminCognitoUsername) {
      const [admins] = await pool.execute('SELECT id FROM users WHERE cognito_username = ?', [adminCognitoUsername]);
      if (admins.length > 0) adminId = admins[0].id;
    }

    const [result] = await pool.execute(
      'INSERT INTO support_chat_messages (user_id, user_email, user_name, sender, message, admin_id) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, userEmail, userName, sender, message, adminId]
    );

    res.json({ id: result.insertId, user_id: userId, sender, message, created_at: new Date().toISOString() });
  } catch (error) {
    console.error('Error sending support message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/messages/read', async (req, res) => {
  try {
    const { cognitoUsername, sender } = req.body;
    if (!cognitoUsername) return res.status(400).json({ error: 'cognitoUsername required' });
    const [users] = await pool.execute('SELECT id FROM users WHERE cognito_username = ?', [cognitoUsername]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const readSender = sender || 'admin';
    await pool.execute(
      'UPDATE support_chat_messages SET read_at = NOW() WHERE user_id = ? AND sender = ? AND read_at IS NULL',
      [users[0].id, readSender]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/conversations', async (req, res) => {
  try {
    const [conversations] = await pool.execute(`
      SELECT m.user_id, m.user_email, m.user_name,
        MAX(m.created_at) as last_message_at,
        (SELECT message FROM support_chat_messages m2 WHERE m2.user_id = m.user_id ORDER BY m2.created_at DESC LIMIT 1) as last_message,
        (SELECT sender FROM support_chat_messages m2 WHERE m2.user_id = m.user_id ORDER BY m2.created_at DESC LIMIT 1) as last_sender,
        SUM(CASE WHEN m.sender = 'user' AND m.read_at IS NULL THEN 1 ELSE 0 END) as unread_count
      FROM support_chat_messages m
      WHERE m.user_id IS NOT NULL
      GROUP BY m.user_id, m.user_email, m.user_name
      ORDER BY last_message_at DESC
    `);
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching support conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [msgs] = await pool.execute(
      'SELECT * FROM support_chat_messages WHERE user_id = ? ORDER BY created_at ASC',
      [userId]
    );
    res.json(msgs);
  } catch (error) {
    console.error('Error fetching admin support messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/user-chat-enabled', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'user_chat_enabled'"
    );
    const enabled = rows.length > 0 ? JSON.parse(rows[0].setting_value) : false;
    res.json({ enabled });
  } catch (error) {
    console.error('Error fetching user chat setting:', error);
    res.json({ enabled: false });
  }
});

router.put('/user-chat-enabled', async (req, res) => {
  try {
    const { enabled } = req.body;
    await pool.execute(
      "INSERT INTO site_settings (setting_key, setting_value) VALUES ('user_chat_enabled', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
      [JSON.stringify(!!enabled), JSON.stringify(!!enabled)]
    );
    res.json({ success: true, enabled: !!enabled });
  } catch (error) {
    console.error('Error updating user chat setting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/test-data-enabled', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'test_data_enabled'"
    );
    const enabled = rows.length > 0 ? JSON.parse(rows[0].setting_value) : false;
    console.log('[DEBUG] GET test-data-enabled:', { rows: rows.length, enabled });
    res.json({ enabled });
  } catch (error) {
    console.error('Error fetching test data setting:', error);
    res.json({ enabled: false });
  }
});

router.put('/test-data-enabled', async (req, res) => {
  try {
    const { enabled } = req.body;
    console.log('[DEBUG] PUT test-data-enabled body:', req.body, '-> storing:', !!enabled);
    await pool.execute(
      "INSERT INTO site_settings (setting_key, setting_value) VALUES ('test_data_enabled', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
      [JSON.stringify(!!enabled), JSON.stringify(!!enabled)]
    );
    res.json({ success: true, enabled: !!enabled });
  } catch (error) {
    console.error('Error updating test data setting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
