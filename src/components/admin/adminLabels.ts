import { AdminPaymentType } from '../../services/api';

export const PAYMENT_TYPE_LABELS: Record<AdminPaymentType, string> = {
  subscription: 'Subscriptions',
  listing_pass: 'Listing passes',
  feature: 'Featured listings',
  bump: 'Bumps',
  featured_artist: 'Featured artist weeks',
  order_fee: 'Order fees',
};

export const money = (n: number, cents = true) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;

export const formatWeekRange = (weekStart: string) => {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${fmt(start)} – ${fmt(end)}`;
};
