import { useEffect, useState } from 'react';
import apiService, { BillingStatus } from '../services/api';

let cached: Promise<BillingStatus> | null = null;

// Call after an admin changes the billing settings so the next read is fresh.
export const invalidateBillingStatus = () => {
  cached = null;
};

// Whether paid billing is on and what an artist without a plan can do. null until loaded (or if the request fails).
export function useBillingStatus(): BillingStatus | null {
  const [billing, setBilling] = useState<BillingStatus | null>(null);

  useEffect(() => {
    let active = true;
    if (!cached) cached = apiService.getBillingStatus();
    cached
      .then((status) => active && setBilling(status))
      .catch(() => {
        cached = null;
      });
    return () => {
      active = false;
    };
  }, []);

  return billing;
}
