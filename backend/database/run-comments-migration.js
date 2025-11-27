import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runCommentsMigration() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mirart',
      multipleStatements: true
    });

    console.log('Adding comments support to listings...');

    const sqlPath = path.join(__dirname, 'migrations', 'add_comments.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await connection.query(sql);
    
    console.log('Successfully added comments support.');

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Comments fields already exist. Skipping migration.');
    } else if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Comments table already exists. Skipping migration.');
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

runCommentsMigration()
  .then(() => {
    console.log('Migration completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });


