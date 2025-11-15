import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkAndAddColumn() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'mirart',
    });

    console.log('Connected to MySQL database');

    // Check if column exists
    const [columns] = await connection.execute(
      'SHOW COLUMNS FROM listings LIKE "image_urls"'
    );

    if (columns.length === 0) {
      console.log('Column image_urls does not exist. Adding it now...');
      
      // Add the column
      await connection.execute(
        `ALTER TABLE listings 
         ADD COLUMN image_urls JSON DEFAULT NULL 
         AFTER primary_image_url`
      );
      
      console.log('✓ Column image_urls added successfully!');
    } else {
      console.log('✓ Column image_urls already exists');
    }

    // Show all columns
    const [allColumns] = await connection.execute('DESCRIBE listings');
    console.log('\nAll columns in listings table:');
    allColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAndAddColumn();

