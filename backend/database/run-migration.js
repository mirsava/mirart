import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  let connection;
  
  try {
    // Connect to MySQL
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'mirart',
    });

    console.log('Connected to MySQL database');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add_image_urls.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Remove comments (both -- and /* */ style) and split by semicolon
    let cleanedSQL = migrationSQL
      .replace(/--.*$/gm, '') // Remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .trim();
    
    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log('Parsed SQL statements:', statements.length);
    if (statements.length > 0) {
      console.log('First statement:', statements[0].substring(0, 100) + '...');
    }

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log('✓ Migration executed successfully');
        } catch (error) {
          // Check if column already exists
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('✓ Column image_urls already exists, skipping...');
          } else {
            console.error('Migration error:', error.message);
            console.error('Error code:', error.code);
            throw error;
          }
        }
      }
    }
    
    // Verify the column was added
    const [columns] = await connection.execute(
      "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'image_urls'",
      [process.env.DB_NAME || 'mirart']
    );
    
    if (columns.length > 0) {
      console.log(`✓ Verified: Column 'image_urls' exists (type: ${columns[0].DATA_TYPE})`);
    } else {
      console.error('✗ WARNING: Column image_urls was not found after migration!');
      process.exit(1);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();

