import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runParentMessageMigration() {
  let connection;
  try {
    console.log('Starting parent_message_id migration...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'mirart',
    });

    console.log('Connected to database. Checking for parent_message_id column...');
    
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'parent_message_id'`,
      [process.env.DB_NAME || 'mirart']
    );

    if (columns.length === 0) {
      console.log('Adding parent_message_id column...');
      await connection.execute('ALTER TABLE messages ADD COLUMN parent_message_id INT NULL');
      console.log('✓ Column added');
    } else {
      console.log('✓ Column already exists');
    }

    try {
      console.log('Adding foreign key constraint...');
      await connection.execute(
        'ALTER TABLE messages ADD FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE CASCADE'
      );
      console.log('✓ Foreign key added');
    } catch (error) {
      if (error.message.includes('Duplicate key') || error.message.includes('already exists') || error.code === 'ER_DUP_KEYNAME') {
        console.log('✓ Foreign key already exists');
      } else {
        throw error;
      }
    }

    try {
      console.log('Adding index...');
      await connection.execute('CREATE INDEX idx_parent_message_id ON messages(parent_message_id)');
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

runParentMessageMigration()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

