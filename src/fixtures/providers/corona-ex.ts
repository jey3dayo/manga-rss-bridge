import { nextDataPage } from './gangan-online.ts';
import type { ProviderFixture } from './types.ts';

export const coronaExNextData = {
  props: {
    pageProps: {
      comicId: '42',
      fallbackData: {
        comic: {
          id: 42,
          title: '星の旅',
          description: '旅の記録',
          latest_episode: {
            id: 9001,
            title: '第9話',
            published_at: '2026-09-03T11:00:00.000+09:00',
          },
        },
      },
    },
  },
};

export const coronaExFixture: ProviderFixture = {
  id: 'corona-ex',
  identifier: '42',
  responses: {
    'https://to-corona-ex.com/comics/42': nextDataPage(coronaExNextData),
  },
  feed: {
    title: '星の旅',
    link: 'https://to-corona-ex.com/comics/42',
    description: '旅の記録',
    items: [
      {
        id: '9001',
        title: '第9話',
        url: 'https://to-corona-ex.com/episodes/9001',
        date: '2026-09-03T11:00:00.000+09:00',
      },
    ],
  },
};
