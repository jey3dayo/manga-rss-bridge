import { describe, expect, it } from 'vitest';
import {
  fallbackFeedTitle,
  normalizeSiteWrappedTitle,
  titleBeforeSeparator,
} from '../lib/feed-title.ts';
import type { ProviderMetadata } from '../schemas/provider.ts';

const provider = {
  id: 'site',
  siteName: 'Site',
  baseUrl: 'https://example.com',
} satisfies ProviderMetadata;

const comicDaysProvider = {
  id: 'comic-days',
  siteName: 'コミックDAYS',
  baseUrl: 'https://comic-days.com',
} satisfies ProviderMetadata;

describe('feed title helpers', () => {
  it('builds a fallback title from site name and identifier', () => {
    expect(fallbackFeedTitle(provider, 'work')).toBe('Site work');
  });

  it('normalizes site-wrapped titles', () => {
    expect(normalizeSiteWrappedTitle('コミックDAYS（Work）', comicDaysProvider, 'series')).toBe(
      'Work',
    );
  });

  it('falls back when site-wrapped title is empty', () => {
    expect(normalizeSiteWrappedTitle('', provider, 'work')).toBe('Site work');
  });

  it('falls back when title only contains whitespace', () => {
    expect(normalizeSiteWrappedTitle('   ', provider, 'work')).toBe('Site work');
  });

  it('falls back when a site-wrapped title has empty content', () => {
    expect(normalizeSiteWrappedTitle('コミックDAYS（）', comicDaysProvider, 'series')).toBe(
      'コミックDAYS series',
    );
  });

  it('takes a title before common title separators', () => {
    const html = '<meta property="og:title" content="Work｜Site" />';
    expect(titleBeforeSeparator(html, provider, 'work')).toBe('Work');
  });

  it('falls back when the title before a separator is empty', () => {
    expect(
      titleBeforeSeparator('<meta property="og:title" content="｜Site" />', provider, 'work'),
    ).toBe('Site work');
    expect(
      titleBeforeSeparator('<meta property="og:title" content="  | Site" />', provider, 'work'),
    ).toBe('Site work');
  });
});
