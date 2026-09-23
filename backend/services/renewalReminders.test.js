import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: { execute: (...args) => mockExecute(...args) },
}));
const mockSendEmail = vi.fn().mockResolvedValue({ success: true });
vi.mock('./emailService.js', async (importOriginal) => ({
  ...(await importOriginal()),
  sendEmail: (...args) => mockSendEmail(...args),
}));

const { reminderStage, runRenewalReminderJob } = await import('./renewalReminders.js');

const HOUR = 60 * 60 * 1000;
const now = new Date('2026-09-23T12:00:00Z');
const inHours = (h) => new Date(now.getTime() + h * HOUR).toISOString();

describe('reminderStage', () => {
  it('picks the 7-day reminder inside the last week and the 1-day one inside the last day', () => {
    expect(reminderStage(inHours(24 * 8), now)).toBeNull();
    expect(reminderStage(inHours(24 * 5), now)).toBe('7d');
    expect(reminderStage(inHours(20), now)).toBe('1d');
    expect(reminderStage(inHours(-1), now)).toBeNull();
  });
});

describe('runRenewalReminderJob', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockSendEmail.mockClear();
  });

  const listing = (overrides = {}) => ({
    id: 5, title: 'Sunset', user_id: 1, paid_until: inHours(20), featured_until: null,
    email: 'artist@example.com', email_notifications: true, user_name: 'Sam', ...overrides,
  });

  it('sends a reminder once, recording it first', async () => {
    mockExecute
      .mockResolvedValueOnce([[listing()]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // reminder recorded
      .mockResolvedValueOnce([{ insertId: 1 }]); // notification
    expect(await runRenewalReminderJob(now)).toEqual({ sent: 1 });
    expect(mockExecute.mock.calls[1][1]).toEqual([5, 'listing_pass', listing().paid_until, '1d']);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0].template.contentText).toContain('/dashboard?promote=5');
  });

  it('skips reminders already sent', async () => {
    mockExecute.mockResolvedValueOnce([[listing()]]).mockResolvedValueOnce([{ affectedRows: 0 }]);
    expect(await runRenewalReminderJob(now)).toEqual({ sent: 0 });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('notifies in the app but does not email artists who turned email off', async () => {
    mockExecute
      .mockResolvedValueOnce([[listing({ paid_until: null, featured_until: inHours(24 * 3), email_notifications: false })]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ insertId: 1 }]);
    expect(await runRenewalReminderJob(now)).toEqual({ sent: 1 });
    expect(mockExecute.mock.calls[1][1][1]).toBe('feature');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
