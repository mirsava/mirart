import pool from '../config/database.js';
import { getSupabaseAdmin } from '../config/supabase.js';

const identifier = process.argv[2];

if (!identifier) {
  console.log('Usage: npm run set-admin -- <email-or-username>');
  process.exit(1);
}

try {
  const [users] = await pool.execute(
    identifier.includes('@')
      ? 'SELECT id, email, username, auth_user_id FROM users WHERE lower(email) = lower(?)'
      : 'SELECT id, email, username, auth_user_id FROM users WHERE lower(username) = lower(?)',
    [identifier]
  );

  if (users.length === 0) {
    console.log(`No user found for "${identifier}". Sign up first, then run this again.`);
    process.exitCode = 1;
  } else {
    const user = users[0];
    await pool.execute("UPDATE users SET user_type = 'admin' WHERE id = ?", [user.id]);

    // Mirror the role into Supabase app_metadata so it is visible in the dashboard and in JWT claims.
    try {
      await getSupabaseAdmin().auth.admin.updateUserById(user.auth_user_id, { app_metadata: { role: 'admin' } });
    } catch (err) {
      console.warn(`Could not update Supabase app_metadata (profile role was still updated): ${err.message}`);
    }

    console.log(`${user.email} (${user.username || user.auth_user_id}) is now an admin.`);
  }
} catch (error) {
  console.error('Failed to set admin:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
