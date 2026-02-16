import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: {
    execute: (...args) => mockExecute(...args),
  },
}));

process.env.NODE_ENV = 'test';
const { app } = await import('../server.js');

describe('Listings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/listings', () => {
    it('returns listings with pagination', async () => {
      // 1) business_name check, 2) count query, 3) main listings query
      mockExecute
        .mockResolvedValueOnce([[{ business_name: 'Test' }]])
        .mockResolvedValueOnce([[{ total: 1 }]])
        .mockResolvedValueOnce([[
          {
            id: 1,
            user_id: 1,
            title: 'Test Painting',
            description: 'Desc',
            category: 'Painting',
            price: 100,
            primary_image_url: '/img.jpg',
            in_stock: true,
            status: 'active',
            views: 0,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
            artist_name: 'Artist',
            cognito_username: 'user1',
            like_count: 0,
          },
        ]]);
      const res = await request(app)
        .get('/api/listings')
        .expect(200);
      expect(res.body).toHaveProperty('listings');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.listings)).toBe(true);
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

    it('returns listing when found', async () => {
      // 1) listing query, 2) update views
      mockExecute
        .mockResolvedValueOnce([[
          {
            id: 1,
            user_id: 1,
            title: 'Painting',
            description: 'Desc',
            category: 'Painting',
            price: 100,
            primary_image_url: '/img.jpg',
            in_stock: true,
            status: 'active',
            views: 5,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
            artist_name: 'Artist',
            cognito_username: 'user1',
            like_count: 0,
          },
        ]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);
      const res = await request(app)
        .get('/api/listings/1')
        .expect(200);
      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('title', 'Painting');
    });
  });
});
