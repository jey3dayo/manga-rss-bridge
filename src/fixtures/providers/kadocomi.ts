import type { ProviderFixture } from './types.ts';

export const kadocomiFixture: ProviderFixture = {
  id: 'kadocomi',
  identifier: 'work/42',
  responses: {
    'https://comic-walker.com/api/contents/details/work?workCode=work%2F42': JSON.stringify({
      work: { title: '星の旅', catchphrase: '夜空の冒険', description: '長い紹介文' },
      firstEpisodes: {
        result: [
          {
            code: ' EP002 ',
            title: '第2話',
            subTitle: ' 後編 ',
            internal: { episodeNo: 2 },
            updateDate: '2026-09-03',
            thumbnail: 'https://cdn.example.com/202.jpg',
          },
          { code: 'hidden', title: '非公開', isActive: false, internal: { episodeNo: 1 } },
          { code: 'EP001', subTitle: ' ', internal: { episodeNo: 1 } },
          { code: 'intro', title: '予告' },
        ],
      },
    }),
  },
  feed: {
    title: '星の旅',
    link: 'https://comic-walker.com/detail/work%2F42?episodeType=latest',
    description: '夜空の冒険',
    items: [
      {
        id: 'intro',
        title: '予告',
        url: 'https://comic-walker.com/detail/work%2F42/episodes/intro?episodeType=latest',
      },
      {
        id: 'EP001',
        title: 'episode EP001',
        url: 'https://comic-walker.com/detail/work%2F42/episodes/EP001?episodeType=latest',
      },
      {
        id: 'EP002',
        title: '第2話 後編',
        url: 'https://comic-walker.com/detail/work%2F42/episodes/EP002?episodeType=latest',
        date: '2026-09-03',
        thumbnail: 'https://cdn.example.com/202.jpg',
      },
    ],
  },
};
