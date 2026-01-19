import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runUserActiveMigration() {
  let connection;
  try {
    console.log('Starting user active status migration...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'mirart',
    });

    console.log('Connected to database. Checking for active column...');
    
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'active'`,
      [process.env.DB_NAME || 'mirart']
    );

    if (columns.length === 0) {
      console.log('Adding active column...');
      await connection.execute('ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT TRUE');
      console.log('✓ Column added');
    } else {
      console.log('✓ Column already exists');
    }

    try {
      console.log('Adding index...');
      await connection.execute('CREATE INDEX idx_active ON users(active)');
      console.log('✓ Index added');
    } catch (error) {
      if (error.message.includes('Duplicate key') || error.message.includes('already exists') || error.code === 'ER_DUP_KEYNAME') {
        console.log('✓ Index already exists');
      } else {
        throw error;
      }
    }

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runUserActiveMigration()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });


