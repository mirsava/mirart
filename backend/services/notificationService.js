import pool from '../config/database.js';

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

export async function createNotification({ userId, type, title, body, link, referenceId }) {
  await ensureTable();
  const [result] = await pool.execute(
    `INSERT INTO notifications (user_id, type, title, body, link, reference_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, title, body || null, link || null, referenceId || null]
  );
  return result.insertId;
}
