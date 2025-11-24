import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function runCommentRepliesMigration() {
  let connection;
  try {
    console.log('Starting comment replies migration...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'mirart',
    });

    console.log('Connected to database. Checking for parent_comment_id column...');
    
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listing_comments' AND COLUMN_NAME = 'parent_comment_id'`,
      [process.env.DB_NAME || 'mirart']
    );

    if (columns.length === 0) {
      console.log('Adding parent_comment_id column...');
      await connection.execute('ALTER TABLE listing_comments ADD COLUMN parent_comment_id INT NULL');
      console.log('✓ Column added');
    } else {
      console.log('✓ Column already exists');
    }

    try {
      console.log('Adding foreign key constraint...');
      await connection.execute(
        'ALTER TABLE listing_comments ADD FOREIGN KEY (parent_comment_id) REFERENCES listing_comments(id) ON DELETE CASCADE'
      );
      console.log('✓ Foreign key added');
    } catch (error) {
      if (error.message.includes('Duplicate key') || error.message.includes('already exists')) {
        console.log('✓ Foreign key already exists');
      } else {
        throw error;
      }
    }

    try {
      console.log('Adding index...');
      await connection.execute('CREATE INDEX idx_parent_comment_id ON listing_comments(parent_comment_id)');
      console.log('✓ Index added');
    } catch (error) {
      if (error.message.includes('Duplicate key') || error.message.includes('already exists')) {
        console.log('✓ Index already exists');
      } else {
        throw error;
      }
    }

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runCommentRepliesMigration();

