import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mangaOneApiUrl,
  mangaOneChapterList,
  mangaOnePage,
} from '../fixtures/providers/manga-one.ts';
import { failedFeed, mockResponses, successfulFeed } from '../fixtures/providers/test-helpers.ts';
import { Result } from '../lib/result.ts';
import { mangaOneProvider } from './manga-one.ts';

beforeEach(() => {
  // Every test is offline: unexpected requests can never reach the network.
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async () => {
      throw new Error('Network disabled: install an explicit response fixture');
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MangaONE metadata and protobuf pagination', () => {
  it('stops when another page adds no new chapters even if the total is larger', async () => {
    const chapter = { id: 303, title: '第3話' };
    const fetchMock = mockResponses({
      'https://manga-one.com/viewer/303': mangaOnePage,
      [mangaOneApiUrl(1)]: mangaOneChapterList([chapter], 50),
      [mangaOneApiUrl(2)]: mangaOneChapterList([chapter], 50),
    });
    expect((await successfulFeed('manga-one', '303')).items).toEqual([
      { id: '303', title: '第3話', url: 'https://manga-one.com/manga/42/chapter/303' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('uses alternate social metadata for an empty chapter-list fallback', async () => {
    const fetchMock = mockResponses({
      'https://manga-one.com/viewer/303': `
        <meta name="twitter:title" content="星の旅 第3話" />
        <meta property="og:description" content="旅の記録" />
        <meta property="og:url" content="https://manga-one.com/manga/42/chapter/303" />
        <meta name="twitter:image" content="https://cdn.example.com/303.jpg" />`,
      [mangaOneApiUrl(1)]: mangaOneChapterList([]),
    });
    expect(await successfulFeed('manga-one', '303')).toEqual({
      title: '星の旅',
      description: '旅の記録',
      link: 'https://manga-one.com/manga/42/chapter/303',
      items: [
        {
          id: '303',
          title: '星の旅 第3話',
          url: 'https://manga-one.com/manga/42/chapter/303',
          thumbnail: 'https://cdn.example.com/303.jpg',
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    '{"title_id":42}',
    '{\\"title_id\\":42}',
  ])('can build a fallback from an embedded title id: %s', async (html) => {
    mockResponses({
      'https://manga-one.com/viewer/chapter%2F9': html,
      [mangaOneApiUrl(1)]: mangaOneChapterList([]),
    });
    expect(await successfulFeed('manga-one', 'chapter/9')).toEqual({
      title: 'マンガワン chapter/9',
      description: '',
      link: 'https://manga-one.com/manga/42/chapter/chapter%2F9',
      items: [
        {
          id: 'chapter/9',
          title: 'chapter chapter/9',
          url: 'https://manga-one.com/manga/42/chapter/chapter%2F9',
        },
      ],
    });
  });

  it('fails before requesting chapters when the title id is absent', async () => {
    const fetchMock = mockResponses({
      'https://manga-one.com/viewer/303': '<title>星の旅</title>',
    });
    expect((await failedFeed('manga-one', '303')).message).toBe('MangaONE title id not found');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['unterminated varint', new Uint8Array([128]), 'unterminated protobuf varint'],
    ['unsupported wire type', new Uint8Array([15]), 'unsupported protobuf wire type: 7'],
  ])('returns a Result for %s in chapter data', async (_name, data, message) => {
    mockResponses({ 'https://manga-one.com/viewer/303': mangaOnePage, [mangaOneApiUrl(1)]: data });
    expect((await failedFeed('manga-one', '303')).message).toBe(message);
  });
});

describe('provider Result flow', () => {
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
