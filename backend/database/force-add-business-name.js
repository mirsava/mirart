import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function forceAddColumn() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mirart'
    });

    console.log('Attempting to add business_name column...');
    
    try {
      await connection.execute('ALTER TABLE users ADD COLUMN business_name VARCHAR(255) NULL');
      console.log('✓ Column added successfully');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('Column already exists (ER_DUP_FIELDNAME)');
      } else {
        throw error;
      }
    }
    
    const [columns] = await connection.execute('SHOW COLUMNS FROM users');
    const hasBusinessName = columns.some(col => col.Field === 'business_name');
    
    console.log('\nVerification:');
    console.log('business_name exists:', hasBusinessName);
    
    if (hasBusinessName) {
      const col = columns.find(c => c.Field === 'business_name');
      console.log('Column details:', {
        Field: col.Field,
        Type: col.Type,
        Null: col.Null,
        Key: col.Key,
        Default: col.Default
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

forceAddColumn()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFailed:', error);
    process.exit(1);
  });

