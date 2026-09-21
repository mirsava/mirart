import pool from '../config/database.js';

const SETTING_KEY = 'social_links';

export const SOCIAL_FIELDS = ['facebook', 'instagram', 'twitter', 'pinterest', 'youtube', 'email'];

const EMPTY = Object.fromEntries(SOCIAL_FIELDS.map((field) => [field, '']));

export class SocialLinkError extends Error {}

// Empty clears a link. Anything else must be a valid http(s) URL (a missing scheme is assumed to be https).
export function normalizeUrl(value, field) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new SocialLinkError(`${field} is not a valid URL`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || raw.length > 300) {
    throw new SocialLinkError(`${field} must be a web address starting with http:// or https://`);
  }
  return url.toString();
}

export function normalizeEmail(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.length > 200 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(raw)) throw new SocialLinkError('email is not a valid address');
  return raw;
}

export async function getSocialLinks() {
  const [rows] = await pool.execute('SELECT setting_value FROM site_settings WHERE setting_key = ?', [SETTING_KEY]);
  const stored = rows[0]?.setting_value || {};
  const links = { ...EMPTY };
  for (const field of SOCIAL_FIELDS) if (typeof stored[field] === 'string') links[field] = stored[field];
  return links;
}

export async function saveSocialLinks(patch = {}) {
  const next = await getSocialLinks();
  for (const field of SOCIAL_FIELDS) {
    if (patch[field] === undefined) continue;
    next[field] = field === 'email' ? normalizeEmail(patch[field]) : normalizeUrl(patch[field], field);
  }
  await pool.execute(
    'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value',
    [SETTING_KEY, JSON.stringify(next)]
  );
  return next;
}
