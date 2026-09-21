import { useEffect, useState } from 'react';
import apiService, { SocialLinks } from '../services/api';

let cached: Promise<SocialLinks> | null = null;

// Call after an admin saves the links so the next read is fresh.
export const invalidateSocialLinks = () => {
  cached = null;
};

// null until loaded (or if the request fails), so the footer shows nothing rather than guessing.
export function useSocialLinks(): SocialLinks | null {
  const [links, setLinks] = useState<SocialLinks | null>(null);

  useEffect(() => {
    let active = true;
    if (!cached) cached = apiService.getSocialLinks();
    cached
      .then((result) => active && setLinks(result))
      .catch(() => {
        cached = null;
      });
    return () => {
      active = false;
    };
  }, []);

  return links;
}
