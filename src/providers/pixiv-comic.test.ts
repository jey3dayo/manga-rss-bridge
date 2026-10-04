import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pixivEpisodesUrl, pixivWork, pixivWorkUrl } from '../fixtures/providers/pixiv-comic.ts';
import { failedFeed, mockResponses, successfulFeed } from '../fixtures/providers/test-helpers.ts';
import { Result } from '../lib/result.ts';
import { pixivComicProvider } from './pixiv-comic.ts';

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

describe('Pixiv Comic metadata-only filtering (offline)', () => {
  it('rejects mismatched viewer paths, blank titles and out-of-range dates without fetching viewers', async () => {
    const episode = {
      id: 202,
      numbering_title: '第2話',
      read_start_at: 1790910000000,
      viewer_path: '/viewer/stories/202',
    };
    const fetchMock = mockResponses({
      [pixivWorkUrl]: JSON.stringify(pixivWork),
      [pixivEpisodesUrl]: JSON.stringify({
        data: {
          episodes: [
            { state: 'readable', episode: { ...episode, viewer_path: '/viewer/stories/203' } },
            {
              state: 'readable',
              episode: { ...episode, viewer_path: '//example.com/viewer/stories/202' },
            },
            {
              state: 'readable',
              episode: { ...episode, viewer_path: '/viewer/stories/202?download=1' },
            },
            { state: 'readable', episode: { ...episode, numbering_title: ' ', sub_title: '\n' } },
            { state: 'readable', episode: { ...episode, read_start_at: 8640000000000001 } },
            { state: 'readable', episode: null },
            { state: 'purchasable', episode },
            { state: 'readable', episode },
          ],
        },
      }),
    });
    const feed = await successfulFeed('pixiv-comic', '42');
    expect(feed.items).toEqual([
      {
        id: '202',
        title: '第2話',
        url: 'https://comic.pixiv.net/viewer/stories/202',
        date: '2026-10-02T03:00:00.000Z',
      },
    ]);
    expect(fetchMock.mock.calls.map(([input]) => String(input)).sort()).toEqual(
      [pixivWorkUrl, pixivEpisodesUrl].sort(),
    );
  });

  it.each([
    ['work', { data: { official_work: { id: '../42', name: '星の旅' } } }],
    ['episodes', { data: { episodes: [{ state: 'readable', episode: { id: '../202' } }] } }],
  ])('returns a Result for malformed %s metadata', async (target, body) => {
    mockResponses({
      [pixivWorkUrl]: JSON.stringify(target === 'work' ? body : pixivWork),
      [pixivEpisodesUrl]: JSON.stringify(target === 'episodes' ? body : { data: { episodes: [] } }),
    });
    expect((await failedFeed('pixiv-comic', '42')).name).toBe('ZodError');
  });
});

describe('providers', () => {
  it('builds a Pixiv Comic feed from published episode metadata only', async () => {
    const calls: { url: string; headers: Headers }[] = [];
    const fetchMock: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, headers: new Headers(init?.headers) });
      if (url.endsWith('/api/app/works/v5/8789')) {
        return new Response(
          JSON.stringify({
            data: {
              official_work: {
                id: 8789,
                name: '楠木さんは高校デビューに失敗している',
                author: 'みいみつき',
              },
            },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.endsWith('/api/app/works/8789/episodes/v2')) {
        return new Response(
          JSON.stringify({
            data: {
              episodes: [
                {
                  state: 'readable',
                  episode: {
                    id: 249922,
                    numbering_title: '第58話',
                    sub_title: 'そんなの知ってるっての',
                    read_start_at: 1790910000000,
                    viewer_path: '/viewer/stories/249922',
                  },
                },
                {
                  state: 'readable',
                  episode: {
                    id: 247033,
                    numbering_title: '第57話',
                    sub_title: 'ほんと何もかも恵まれてる子',
                    read_start_at: 1788490800000,
                    viewer_path: '/viewer/stories/247033',
                  },
                },
                { state: 'not_publishing', message: '非公開エピソード' },
                {
                  state: 'readable',
                  episode: {
                    id: 1,
                    numbering_title: '未公開',
                    read_start_at: null,
                    viewer_path: '/viewer/stories/1',
                  },
                },
                {
                  state: 'readable',
                  episode: {
                    id: 2,
                    numbering_title: '不正なリンク',
                    read_start_at: 1790910000000,
                    viewer_path: 'https://example.com/private',
                  },
                },
              ],
            },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('not found', { status: 404 });
    };
    vi.stubGlobal('fetch', fetchMock);

    const result = await pixivComicProvider.fetchFeed('8789');
    if (Result.isFailure(result)) throw result.error;

    expect(result.value.title).toBe('楠木さんは高校デビューに失敗している');
    expect(result.value.link).toBe('https://comic.pixiv.net/works/8789');
    expect(result.value.description).toBe('みいみつき');
    expect(result.value.items).toEqual([
      {
        id: '249922',
        title: '第58話 そんなの知ってるっての',
        url: 'https://comic.pixiv.net/viewer/stories/249922',
        date: '2026-10-02T03:00:00.000Z',
      },
      {
        id: '247033',
        title: '第57話 ほんと何もかも恵まれてる子',
        url: 'https://comic.pixiv.net/viewer/stories/247033',
        date: '2026-09-04T03:00:00.000Z',
      },
    ]);
    expect(calls).toHaveLength(2);
    expect(calls.map((call) => call.url)).toEqual([
      'https://comic.pixiv.net/api/app/works/v5/8789',
      'https://comic.pixiv.net/api/app/works/8789/episodes/v2',
    ]);
    for (const call of calls) {
      expect(call.headers.get('origin')).toBe('https://comic.pixiv.net');
      expect(call.headers.get('referer')).toBe('https://comic.pixiv.net/works/8789');
      expect(call.headers.get('x-requested-with')).toBe('XMLHttpRequest');
    }
  });

  it('rejects invalid Pixiv Comic work IDs without making a request', async () => {
    let requestCount = 0;
    vi.stubGlobal('fetch', async () => {
      requestCount += 1;
      return new Response('{}');
    });

    const result = await pixivComicProvider.fetchFeed('8789/../../private');

    expect(Result.isFailure(result)).toBe(true);
    expect(requestCount).toBe(0);
  });
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
});
