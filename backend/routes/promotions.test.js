import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mockExecute = vi.fn();
const mockConn = {
  execute: (...args) => mockExecute(...args),
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn().mockResolvedValue(),
  release: vi.fn(),
};
vi.mock('../config/database.js', () => ({
  default: {
    execute: (...args) => mockExecute(...args),
    getConnection: async () => mockConn,
  },
}));

vi.mock('../middleware/auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    attachAuth: (req, _res, next) => {
      const header = req.headers['x-test-auth'];
      if (header) req.auth = JSON.parse(header);
      next();
    },
  };
});

const mockCreateSession = vi.fn();
const mockRetrieveSession = vi.fn();
vi.mock('../config/stripe.js', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: (...args) => mockCreateSession(...args),
        retrieve: (...args) => mockRetrieveSession(...args),
      },
    },
  },
}));

process.env.NODE_ENV = 'test';
const { app } = await import('../server.js');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const asArtist = JSON.stringify({ authUserId: USER_ID, userId: 1, email: 'a@example.com', role: 'artist', isAdmin: false });
const noSettings = [[]];
const activeListing = (overrides = {}) => [[{ id: 5, user_id: 1, title: 'Sunset', status: 'active', featured_until: null, bumped_at: null, ...overrides }]];

describe('Promotions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockReset();
  });

  describe('POST /api/promotions/checkout', () => {
    it('requires sign-in', async () => {
      await request(app).post('/api/promotions/checkout').send({ listing_id: 5, type: 'bump' }).expect(401);
    });

    it('creates a Stripe session priced on the server', async () => {
      mockExecute.mockResolvedValueOnce(noSettings).mockResolvedValueOnce(activeListing());
      mockCreateSession.mockResolvedValueOnce({ id: 'cs_test', url: 'https://stripe.test/cs_test' });

      const res = await request(app)
        .post('/api/promotions/checkout')
        .set('x-test-auth', asArtist)
        .send({ listing_id: 5, type: 'feature', days: 30, price: 0.01 })
        .expect(200);

      expect(res.body.url).toBe('https://stripe.test/cs_test');
      const session = mockCreateSession.mock.calls[0][0];
      expect(session.line_items[0].price_data.unit_amount).toBe(1500);
      expect(session.metadata).toMatchObject({ kind: 'listing_promotion', listing_id: '5', type: 'feature', days: '30' });
    });

    it('rejects a listing the caller does not own', async () => {
      mockExecute.mockResolvedValueOnce(noSettings).mockResolvedValueOnce(activeListing({ user_id: 99 }));
      await request(app).post('/api/promotions/checkout').set('x-test-auth', asArtist).send({ listing_id: 5, type: 'bump' }).expect(403);
      expect(mockCreateSession).not.toHaveBeenCalled();
    });

    it('rejects a bump during the cooldown', async () => {
      mockExecute.mockResolvedValueOnce(noSettings).mockResolvedValueOnce(activeListing({ bumped_at: new Date().toISOString() }));
      const res = await request(app).post('/api/promotions/checkout').set('x-test-auth', asArtist).send({ listing_id: 5, type: 'bump' }).expect(400);
      expect(res.body.next_bump_at).toBeDefined();
    });

    it('sells a listing pass for a draft listing', async () => {
      mockExecute.mockResolvedValueOnce(noSettings).mockResolvedValueOnce(activeListing({ status: 'draft' }));
      mockCreateSession.mockResolvedValueOnce({ id: 'cs_pass', url: 'https://stripe.test/cs_pass' });
      await request(app).post('/api/promotions/checkout').set('x-test-auth', asArtist).send({ listing_id: 5, type: 'listing_pass' }).expect(200);
      const session = mockCreateSession.mock.calls[0][0];
      expect(session.line_items[0].price_data.unit_amount).toBe(300);
      expect(session.metadata).toMatchObject({ type: 'listing_pass', days: '60' });
    });

    it('does not feature a draft listing', async () => {
      mockExecute.mockResolvedValueOnce(noSettings).mockResolvedValueOnce(activeListing({ status: 'draft' }));
      await request(app).post('/api/promotions/checkout').set('x-test-auth', asArtist).send({ listing_id: 5, type: 'feature', days: 7 }).expect(400);
    });

    it('rejects an unknown feature length', async () => {
      mockExecute.mockResolvedValueOnce(noSettings);
      await request(app).post('/api/promotions/checkout').set('x-test-auth', asArtist).send({ listing_id: 5, type: 'feature', days: 2 }).expect(400);
    });
  });

  describe('GET /api/promotions/confirm', () => {
    const paidSession = (metadata = {}) => ({
      id: 'cs_test',
      payment_status: 'paid',
      amount_total: 500,
      metadata: { kind: 'listing_promotion', listing_id: '5', user_id: '1', auth_user_id: USER_ID, type: 'feature', days: '7', ...metadata },
    });

    it('applies a paid promotion', async () => {
      mockRetrieveSession.mockResolvedValueOnce(paidSession());
      mockExecute
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ id: 5, featured_until: '2026-09-30T00:00:00Z', bumped_at: null }]]);

      const res = await request(app).get('/api/promotions/confirm?session_id=cs_test').set('x-test-auth', asArtist).expect(200);
      expect(res.body).toMatchObject({ success: true, applied: true, type: 'feature', days: 7 });
      expect(mockExecute.mock.calls[0][1]).toEqual([5, 1, 'feature', 7, 5, 'stripe', 'cs_test']);
    });

    it('reports an already-applied session without updating the listing again', async () => {
      mockRetrieveSession.mockResolvedValueOnce(paidSession());
      mockExecute
        .mockResolvedValueOnce([{ affectedRows: 0 }])
        .mockResolvedValueOnce([[{ id: 5, featured_until: '2026-09-30T00:00:00Z', bumped_at: null }]]);

      const res = await request(app).get('/api/promotions/confirm?session_id=cs_test').set('x-test-auth', asArtist).expect(200);
      expect(res.body.applied).toBe(false);
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('refuses another account\'s payment', async () => {
      mockRetrieveSession.mockResolvedValueOnce(paidSession({ auth_user_id: '22222222-2222-4222-8222-222222222222' }));
      await request(app).get('/api/promotions/confirm?session_id=cs_test').set('x-test-auth', asArtist).expect(403);
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('refuses an unpaid session', async () => {
      mockRetrieveSession.mockResolvedValueOnce({ ...paidSession(), payment_status: 'unpaid' });
      await request(app).get('/api/promotions/confirm?session_id=cs_test').set('x-test-auth', asArtist).expect(400);
    });
  });

  describe('POST /api/promotions/listings/:id/use-credit', () => {
    it('features the listing with an included plan credit', async () => {
      mockExecute
        .mockResolvedValueOnce(noSettings)
        .mockResolvedValueOnce(activeListing())
        .mockResolvedValueOnce([[{ id: 1 }]]) // row lock
        .mockResolvedValueOnce([[{ tier: 'professional' }]])
        .mockResolvedValueOnce([[{ used: 0 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ id: 5, featured_until: '2026-09-30T00:00:00Z', bumped_at: null }]]);

      const res = await request(app).post('/api/promotions/listings/5/use-credit').set('x-test-auth', asArtist).expect(200);
      expect(res.body.credits).toMatchObject({ allowance: 1, used: 1, remaining: 0 });
      expect(mockConn.commit).toHaveBeenCalled();
    });

    it('refuses when no credits are left', async () => {
      mockExecute
        .mockResolvedValueOnce(noSettings)
        .mockResolvedValueOnce(activeListing())
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([[{ tier: 'professional' }]])
        .mockResolvedValueOnce([[{ used: 1 }]]);

      await request(app).post('/api/promotions/listings/5/use-credit').set('x-test-auth', asArtist).expect(400);
      expect(mockConn.rollback).toHaveBeenCalled();
      expect(mockConn.commit).not.toHaveBeenCalled();
    });
  });
});
