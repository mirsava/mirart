import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function renameColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mirart',
  });

  try {
    console.log('Checking current columns...');
    const [cols] = await connection.execute("SHOW COLUMNS FROM listings");
    const columnNames = cols.map(c => c.Field);
    console.log('Current columns:', columnNames.join(', '));
    
    if (columnNames.includes('primary_image_url')) {
      console.log('\n✓ Column already renamed to primary_image_url');
      return;
    }
    
    if (!columnNames.includes('image_url')) {
      console.log('\n✗ Column image_url not found!');
      return;
    }
    
    console.log('\nRenaming image_url to primary_image_url...');
    await connection.execute('ALTER TABLE listings CHANGE image_url primary_image_url VARCHAR(500)');
    console.log('✓ SUCCESS: Column renamed!');
    
    // Verify
    const [verify] = await connection.execute("SHOW COLUMNS FROM listings");
    console.log('\nUpdated columns:');
    verify.forEach(c => console.log(`  - ${c.Field}`));
    
  } catch (err) {
    console.error('\n✗ ERROR:', err.message);
    if (err.code) console.error('Error code:', err.code);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

renameColumn();

