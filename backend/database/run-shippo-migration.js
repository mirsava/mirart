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
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'mirart',
    });

    console.log('Running Shippo shipping migration...');

    const migrationPath = path.join(__dirname, 'migrations', 'add_shippo_shipping.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    const statements = migrationSQL
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim()
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      try {
        await connection.execute(statement);
        console.log('✓ Statement executed');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('✓ Column already exists, skipping...');
        } else {
          console.error('Error:', error.message);
          throw error;
        }
      }
    }

    console.log('Shippo migration completed!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();
