import { describe, it, expect } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';
const { app } = await import('./server.js');

describe('Health check', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app)
      .get('/health')
      .expect(200);
    expect(res.body).toEqual({ status: 'ok', message: 'ArtZyla API is running' });
  });
});
