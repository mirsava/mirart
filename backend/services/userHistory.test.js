import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: { execute: (...args) => mockExecute(...args) },
}));

const { getUserHistory, getUserActivity } = await import('./userHistory.js');

const at = (d) => new Date(`2026-09-${d}T12:00:00Z`);

// Queries run in this order: user, last sign-in, then nine in parallel (see getUserHistory).
function mockHistory() {
  mockExecute
    .mockResolvedValueOnce([[{ id: 7, auth_user_id: 'u', email: 'a@example.com', user_type: 'artist', active: true, blocked: false, created_at: at('01') }]])
    .mockResolvedValueOnce([[{ last_sign_in_at: at('20') }]])
    .mockResolvedValueOnce([[]]) // listings
    .mockResolvedValueOnce([[]]) // subscriptions
    .mockResolvedValueOnce([[]]) // promotions
    .mockResolvedValueOnce([[]]) // featured bookings
    .mockResolvedValueOnce([[
      { action: 'user_blocked', entity_type: null, details: null, created_at: at('10'), actor_id: 2, actor_name: 'Mir', actor_type: 'admin' },
      { action: 'listing_status_changed', entity_type: 'listing', entity_id: 5, details: { title: 'Sunset', from: 'active', to: 'inactive', fields: ['price'] }, created_at: at('11'), actor_id: 2, actor_name: 'Mir', actor_type: 'admin' },
      { action: 'listing_status_changed', entity_type: 'listing', entity_id: 5, details: { title: 'Sunset', from: 'active', to: 'inactive', reason: 'Listing pass ended' }, created_at: at('12'), actor_id: null },
    ]]) // activity log
    .mockResolvedValueOnce([[{ sent: 1, received: 0, support: 0 }]])
    .mockResolvedValueOnce([[{ id: 1, subject: 'Hi', created_at: at('15'), sender_id: 7, listing_title: 'Sunset' }]]) // messages
    .mockResolvedValueOnce([[]]) // reminders
    .mockResolvedValueOnce([[]]); // newsletter
}

describe('user history audiences', () => {
  beforeEach(() => mockExecute.mockReset());

  it('shows admins everything, including who did it', async () => {
    mockHistory();
    const { timeline } = await getUserHistory(7);
    const titles = timeline.map((e) => e.title);
    expect(titles).toContain('Account blocked');
    expect(titles).toContain('Sent a message');
    expect(titles).toContain('Last signed in');
    expect(timeline.find((e) => e.title === 'Account blocked').actor).toBe('Mir (admin)');
    expect(timeline.find((e) => e.detail?.includes('fields: price'))).toBeDefined();
  });

  it("hides admin-only entries from the user's own feed and credits staff as ArtZyla team", async () => {
    mockHistory();
    const { timeline } = await getUserActivity(7);
    const titles = timeline.map((e) => e.title);
    expect(titles).not.toContain('Account blocked');
    expect(titles).not.toContain('Sent a message');
    expect(titles).not.toContain('Last signed in');
    const changes = timeline.filter((e) => e.title === 'Changed listing status');
    expect(changes.map((e) => e.actor).sort()).toEqual(['ArtZyla team', 'Automatic']);
    expect(changes.some((e) => e.detail.includes('fields:'))).toBe(false);
    expect(changes.find((e) => e.actor === 'Automatic').detail).toContain('Listing pass ended');
  });
});
