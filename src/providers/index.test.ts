import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BROWSER_USER_AGENT, MIME_TYPES } from '../constants/http.ts';
import { PROVIDERS } from '../constants/providers.ts';
import { providerFixtures } from '../fixtures/providers/index.ts';
import { failedFeed, mockResponses, successfulFeed } from '../fixtures/providers/test-helpers.ts';
import { listProviders } from './index.ts';

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
      if (
        ['corona-ex', 'drecomi-plus', 'firecross', 'manga-one', 'pixiv-comic'].includes(fixture.id)
      ) {
        expect(headers.get('user-agent')).toBe(BROWSER_USER_AGENT);
      }
      if (fixture.id === 'firecross') {
        expect(headers.get('referer')).toBe('https://firecross.jp/');
        expect(headers.get('accept-language')).toContain('ja');
      }
      if (fixture.id === 'corona-ex') {
        expect(headers.get('referer')).toBe('https://to-corona-ex.com/');
        expect(headers.get('accept-language')).toContain('ja');
      }
      if (fixture.id === 'drecomi-plus') {
        expect(headers.get('referer')).toBe('https://drecomi-plus.jp/');
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

  it.each(['comic-days', 'firecross', 'gaugau', 'hayacomic', 'jump-rookie', 'mangabox', 'yanmaga'])(
    '%s fails instead of returning an empty feed when no episodes are found',
    async (id) => {
      vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>(async () => new Response('<html></html>')),
      );
      await expect(failedFeed(id, '42')).resolves.toBeInstanceOf(Error);
    },
  );
});
