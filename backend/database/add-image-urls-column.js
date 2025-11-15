import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addColumn() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'mirart',
    });

    console.log('Connected to MySQL database');

    // Check if column exists first
    const [columns] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'image_urls'",
      [process.env.DB_NAME || 'mirart']
    );

    if (columns.length > 0) {
      console.log('Column image_urls already exists');
      process.exit(0);
    }

    console.log('Adding image_urls column...');
    
    // Add the column
    await connection.execute(
      `ALTER TABLE listings 
       ADD COLUMN image_urls JSON DEFAULT NULL 
       AFTER primary_image_url`
    );
    
    console.log('✓ Column image_urls added successfully!');
    
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column image_urls already exists');
    } else {
      console.error('Error:', error.message);
      console.error('Error code:', error.code);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addColumn();

