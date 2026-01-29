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
    console.log('Starting subscription migration...\n');
    
    // Connect to MySQL
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mirart',
    });

    console.log('✓ Connected to MySQL database\n');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_subscriptions.sql'),
      'utf8'
    );

    // Remove comments and clean SQL - handle both -- and /* */ style comments
    let cleanedSQL = migrationSQL
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments first
      .split('\n')
      .map(line => {
        // Remove -- comments but keep the line if it has content before the comment
        const commentIndex = line.indexOf('--');
        if (commentIndex >= 0) {
          return line.substring(0, commentIndex).trim();
        }
        return line.trim();
      })
      .filter(line => line.length > 0)
      .join('\n')
      .trim();

    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`Parsed ${statements.length} SQL statements\n`);
    if (statements.length > 0) {
      console.log('First statement preview:', statements[0].substring(0, 100) + '...\n');
    } else {
      console.log('WARNING: No SQL statements found! Check the SQL file.\n');
      console.log('Cleaned SQL preview:', cleanedSQL.substring(0, 200));
    }

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await connection.execute(statement);
        if (statement.trim().toUpperCase().startsWith('INSERT')) {
          console.log(`✓ [${i + 1}/${statements.length}] Inserted/Updated subscription plans`);
        } else if (statement.trim().toUpperCase().startsWith('CREATE TABLE')) {
          const tableName = statement.match(/CREATE TABLE.*?IF NOT EXISTS\s+(\w+)/i)?.[1] || 
                           statement.match(/CREATE TABLE\s+(\w+)/i)?.[1] || 'unknown';
          console.log(`✓ [${i + 1}/${statements.length}] Created table: ${tableName}`);
        } else {
          console.log(`✓ [${i + 1}/${statements.length}] Executed statement`);
        }
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_ENTRY' || error.code === 'ER_DUP_KEYNAME') {
          console.log(`⚠ [${i + 1}/${statements.length}] Skipped (already exists)`);
        } else {
          console.error(`✗ [${i + 1}/${statements.length}] Error:`, error.message);
          console.error('   Code:', error.code);
          console.error('   SQL:', statement.substring(0, 100) + '...');
          throw error;
        }
      }
    }

    console.log('\n--- Verification ---');
    
    // Verify tables exist
    try {
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME IN ('subscription_plans', 'user_subscriptions')
      `);
      console.log(`✓ Found ${tables.length} subscription tables:`);
      tables.forEach(table => console.log(`   - ${table.TABLE_NAME}`));
    } catch (error) {
      console.warn('⚠ Could not verify tables:', error.message);
    }

    // Verify plans were inserted
    try {
      const [plans] = await connection.execute('SELECT COUNT(*) as count FROM subscription_plans');
      console.log(`✓ Verified: ${plans[0].count} subscription plan(s) in database`);
      if (plans[0].count > 0) {
        const [planList] = await connection.execute('SELECT name, tier FROM subscription_plans');
        planList.forEach(plan => console.log(`   - ${plan.name} (${plan.tier})`));
      }
    } catch (error) {
      console.warn('⚠ Could not verify plans:', error.message);
    }

    await connection.end();

    console.log('\n✓ Subscription migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    console.error('   Code:', error.code);
    if (error.sql) {
      console.error('   SQL:', error.sql.substring(0, 200));
    }
    process.exit(1);
  }
}

runMigration().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
