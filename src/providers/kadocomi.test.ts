import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { failedFeed, mockResponses, successfulFeed } from '../fixtures/providers/test-helpers.ts';
import { Result } from '../lib/result.ts';
import { kadocomiProvider } from './kadocomi.ts';

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

describe('providers', () => {
  it('skips Kadocomi episodes with blank codes', async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          work: { title: 'Kadocomi' },
          firstEpisodes: {
            result: [
              { code: '', title: 'blank' },
              { code: '   ', title: 'spaces' },
              { code: '  EP001  ', title: 'valid' },
            ],
          },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await kadocomiProvider.fetchFeed('KC_000733_S');
    if (Result.isFailure(result)) throw result.error;

    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0]?.id).toBe('EP001');
  });
});
