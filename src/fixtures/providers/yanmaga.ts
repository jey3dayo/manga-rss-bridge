import type { ProviderFixture } from './types.ts';

export const yanmagaFixture: ProviderFixture = {
  id: 'yanmaga',
  identifier: '星/旅',
  responses: {
    'https://yanmaga.jp/comics/%E6%98%9F%2F%E6%97%85?sort=older': `
        <title>星の旅</title><meta name="description" content="旅の記録" />
        <li class="mod-episode-item"><a href="/comics/stars/202"><h3>第2話 後編</h3>
          <time class="mod-episode-date">2026/09/03</time><img data-src="/covers/202.jpg" /></a></li>
        <li class="mod-episode-item"><a href="/comics/stars/101">
          <p class="mod-episode-title">第1話</p><time class="mod-episode-date">2026/09/01</time></a></li>
        <li class="mod-episode-item"><a href="/comics/stars/202"><h3>重複</h3></a></li>
        <li class="mod-episode-item"><p>公開準備中</p></li>`,
  },
  feed: {
    title: '星の旅',
    link: 'https://yanmaga.jp/comics/%E6%98%9F%2F%E6%97%85?sort=older',
    description: '旅の記録',
    items: [
      {
        id: '101',
        title: '第1話',
        url: 'https://yanmaga.jp/comics/stars/101',
        date: '2026/09/01',
      },
      {
        id: '202',
        title: '第2話 後編',
        url: 'https://yanmaga.jp/comics/stars/202',
        date: '2026/09/03',
        thumbnail: 'https://yanmaga.jp/covers/202.jpg',
      },
    ],
  },
};
