import { useMemo } from 'react';
import { FAQItem, getFaqItems } from '../data/faqs';
import { useBillingStatus } from './useBillingStatus';
import { useMarketplaceSettings } from './useMarketplaceSettings';

// FAQ answers that match how the site currently works (checkout on/off, billing on/off).
export function useFaqItems(): FAQItem[] {
  const { checkoutEnabled } = useMarketplaceSettings();
  const billing = useBillingStatus();
  const billingEnabled = billing?.billing_enabled === true;
  const freeListingLimit = billing?.free_listing_limit ?? 25;

  return useMemo(
    () => getFaqItems({ checkoutEnabled, billingEnabled, freeListingLimit }),
    [checkoutEnabled, billingEnabled, freeListingLimit]
  );
}
