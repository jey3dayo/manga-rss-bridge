import type { ProviderFixture } from './types.ts';

export const hayacomicFixture: ProviderFixture = {
  id: 'hayacomic',
  identifier: 'work/42',
  responses: {
    'https://hayacomic.jp/series/work%2F42': `
        <meta property="og:title" content="星の旅 | ハヤコミ" />
        <meta name="description" content="旅の記録" />
        <li class="series-eplist-item"><a href="/episodes/202">
          <span class="series-eplist-item-h-text">第2話 <b>後編</b></span>
          <div class="series-eplist-item-meta-date"> 2026/09/03 </div>
          <img src="/covers/202.jpg" /></a></li>
        <li class="series-eplist-item"><a href="/news/1">お知らせ</a></li>`,
  },
  feed: {
    title: '星の旅',
    link: 'https://hayacomic.jp/series/work%2F42',
    description: '旅の記録',
    items: [
      {
        id: '202',
        title: '第2話 後編',
        url: 'https://hayacomic.jp/episodes/202',
        date: '2026/09/03',
        thumbnail: 'https://hayacomic.jp/covers/202.jpg',
      },
    ],
  },
};
