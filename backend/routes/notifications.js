import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

const ensureTable = async () => {
  try {
    await pool.execute('SELECT 1 FROM notifications LIMIT 1');
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      await pool.execute(`
        CREATE TABLE notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          body TEXT,
          link VARCHAR(500),
          reference_id INT,
          read_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_read (user_id, read_at),
          INDEX idx_created (created_at)
        )
      `);
    } else {
      throw err;
    }
  }
};

router.get('/', async (req, res) => {
  try {
    await ensureTable();
    const cognitoUsername = req.query.cognitoUsername;
    if (!cognitoUsername) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [users] = await pool.execute('SELECT id FROM users WHERE cognito_username = ?', [cognitoUsername]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = users[0].id;

    const [rows] = await pool.execute(
      `SELECT id, type, title, body, link, reference_id, read_at, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    const unreadCount = rows.filter((r) => !r.read_at).length;
    res.json({
      notifications: rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        body: r.body,
        link: r.link,
        reference_id: r.reference_id,
        read_at: r.read_at,
        created_at: r.created_at,
      })),
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    await ensureTable();
    const cognitoUsername = req.query.cognitoUsername;
    if (!cognitoUsername) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [users] = await pool.execute('SELECT id FROM users WHERE cognito_username = ?', [cognitoUsername]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = users[0].id;

    await pool.execute('UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    await ensureTable();
    const cognitoUsername = req.query.cognitoUsername;
    if (!cognitoUsername) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [users] = await pool.execute('SELECT id FROM users WHERE cognito_username = ?', [cognitoUsername]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = users[0].id;

    const [result] = await pool.execute(
      'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
