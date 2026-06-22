import { describe, expect, it } from 'vitest';
import {
  fallbackFeedTitle,
  normalizeSiteWrappedTitle,
  titleBeforeSeparator,
} from '../lib/feed-title.ts';

describe('feed title helpers', () => {
  it('builds a fallback title from site name and identifier', () => {
    expect(fallbackFeedTitle('Site', 'work')).toBe('Site work');
  });

  it('normalizes site-wrapped titles', () => {
    expect(normalizeSiteWrappedTitle('コミックDAYS（Work）', 'コミックDAYS', 'series')).toBe(
      'Work',
    );
  });

  it('falls back when site-wrapped title is empty', () => {
    expect(normalizeSiteWrappedTitle('', 'Site', 'work')).toBe('Site work');
  });

  it('takes a title before common title separators', () => {
    const html = '<meta property="og:title" content="Work｜Site" />';
    expect(titleBeforeSeparator(html, 'Site', 'work')).toBe('Work');
  });
});
