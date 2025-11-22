import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runLikesMigration() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mirart',
      multipleStatements: true
    });

    console.log('Creating likes table...');

    const sqlPath = path.join(__dirname, 'migrations', 'add_likes_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await connection.query(sql);
    
    console.log('Successfully created likes table.');
    
    const [tables] = await connection.execute(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'likes'`,
      [process.env.DB_NAME || 'mirart']
    );

    if (tables.length > 0) {
      console.log('Verification successful: likes table exists');
    } else {
      throw new Error('Table was not created successfully');
    }

  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('likes table already exists. Skipping migration.');
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

runLikesMigration()
  .then(() => {
    console.log('Migration completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

