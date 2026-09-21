import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createLimiter, securityHeaders } from './security.js';

describe('createLimiter', () => {
  const buildApp = () => {
    const app = express();
    app.use(createLimiter({ windowMs: 60 * 1000, limit: 3, message: 'Slow down' }));
    app.get('/ping', (req, res) => res.json({ ok: true }));
    return app;
  };

  it('allows requests up to the limit, then answers 429 with a stable error code', async () => {
    const app = buildApp();
    for (let i = 0; i < 3; i++) await request(app).get('/ping').expect(200);
    const res = await request(app).get('/ping').expect(429);
    expect(res.body).toEqual({ error: 'Slow down', code: 'rate_limited' });
  });

  it('reports the remaining quota in standard headers', async () => {
    const res = await request(buildApp()).get('/ping').expect(200);
    expect(res.headers['ratelimit-policy'] || res.headers['ratelimit']).toBeTruthy();
  });
});

describe('securityHeaders', () => {
  it('sets protective headers and hides the framework', async () => {
    const app = express();
    app.use(securityHeaders);
    app.get('/ping', (req, res) => res.json({ ok: true }));
    const res = await request(app).get('/ping').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });
});
