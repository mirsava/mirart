import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendEmail, verifyEmailConfig, templates } from './emailService.js';

const template = templates.newMessage({ listingTitle: 'Sunset', listingId: 7, message: 'Hi there', fromName: 'Sam' });
const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe('emailService (Resend API)', () => {
  const originalEnv = { key: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM };
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    process.env.RESEND_API_KEY = originalEnv.key ?? '';
    process.env.EMAIL_FROM = originalEnv.from ?? '';
  });

  it('logs instead of sending when no API key is configured', async () => {
    process.env.RESEND_API_KEY = '';
    const result = await sendEmail({ to: 'a@example.com', subject: 'Hi', template });
    expect(result).toMatchObject({ success: true, mocked: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the message to the Resend API with the bearer key', async () => {
    process.env.RESEND_API_KEY = 're_test_123';
    process.env.EMAIL_FROM = 'ArtZyla <noreply@artzyla.com>';
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 'email_abc' }));

    const result = await sendEmail({ to: 'seller@example.com', subject: 'New message', template, replyTo: 'buyer@example.com', replyToName: 'Sam' });

    expect(result).toEqual({ success: true, messageId: 'email_abc', mocked: false });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test_123');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      from: 'ArtZyla <noreply@artzyla.com>',
      to: ['seller@example.com'],
      subject: 'New message',
      reply_to: 'Sam <buyer@example.com>',
    });
    expect(body.html).toContain('Sam');
    expect(body.text).toContain('Hi there');
  });

  it('falls back to the Resend test sender when EMAIL_FROM is empty', async () => {
    process.env.RESEND_API_KEY = 're_test_123';
    process.env.EMAIL_FROM = '';
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 'x' }));
    await sendEmail({ to: 'a@example.com', subject: 'Hi', template });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).from).toBe('ArtZyla <onboarding@resend.dev>');
  });

  it('throws with the provider message when the API rejects the email', async () => {
    process.env.RESEND_API_KEY = 're_test_123';
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { message: 'The domain is not verified' }));
    await expect(sendEmail({ to: 'a@example.com', subject: 'Hi', template })).rejects.toThrow('The domain is not verified');
  });

  it('throws when the network call fails', async () => {
    process.env.RESEND_API_KEY = 're_test_123';
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    await expect(sendEmail({ to: 'a@example.com', subject: 'Hi', template })).rejects.toThrow('network down');
  });

  it('reports a missing key when verifying', async () => {
    process.env.RESEND_API_KEY = '';
    expect(await verifyEmailConfig()).toMatchObject({ configured: false });
  });

  it('accepts a valid key and a send-only key when verifying', async () => {
    process.env.RESEND_API_KEY = 're_test_123';
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: [] }));
    expect(await verifyEmailConfig()).toMatchObject({ configured: true });

    fetchMock.mockResolvedValueOnce(jsonResponse(401, { name: 'restricted_api_key', message: 'restricted' }));
    expect(await verifyEmailConfig()).toMatchObject({ configured: true });
  });

  it('rejects an invalid key when verifying', async () => {
    process.env.RESEND_API_KEY = 're_bad';
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { name: 'validation_error', message: 'API key is invalid' }));
    expect(await verifyEmailConfig()).toMatchObject({ configured: false });
  });
});
