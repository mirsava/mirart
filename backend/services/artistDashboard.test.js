import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: { execute: (...args) => mockExecute(...args) },
}));

const mockAccess = vi.fn();
vi.mock('./billing.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getListingAccess: (...args) => mockAccess(...args),
}));

const { getAnalyticsTier, getArtistEngagement } = await import('./artistDashboard.js');

describe('artist analytics', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockAccess.mockReset();
  });

  it('gives Starter and no-plan artists the basic tier, and higher plans or free launch the full tier', async () => {
    mockAccess.mockResolvedValueOnce({ subscription: { plan_id: 1 }, source: 'subscription' });
    mockExecute.mockResolvedValueOnce([[{ tier: 'starter' }]]);
    expect(await getAnalyticsTier(1)).toBe('basic');

    mockAccess.mockResolvedValueOnce({ subscription: { plan_id: 2 }, source: 'subscription' });
    mockExecute.mockResolvedValueOnce([[{ tier: 'professional' }]]);
    expect(await getAnalyticsTier(1)).toBe('full');

    mockAccess.mockResolvedValueOnce({ subscription: null, source: 'free' });
    expect(await getAnalyticsTier(1)).toBe('full');

    mockAccess.mockResolvedValueOnce({ subscription: null, source: 'none' });
    expect(await getAnalyticsTier(1)).toBe('basic');
  });

  it('fills every day in the range so the chart has no gaps, and hides per-listing data on the basic tier', async () => {
    mockAccess.mockResolvedValueOnce({ subscription: null, source: 'none' });
    const today = new Date().toISOString().slice(0, 10);
    mockExecute
      .mockResolvedValueOnce([[{ day: today, views: '5' }]]) // daily views
      .mockResolvedValueOnce([[{ likes: 2, messages: 1 }]]); // totals
    const result = await getArtistEngagement(1, 7);
    expect(result.tier).toBe('basic');
    expect(result.series).toHaveLength(7);
    expect(result.series[6]).toEqual({ day: today, views: 5 });
    expect(result.summary).toEqual({ views: 5, likes: 2, messages: 1 });
    expect(result.listings).toBeUndefined();
  });

  it('falls back to 30 days for an unsupported range', async () => {
    mockAccess.mockResolvedValueOnce({ subscription: null, source: 'none' });
    mockExecute.mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{}]]);
    const result = await getArtistEngagement(1, 365);
    expect(result.days).toBe(30);
    expect(result.series).toHaveLength(30);
  });
});
