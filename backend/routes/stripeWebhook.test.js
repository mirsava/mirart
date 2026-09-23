import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: { execute: (...args) => mockExecute(...args) },
}));

const mockConstructEvent = vi.fn();
vi.mock('../config/stripe.js', () => ({
  stripe: { webhooks: { constructEvent: (...args) => mockConstructEvent(...args) } },
}));

process.env.NODE_ENV = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
const { app } = await import('../server.js');

const send = (event) => {
  mockConstructEvent.mockReturnValueOnce(event);
  return request(app)
    .post('/api/stripe/webhook')
    .set('stripe-signature', 't=1,v1=abc')
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(event));
};

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockReset();
  });

  it('rejects a bad signature', async () => {
    mockConstructEvent.mockImplementationOnce(() => { throw new Error('No signatures found'); });
    await request(app).post('/api/stripe/webhook').set('stripe-signature', 'bad').set('Content-Type', 'application/json').send('{}').expect(400);
  });

  it('passes the raw body to the signature check', async () => {
    await send({ id: 'evt_0', type: 'ping', data: { object: {} } }).expect(200);
    expect(Buffer.isBuffer(mockConstructEvent.mock.calls[0][0])).toBe(true);
    expect(mockConstructEvent.mock.calls[0][2]).toBe('whsec_test');
  });

  it('applies a paid listing promotion', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
    await send({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_1', payment_status: 'paid', amount_total: 500, metadata: { kind: 'listing_promotion', listing_id: '5', user_id: '1', type: 'feature', days: '7' } } },
    }).expect(200);
    expect(mockExecute.mock.calls[0][0]).toMatch(/INSERT INTO listing_promotions/);
    expect(mockExecute.mock.calls[0][1]).toEqual([5, 1, 'feature', 7, 5, 'stripe', 'cs_1']);
  });

  it('ignores unpaid sessions', async () => {
    await send({ id: 'evt_2', type: 'checkout.session.completed', data: { object: { id: 'cs_2', payment_status: 'unpaid', metadata: { kind: 'listing_promotion' } } } }).expect(200);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('extends a subscription when a renewal invoice is paid', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await send({
      id: 'evt_3',
      type: 'invoice.paid',
      data: { object: { billing_reason: 'subscription_cycle', subscription: 'sub_1', lines: { data: [{ period: { end: 1790000000 } }] } } },
    }).expect(200);
    expect(mockExecute.mock.calls[0][0]).toMatch(/UPDATE user_subscriptions/);
    expect(mockExecute.mock.calls[0][1]).toEqual([1790000000, 'sub_1']);
  });

  it('does not treat the first invoice as a renewal', async () => {
    await send({ id: 'evt_4', type: 'invoice.paid', data: { object: { billing_reason: 'subscription_create', subscription: 'sub_1' } } }).expect(200);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('asks Stripe to retry when applying fails', async () => {
    mockExecute.mockRejectedValueOnce(new Error('db down'));
    await send({
      id: 'evt_5',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_5', payment_status: 'paid', metadata: { kind: 'listing_promotion', listing_id: '5', user_id: '1', type: 'bump' } } },
    }).expect(500);
  });
});
