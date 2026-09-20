import pool from '../config/database.js';

export async function createNotification({ userId, type, title, body, link, referenceId, severity }) {
  const sev = ['info', 'warning', 'success', 'error'].includes(severity) ? severity : 'info';
  const [result] = await pool.execute(
    `INSERT INTO notifications (user_id, type, severity, title, body, link, reference_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, type, sev, title, body || null, link || null, referenceId || null]
  );
  return result.insertId;
}
