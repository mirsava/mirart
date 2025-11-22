import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mirart'
});

try {
  console.log('Adding business_name column...');
  await connection.execute('ALTER TABLE users ADD COLUMN business_name VARCHAR(255) NULL');
  console.log('SUCCESS: Column added');
} catch (error) {
  if (error.code === 'ER_DUP_FIELDNAME') {
    console.log('Column already exists');
  } else {
    console.error('ERROR:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  }
}

const [cols] = await connection.execute('SHOW COLUMNS FROM users');
const hasCol = cols.some(c => c.Field === 'business_name');
console.log('Verification - business_name exists:', hasCol);

await connection.end();
process.exit(0);

