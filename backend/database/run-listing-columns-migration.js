import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mirart'
  });
  const db = process.env.DB_NAME || 'mirart';
  for (const col of ['shipping_preference', 'shipping_carrier', 'return_days']) {
    const [rows] = await conn.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = ?",
      [db, col]
    );
    if (rows.length === 0) {
      const def = col === 'return_days' ? 'INT DEFAULT NULL' : 'VARCHAR(20) DEFAULT NULL';
      await conn.query(`ALTER TABLE listings ADD COLUMN ${col} ${def}`);
      console.log(`Added ${col} to listings`);
    }
  }
  await conn.end();
  console.log('Done');
}

run().catch(e => { console.error(e); process.exit(1); });
