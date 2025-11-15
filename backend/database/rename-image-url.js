import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function renameColumn() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'mirart',
    });

    console.log('Connected to MySQL database');

    // Check if old column exists
    const [oldColumn] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'image_url'",
      [process.env.DB_NAME || 'mirart']
    );

    if (oldColumn.length === 0) {
      // Check if new column already exists
      const [newColumn] = await connection.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'primary_image_url'",
        [process.env.DB_NAME || 'mirart']
      );
      
      if (newColumn.length > 0) {
        console.log('✓ Column already renamed to primary_image_url');
        await connection.end();
        return;
      } else {
        console.error('✗ Neither image_url nor primary_image_url column found!');
        process.exit(1);
      }
    }

    console.log('Renaming image_url to primary_image_url...');
    
    // Rename the column
    await connection.execute(
      `ALTER TABLE listings CHANGE COLUMN image_url primary_image_url VARCHAR(500)`
    );
    
    console.log('✓ Column renamed successfully!');
    
    // Verify
    const [verify] = await connection.execute(
      "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'primary_image_url'",
      [process.env.DB_NAME || 'mirart']
    );
    
    if (verify.length > 0) {
      console.log(`✓ Verified: Column 'primary_image_url' exists (type: ${verify[0].DATA_TYPE})`);
    } else {
      console.error('✗ ERROR: Column was not renamed!');
      process.exit(1);
    }
    
  } catch (error) {
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      // Column might already be renamed
      const [check] = await connection.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'primary_image_url'",
        [process.env.DB_NAME || 'mirart']
      );
      if (check.length > 0) {
        console.log('✓ Column already renamed to primary_image_url');
        await connection.end();
        return;
      }
    }
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

renameColumn();

