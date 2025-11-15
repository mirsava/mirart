import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function rename() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mirart',
  });

  const output = [];
  const log = (msg) => {
    output.push(msg);
    console.log(msg);
  };

  try {
    log('Checking columns...');
    const [cols] = await connection.execute("SHOW COLUMNS FROM listings LIKE 'image_url%'");
    log('Found columns: ' + cols.map(c => c.Field).join(', '));
    
    if (cols.some(c => c.Field === 'image_url')) {
      log('Renaming image_url to primary_image_url...');
      await connection.execute('ALTER TABLE listings CHANGE image_url primary_image_url VARCHAR(500)');
      log('SUCCESS: Column renamed!');
    } else if (cols.some(c => c.Field === 'primary_image_url')) {
      log('Column already renamed to primary_image_url');
    } else {
      log('Neither column found');
    }
    
    const [final] = await connection.execute("SHOW COLUMNS FROM listings");
    log('\nAll columns:');
    final.forEach(c => log('  - ' + c.Field));
    
    fs.writeFileSync('rename-output.txt', output.join('\n'));
    
  } catch (err) {
    const errMsg = 'ERROR: ' + err.message;
    log(errMsg);
    fs.writeFileSync('rename-output.txt', output.join('\n'));
    process.exit(1);
  } finally {
    await connection.end();
  }
}

rename();

