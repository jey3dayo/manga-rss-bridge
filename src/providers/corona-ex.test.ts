import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { coronaExNextData } from '../fixtures/providers/corona-ex.ts';
import { nextDataPage } from '../fixtures/providers/gangan-online.ts';
import { failedFeed, mockResponses } from '../fixtures/providers/test-helpers.ts';

beforeEach(() => {
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

describe('corona-ex response branches', () => {
  const pageUrl = 'https://to-corona-ex.com/comics/42';

  it.each(['', '   ', '0', '042', 'abc', '42/43'])(
    'rejects invalid comic ID %j without requesting the comic page',
    async (identifier) => {
      await expect(failedFeed('corona-ex', identifier)).resolves.toBeInstanceOf(Error);
    },
  );

  it.each([
    ['no next data', '<html></html>'],
    ['unparseable next data', '<script id="__NEXT_DATA__" type="application/json">{</script>'],
    ['missing comic', nextDataPage({ props: { pageProps: {} } })],
    [
      'missing latest episode',
      nextDataPage({
        props: {
          pageProps: { fallbackData: { comic: { id: 42, title: '星の旅' } } },
        },
      }),
    ],
    [
      'comic id mismatch',
      nextDataPage({
        props: {
          pageProps: {
            fallbackData: {
              comic: {
                ...coronaExNextData.props.pageProps.fallbackData.comic,
                id: 43,
              },
            },
          },
        },
      }),
    ],
    [
      'invalid published_at',
      nextDataPage({
        props: {
          pageProps: {
            fallbackData: {
              comic: {
                ...coronaExNextData.props.pageProps.fallbackData.comic,
                latest_episode: {
                  ...coronaExNextData.props.pageProps.fallbackData.comic.latest_episode,
                  published_at: 'not-a-date',
                },
              },
            },
          },
        },
      }),
    ],
  ])('returns an Error Result for %s', async (_name, html) => {
    mockResponses({ [pageUrl]: html });
    await expect(failedFeed('corona-ex', '42')).resolves.toBeInstanceOf(Error);
  });
});
