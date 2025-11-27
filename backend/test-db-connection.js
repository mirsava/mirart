import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  let connection;
  
  try {
    console.log('Testing database connection...');
    console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
    console.log('DB_USER:', process.env.DB_USER || 'root');
    console.log('DB_NAME:', process.env.DB_NAME || 'mirart');
    console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : '(empty)');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mirart',
    });
    
    console.log('✓ Successfully connected to database!');
    
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✓ Database query successful:', rows);
    
    await connection.end();
    console.log('✓ Connection closed successfully');
    
  } catch (error) {
    console.error('✗ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nPossible solutions:');
      console.error('1. Check your MySQL password in the .env file');
      console.error('2. Verify MySQL is running');
      console.error('3. Ensure the user has permission to access the database');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\nPossible solutions:');
      console.error('1. Make sure MySQL server is running');
      console.error('2. Check the DB_HOST in your .env file');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\nPossible solutions:');
      console.error('1. The database does not exist');
      console.error('2. Run: npm run init-db');
    }
    
    process.exit(1);
  }
}

testConnection();

