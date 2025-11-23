import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function setAdmin() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mirart',
    });

    const cognitoUsername = process.argv[2];
    
    if (!cognitoUsername) {
      console.log('Usage: node set-admin.js <cognito_username>');
      console.log('Example: node set-admin.js myusername');
      process.exit(1);
    }

    const [users] = await connection.execute(
      'SELECT id, email, cognito_username FROM users WHERE cognito_username = ?',
      [cognitoUsername]
    );

    if (users.length === 0) {
      console.log(`User with cognito_username "${cognitoUsername}" not found.`);
      console.log('Available users:');
      const [allUsers] = await connection.execute(
        'SELECT cognito_username, email FROM users LIMIT 10'
      );
      allUsers.forEach(u => {
        console.log(`  - ${u.cognito_username} (${u.email})`);
      });
      process.exit(1);
    }

    await connection.execute(
      'UPDATE users SET user_type = ? WHERE cognito_username = ?',
      ['admin', cognitoUsername]
    );

    console.log(`✓ Successfully set user "${cognitoUsername}" as admin.`);
    console.log(`  User can now access /admin dashboard.`);
    console.log(`  They may need to log out and log back in for changes to take effect.`);

  } catch (error) {
    console.error('Error setting admin:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setAdmin();

