import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
vi.mock('../config/database.js', () => ({
  default: { execute: (...args) => mockExecute(...args) },
}));

const { getSocialLinks, saveSocialLinks, normalizeUrl, normalizeEmail, SocialLinkError } = await import('./socialLinks.js');

describe('social links', () => {
  beforeEach(() => mockExecute.mockReset());

  it('returns every field empty when nothing is stored', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    expect(await getSocialLinks()).toEqual({ facebook: '', instagram: '', twitter: '', pinterest: '', youtube: '', email: '' });
  });

  it('adds https when the scheme is missing and keeps valid URLs', () => {
    expect(normalizeUrl('instagram.com/artzyla', 'instagram')).toBe('https://instagram.com/artzyla');
    expect(normalizeUrl('https://x.com/artzyla', 'twitter')).toBe('https://x.com/artzyla');
    expect(normalizeUrl('  ', 'facebook')).toBe('');
  });

  it('rejects script and non-web URLs', () => {
    expect(() => normalizeUrl('javascript:alert(1)', 'facebook')).toThrow(SocialLinkError);
    expect(() => normalizeUrl('ftp://example.com', 'facebook')).toThrow(SocialLinkError);
    expect(() => normalizeUrl('not a url', 'facebook')).toThrow(SocialLinkError);
  });

  it('validates the email address', () => {
    expect(normalizeEmail('hello@artzyla.com')).toBe('hello@artzyla.com');
    expect(() => normalizeEmail('nope')).toThrow(SocialLinkError);
  });

  it('merges a patch into what is stored and leaves other links alone', async () => {
    mockExecute.mockResolvedValueOnce([[{ setting_value: { facebook: 'https://facebook.com/a' } }]]);
    mockExecute.mockResolvedValueOnce([{}]);
    const saved = await saveSocialLinks({ instagram: 'instagram.com/a' });
    expect(saved.facebook).toBe('https://facebook.com/a');
    expect(saved.instagram).toBe('https://instagram.com/a');
    expect(JSON.parse(mockExecute.mock.calls[1][1][1])).toEqual(saved);
  });

  it('does not save anything when a value is invalid', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await expect(saveSocialLinks({ facebook: 'javascript:x' })).rejects.toThrow(SocialLinkError);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
