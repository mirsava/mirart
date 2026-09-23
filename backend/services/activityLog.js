import pool from '../config/database.js';

// Records one history entry. Never throws: a failed log line must not break the action it describes.
export async function logActivity({ userId, actorId = null, action, entityType = null, entityId = null, details = null }) {
  try {
    await pool.execute(
      `INSERT INTO activity_log (user_id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId ?? null, actorId ?? null, action, entityType, entityId ?? null, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    console.warn(`Could not record activity "${action}":`, error.message);
  }
}

// Logs an event about a listing into its owner's history. Pass `listing` when it is already loaded
// (or about to be deleted); otherwise the owner and title are looked up.
export async function logListingActivity(listingId, { actorId = null, action, details = {}, listing = null }) {
  try {
    let row = listing;
    if (!row) {
      const [rows] = await pool.execute('SELECT user_id, title FROM listings WHERE id = ?', [listingId]);
      row = rows[0];
    }
    if (!row) return;
    await logActivity({
      userId: row.user_id,
      actorId,
      action,
      entityType: 'listing',
      entityId: Number(listingId),
      details: { title: row.title, ...details },
    });
  } catch (error) {
    console.warn(`Could not record listing activity "${action}":`, error.message);
  }
}
