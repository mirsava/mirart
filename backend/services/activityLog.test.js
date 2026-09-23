import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: { execute: (...args) => mockExecute(...args) },
}));

const { logActivity, logListingActivity } = await import('./activityLog.js');

describe('activity log', () => {
  beforeEach(() => mockExecute.mockReset());

  it('records an entry with JSON details', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await logActivity({ userId: 7, actorId: 1, action: 'user_blocked', details: { reason: 'spam' } });
    expect(mockExecute.mock.calls[0][1]).toEqual([7, 1, 'user_blocked', null, null, '{"reason":"spam"}']);
  });

  it('never throws when the database write fails', async () => {
    mockExecute.mockRejectedValueOnce(new Error('db down'));
    await expect(logActivity({ userId: 7, action: 'user_blocked' })).resolves.toBeUndefined();
  });

  it('files listing events under the owner, with the title', async () => {
    mockExecute.mockResolvedValueOnce([[{ user_id: 3, title: 'Sunset' }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    await logListingActivity(12, { actorId: 3, action: 'listing_status_changed', details: { from: 'active', to: 'sold' } });
    expect(mockExecute.mock.calls[1][1]).toEqual([3, 3, 'listing_status_changed', 'listing', 12, '{"title":"Sunset","from":"active","to":"sold"}']);
  });

  it('uses a listing passed in (e.g. one being deleted) without looking it up', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await logListingActivity(12, { actorId: 1, action: 'listing_deleted', listing: { user_id: 3, title: 'Sunset' } });
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute.mock.calls[0][1][0]).toBe(3);
  });
});
