import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkAndAddColumn() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mirart'
    });

    console.log('Checking users table structure...');
    const [columns] = await connection.execute('SHOW COLUMNS FROM users');
    console.log('\nCurrent columns:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });

    const hasBusinessName = columns.some(col => col.Field === 'business_name');
    
    if (!hasBusinessName) {
      console.log('\nbusiness_name column NOT found. Adding it...');
      await connection.execute('ALTER TABLE users ADD COLUMN business_name VARCHAR(255) NULL');
      console.log('✓ Successfully added business_name column');
      
      const [verify] = await connection.execute('SHOW COLUMNS FROM users');
      const hasItNow = verify.some(col => col.Field === 'business_name');
      if (hasItNow) {
        console.log('✓ Verification: business_name column now exists');
      } else {
        console.error('✗ Verification failed: column was not added');
      }
    } else {
      console.log('\n✓ business_name column already exists');
    }

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('business_name column already exists (caught ER_DUP_FIELDNAME)');
    } else {
      console.error('Error:', error.message);
      console.error('Code:', error.code);
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAndAddColumn()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFailed:', error);
    process.exit(1);
  });

