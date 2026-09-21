import crypto from 'crypto';
import { getSupabaseAdmin } from '../config/supabase.js';

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'artwork';

const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

export const ALLOWED_IMAGE_TYPES = Object.keys(EXTENSIONS);

let bucketReady = false;

// Creates the public bucket the first time it is needed (idempotent).
export async function ensureBucket() {
  if (bucketReady) return;
  const storage = getSupabaseAdmin().storage;
  const { error } = await storage.createBucket(STORAGE_BUCKET, { public: true });
  if (error && !/already exists|duplicate/i.test(error.message || '')) throw error;
  bucketReady = true;
}

export function publicUrlFor(path) {
  return getSupabaseAdmin().storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

// Returns the object path if the URL points at our bucket, otherwise null.
export function pathFromPublicUrl(url) {
  if (typeof url !== 'string') return null;
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  try {
    return decodeURIComponent(url.slice(index + marker.length).split('?')[0]);
  } catch {
    return null;
  }
}

/**
 * Stores an image and returns its public URL. The extension comes from the verified MIME type,
 * never from the client-supplied file name.
 */
export async function uploadImage({ buffer, mimetype, folder }) {
  const extension = EXTENSIONS[mimetype];
  if (!extension) throw new Error('Unsupported image type');

  await ensureBucket();
  const path = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
  const { error } = await getSupabaseAdmin().storage.from(STORAGE_BUCKET).upload(path, buffer, {
    contentType: mimetype,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;
  return { path, url: publicUrlFor(path) };
}

/**
 * Deletes the stored files behind the given URLs. URLs that are not in our bucket are ignored, and when
 * onlyFolder is set, files outside that folder are ignored too, so one user cannot delete another's images.
 */
export async function deleteImages(urls, { onlyFolder } = {}) {
  const paths = [...new Set((urls || []).map(pathFromPublicUrl).filter(Boolean))].filter(
    (path) => !onlyFolder || path.startsWith(`${onlyFolder}/`)
  );
  if (paths.length === 0) return 0;
  const { error } = await getSupabaseAdmin().storage.from(STORAGE_BUCKET).remove(paths);
  if (error) throw error;
  return paths.length;
}
