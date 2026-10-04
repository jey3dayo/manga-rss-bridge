import type { ProviderFixture } from './types.ts';

export const jumpRookieFixture: ProviderFixture = {
  id: 'jump-rookie',
  identifier: '42',
  responses: {
    'https://rookie.shonenjump.com/series/42': `
        <meta property="og:title" content="星の旅 - ジャンプルーキー！" />
        <meta name="description" content="旅の記録" />
        <li class="episode-wrapper"><a class="episode-content" href="/series/42/202">
          <span class="episode-title">第2話 <b>後編</b></span><img src="/covers/202.jpg" /></a></li>
        <li class="episode-wrapper"><a class="episode-content" href="/series/other/9">
          <span class="episode-title">別の作品</span></a></li>
        <li class="episode-wrapper"><a class="episode-content" href="/series/42/202">
          <span class="episode-title">重複</span></a></li>`,
  },
  feed: {
    title: '星の旅 - ジャンプルーキー！',
    link: 'https://rookie.shonenjump.com/series/42',
    description: '旅の記録',
    items: [
      {
        id: '202',
        title: '第2話 後編',
        url: 'https://rookie.shonenjump.com/series/42/202',
        thumbnail: 'https://rookie.shonenjump.com/covers/202.jpg',
      },
    ],
  },
};
