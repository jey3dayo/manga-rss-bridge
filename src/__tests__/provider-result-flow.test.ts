import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  mangaOneApiUrl,
  mangaOneChapterList,
  mangaOnePage,
} from '../fixtures/providers/manga-one.ts';
import { pixivEpisodesUrl, pixivWork, pixivWorkUrl } from '../fixtures/providers/pixiv-comic.ts';
import { Result } from '../lib/result.ts';
import { mangaOneProvider } from '../providers/manga-one.ts';
import { pixivComicProvider } from '../providers/pixiv-comic.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('provider Result flow', () => {
  it.each([
    {
      failedUrl: pixivWorkUrl,
      pendingUrl: pixivEpisodesUrl,
      pendingBody: { data: { episodes: [] } },
    },
    { failedUrl: pixivEpisodesUrl, pendingUrl: pixivWorkUrl, pendingBody: pixivWork },
  ])('returns a failure from $failedUrl while the other request is pending', async ({
    failedUrl,
    pendingUrl,
    pendingBody,
  }) => {
    const failure = new Error('metadata request failed');
    const pending = Promise.withResolvers<Response>();
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      if (String(input) === failedUrl) throw failure;
      if (String(input) === pendingUrl) return pending.promise;
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const result = await pixivComicProvider.fetchFeed('42');

      expect(Result.unwrapError(result)).toBe(failure);
      expect(fetchMock.mock.calls.map(([input]) => String(input)).sort()).toEqual(
        [failedUrl, pendingUrl].sort(),
      );
    } finally {
      pending.resolve(new Response(JSON.stringify(pendingBody)));
    }
  });

  it('returns a MangaONE page failure instead of a partial feed or more requests', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url === 'https://manga-one.com/viewer/303') return new Response(mangaOnePage);
      if (url === mangaOneApiUrl(1)) {
        return new Response(mangaOneChapterList([{ id: 303, title: '第3話' }], 3));
      }
      if (url === mangaOneApiUrl(2)) return new Response('', { status: 503 });
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await mangaOneProvider.fetchFeed('303');

    expect(Result.unwrapError(result).message).toBe(`GET ${mangaOneApiUrl(2)} failed: 503`);
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      'https://manga-one.com/viewer/303',
      mangaOneApiUrl(1),
      mangaOneApiUrl(2),
    ]);
  });
});
