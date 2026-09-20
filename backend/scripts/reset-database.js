import pool from '../config/database.js';
import { getSupabaseAdmin } from '../config/supabase.js';

// Empties every app table and restarts id sequences. Pass --include-auth to also delete all Supabase Auth users.
const includeAuth = process.argv.includes('--include-auth');

try {
  await pool.raw.query(`
    TRUNCATE users, listings, likes, listing_comments, messages, chat_conversations, chat_messages,
      support_chat_messages, notifications, admin_announcements, dashboard_stats, orders,
      subscription_plans, user_subscriptions
    RESTART IDENTITY CASCADE
  `);
  console.log('Truncated all app tables (site_settings kept).');

  if (includeAuth) {
    const admin = getSupabaseAdmin();
    let deleted = 0;
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
      if (error) throw error;
      if (data.users.length === 0) break;
      for (const user of data.users) {
        const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
        if (deleteError) throw deleteError;
        deleted++;
      }
    }
    console.log(`Deleted ${deleted} Supabase Auth user(s).`);
  }
} catch (error) {
  console.error('Reset failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
