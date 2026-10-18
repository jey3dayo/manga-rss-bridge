import type { ProviderFixture } from './types.ts';

const pageUrl = 'https://drecomi-plus.jp/series/CD00035';

export const flightEntryPayload = (id: string, value: unknown): string =>
  `${id}:${JSON.stringify(value)}`;

export const flightScripts = (payloads: string[]): string =>
  payloads
    .map((payload) => `<script>self.__next_f.push([1,${JSON.stringify(payload)}])</script>`)
    .join('');

export const splitFlightEntry = (payload: string): [string, string] => {
  const half = Math.floor(payload.length / 2);
  const split = /^\d+:/.test(payload.slice(half)) ? payload.indexOf(':') + 1 : half;
  return [payload.slice(0, split), payload.slice(split)];
};

export const drecomiSeriesDetail = {
  code: 'CD00035',
  name: '魔物使いの娘',
  summary: '母は魔物、娘は人。魔物たちと群れを守る物語。',
  catch_copy: '群れを守る、優しい強さ。',
};

export const drecomiPickupQuery = {
  queryKey: ['series', 'detail', 'CD00035', 'pickup'],
  queryHash: '["series","detail","CD00035","pickup"]',
  state: {
    data: {
      items: [{ code: 'CD20007', name: '関連作品', episode_number: 1 }],
    },
  },
};

export const drecomiDetailQuery = {
  queryKey: ['series', 'detail', 'CD00035'],
  queryHash: '["series","detail","CD00035"]',
  state: { data: drecomiSeriesDetail },
};

export const drecomiVolumesQuery = {
  queryKey: ['series', 'detail', 'CD00035', 'volumes'],
  queryHash:
    '["series","detail","CD00035","volumes",{"limit":6,"offset":0,"order":"desc","page":1,"sort":"volume_number"}]',
  state: {
    data: {
      items: [{ code: 'CD00035-001', name: '第1巻', volume_number: 1 }],
      pagination: { total: 1, per_page: 6, page: 1 },
    },
  },
};

export const drecomiEpisodesQuery = {
  queryKey: ['series', 'detail', 'CD00035', 'episodes'],
  queryHash:
    '["series","detail","CD00035","episodes",{"limit":7,"offset":0,"order":"desc","page":1,"sort":"episode_number"}]',
  state: {
    data: {
      items: [
        {
          code: 'CD00035-001-003',
          name: '第3話 群れの掟',
          episode_number: 3,
          publish_at: '2026-03-06T12:00:00+09:00',
          actual_price: 110,
          price_coins: 3,
          is_latest: false,
          thumbnail: { cdn_url: 'https://cdn.drecomi-plus.jp/episodes/003.jpg' },
        },
        {
          code: 'CD00035-001-002',
          name: '第2話 約束',
          episode_number: 2,
          sale_start_at: '2026-02-06T12:00:00+09:00',
          actual_price: 110,
          price_coins: 3,
          is_latest: false,
          thumbnail: { cdn_url: 'https://cdn.drecomi-plus.jp/episodes/002.jpg' },
        },
        {
          code: 'CD00035-001-001',
          name: '第1話 魔物の娘',
          episode_number: 1,
          publish_at: '2026-01-09T12:00:00+09:00',
          actual_price: 110,
          price_coins: 3,
          is_latest: true,
          thumbnail: { cdn_url: 'https://cdn.drecomi-plus.jp/episodes/001.jpg' },
        },
        { code: '   ', name: 'コード未採番', episode_number: 99 },
      ],
      pagination: { total: 3, per_page: 10, page: 1 },
    },
  },
};

export const drecomiArrayDetailQuery = {
  queryHash: ['series', 'detail', 'CD00035'],
  state: drecomiDetailQuery.state,
};

export const drecomiArrayEpisodesQuery = {
  queryHash: ['series', 'detail', 'CD00035', 'episodes'],
  state: drecomiEpisodesQuery.state,
};

export const drecomiDehydratedHtml = (queries: unknown[]): string => {
  const payload = flightEntryPayload('26', [
    '$',
    '$L18',
    null,
    { state: { mutations: [], queries } },
  ]);
  const [chunk, continuation] = splitFlightEntry(payload);
  return `<html><head><title>ドリコミ＋</title></head><body>${flightScripts([chunk, continuation])}</body></html>`;
};

export const drecomiRowBatchHtml = (rows: string[]): string =>
  `<html><head><title>ドリコミ＋</title></head><body><script>self.__next_f.push([1,${JSON.stringify(
    rows.join('\n'),
  )}])</script></body></html>`;

export const drecomiPlusFixture: ProviderFixture = {
  id: 'drecomi-plus',
  identifier: 'CD00035',
  responses: {
    [pageUrl]: drecomiDehydratedHtml([
      drecomiPickupQuery,
      drecomiDetailQuery,
      drecomiEpisodesQuery,
      drecomiVolumesQuery,
    ]),
  },
  feed: {
    title: '魔物使いの娘',
    link: pageUrl,
    description: '母は魔物、娘は人。魔物たちと群れを守る物語。',
    items: [
      {
        id: 'CD00035-001-001',
        title: '第1話 魔物の娘',
        url: 'https://drecomi-plus.jp/series/CD00035/episodes/CD00035-001-001',
        date: '2026-01-09T12:00:00+09:00',
        thumbnail: 'https://cdn.drecomi-plus.jp/episodes/001.jpg',
      },
      {
        id: 'CD00035-001-002',
        title: '第2話 約束',
        url: 'https://drecomi-plus.jp/series/CD00035/episodes/CD00035-001-002',
        date: '2026-02-06T12:00:00+09:00',
        thumbnail: 'https://cdn.drecomi-plus.jp/episodes/002.jpg',
      },
      {
        id: 'CD00035-001-003',
        title: '第3話 群れの掟',
        url: 'https://drecomi-plus.jp/series/CD00035/episodes/CD00035-001-003',
        date: '2026-03-06T12:00:00+09:00',
        thumbnail: 'https://cdn.drecomi-plus.jp/episodes/003.jpg',
      },
    ],
  },
};
