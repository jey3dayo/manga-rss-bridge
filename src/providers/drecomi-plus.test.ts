import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  drecomiArrayDetailQuery,
  drecomiArrayEpisodesQuery,
  drecomiDetailQuery,
  drecomiDehydratedHtml,
  drecomiEpisodesQuery,
  drecomiPickupQuery,
  drecomiSeriesDetail,
  drecomiVolumesQuery,
  flightEntryPayload,
  drecomiRowBatchHtml,
} from '../fixtures/providers/drecomi-plus.ts';
import { failedFeed, mockResponses, successfulFeed } from '../fixtures/providers/test-helpers.ts';

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

describe('drecomi-plus response branches', () => {
  const pageUrl = 'https://drecomi-plus.jp/series/CD00035';

  it('rejects blank series codes without requesting the series page', async () => {
    expect((await failedFeed('drecomi-plus', '   ')).name).toBe('Error');
  });

  it.each([
    ['no flight payload', '<html></html>'],
    ['unparseable flight payload', drecomiDehydratedHtml([{}.toString()])],
    ['missing episodes query', drecomiDehydratedHtml([drecomiDetailQuery])],
  ])('returns an Error Result for %s', async (_name, html) => {
    mockResponses({ [pageUrl]: html });
    expect((await failedFeed('drecomi-plus', 'CD00035')).name).toBe('Error');
  });

  it('falls back to site and identifier metadata when the detail query is missing', async () => {
    mockResponses({ [pageUrl]: drecomiDehydratedHtml([drecomiEpisodesQuery]) });

    expect(await successfulFeed('drecomi-plus', 'CD00035')).toEqual({
      title: 'ドリコミ＋ CD00035',
      link: pageUrl,
      description: '',
      items: [
        expect.objectContaining({ id: 'CD00035-001-001' }),
        expect.objectContaining({ id: 'CD00035-001-002' }),
        expect.objectContaining({ id: 'CD00035-001-003' }),
      ],
    });
  });

  it('keeps series detail when pickup, volumes, and episodes queries share the detail prefix', async () => {
    mockResponses({
      [pageUrl]: drecomiDehydratedHtml([
        drecomiPickupQuery,
        drecomiDetailQuery,
        drecomiEpisodesQuery,
        drecomiVolumesQuery,
      ]),
    });

    const feed = await successfulFeed('drecomi-plus', 'CD00035');

    expect(feed.title).toBe(drecomiSeriesDetail.name);
    expect(feed.items.map(({ id }) => id)).toEqual([
      'CD00035-001-001',
      'CD00035-001-002',
      'CD00035-001-003',
    ]);
  });

  it('parses array-form queryHash for detail and episodes', async () => {
    mockResponses({
      [pageUrl]: drecomiDehydratedHtml([drecomiArrayDetailQuery, drecomiArrayEpisodesQuery]),
    });

    const feed = await successfulFeed('drecomi-plus', 'CD00035');

    expect(feed.title).toBe(drecomiSeriesDetail.name);
    expect(feed.items).toHaveLength(3);
  });

  it('parses a row whose id contains hex digits', async () => {
    const row = flightEntryPayload('2f', [
      '$',
      '$L18',
      null,
      { state: { mutations: [], queries: [drecomiDetailQuery, drecomiEpisodesQuery] } },
    ]);
    mockResponses({ [pageUrl]: drecomiRowBatchHtml([row]) });

    const feed = await successfulFeed('drecomi-plus', 'CD00035');

    expect(feed.title).toBe(drecomiSeriesDetail.name);
    expect(feed.items).toHaveLength(3);
  });

  it('parses multiple newline-separated rows in a single push payload', async () => {
    const irrelevant = flightEntryPayload('18', ['$', 'span', null, { children: '無関係な行' }]);
    const episodes = flightEntryPayload('19', [
      '$',
      '$L18',
      null,
      { state: { mutations: [], queries: [drecomiEpisodesQuery] } },
    ]);
    mockResponses({ [pageUrl]: drecomiRowBatchHtml([irrelevant, episodes]) });

    const feed = await successfulFeed('drecomi-plus', 'CD00035');

    expect(feed.items).toHaveLength(3);
  });

  it('prefers catch_copy over an empty description when summary is absent', async () => {
    const detailOnlyCatchCopy = {
      queryHash: ['series', 'detail', 'CD00035'],
      state: {
        data: { name: drecomiSeriesDetail.name, catch_copy: drecomiSeriesDetail.catch_copy },
      },
    };
    mockResponses({
      [pageUrl]: drecomiDehydratedHtml([detailOnlyCatchCopy, drecomiEpisodesQuery]),
    });

    const feed = await successfulFeed('drecomi-plus', 'CD00035');

    expect(feed.description).toBe(drecomiSeriesDetail.catch_copy);
  });
});
