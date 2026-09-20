import { useEffect, useState } from 'react';
import apiService from '../services/api';

let cached: Promise<{ checkout_enabled: boolean }> | null = null;

// Call after an admin changes the setting so the next read is fresh.
export const invalidateMarketplaceSettings = () => {
  cached = null;
};

// checkoutEnabled is false until the setting has loaded (or if loading fails), so purchase UI never flashes on.
export function useMarketplaceSettings(): { checkoutEnabled: boolean; loaded: boolean } {
  const [state, setState] = useState<{ checkoutEnabled: boolean; loaded: boolean }>({ checkoutEnabled: false, loaded: false });

  useEffect(() => {
    let active = true;
    if (!cached) cached = apiService.getMarketplaceSettings();
    cached
      .then((settings) => active && setState({ checkoutEnabled: settings.checkout_enabled === true, loaded: true }))
      .catch(() => {
        cached = null;
        if (active) setState({ checkoutEnabled: false, loaded: true });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
