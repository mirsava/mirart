import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', 'add_notifications.sql'), 'utf8');
  await pool.execute(sql);
  console.log('Notifications table migration complete');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
