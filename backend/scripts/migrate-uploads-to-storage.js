import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import { ensureBucket, publicUrlFor, STORAGE_BUCKET } from '../services/storage.js';
import { getSupabaseAdmin } from '../config/supabase.js';

// One-time: copy images from backend/uploads into Supabase Storage and rewrite the URLs saved in the database.
const uploadsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../uploads');
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };

try {
  if (!fs.existsSync(uploadsDir)) {
    console.log('No local uploads folder found. Nothing to migrate.');
  } else {
    await ensureBucket();
    const storage = getSupabaseAdmin().storage.from(STORAGE_BUCKET);
    const files = fs.readdirSync(uploadsDir).filter((name) => MIME[path.extname(name).toLowerCase()]);
    let moved = 0;

    for (const name of files) {
      const target = `legacy/${name}`;
      const { error } = await storage.upload(target, fs.readFileSync(path.join(uploadsDir, name)), {
        contentType: MIME[path.extname(name).toLowerCase()],
        upsert: true,
        cacheControl: '31536000',
      });
      if (error) throw new Error(`Upload failed for ${name}: ${error.message}`);
      const newUrl = publicUrlFor(target);

      // Old values were stored as /uploads/<name> or http(s)://<host>/uploads/<name>
      const oldPattern = `%/uploads/${name}`;
      await pool.raw.query(
        `UPDATE listings SET primary_image_url = $1 WHERE primary_image_url LIKE $2`,
        [newUrl, oldPattern]
      );
      await pool.raw.query(
        `UPDATE listings
         SET image_urls = (
           SELECT jsonb_agg(CASE WHEN elem #>> '{}' LIKE $2 THEN to_jsonb($1::text) ELSE elem END)
           FROM jsonb_array_elements(image_urls) AS elem
         )
         WHERE image_urls IS NOT NULL AND jsonb_typeof(image_urls) = 'array' AND image_urls::text LIKE $3`,
        [newUrl, oldPattern, `%/uploads/${name}%`]
      );
      await pool.raw.query(`UPDATE users SET profile_image_url = $1 WHERE profile_image_url LIKE $2`, [newUrl, oldPattern]);
      await pool.raw.query(`UPDATE users SET signature_url = $1 WHERE signature_url LIKE $2`, [newUrl, oldPattern]);
      moved++;
      console.log(`Migrated ${name}`);
    }
    console.log(`Done. ${moved} file(s) copied to Storage. You can delete backend/uploads once you have checked the site.`);
  }
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
