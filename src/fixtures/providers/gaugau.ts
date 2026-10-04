import type { ProviderFixture } from './types.ts';

export const gaugauFixture: ProviderFixture = {
  id: 'gaugau',
  identifier: 'work/42',
  responses: {
    'https://gaugau.futabanet.jp/list/work/work%2F42/episodes': `
        <meta property="og:title" content="星の旅｜がうがうモンスター＋" />
        <meta content="夜空&amp;冒険" name="description" />
        <div class="episode__grid"><div class="episode__num">第2話</div>
          <div class="episode__title"><b>旅立ち</b></div><time>2026年09月03日</time>
          <img src="/covers/202.jpg" /></div>
        <div class="episode__grid"><div class="episode__num">第2話</div>
          <div class="episode__title">旅立ち</div></div>`,
  },
  feed: {
    title: '星の旅',
    link: 'https://gaugau.futabanet.jp/list/work/work%2F42/episodes',
    description: '夜空&冒険',
    items: [
      {
        id: 'episode-第2話-旅立ち',
        title: '第2話 旅立ち',
        url: 'https://gaugau.futabanet.jp/list/work/work%2F42/episodes#episode-第2話-旅立ち',
        date: '2026年09月03日',
        thumbnail: 'https://gaugau.futabanet.jp/covers/202.jpg',
      },
    ],
  },
};
