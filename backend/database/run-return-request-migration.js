import pool from '../config/database.js';

async function run() {
  try {
    await pool.execute("ALTER TABLE orders ADD COLUMN return_status VARCHAR(30) DEFAULT NULL AFTER status");
  } catch (e) { if (!e.message.includes('Duplicate column')) throw e; }
  try {
    await pool.execute("ALTER TABLE orders ADD COLUMN return_reason TEXT DEFAULT NULL AFTER return_status");
  } catch (e) { if (!e.message.includes('Duplicate column')) throw e; }
  try {
    await pool.execute("ALTER TABLE orders ADD COLUMN return_requested_at TIMESTAMP NULL DEFAULT NULL AFTER return_reason");
  } catch (e) { if (!e.message.includes('Duplicate column')) throw e; }
  console.log('Return request columns migration complete');
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
