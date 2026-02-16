import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function runMigration() {
  let connection;

  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mirart',
    });
    console.log('Connected.');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_stripe_product_id.sql'),
      'utf8'
    );

    const statements = migrationSQL
      .replace(/--[^\n]*/g, '')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      try {
        await connection.execute(statement);
        console.log('✓ Executed:', statement.substring(0, 60) + '...');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('✓ Column stripe_product_id already exists, skipping ADD COLUMN');
        } else {
          throw error;
        }
      }
    }

    console.log('\n✓ Stripe product ID migration completed');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runMigration().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
