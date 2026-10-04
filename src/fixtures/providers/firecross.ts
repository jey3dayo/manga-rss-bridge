import type { ProviderFixture } from './types.ts';

export const firecrossFixture: ProviderFixture = {
  id: 'firecross',
  identifier: 'work/42',
  responses: {
    'https://firecross.jp/ebook/series/work%2F42': `
        <title>星の旅 | ファイアCROSS</title><meta name="description" content="夜空&amp;冒険" />
        <div class="shop-item--episode"><a href="/ebook/episode/202.html">
          <div class="title"><b>第2話</b> 後編</div><time>2026年9月3日</time>
          <img data-src="/covers/202.jpg" /></a></div>
        <div class="shop-item--episode"><a href="/ebook/episode/202.html"><h3>重複</h3></a></div>
        <div class="shop-item--episode"><h3>公開準備中</h3></div>`,
  },
  feed: {
    title: '星の旅',
    link: 'https://firecross.jp/ebook/series/work%2F42',
    description: '夜空&冒険',
    items: [
      {
        id: '202',
        title: '第2話 後編',
        url: 'https://firecross.jp/ebook/episode/202.html',
        date: '2026年9月3日',
        thumbnail: 'https://firecross.jp/covers/202.jpg',
      },
    ],
  },
};
