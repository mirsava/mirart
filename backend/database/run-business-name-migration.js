import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runBusinessNameMigration() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mirart',
      multipleStatements: true
    });

    console.log('Checking if business_name column exists...');

    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'users' 
       AND COLUMN_NAME = 'business_name'`,
      [process.env.DB_NAME || 'mirart']
    );

    if (columns.length > 0) {
      console.log('business_name column already exists in INFORMATION_SCHEMA. Verifying with SHOW COLUMNS...');
      const [showColumns] = await connection.execute('SHOW COLUMNS FROM users LIKE "business_name"');
      if (showColumns.length === 0) {
        console.log('Column not found in actual table. Adding it...');
      } else {
        console.log('business_name column exists. Skipping migration.');
        return;
      }
    } else {
      console.log('business_name column does not exist. Adding it...');
    }

    const sqlPath = path.join(__dirname, 'migrations', 'add_business_name.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await connection.query(sql);
    
    console.log('Successfully added business_name column to users table.');
    
    const [verify] = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'users' 
       AND COLUMN_NAME = 'business_name'`,
      [process.env.DB_NAME || 'mirart']
    );

    if (verify.length > 0) {
      console.log('Verification successful:', verify[0]);
    } else {
      throw new Error('Column was not added successfully');
    }

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('business_name column already exists. Skipping migration.');
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

runBusinessNameMigration()
  .then(() => {
    console.log('Migration completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

