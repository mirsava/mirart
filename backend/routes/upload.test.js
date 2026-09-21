import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mockUploadImage = vi.fn();
vi.mock('../services/storage.js', () => ({
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  uploadImage: (...args) => mockUploadImage(...args),
  deleteImages: vi.fn(),
}));

vi.mock('../config/database.js', () => ({ default: { execute: vi.fn() } }));

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

const USER_ID = '11111111-1111-4111-8111-111111111111';
const asUser = JSON.stringify({ authUserId: USER_ID, userId: 1, role: 'artist', groups: ['artist'], isAdmin: false });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

describe('POST /api/upload', () => {
  beforeEach(() => {
    mockUploadImage.mockReset();
    mockUploadImage.mockImplementation(async ({ folder }) => ({ path: `${folder}/1-abc.png`, url: `https://cdn.example/artwork/${folder}/1-abc.png` }));
  });

  it('requires a session', async () => {
    await request(app).post('/api/upload/image').attach('image', png, 'a.png').expect(401);
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it('stores a single image in the uploader\'s own folder and returns its public URL', async () => {
    const res = await request(app).post('/api/upload/image').set('x-test-auth', asUser).attach('image', png, { filename: 'a.png', contentType: 'image/png' }).expect(200);
    expect(res.body.url).toBe(`https://cdn.example/artwork/${USER_ID}/1-abc.png`);
    expect(mockUploadImage).toHaveBeenCalledWith(expect.objectContaining({ folder: USER_ID, mimetype: 'image/png' }));
  });

  it('rejects a request with no file', async () => {
    const res = await request(app).post('/api/upload/image').set('x-test-auth', asUser).expect(400);
    expect(res.body.error).toBe('No file uploaded');
  });

  it('rejects files that are not images', async () => {
    const res = await request(app).post('/api/upload/image').set('x-test-auth', asUser).attach('image', Buffer.from('<svg/>'), { filename: 'a.svg', contentType: 'image/svg+xml' }).expect(400);
    expect(res.body.error).toMatch(/Only image files/);
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it('uploads several images at once', async () => {
    const res = await request(app)
      .post('/api/upload/images')
      .set('x-test-auth', asUser)
      .attach('images', png, { filename: 'a.png', contentType: 'image/png' })
      .attach('images', png, { filename: 'b.png', contentType: 'image/png' })
      .expect(200);
    expect(res.body.files).toHaveLength(2);
    expect(mockUploadImage).toHaveBeenCalledTimes(2);
  });

  it('returns a 500 when storage fails, without leaking details', async () => {
    mockUploadImage.mockRejectedValueOnce(new Error('bucket exploded'));
    const res = await request(app).post('/api/upload/image').set('x-test-auth', asUser).attach('image', png, { filename: 'a.png', contentType: 'image/png' }).expect(500);
    expect(res.body.error).toBe('Failed to upload file');
  });
});
