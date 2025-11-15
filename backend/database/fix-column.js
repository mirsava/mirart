import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixColumn() {
  let connection;
  
  try {
    console.log('Attempting to connect to MySQL...');
    console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
    console.log('DB_NAME:', process.env.DB_NAME || 'mirart');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'mirart',
    });

    console.log('✓ Connected to MySQL database');

    // Check if column exists
    const [columns] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'image_urls'",
      [process.env.DB_NAME || 'mirart']
    );

    if (columns.length > 0) {
      console.log('✓ Column image_urls already exists');
      await connection.end();
      return;
    }

    console.log('Adding image_urls column...');
    
    // Add the column - using a simpler approach
    try {
      await connection.execute(
        `ALTER TABLE listings ADD COLUMN image_urls JSON DEFAULT NULL AFTER primary_image_url`
      );
      console.log('✓ Column image_urls added successfully!');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ Column image_urls already exists');
      } else {
        console.error('Error adding column:', error.message);
        console.error('Error code:', error.code);
        throw error;
      }
    }
    
    // Verify
    const [verify] = await connection.execute(
      "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'image_urls'",
      [process.env.DB_NAME || 'mirart']
    );
    
    if (verify.length > 0) {
      console.log(`✓ Verified: Column 'image_urls' exists (type: ${verify[0].DATA_TYPE})`);
    } else {
      console.error('✗ ERROR: Column was not created!');
      process.exit(1);
    }
    
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

fixColumn();

