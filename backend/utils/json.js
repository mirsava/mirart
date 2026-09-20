// image_urls is a JSONB array, but older rows may hold a bare URL, a JSON string,
// or a single comma-separated string inside the array.
export function parseImageUrls(value) {
  if (value === null || value === undefined || value === '' || value === 'null') return null;

  let urls = value;
  if (typeof value === 'string') {
    const text = value.trim();
    if (/^(https?:\/\/|\/)/.test(text)) {
      urls = [text];
    } else {
      try {
        urls = JSON.parse(text);
      } catch {
        return null;
      }
    }
  }

  if (!Array.isArray(urls)) return urls ? [urls] : null;
  if (urls.length === 1 && typeof urls[0] === 'string' && urls[0].includes(',')) {
    return urls[0].split(',').map((url) => url.trim()).filter(Boolean);
  }
  return urls;
}
