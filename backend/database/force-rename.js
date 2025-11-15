import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Also log to file for debugging
const logFile = 'rename-log.txt';
const log = (msg) => {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${msg}\n`;
  fs.appendFileSync(logFile, logMsg);
  console.log(msg);
};

async function forceRename() {
  let connection;
  
  try {
    log('Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'mirart',
    });

    log('✓ Connected to MySQL');

    // First, check current columns
    const [currentColumns] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' ORDER BY ORDINAL_POSITION",
      [process.env.DB_NAME || 'mirart']
    );
    
    log('\nCurrent columns in listings table:');
    currentColumns.forEach(col => log(`  - ${col.COLUMN_NAME}`));

    // Check if image_url exists
    const hasImageUrl = currentColumns.some(col => col.COLUMN_NAME === 'image_url');
    const hasPrimaryImageUrl = currentColumns.some(col => col.COLUMN_NAME === 'primary_image_url');

    if (hasPrimaryImageUrl && !hasImageUrl) {
      log('\n✓ Column already renamed to primary_image_url');
      await connection.end();
      return;
    }

    if (!hasImageUrl) {
      log('\n✗ Column image_url does not exist!');
      await connection.end();
      return;
    }

    log('\nRenaming image_url to primary_image_url...');
    
    // Rename the column
    await connection.execute(
      `ALTER TABLE listings CHANGE COLUMN image_url primary_image_url VARCHAR(500)`
    );
    
    log('✓ Column renamed successfully!');
    
    // Verify
    const [verify] = await connection.execute(
      "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'primary_image_url'",
      [process.env.DB_NAME || 'mirart']
    );
    
    if (verify.length > 0) {
      log(`\n✓ Verified: Column 'primary_image_url' exists (type: ${verify[0].DATA_TYPE})`);
      
      // Show updated columns
      const [updatedColumns] = await connection.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' ORDER BY ORDINAL_POSITION",
        [process.env.DB_NAME || 'mirart']
      );
      
      log('\nUpdated columns in listings table:');
      updatedColumns.forEach(col => log(`  - ${col.COLUMN_NAME}`));
    } else {
      log('\n✗ ERROR: Column was not renamed!');
      process.exit(1);
    }
    
  } catch (error) {
    log('\n✗ Error: ' + error.message);
    if (error.code) {
      log('Error code: ' + error.code);
    }
    if (error.sqlMessage) {
      log('SQL Message: ' + error.sqlMessage);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      log('\nConnection closed');
    }
  }
}

forceRename();

