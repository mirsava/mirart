import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: { execute: (...args) => mockExecute(...args) },
}));
const mockSendBatch = vi.fn().mockResolvedValue({ sent: 2, mocked: true });
vi.mock('./emailService.js', async (importOriginal) => ({
  ...(await importOriginal()),
  sendEmailBatch: (...args) => mockSendBatch(...args),
}));

const { subscribe, unsubscribe, runWeeklyNewsletterJob, NewsletterError } = await import('./newsletter.js');

const monday3pm = new Date('2026-09-28T15:00:00Z');
const settings = (value) => [[{ setting_value: value }]];

describe('newsletter subscriptions', () => {
  beforeEach(() => mockExecute.mockReset());

  it('rejects invalid addresses', async () => {
    await expect(subscribe('not-an-email')).rejects.toBeInstanceOf(NewsletterError);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('stores a normalized address and re-subscribes a previous unsubscriber', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await subscribe('  Fan@Example.COM ');
    expect(mockExecute.mock.calls[0][0]).toMatch(/ON CONFLICT \(email\) DO UPDATE SET unsubscribed_at = NULL/);
    expect(mockExecute.mock.calls[0][1]).toEqual(['fan@example.com', null]);
  });

  it('ignores malformed unsubscribe tokens', async () => {
    expect(await unsubscribe('nope')).toBe(false);
    expect(mockExecute).not.toHaveBeenCalled();
  });
});

describe('runWeeklyNewsletterJob', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockSendBatch.mockClear();
  });

  it('does nothing while disabled', async () => {
    mockExecute.mockResolvedValueOnce(settings({ enabled: false }));
    expect(await runWeeklyNewsletterJob({ now: monday3pm })).toEqual({ skipped: 'not due' });
  });

  it('does not send twice in one week', async () => {
    mockExecute.mockResolvedValueOnce(settings({ enabled: true, last_sent_week: '2026-09-28' }));
    expect(await runWeeklyNewsletterJob({ now: monday3pm })).toEqual({ skipped: 'not due' });
  });

  it('waits for Monday afternoon', async () => {
    mockExecute.mockResolvedValueOnce(settings({ enabled: true }));
    expect(await runWeeklyNewsletterJob({ now: new Date('2026-09-29T15:00:00Z') })).toEqual({ skipped: 'not due' });
  });

  it('sends each subscriber their own unsubscribe link, marking the week first', async () => {
    mockExecute
      .mockResolvedValueOnce(settings({ enabled: true })) // config
      .mockResolvedValueOnce([[]]) // no featured artist this week
      .mockResolvedValueOnce([[]]) // no featured listings
      .mockResolvedValueOnce([[{ id: 5, title: 'Sunset', price: '100', primary_image_url: 'https://cdn/x.jpg', artist_name: 'Sam' }]])
      .mockResolvedValueOnce([[{ email: 'a@example.com', token: 'tok-a' }, { email: 'b@example.com', token: 'tok-b' }]])
      .mockResolvedValueOnce(settings({ enabled: true })) // read before save
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // save last_sent_week

    expect(await runWeeklyNewsletterJob({ now: monday3pm })).toEqual({ sent: 2 });
    expect(JSON.parse(mockExecute.mock.calls[6][1][1])).toMatchObject({ last_sent_week: '2026-09-28', last_sent_count: 2 });
    const messages = mockSendBatch.mock.calls[0][0];
    expect(messages.map((m) => m.to)).toEqual(['a@example.com', 'b@example.com']);
    expect(messages[0].headers['List-Unsubscribe']).toContain('token=tok-a');
    expect(messages[1].template.contentText).toContain('token=tok-b');
  });
});
