import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'migrations', 'add_auction_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running auction fields migration...');
    await pool.execute(sql);
    console.log('Migration completed successfully!');
    
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Auction fields already exist. Migration skipped.');
      process.exit(0);
    } else {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  }
}

runMigration();

