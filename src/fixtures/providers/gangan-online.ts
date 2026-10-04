import type { ProviderFixture } from './types.ts';

export const nextDataPage = (data: unknown): string =>
  `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`;

export const ganganTitle = {
  titleName: '星の旅',
  author: '星野',
  description: '旅の記録',
  chapters: [{ id: 12, mainText: '第12話' }, { id: 'chapter/a' }, { mainText: '未公開' }],
};

export const ganganOnlineFixture: ProviderFixture = {
  id: 'gangan-online',
  identifier: 'work/42',
  responses: {
    'https://www.ganganonline.com/title/work%2F42': nextDataPage({ buildId: 'build-42' }),
    'https://www.ganganonline.com/_next/data/build-42/title/work%2F42.json': JSON.stringify({
      pageProps: { data: { default: ganganTitle } },
    }),
  },
  feed: {
    title: '星の旅',
    link: 'https://www.ganganonline.com/title/work%2F42',
    description: '星野\n旅の記録',
    items: [
      {
        id: '12',
        title: '第12話',
        url: 'https://www.ganganonline.com/title/work%2F42/chapter/12',
      },
      {
        id: 'chapter/a',
        title: 'chapter chapter/a',
        url: 'https://www.ganganonline.com/title/work%2F42/chapter/chapter%2Fa',
      },
    ],
  },
};
