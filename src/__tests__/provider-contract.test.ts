import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BROWSER_USER_AGENT, MIME_TYPES } from '../constants/http.ts';
import { PROVIDERS } from '../constants/providers.ts';
import {
  ganganTitle,
  mangaOneApiUrl,
  mangaOneChapterList,
  mangaOnePage,
  nextDataPage,
  pixivEpisodesUrl,
  pixivWork,
  pixivWorkUrl,
  providerFixtures,
} from '../fixtures/providers.ts';
import { Result } from '../lib/result.ts';
import { getProvider, listProviders } from '../providers/index.ts';

const provider = (id: string) => {
  const found = getProvider(id);
  if (!found) throw new Error(`Provider not registered: ${id}`);
  return found;
};

const mockResponses = (responses: Record<string, string | Uint8Array>) => {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    const body = responses[url];
    if (body === undefined) throw new Error(`Unexpected request: ${url}`);
    return new Response(typeof body === 'string' ? body : new Uint8Array(body));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const successfulFeed = async (id: string, identifier: string) => {
  const result = await provider(id).fetchFeed(identifier);
  if (Result.isFailure(result)) throw result.error;
  return result.value;
};

const failedFeed = async (id: string, identifier: string) => {
  const result = await provider(id).fetchFeed(identifier);
  if (Result.isSuccess(result)) throw new Error(`Expected ${id} to return a failure Result`);
  expect(result.error).toBeInstanceOf(Error);
  return result.error;
};

beforeEach(() => {
  // Every test is offline, including Pixiv: unexpected requests can never reach the network.
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

describe('registered provider contracts', () => {
  it('covers every configured provider and preserves its public metadata', () => {
    const configured = Object.values(PROVIDERS);
    expect(providerFixtures.map(({ id }) => id).sort()).toEqual(
      configured.map(({ id }) => id).sort(),
    );
    expect(listProviders().map(({ id, siteName }) => ({ id, siteName }))).toEqual(
      expect.arrayContaining(configured.map(({ id, siteName }) => ({ id, siteName }))),
    );
    expect(listProviders()).toHaveLength(configured.length);
  });

  it.each(providerFixtures)('$id requests and renders public feed metadata', async (fixture) => {
    const fetchMock = mockResponses(fixture.responses);

    expect(await successfulFeed(fixture.id, fixture.identifier)).toEqual(fixture.feed);
    expect(fetchMock.mock.calls.map(([input]) => String(input)).sort()).toEqual(
      Object.keys(fixture.responses).sort(),
    );

    for (const [input, init] of fetchMock.mock.calls) {
      const headers = new Headers(init?.headers);
      if (fixture.id === 'comic-days') expect(headers.get('accept')).toBe(MIME_TYPES.rssXmlList);
      if (['firecross', 'manga-one', 'pixiv-comic'].includes(fixture.id)) {
        expect(headers.get('user-agent')).toBe(BROWSER_USER_AGENT);
      }
      if (fixture.id === 'firecross') {
        expect(headers.get('referer')).toBe('https://firecross.jp/');
        expect(headers.get('accept-language')).toContain('ja');
      }
      if (fixture.id === 'manga-one' && String(input).includes('/api/client?')) {
        expect(headers.get('referer')).toBe('https://manga-one.com/manga/42/chapter/303');
      }
    }
  });

  it.each(providerFixtures)('$id returns rejected requests as an Error Result', async (fixture) => {
    const failure = new Error('connection reset');
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(failure));

    expect(await failedFeed(fixture.id, fixture.identifier)).toBe(failure);
  });

  it.each([
    ['comic-days', 'コミックDAYS 42', 'https://comic-days.com/series/42'],
    ['firecross', 'ファイアCROSS 42', 'https://firecross.jp/ebook/series/42'],
    ['gaugau', 'がうがうモンスター＋ 42', 'https://gaugau.futabanet.jp/list/work/42/episodes'],
    ['hayacomic', 'ハヤコミ 42', 'https://hayacomic.jp/series/42'],
    ['jump-rookie', 'ジャンプルーキー！ 42', 'https://rookie.shonenjump.com/series/42'],
    ['mangabox', 'マンガボックス 42', 'https://www.mangabox.me/reader/42/episodes/all/'],
    ['yanmaga', '42', 'https://yanmaga.jp/comics/42?sort=older'],
  ])('%s retains useful defaults when page metadata is missing', async (id, title, link) => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => new Response('<html></html>')),
    );
    expect(await successfulFeed(id, '42')).toEqual({ title, link, description: '', items: [] });
  });
});

describe('Gangan ONLINE response branches', () => {
  const pageUrl = 'https://www.ganganonline.com/title/42';

  it('uses embedded title data without requesting a build endpoint', async () => {
    const fetchMock = mockResponses({
      [pageUrl]: nextDataPage({ props: { pageProps: { data: { default: ganganTitle } } } }),
    });
    const feed = await successfulFeed('gangan-online', '42');

    expect(feed).toMatchObject({ title: '星の旅', description: '星野\n旅の記録', link: pageUrl });
    expect(feed.items.map(({ id, title }) => ({ id, title }))).toEqual([
      { id: '12', title: '第12話' },
      { id: 'chapter/a', title: 'chapter chapter/a' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('supports optional title data with site and identifier defaults', async () => {
    mockResponses({ [pageUrl]: nextDataPage({ props: { pageProps: { data: { default: {} } } } }) });
    expect(await successfulFeed('gangan-online', '42')).toEqual({
      title: 'Gangan ONLINE 42',
      link: pageUrl,
      description: '',
      items: [],
    });
  });

  it.each([
    ['missing Next data', '<html></html>'],
    ['invalid JSON', '<script id="__NEXT_DATA__" type="application/json">{</script>'],
    ['invalid build id', nextDataPage({ buildId: 123 })],
    [
      'invalid embedded title',
      nextDataPage({ props: { pageProps: { data: { default: { titleName: 123 } } } } }),
    ],
  ])('returns an Error Result for %s', async (_name, html) => {
    mockResponses({ [pageUrl]: html });
    await failedFeed('gangan-online', '42');
  });

  it('validates build-endpoint title data rather than accepting an invalid chapter', async () => {
    mockResponses({
      [pageUrl]: nextDataPage({ buildId: 'build-42' }),
      'https://www.ganganonline.com/_next/data/build-42/title/42.json': JSON.stringify({
        pageProps: { data: { default: { chapters: [{ id: null }] } } },
      }),
    });
    expect((await failedFeed('gangan-online', '42')).name).toBe('ZodError');
  });
});

describe('Kadocomi optional metadata and validation', () => {
  it.each([
    [{}, 'カドコミ 42', ''],
    [{ work: { description: '作品紹介' } }, 'カドコミ 42', '作品紹介'],
    [{ work: { title: '星の旅', catchphrase: '', description: '作品紹介' } }, '星の旅', ''],
  ])('preserves nullish metadata defaults for %j', async (data, title, description) => {
    mockResponses({
      'https://comic-walker.com/api/contents/details/work?workCode=42': JSON.stringify(data),
    });
    expect(await successfulFeed('kadocomi', '42')).toEqual({
      title,
      description,
      link: 'https://comic-walker.com/detail/42?episodeType=latest',
      items: [],
    });
  });

  it('returns a schema failure Result for an invalid episode code', async () => {
    mockResponses({
      'https://comic-walker.com/api/contents/details/work?workCode=42': JSON.stringify({
        firstEpisodes: { result: [{ code: 42 }] },
      }),
    });
    expect((await failedFeed('kadocomi', '42')).name).toBe('ZodError');
  });
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
