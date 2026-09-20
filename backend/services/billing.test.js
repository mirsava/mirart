import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: { execute: (...args) => mockExecute(...args) },
}));

const { describeAccess, getBillingConfig, saveBillingConfig, getListingAccess, DEFAULT_BILLING_CONFIG } = await import('./billing.js');

const DAY = 24 * 60 * 60 * 1000;

describe('describeAccess', () => {
  it('gives everyone free access while billing is off', () => {
    const access = describeAccess(DEFAULT_BILLING_CONFIG);
    expect(access).toMatchObject({ billing_enabled: false, free_access: true, in_grace: false, free_listing_limit: 25 });
    expect(access.grace_ends_at).toBeNull();
  });

  it('keeps free access during the grace period after billing starts', () => {
    const now = new Date('2026-10-10T00:00:00Z');
    const config = { ...DEFAULT_BILLING_CONFIG, enabled: true, grace_days: 30, billing_started_at: new Date(now.getTime() - 10 * DAY).toISOString() };
    const access = describeAccess(config, now);
    expect(access.in_grace).toBe(true);
    expect(access.free_access).toBe(true);
    expect(new Date(access.grace_ends_at).getTime()).toBe(now.getTime() + 20 * DAY);
  });

  it('ends free access once the grace period is over', () => {
    const now = new Date('2026-12-01T00:00:00Z');
    const config = { ...DEFAULT_BILLING_CONFIG, enabled: true, grace_days: 30, billing_started_at: '2026-10-01T00:00:00Z' };
    expect(describeAccess(config, now)).toMatchObject({ billing_enabled: true, in_grace: false, free_access: false });
  });

  it('has no grace period when grace_days is 0', () => {
    const now = new Date('2026-10-01T12:00:00Z');
    const config = { ...DEFAULT_BILLING_CONFIG, enabled: true, grace_days: 0, billing_started_at: '2026-10-01T00:00:00Z' };
    expect(describeAccess(config, now).free_access).toBe(false);
  });
});

describe('billing config storage', () => {
  beforeEach(() => mockExecute.mockReset());

  it('falls back to defaults when nothing is stored', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    expect(await getBillingConfig()).toEqual(DEFAULT_BILLING_CONFIG);
  });

  it('starts the grace clock only when billing is switched on', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ setting_value: { enabled: false, free_listing_limit: 25, grace_days: 30, billing_started_at: null } }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const saved = await saveBillingConfig({ enabled: true });
    expect(saved.enabled).toBe(true);
    expect(saved.billing_started_at).toEqual(expect.any(String));
  });

  it('does not restart the grace clock when billing was already on', async () => {
    const startedAt = '2026-10-01T00:00:00.000Z';
    mockExecute
      .mockResolvedValueOnce([[{ setting_value: { enabled: true, free_listing_limit: 25, grace_days: 30, billing_started_at: startedAt } }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const saved = await saveBillingConfig({ free_listing_limit: 40 });
    expect(saved.billing_started_at).toBe(startedAt);
    expect(saved.free_listing_limit).toBe(40);
  });

  it('clamps out-of-range values', async () => {
    mockExecute.mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    const saved = await saveBillingConfig({ free_listing_limit: -5, grace_days: 9999 });
    expect(saved.free_listing_limit).toBe(1);
    expect(saved.grace_days).toBe(365);
  });
});

describe('getListingAccess', () => {
  beforeEach(() => mockExecute.mockReset());

  it('lets an artist without a plan list up to the free limit while billing is off', async () => {
    mockExecute
      .mockResolvedValueOnce([[]]) // no active subscription
      .mockResolvedValueOnce([[]]); // no stored config -> defaults
    expect(await getListingAccess(1)).toMatchObject({ allowed: true, source: 'free', maxListings: 25 });
  });

  it('never gives a subscriber less than the free limit while billing is off', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ id: 1, max_listings: 5 }]])
      .mockResolvedValueOnce([[]]);
    expect(await getListingAccess(1)).toMatchObject({ allowed: true, source: 'subscription', maxListings: 25 });
  });

  it('requires a subscription once billing is on and the grace period is over', async () => {
    mockExecute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ setting_value: { enabled: true, grace_days: 0, billing_started_at: '2020-01-01T00:00:00Z' } }]]);
    expect(await getListingAccess(1)).toMatchObject({ allowed: false, source: 'none' });
  });

  it('uses the plan limit once billing is fully on', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ id: 1, max_listings: 5 }]])
      .mockResolvedValueOnce([[{ setting_value: { enabled: true, grace_days: 0, billing_started_at: '2020-01-01T00:00:00Z' } }]]);
    expect(await getListingAccess(1)).toMatchObject({ allowed: true, source: 'subscription', maxListings: 5 });
  });
});
