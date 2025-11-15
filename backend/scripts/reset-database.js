import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mirart',
  });

  try {
    console.log('Starting database reset...\n');

    // Disable foreign key checks temporarily
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Delete all data from tables (in order to respect foreign keys)
    const tables = [
      'orders',
      'listings',
      'dashboard_stats',
      'users',
    ];

    for (const table of tables) {
      try {
        const [result] = await connection.execute(`DELETE FROM ${table}`);
        console.log(`✓ Deleted ${result.affectedRows} records from ${table}`);
      } catch (error) {
        console.error(`✗ Error deleting from ${table}:`, error.message);
      }
    }

    // Reset auto-increment counters
    console.log('\nResetting auto-increment counters...');
    const resetQueries = [
      'ALTER TABLE users AUTO_INCREMENT = 1',
      'ALTER TABLE listings AUTO_INCREMENT = 1',
      'ALTER TABLE orders AUTO_INCREMENT = 1',
      'ALTER TABLE dashboard_stats AUTO_INCREMENT = 1',
    ];

    for (const query of resetQueries) {
      try {
        await connection.execute(query);
        console.log(`✓ Reset auto-increment for ${query.split(' ')[2]}`);
      } catch (error) {
        console.error(`✗ Error resetting auto-increment:`, error.message);
      }
    }

    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    // Delete uploaded image files
    console.log('\nCleaning up uploaded files...');
    const uploadsDir = path.join(__dirname, '../uploads');
    
    if (fs.existsSync(uploadsDir)) {
      try {
        const files = fs.readdirSync(uploadsDir);
        let deletedCount = 0;
        
        for (const file of files) {
          const filePath = path.join(uploadsDir, file);
          try {
            if (fs.statSync(filePath).isFile()) {
              fs.unlinkSync(filePath);
              deletedCount++;
            }
          } catch (fileError) {
            console.error(`  ✗ Error deleting file ${file}:`, fileError.message);
          }
        }
        
        console.log(`✓ Deleted ${deletedCount} uploaded image files`);
      } catch (dirError) {
        console.error(`✗ Error reading uploads directory:`, dirError.message);
      }
    } else {
      console.log('  (uploads directory does not exist)');
    }

    console.log('\n✓ Database reset complete!');
    console.log('\nAll data has been deleted. The database is now clean and ready for fresh data.');
    
  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
    if (error.code) console.error('Error code:', error.code);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Confirm before proceeding
console.log('⚠️  WARNING: This will delete ALL data from the database!');
console.log('   - All users');
console.log('   - All listings');
console.log('   - All orders');
console.log('   - All dashboard stats');
console.log('   - All uploaded images');
console.log('\nThis action cannot be undone!\n');

// Run the reset
resetDatabase();

