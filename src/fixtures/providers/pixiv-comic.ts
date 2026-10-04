import type { ProviderFixture } from './types.ts';

export const pixivWork = { data: { official_work: { id: 42, name: '星の旅' } } };

export const pixivWorkUrl = 'https://comic.pixiv.net/api/app/works/v5/42';

export const pixivEpisodesUrl = 'https://comic.pixiv.net/api/app/works/42/episodes/v2';

export const pixivComicFixture: ProviderFixture = {
  id: 'pixiv-comic',
  identifier: ' 42 ',
  responses: {
    [pixivWorkUrl]: JSON.stringify(pixivWork),
    [pixivEpisodesUrl]: JSON.stringify({
      data: {
        episodes: [
          {
            state: 'readable',
            episode: {
              id: '202',
              sub_title: ' 旅立ち ',
              read_start_at: 1790910000000,
              viewer_path: '/viewer/stories/202',
            },
          },
        ],
      },
    }),
  },
  feed: {
    title: '星の旅',
    link: 'https://comic.pixiv.net/works/42',
    description: '',
    items: [
      {
        id: '202',
        title: '旅立ち',
        url: 'https://comic.pixiv.net/viewer/stories/202',
        date: '2026-10-02T03:00:00.000Z',
      },
    ],
  },
};
