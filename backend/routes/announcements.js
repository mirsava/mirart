import express from 'express';
import pool from '../config/database.js';
import UserRole from '../constants/userRoles.js';

const router = express.Router();

const ensureAnnouncementsTable = async () => {
  try {
    await pool.execute('SELECT 1 FROM admin_announcements LIMIT 1');
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      await pool.execute(`
        CREATE TABLE admin_announcements (
          id INT AUTO_INCREMENT PRIMARY KEY,
          message TEXT NOT NULL,
          target_type ENUM('all', 'authenticated', 'artists', 'buyers', 'admins', 'specific') NOT NULL DEFAULT 'all',
          target_user_ids JSON NULL,
          severity ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
          is_active BOOLEAN DEFAULT TRUE,
          start_date DATETIME NULL,
          end_date DATETIME NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_active_dates (is_active, start_date, end_date)
        )
      `);
    } else {
      throw err;
    }
  }
};

router.get('/', async (req, res) => {
  try {
    await ensureAnnouncementsTable();
    const cognitoUsername = req.query.cognitoUsername;
    const groupsParam = req.query.groups;
    let userGroups = [];
    if (groupsParam) {
      try {
        userGroups = typeof groupsParam === 'string' ? JSON.parse(groupsParam) : groupsParam;
      } catch {
        userGroups = Array.isArray(groupsParam) ? groupsParam : [groupsParam];
      }
    }

    const [rows] = await pool.execute(
      `SELECT id, message, target_type, target_user_ids, severity, is_active, start_date, end_date
       FROM admin_announcements
       WHERE is_active = 1
         AND (start_date IS NULL OR start_date <= NOW())
         AND (end_date IS NULL OR end_date >= NOW())
       ORDER BY created_at DESC`
    );

    const now = new Date();
    const announcements = rows.filter((row) => {
      if (row.start_date && new Date(row.start_date) > now) return false;
      if (row.end_date && new Date(row.end_date) < now) return false;

      const targetType = row.target_type || 'all';
      if (targetType === 'all') return true;

      if (!cognitoUsername) return false;

      if (targetType === 'authenticated') return true;
      if (targetType === 'admins') {
        return userGroups.includes('site_admin') || userGroups.includes('admin');
      }
      if (targetType === 'artists') {
        return userGroups.includes(UserRole.ARTIST) || userGroups.includes('artist');
      }
      if (targetType === 'buyers') {
        return userGroups.includes(UserRole.BUYER) || userGroups.includes('buyer');
      }
      if (targetType === 'specific') return true;
      return false;
    });

    const result = [];
    for (const a of announcements) {
      if (a.target_type === 'specific' && a.target_user_ids) {
        try {
          const ids = typeof a.target_user_ids === 'string' ? JSON.parse(a.target_user_ids) : a.target_user_ids;
          if (!Array.isArray(ids) || ids.length === 0 || !cognitoUsername) continue;
          const placeholders = ids.map(() => '?').join(',');
          const [users] = await pool.execute(
            `SELECT id FROM users WHERE cognito_username = ? AND id IN (${placeholders})`,
            [cognitoUsername, ...ids]
          );
          if (users.length === 0) continue;
        } catch {
          continue;
        }
      }
      const msg = a.message;
      const messageStr = msg == null ? '' : (Buffer.isBuffer(msg) ? msg.toString('utf8') : String(msg));
      result.push({
        id: a.id,
        message: messageStr,
        severity: a.severity || 'info',
      });
    }

    res.json({ announcements: result });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const checkAdmin = (req, res, next) => {
  const { cognitoUsername, groups } = req.query;
  if (!cognitoUsername) return res.status(401).json({ error: 'Authentication required' });
  let userGroups = [];
  if (groups) {
    try {
      userGroups = typeof groups === 'string' ? JSON.parse(groups) : groups;
    } catch {
      userGroups = Array.isArray(groups) ? groups : [groups];
    }
  }
  if (!userGroups.includes('site_admin') && !userGroups.includes('admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.get('/admin', checkAdmin, async (req, res) => {
  try {
    await ensureAnnouncementsTable();
    const [rows] = await pool.execute(
      'SELECT * FROM admin_announcements ORDER BY created_at DESC'
    );
    const formatted = rows.map((r) => ({
      ...r,
      target_user_ids: r.target_user_ids ? (typeof r.target_user_ids === 'string' ? JSON.parse(r.target_user_ids) : r.target_user_ids) : null,
    }));
    res.json({ announcements: formatted });
  } catch (error) {
    console.error('Error fetching admin announcements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/admin', checkAdmin, async (req, res) => {
  try {
    await ensureAnnouncementsTable();
    const { message, target_type, target_user_ids, severity, is_active, start_date, end_date } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const targetType = ['all', 'authenticated', 'artists', 'buyers', 'admins', 'specific'].includes(target_type) ? target_type : 'all';
    const targetIdsJson = target_user_ids && Array.isArray(target_user_ids) ? JSON.stringify(target_user_ids) : null;
    const sev = ['info', 'warning', 'success', 'error'].includes(severity) ? severity : 'info';
    const isActive = is_active !== false ? 1 : 0;

    await pool.execute(
      `INSERT INTO admin_announcements (message, target_type, target_user_ids, severity, is_active, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [message.trim(), targetType, targetIdsJson, sev, isActive, start_date || null, end_date || null]
    );
    res.status(201).json({ success: true, message: 'Announcement created' });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

router.put('/admin/:id', checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, target_type, target_user_ids, severity, is_active, start_date, end_date } = req.body;

    const targetType = target_type && ['all', 'authenticated', 'artists', 'buyers', 'admins', 'specific'].includes(target_type) ? target_type : undefined;
    const targetIdsJson = target_user_ids !== undefined
      ? (Array.isArray(target_user_ids) ? JSON.stringify(target_user_ids) : null)
      : undefined;
    const sev = severity && ['info', 'warning', 'success', 'error'].includes(severity) ? severity : undefined;

    const updates = [];
    const params = [];
    if (message !== undefined) { updates.push('message = ?'); params.push(message.trim()); }
    if (targetType !== undefined) { updates.push('target_type = ?'); params.push(targetType); }
    if (targetIdsJson !== undefined) { updates.push('target_user_ids = ?'); params.push(targetIdsJson); }
    if (sev !== undefined) { updates.push('severity = ?'); params.push(sev); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(Boolean(is_active)); }
    if (start_date !== undefined) { updates.push('start_date = ?'); params.push(start_date || null); }
    if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date || null); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    params.push(id);
    const [result] = await pool.execute(
      `UPDATE admin_announcements SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/admin/:id', checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute('DELETE FROM admin_announcements WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
