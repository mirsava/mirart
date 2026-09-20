import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: {
    execute: (...args) => mockExecute(...args),
  },
}));

// Tests identify the caller with an x-test-auth header instead of a real Supabase token.
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

process.env.NODE_ENV = 'test';
const { app } = await import('../server.js');

const asUser = JSON.stringify({ authUserId: '11111111-1111-4111-8111-111111111111', userId: 1, role: 'artist', groups: ['artist'], isAdmin: false });

const listingRow = (overrides = {}) => ({
  id: 1,
  user_id: 1,
  title: 'Painting',
  description: 'Desc',
  category: 'Painting',
  price: 100,
  primary_image_url: '/img.jpg',
  image_urls: ['/img.jpg', '/img2.jpg'],
  in_stock: true,
  status: 'active',
  views: 5,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  artist_name: 'Artist',
  auth_user_id: '11111111-1111-4111-8111-111111111111',
  like_count: 0,
  ...overrides,
});

describe('Listings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockReset();
  });

  describe('GET /api/listings', () => {
    it('returns listings with pagination', async () => {
      // 1) count query, 2) main listings query
      mockExecute
        .mockResolvedValueOnce([[{ total: 1 }]])
        .mockResolvedValueOnce([[listingRow({ title: 'Test Painting', views: 0 })]]);
      const res = await request(app)
        .get('/api/listings')
        .expect(200);
      expect(res.body).toHaveProperty('listings');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.listings[0].image_urls).toEqual(['/img.jpg', '/img2.jpg']);
    });

    it("does not treat someone else's authUserId as 'my listings' (drafts stay private)", async () => {
      mockExecute
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[]]);
      await request(app)
        .get('/api/listings')
        .query({ authUserId: '22222222-2222-4222-8222-222222222222' })
        .set('x-test-auth', asUser)
        .expect(200);
      const countSql = mockExecute.mock.calls[0][0];
      expect(countSql).toContain("l.status = 'active'");
    });
  });

  describe('GET /api/listings/:id', () => {
    it('returns 404 when listing not found', async () => {
      mockExecute.mockResolvedValueOnce([[]]);
      const res = await request(app)
        .get('/api/listings/999')
        .expect(404);
      expect(res.body).toHaveProperty('error', 'Listing not found');
    });

    it('returns 404 for a non-numeric id without touching the database', async () => {
      await request(app).get('/api/listings/not-a-number').expect(404);
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('returns listing when found', async () => {
      // 1) listing query, 2) update views
      mockExecute
        .mockResolvedValueOnce([[listingRow()]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);
      const res = await request(app)
        .get('/api/listings/1')
        .expect(200);
      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('title', 'Painting');
      expect(res.body.is_liked).toBe(false);
    });
  });

  describe('write access', () => {
    it('requires a session to create a listing', async () => {
      await request(app)
        .post('/api/listings')
        .send({ title: 'x', category: 'Painting', price: 10 })
        .expect(401);
    });

    it('requires a session to edit or delete a listing', async () => {
      await request(app).put('/api/listings/1').send({ title: 'x' }).expect(401);
      await request(app).delete('/api/listings/1').expect(401);
    });

    it('rejects edits from someone who does not own the listing', async () => {
      mockExecute.mockResolvedValueOnce([[{ user_id: 99 }]]);
      const res = await request(app)
        .put('/api/listings/1')
        .set('x-test-auth', asUser)
        .send({ title: 'Hijacked' })
        .expect(403);
      expect(res.body.error).toMatch(/permission/);
    });
  });
});
