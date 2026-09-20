import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';

dotenv.config();

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_c9TqRAcz9';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const ADMIN_GROUP = 'site_admin';

async function setAdmin() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mirart',
    });

    const input = process.argv[2];

    if (!input) {
      console.log('Usage: node set-admin.js <cognito_username_or_email>');
      console.log('Example: node set-admin.js myusername');
      console.log('Example: node set-admin.js user@example.com');
      process.exit(1);
    }

    const isEmail = input.includes('@');
    const [users] = await connection.execute(
      isEmail
        ? 'SELECT id, email, cognito_username FROM users WHERE email = ?'
        : 'SELECT id, email, cognito_username FROM users WHERE cognito_username = ?',
      [input]
    );

    if (users.length === 0) {
      console.log(`User with ${isEmail ? 'email' : 'cognito_username'} "${input}" not found.`);
      console.log('Available users:');
      const [allUsers] = await connection.execute(
        'SELECT cognito_username, email FROM users LIMIT 10'
      );
      allUsers.forEach(u => {
        console.log(`  - ${u.cognito_username} (${u.email})`);
      });
      process.exit(1);
    }

    const cognitoUsername = users[0].cognito_username;
    await connection.execute(
      'UPDATE users SET user_type = ? WHERE cognito_username = ?',
      ['admin', cognitoUsername]
    );

    const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });
    try {
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: cognitoUsername,
        GroupName: ADMIN_GROUP,
      }));
      console.log(`✓ Added to Cognito group "${ADMIN_GROUP}".`);
    } catch (cognitoErr) {
      if (cognitoErr.name === 'UserNotFoundException') {
        console.log(`⚠ Cognito user "${cognitoUsername}" not found. DB updated; add user to "${ADMIN_GROUP}" group in Cognito console.`);
      } else if (cognitoErr.name === 'ResourceNotFoundException' && cognitoErr.message?.includes('Group')) {
        console.log(`⚠ Cognito group "${ADMIN_GROUP}" not found. Create it in Cognito console and add user.`);
      } else {
        throw cognitoErr;
      }
    }

    console.log(`✓ Successfully set user "${cognitoUsername}" (${users[0].email}) as admin.`);
    console.log(`  User can now access /admin dashboard.`);
    console.log(`  Log out and log back in for changes to take effect.`);

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

