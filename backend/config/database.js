import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mirart',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.on('connection', (connection) => {
  console.log('New MySQL connection established');
});

pool.on('error', (err) => {
  console.error('MySQL pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Database connection was closed.');
  }
  if (err.code === 'ER_CON_COUNT_ERROR') {
    console.error('Database has too many connections.');
  }
  if (err.code === 'ECONNREFUSED') {
    console.error('Database connection was refused.');
  }
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('Database access denied. Check your credentials in .env file.');
  }
});

export default pool;

