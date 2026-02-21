import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runShippingPreferenceMigration() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mirart',
      multipleStatements: true
    });

    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'users' 
       AND COLUMN_NAME = 'default_shipping_preference'`,
      [process.env.DB_NAME || 'mirart']
    );

    if (columns.length > 0) {
      console.log('default_shipping_preference column already exists. Skipping migration.');
      return;
    }

    console.log('Adding default_shipping_preference column to users table...');

    const sqlPath = path.join(__dirname, 'migrations', 'add_default_shipping_preference.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await connection.query(sql);

    console.log('Successfully added default_shipping_preference column.');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('default_shipping_preference column already exists. Skipping migration.');
    } else {
      console.error('Error running migration:', error);
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runShippingPreferenceMigration()
  .then(() => {
    console.log('Migration completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
