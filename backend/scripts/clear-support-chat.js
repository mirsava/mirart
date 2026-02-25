import dotenv from 'dotenv';
import pool from '../config/database.js';
import fs from 'fs';

dotenv.config();

const run = async () => {
  const [before] = await pool.execute('SELECT COUNT(*) AS count FROM support_chat_messages');
  await pool.execute('DELETE FROM support_chat_messages');
  const [after] = await pool.execute('SELECT COUNT(*) AS count FROM support_chat_messages');
  const [cfg] = await pool.execute("SELECT setting_value FROM site_settings WHERE setting_key = 'support_chat_config'");
  let config = { enabled: false };
  if (cfg.length > 0 && cfg[0].setting_value) {
    try {
      const raw = typeof cfg[0].setting_value === 'string' ? JSON.parse(cfg[0].setting_value) : cfg[0].setting_value;
      config = { ...raw, enabled: false };
    } catch {
      config = { enabled: false };
    }
  }
  await pool.execute(
    "INSERT INTO site_settings (setting_key, setting_value) VALUES ('support_chat_config', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
    [JSON.stringify(config), JSON.stringify(config)]
  );
  const [conv] = await pool.execute(
    `SELECT m.user_id, COUNT(*) AS cnt
     FROM support_chat_messages m
     WHERE m.user_id IS NOT NULL
     GROUP BY m.user_id`
  );

  const result = {
    db: process.env.DB_NAME || 'mirart',
    before: before[0].count,
    after: after[0].count,
    conversations_after: conv.length,
    support_enabled: false,
  };
  fs.writeFileSync(new URL('../support-chat-clear-result.json', import.meta.url), JSON.stringify(result, null, 2), 'utf8');
  await pool.end();
};

run().catch(async (error) => {
  console.error(error);
  try { await pool.end(); } catch {}
  process.exit(1);
});
