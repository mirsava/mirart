import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: { execute: (...args) => mockExecute(...args) },
}));

const { weekStartOf, addWeeks, listFeaturedArtistWeeks, applyFeaturedArtistBooking } = await import('./featuredArtist.js');

describe('featured artist weeks', () => {
  beforeEach(() => mockExecute.mockReset());

  it('starts weeks on Monday (UTC)', () => {
    expect(weekStartOf(new Date('2026-09-23T12:00:00Z'))).toBe('2026-09-21'); // Wednesday
    expect(weekStartOf(new Date('2026-09-27T23:59:00Z'))).toBe('2026-09-21'); // Sunday
    expect(weekStartOf(new Date('2026-09-28T00:00:00Z'))).toBe('2026-09-28'); // Monday
    expect(addWeeks('2026-09-21', 2)).toBe('2026-10-05');
  });

  it('lists upcoming weeks and marks taken and own ones', async () => {
    mockExecute.mockResolvedValueOnce([[{ week_start: new Date('2026-09-28T00:00:00Z'), user_id: 9 }, { week_start: '2026-10-05', user_id: 1 }]]);
    const weeks = await listFeaturedArtistWeeks({ featured_artist_weeks_ahead: 3 }, 1, new Date('2026-09-23T12:00:00Z'));
    expect(weeks).toEqual([
      { week_start: '2026-09-21', taken: false, mine: false },
      { week_start: '2026-09-28', taken: true, mine: false },
      { week_start: '2026-10-05', taken: true, mine: true },
    ]);
  });
});

describe('applyFeaturedArtistBooking', () => {
  beforeEach(() => mockExecute.mockReset());
  const farWeek = addWeeks(weekStartOf(), 4);
  const session = { id: 'cs_fa', amount_total: 2500, metadata: { user_id: '3', week_start: farWeek } };

  it('books the requested week', async () => {
    mockExecute.mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    expect(await applyFeaturedArtistBooking(session)).toEqual({ applied: true, week_start: farWeek, moved: false });
    expect(mockExecute.mock.calls[1][1]).toEqual([3, farWeek, 25, 'cs_fa']);
  });

  it('is a no-op when the session was already booked', async () => {
    mockExecute.mockResolvedValueOnce([[{ week_start: farWeek }]]);
    expect(await applyFeaturedArtistBooking(session)).toEqual({ applied: false, week_start: farWeek });
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('moves to the next free week if someone else paid first, and tells the artist', async () => {
    mockExecute
      .mockResolvedValueOnce([[]]) // session not recorded
      .mockResolvedValueOnce([{ affectedRows: 0 }]) // requested week taken
      .mockResolvedValueOnce([[]]) // still not this session
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // next week booked
      .mockResolvedValueOnce([{ insertId: 1 }]); // notification
    const result = await applyFeaturedArtistBooking(session);
    expect(result).toEqual({ applied: true, week_start: addWeeks(farWeek, 1), moved: true });
    expect(mockExecute.mock.calls[4][0]).toMatch(/INSERT INTO notifications/);
  });
});
