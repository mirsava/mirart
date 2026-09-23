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

const ME = '11111111-1111-4111-8111-111111111111';
const asMe = JSON.stringify({ authUserId: ME, userId: 1, role: 'artist', isAdmin: false });

describe('PUT /api/users/:authUserId (profile save)', () => {
  beforeEach(() => mockExecute.mockReset());

  it('only updates the fields that were sent, so the profile photo is not wiped', async () => {
    mockExecute.mockResolvedValueOnce([{ rows: [{ id: 1, bio: 'Hello' }], affectedRows: 1 }]);
    await request(app).put(`/api/users/${ME}`).set('x-test-auth', asMe).send({ bio: 'Hello' }).expect(200);
    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toMatch(/SET bio = \? WHERE/);
    expect(sql).not.toMatch(/profile_image_url/);
    expect(params).toEqual(['Hello', ME]);
  });

  it('accepts a valid new username', async () => {
    mockExecute.mockResolvedValueOnce([{ rows: [{ id: 1, username: 'new_name' }], affectedRows: 1 }]);
    await request(app).put(`/api/users/${ME}`).set('x-test-auth', asMe).send({ username: 'new_name' }).expect(200);
    expect(mockExecute.mock.calls[0][0]).toMatch(/username = \?/);
  });

  it('rejects a badly formed username without touching the database', async () => {
    await request(app).put(`/api/users/${ME}`).set('x-test-auth', asMe).send({ username: 'no spaces!' }).expect(400);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('reports a taken username as a conflict', async () => {
    mockExecute.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505', constraint: 'idx_users_username_lower' }));
    const res = await request(app).put(`/api/users/${ME}`).set('x-test-auth', asMe).send({ username: 'taken' }).expect(409);
    expect(res.body.error).toMatch(/taken/);
  });

  it("does not let someone edit another person's profile", async () => {
    await request(app).put('/api/users/22222222-2222-4222-8222-222222222222').set('x-test-auth', asMe).send({ bio: 'x' }).expect(403);
  });
});
