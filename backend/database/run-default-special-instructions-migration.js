import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runDefaultSpecialInstructionsMigration() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mirart',
      multipleStatements: true
    });

    console.log('Adding default_special_instructions column to users table...');

    const sqlPath = path.join(__dirname, 'migrations', 'add_default_special_instructions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await connection.query(sql);
    
    console.log('Successfully added default_special_instructions column.');

    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'users' 
       AND COLUMN_NAME = 'default_special_instructions'`,
      [process.env.DB_NAME || 'mirart']
    );

    if (columns.length > 0) {
      console.log('Verification successful: default_special_instructions column exists');
    } else {
      throw new Error('Column was not created successfully');
    }

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('default_special_instructions column already exists. Skipping migration.');
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

runDefaultSpecialInstructionsMigration()
  .then(() => {
    console.log('Migration completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
