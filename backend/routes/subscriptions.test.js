import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock database before app loads
const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: {
    execute: (...args) => mockExecute(...args),
  },
}));

// Mock Stripe
vi.mock('../config/stripe.js', () => ({
  stripe: {
    subscriptions: {
      update: vi.fn().mockResolvedValue({ id: 'sub_xxx', cancel_at_period_end: true }),
    },
    checkout: {
      sessions: {
        retrieve: vi.fn().mockResolvedValue({ payment_status: 'paid', subscription: 'sub_xxx', metadata: {} }),
      },
    },
  },
}));

// Import app after mocks (NODE_ENV=test prevents server.listen)
process.env.NODE_ENV = 'test';
const { app } = await import('../server.js');

describe('Subscriptions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockReset(); // Reset so each test sets its own mock
  });

  describe('GET /api/subscriptions/test', () => {
    it('returns success message', async () => {
      const res = await request(app)
        .get('/api/subscriptions/test')
        .expect(200);
      expect(res.body).toHaveProperty('message', 'Subscriptions router is working');
      expect(res.body).toHaveProperty('path');
      expect(res.body).toHaveProperty('url');
    });
  });

  describe('GET /api/subscriptions/plans', () => {
    it('returns plans when table exists', async () => {
      mockExecute
        .mockResolvedValueOnce([[1]]) // SELECT 1 FROM subscription_plans
        .mockResolvedValueOnce([[{ id: 1, name: 'Starter', tier: 'starter', max_listings: 5, price_monthly: 9.99, price_yearly: 99.99, is_active: true, display_order: 0 }]]);
      const res = await request(app)
        .get('/api/subscriptions/plans')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(0);
    });

    it('returns empty array when table does not exist', async () => {
      const noTableError = new Error('Table does not exist');
      noTableError.code = 'ER_NO_SUCH_TABLE';
      mockExecute.mockRejectedValueOnce(noTableError);
      const res = await request(app)
        .get('/api/subscriptions/plans')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('GET /api/subscriptions/admin/plans', () => {
    it('returns 401 without cognitoUsername', async () => {
      const res = await request(app)
        .get('/api/subscriptions/admin/plans')
        .expect(401);
      expect(res.body).toHaveProperty('error', 'Authentication required');
    });

    it('returns 403 when user is not admin', async () => {
      mockExecute
        .mockResolvedValueOnce([[1]])
        .mockResolvedValueOnce([[]]);
      const res = await request(app)
        .get('/api/subscriptions/admin/plans')
        .query({ cognitoUsername: 'user1', groups: JSON.stringify(['buyer']) })
        .expect(403);
      expect(res.body).toHaveProperty('error', 'Admin access required');
    });

    it('returns plans when user is admin', async () => {
      mockExecute
        .mockResolvedValueOnce([[1]])
        .mockResolvedValueOnce([[{ id: 1, name: 'Starter', tier: 'starter', max_listings: 5, price_monthly: 9.99, price_yearly: 99.99, is_active: true, display_order: 0 }]]);
      const res = await request(app)
        .get('/api/subscriptions/admin/plans')
        .query({ cognitoUsername: 'admin1', groups: JSON.stringify(['site_admin']) })
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/subscriptions/user/:cognitoUsername', () => {
    it('returns 404 when user not found', async () => {
      mockExecute.mockResolvedValueOnce([[]]); // pool.execute returns [rows, fields]; rows = []
      const res = await request(app)
        .get('/api/subscriptions/user/nonexistent')
        .expect(404);
      expect(res.body).toHaveProperty('error', 'User not found');
    });

    it('returns null subscription when user has no active subscription', async () => {
      mockExecute
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([[]]); // no subscriptions
      const res = await request(app)
        .get('/api/subscriptions/user/user1')
        .expect(200);
      expect(res.body).toHaveProperty('subscription', null);
    });

    it('returns subscription when user has active subscription', async () => {
      mockExecute
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([[{ id: 1, plan_id: 1, plan_name: 'Starter', billing_period: 'monthly', max_listings: 5, end_date: '2025-12-31', auto_renew: true }]])
        .mockResolvedValueOnce([[{ count: 2 }]]);
      const res = await request(app)
        .get('/api/subscriptions/user/user1')
        .expect(200);
      expect(res.body.subscription).not.toBeNull();
      expect(res.body.subscription.plan_name).toBe('Starter');
      expect(res.body.subscription.current_listings).toBe(2);
      expect(res.body.subscription.listings_remaining).toBe(3);
    });
  });

  describe('PUT /api/subscriptions/user/:cognitoUsername/cancel', () => {
    it('returns 404 when user not found', async () => {
      mockExecute.mockResolvedValueOnce([[]]); // no users found
      const res = await request(app)
        .put('/api/subscriptions/user/nonexistent/cancel')
        .expect(404);
      expect(res.body).toHaveProperty('error', 'User not found');
    });

    it('cancels subscription and updates Stripe when sub_ id exists', async () => {
      mockExecute
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([[{ id: 1, payment_intent_id: 'sub_xxx123' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);
      const res = await request(app)
        .put('/api/subscriptions/user/user1/cancel')
        .expect(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('retain access');
    });

    it('cancels subscription in DB when no Stripe sub id', async () => {
      mockExecute
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([[{ id: 1, payment_intent_id: 'cs_session_xxx' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);
      const res = await request(app)
        .put('/api/subscriptions/user/user1/cancel')
        .expect(200);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('POST /api/subscriptions/user/:cognitoUsername', () => {
    it('returns 400 without plan_id and billing_period', async () => {
      const res = await request(app)
        .post('/api/subscriptions/user/user1')
        .send({})
        .expect(400);
      expect(res.body).toHaveProperty('error', 'plan_id and billing_period are required');
    });

    it('returns 400 without session_id', async () => {
      const res = await request(app)
        .post('/api/subscriptions/user/user1')
        .send({ plan_id: 1, billing_period: 'monthly' })
        .expect(400);
      expect(res.body).toHaveProperty('error', 'Stripe payment required');
    });
  });
});
