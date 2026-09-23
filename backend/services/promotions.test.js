import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: { execute: (...args) => mockExecute(...args) },
}));

const {
  DEFAULT_PROMOTION_CONFIG,
  normalizePromotionConfig,
  quotePromotion,
  nextBumpAt,
  getFeatureCredits,
  applyPromotion,
} = await import('./promotions.js');

describe('promotions service', () => {
  beforeEach(() => mockExecute.mockReset());

  describe('normalizePromotionConfig', () => {
    it('falls back to defaults for an empty config', () => {
      expect(normalizePromotionConfig({})).toEqual(DEFAULT_PROMOTION_CONFIG);
    });

    it('clamps prices and drops invalid or duplicate feature options', () => {
      const config = normalizePromotionConfig({
        feature_options: [{ days: 30, price: 12.345 }, { days: 'x', price: 3 }, { days: 30, price: 20 }, { days: 3, price: 0 }],
        bump_price: -4,
      });
      expect(config.feature_options).toEqual([{ days: 3, price: 0.5 }, { days: 30, price: 20 }]);
      expect(config.bump_price).toBe(0.5);
    });

    it('keeps an explicit disable', () => {
      expect(normalizePromotionConfig({ enabled: false }).enabled).toBe(false);
    });
  });

  describe('quotePromotion', () => {
    it('prices a configured feature option and a bump', () => {
      expect(quotePromotion(DEFAULT_PROMOTION_CONFIG, 'feature', '30')).toEqual({ type: 'feature', days: 30, price: 15 });
      expect(quotePromotion(DEFAULT_PROMOTION_CONFIG, 'bump')).toEqual({ type: 'bump', days: null, price: 1 });
    });

    it('rejects options that are not configured', () => {
      expect(quotePromotion(DEFAULT_PROMOTION_CONFIG, 'feature', 2)).toBeNull();
      expect(quotePromotion(DEFAULT_PROMOTION_CONFIG, 'gold')).toBeNull();
    });
  });

  describe('nextBumpAt', () => {
    const now = new Date('2026-09-23T12:00:00Z');

    it('is null when the listing was never bumped or the cooldown passed', () => {
      expect(nextBumpAt({ bumped_at: null }, DEFAULT_PROMOTION_CONFIG, now)).toBeNull();
      expect(nextBumpAt({ bumped_at: '2026-09-22T11:00:00Z' }, DEFAULT_PROMOTION_CONFIG, now)).toBeNull();
    });

    it('returns the end of the cooldown when bumped recently', () => {
      expect(nextBumpAt({ bumped_at: '2026-09-23T10:00:00Z' }, DEFAULT_PROMOTION_CONFIG, now)?.toISOString()).toBe('2026-09-24T10:00:00.000Z');
    });
  });

  describe('getFeatureCredits', () => {
    it('gives nothing without a plan that includes features', async () => {
      mockExecute.mockResolvedValueOnce([[{ tier: 'starter' }]]);
      expect(await getFeatureCredits(1, DEFAULT_PROMOTION_CONFIG)).toMatchObject({ allowance: 0, remaining: 0 });
    });

    it('subtracts features used in the last 30 days', async () => {
      mockExecute.mockResolvedValueOnce([[{ tier: 'enterprise' }]]).mockResolvedValueOnce([[{ used: 2 }]]);
      expect(await getFeatureCredits(1, DEFAULT_PROMOTION_CONFIG)).toEqual({ allowance: 3, used: 2, remaining: 1, days: 7 });
    });
  });

  describe('applyPromotion', () => {
    const executor = { execute: (...args) => mockExecute(...args) };

    it('extends featured_until when the ledger row is new', async () => {
      mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce([{ affectedRows: 1 }]);
      const result = await applyPromotion(executor, { listingId: 5, userId: 1, type: 'feature', days: 7, amount: 5, source: 'stripe', stripeSessionId: 'cs_1' });
      expect(result).toEqual({ applied: true });
      expect(mockExecute.mock.calls[1][0]).toMatch(/featured_until = GREATEST/);
      expect(mockExecute.mock.calls[1][1]).toEqual([7, 5]);
    });

    it('does nothing when the Stripe session was already applied', async () => {
      mockExecute.mockResolvedValueOnce([{ affectedRows: 0 }]);
      const result = await applyPromotion(executor, { listingId: 5, userId: 1, type: 'bump', source: 'stripe', stripeSessionId: 'cs_1' });
      expect(result).toEqual({ applied: false });
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });
});
