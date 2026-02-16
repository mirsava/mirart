import type { Listing } from '../services/api';

/**
 * Parses image_urls the same way as PaintingDetail to get accurate image count.
 * image_urls can be: array of URLs, comma-separated string, or JSON string.
 */
export function getListingImageCount(listing: Listing): number {
  const seenUrls = new Set<string>();

  const addUrl = (url: string | null | undefined) => {
    if (!url || !url.trim()) return;
    const normalized = url.trim();
    if (!seenUrls.has(normalized)) {
      seenUrls.add(normalized);
    }
  };

  addUrl(listing.primary_image_url);

  if (listing.image_urls) {
    let imageUrlsArray: string[] = [];

    if (Array.isArray(listing.image_urls)) {
      listing.image_urls.forEach((item: unknown) => {
        if (typeof item === 'string') {
          if (item.includes(',')) {
            const split = item.split(',').map((u) => u.trim()).filter(Boolean);
            split.forEach(addUrl);
          } else {
            addUrl(item);
          }
        }
      });
      return seenUrls.size;
    }

    if (typeof listing.image_urls === 'string') {
      const imageUrlsStr = String(listing.image_urls).trim();
      if (!imageUrlsStr || imageUrlsStr === 'null') return seenUrls.size;

      if (imageUrlsStr.startsWith('[') || imageUrlsStr.startsWith('{')) {
        try {
          const parsed = JSON.parse(imageUrlsStr);
          if (Array.isArray(parsed)) {
            if (parsed.length === 1 && typeof parsed[0] === 'string' && parsed[0].includes(',')) {
              parsed[0].split(',').map((u: string) => u.trim()).filter(Boolean).forEach(addUrl);
            } else {
              parsed.filter((u: unknown) => u && typeof u === 'string').forEach((u: string) => addUrl(u));
            }
          } else if (typeof parsed === 'string' && parsed.includes(',')) {
            parsed.split(',').map((u: string) => u.trim()).filter(Boolean).forEach(addUrl);
          }
        } catch {
          if (imageUrlsStr.includes(',')) {
            imageUrlsStr.split(',').map((u) => u.trim()).filter(Boolean).forEach(addUrl);
          } else {
            addUrl(imageUrlsStr);
          }
        }
      } else if (imageUrlsStr.includes(',')) {
        imageUrlsStr.split(',').map((u) => u.trim()).filter(Boolean).forEach(addUrl);
      } else {
        addUrl(imageUrlsStr);
      }
    }
  }

  return seenUrls.size;
}
