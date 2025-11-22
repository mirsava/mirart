import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'migrations', 'make_price_nullable.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running price nullable migration...');
    await pool.execute(sql);
    console.log('Migration completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

