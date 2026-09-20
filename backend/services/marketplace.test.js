import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: { execute: (...args) => mockExecute(...args) },
}));

const { getMarketplaceConfig, saveMarketplaceConfig, requireCheckoutEnabled } = await import('./marketplace.js');

const runGuard = async () => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  await requireCheckoutEnabled({}, res, next);
  return { res, next };
};

describe('marketplace config', () => {
  beforeEach(() => mockExecute.mockReset());

  it('defaults to checkout off when nothing is stored', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    expect(await getMarketplaceConfig()).toEqual({ checkout_enabled: false });
  });

  it('only treats an explicit true as enabled', async () => {
    mockExecute.mockResolvedValueOnce([[{ setting_value: { checkout_enabled: 'yes' } }]]);
    expect((await getMarketplaceConfig()).checkout_enabled).toBe(false);
  });

  it('stores the new value', async () => {
    mockExecute.mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    expect(await saveMarketplaceConfig({ checkout_enabled: true })).toEqual({ checkout_enabled: true });
    expect(mockExecute.mock.calls[1][1][1]).toBe(JSON.stringify({ checkout_enabled: true }));
  });
});

describe('requireCheckoutEnabled', () => {
  beforeEach(() => mockExecute.mockReset());

  it('refuses with a checkout_disabled code while checkout is off', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    const { res, next } = await runGuard();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0]).toMatchObject({ code: 'checkout_disabled' });
  });

  it('lets the request through when checkout is on', async () => {
    mockExecute.mockResolvedValueOnce([[{ setting_value: { checkout_enabled: true } }]]);
    const { res, next } = await runGuard();
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('fails closed with a 500 if the setting cannot be read', async () => {
    mockExecute.mockRejectedValueOnce(new Error('db down'));
    const { res, next } = await runGuard();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
