import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ganganTitle, nextDataPage } from '../fixtures/providers/gangan-online.ts';
import { failedFeed, mockResponses, successfulFeed } from '../fixtures/providers/test-helpers.ts';
import { Result } from '../lib/result.ts';
import { ganganOnlineProvider } from './gangan-online.ts';

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
    ['missing Next data', '<html></html>', 'Error'],
    [
      'invalid JSON',
      '<script id="__NEXT_DATA__" type="application/json">{</script>',
      'SyntaxError',
    ],
    ['invalid build id', nextDataPage({ buildId: 123 }), 'ZodError'],
    [
      'invalid embedded title',
      nextDataPage({ props: { pageProps: { data: { default: { titleName: 123 } } } } }),
      'ZodError',
    ],
  ])('returns an Error Result for %s', async (_name, html, errorName) => {
    const fetchMock = mockResponses({ [pageUrl]: html });
    expect((await failedFeed('gangan-online', '42')).name).toBe(errorName);
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([pageUrl]);
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

describe('providers', () => {
  it('skips Gangan ONLINE chapters with blank ids', async () => {
    const nextData = {
      props: {
        pageProps: {
          data: {
            default: {
              titleName: 'Gangan',
              chapters: [
                { id: '', mainText: 'blank' },
                { id: '   ', mainText: 'spaces' },
                { id: '  123  ', mainText: 'valid' },
              ],
            },
          },
        },
      },
    };
    const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>`;
    const fetchMock: typeof fetch = async () => new Response(html);
    vi.stubGlobal('fetch', fetchMock);

    const result = await ganganOnlineProvider.fetchFeed('2061');
    if (Result.isFailure(result)) throw result.error;

    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0]?.id).toBe('123');
  });
});
