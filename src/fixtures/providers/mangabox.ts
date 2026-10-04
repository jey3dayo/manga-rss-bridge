import type { ProviderFixture } from './types.ts';

export const mangaboxFixture: ProviderFixture = {
  id: 'mangabox',
  identifier: 'work/42',
  responses: {
    'https://www.mangabox.me/reader/work%2F42/episodes/all/': `
        <title>星の旅｜マンガボックス</title><meta name="description" content="旅の記録" />
        <li class="_episodes__item"><a href="/reader/42/episodes/202">
          <div class="_volume_title">毎日¥0 無料 第2話 コイン <b>後編</b> 先読み</div>
          <img src="/covers/202.jpg" /></a></li>
        <li class="_episodes__item"><a href="/reader/42/episodes/203"><span>第3話</span></a></li>
        <li class="_episodes__item"><a href="/news/1">お知らせ</a></li>`,
  },
  feed: {
    title: '星の旅',
    link: 'https://www.mangabox.me/reader/work%2F42/episodes/all/',
    description: '旅の記録',
    items: [
      {
        id: '202',
        title: '第2話 後編',
        url: 'https://www.mangabox.me/reader/42/episodes/202',
        thumbnail: 'https://www.mangabox.me/covers/202.jpg',
      },
      { id: '203', title: '第3話', url: 'https://www.mangabox.me/reader/42/episodes/203' },
    ],
  },
};
