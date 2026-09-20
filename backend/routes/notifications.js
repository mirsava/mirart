import express from 'express';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.use((req, res, next) => {
  if (!req.auth.userId) return res.status(404).json({ error: 'User not found' });
  next();
});

router.get('/', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const [users] = await pool.execute('SELECT created_at FROM users WHERE id = ?', [userId]);
    const userCreatedAt = users[0]?.created_at || new Date(0);

    const [rows] = await pool.execute(
      `SELECT id, type, severity, title, body, link, reference_id, read_at, created_at FROM notifications WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 50`,
      [userId, userCreatedAt]
    );

    const unreadCount = rows.filter((r) => !r.read_at).length;
    res.json({
      notifications: rows.map((r) => ({
        id: r.id,
        type: r.type,
        severity: r.severity || 'info',
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
    await pool.execute('UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL', [req.auth.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Notification not found' });

    const [result] = await pool.execute('DELETE FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.auth.userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error dismissing notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Notification not found' });

    const [result] = await pool.execute(
      'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ?',
      [req.params.id, req.auth.userId]
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
