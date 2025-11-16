import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSignatureMigration() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'mirart',
    });

    console.log('Connected to MySQL database');

    const migrationPath = path.join(__dirname, 'migrations', 'add_signature.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    let cleanedSQL = migrationSQL
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();
    
    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log('✓ Migration executed successfully');
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('✓ Column signature_url already exists, skipping...');
          } else {
            console.error('Migration error:', error.message);
            throw error;
          }
        }
      }
    }
    
    const [columns] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'signature_url'",
      [process.env.DB_NAME || 'mirart']
    );
    
    if (columns.length > 0) {
      console.log('✓ Verified: signature_url column exists in users table');
    } else {
      console.log('⚠ Warning: Could not verify signature_url column was added');
    }
    
    await connection.end();
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Error running migration:', error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

runSignatureMigration();

