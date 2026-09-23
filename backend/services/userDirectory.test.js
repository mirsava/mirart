import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: { execute: (...args) => mockExecute(...args) },
}));

const { getUserDirectory, exportUserDirectoryCsv } = await import('./userDirectory.js');

const row = (overrides = {}) => ({
  id: 1, email: 'a@example.com', username: 'amy', display_name: 'Amy', user_type: 'artist', active: true, blocked: false,
  plan_name: null, billing_period: null, listings_total: '3', listings_active: '1', paid_total: '33.00',
  last_sign_in_at: null, created_at: new Date('2026-09-01T00:00:00Z'), ...overrides,
});

describe('user directory', () => {
  beforeEach(() => mockExecute.mockReset());

  it('applies type, status, plan and search filters as parameters', async () => {
    mockExecute.mockResolvedValueOnce([[{ total: 1 }]]).mockResolvedValueOnce([[row()]]).mockResolvedValueOnce([[{ all_users: 5 }]]);
    const result = await getUserDirectory({ search: 'amy', type: 'artist', status: 'blocked', plan: 'Professional', sort: 'spend' });
    const [countSql, countParams] = mockExecute.mock.calls[0];
    expect(countSql).toMatch(/u\.user_type = \?/);
    expect(countSql).toMatch(/COALESCE\(u\.blocked, FALSE\) = TRUE/);
    expect(countSql).toMatch(/sub\.plan_name = \?/);
    expect(countParams).toEqual(['%amy%', '%amy%', '%amy%', '%amy%', '%amy%', 'artist', 'Professional']);
    expect(mockExecute.mock.calls[1][0]).toMatch(/ORDER BY paid_total DESC/);
    expect(result.users[0]).toMatchObject({ listings_total: 3, paid_total: 33 });
  });

  it('ignores unknown types and sorts instead of putting them in SQL', async () => {
    mockExecute.mockResolvedValueOnce([[{ total: 0 }]]).mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{}]]);
    await getUserDirectory({ type: 'superuser', sort: 'id; drop table users' });
    expect(mockExecute.mock.calls[0][1]).toEqual([]);
    expect(mockExecute.mock.calls[1][0]).toMatch(/ORDER BY u\.created_at DESC/);
  });

  it('exports CSV with quoting and spreadsheet-formula protection', async () => {
    mockExecute.mockResolvedValueOnce([[row({ display_name: '=HYPERLINK("x")', email: 'a,b@example.com' })]]);
    const csv = await exportUserDirectoryCsv({});
    const [header, line] = csv.split('\r\n');
    expect(header.startsWith('id,name,email')).toBe(true);
    expect(line).toContain(`"'=HYPERLINK(""x"")"`);
    expect(line).toContain('"a,b@example.com"');
  });
});
