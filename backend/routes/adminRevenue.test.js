import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: { execute: (...args) => mockExecute(...args) },
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

process.env.NODE_ENV = 'test';
const { app } = await import('../server.js');
const { weekStartOf, addWeeks } = await import('../services/featuredArtist.js');

const asAdmin = JSON.stringify({ authUserId: '22222222-2222-4222-8222-222222222222', userId: 2, role: 'admin', isAdmin: true });
const asArtist = JSON.stringify({ authUserId: '11111111-1111-4111-8111-111111111111', userId: 1, role: 'artist', isAdmin: false });

describe('admin revenue routes', () => {
  beforeEach(() => mockExecute.mockReset());

  it('are admin only', async () => {
    await request(app).get('/api/admin/overview').expect(401);
    await request(app).get('/api/admin/payments').set('x-test-auth', asArtist).expect(403);
  });

  it('adds up revenue from every source for the overview', async () => {
    mockExecute
      .mockResolvedValueOnce([[
        { type: 'feature', this_month: '5', last_30d: '5', all_time: '5', purchases: 1 },
        { type: 'featured_artist', this_month: '25', last_30d: '25', all_time: '50', purchases: 2 },
      ]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ users_total: 3 }]])
      .mockResolvedValueOnce([[{ unread_support: 1 }]])
      .mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/admin/overview').set('x-test-auth', asAdmin).expect(200);
    expect(res.body.revenue).toMatchObject({ this_month: 30, all_time: 55 });
    expect(res.body.monthly).toHaveLength(12);
    expect(res.body.attention.unread_support).toBe(1);
  });

  it('ignores unknown payment types instead of passing them to SQL', async () => {
    mockExecute.mockResolvedValueOnce([[{ count: 0, paid_total: 0 }]]).mockResolvedValueOnce([[]]);
    await request(app).get('/api/admin/payments?type=drop%20table').set('x-test-auth', asAdmin).expect(200);
    expect(mockExecute.mock.calls[0][1]).toEqual([]);
  });

  it('only lets admins give away Mondays that have not passed', async () => {
    const nextMonday = addWeeks(weekStartOf(), 1);
    const tuesday = new Date(new Date(`${nextMonday}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await request(app).post('/api/admin/featured-artist/bookings').set('x-test-auth', asAdmin).send({ week_start: tuesday, user_id: 5 }).expect(400);
    await request(app).post('/api/admin/featured-artist/bookings').set('x-test-auth', asAdmin).send({ week_start: addWeeks(weekStartOf(), -1), user_id: 5 }).expect(400);
  });

  it('refuses a week that is already booked', async () => {
    mockExecute.mockResolvedValueOnce([[{ id: 5, email: 'a@example.com' }]]).mockResolvedValueOnce([{ affectedRows: 0 }]);
    await request(app).post('/api/admin/featured-artist/bookings').set('x-test-auth', asAdmin)
      .send({ week_start: addWeeks(weekStartOf(), 2), user_id: 5 }).expect(409);
  });
});
