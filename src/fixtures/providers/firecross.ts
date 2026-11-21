import type { ProviderFixture } from './types.ts';

const episodeBlock = (id: number, title: string, release: string): string => `
  <div js-shop-item class="shop-item--episode" id="ep${id}" data-id="${id}">
    <picture class="shop-item-figure">
      <img class="shop-item-img--episode" alt="${title}" src="/covers/${id}.jpg" />
    </picture>
    <div class="shop-item-info">
      <span class="shop-item-info-name">${title}</span>
      <div class="shop-item-info-meta">
        <span class="shop-item-info-release">公開：${release}</span>
      </div>
    </div>
  </div>`;

export const firecrossFixture: ProviderFixture = {
  id: 'firecross',
  identifier: '42',
  responses: {
    'https://firecross.jp/ebook/series/42?sort=latest&page=1': `
        <title>星の旅 | ファイアCROSS</title><meta name="description" content="夜空&amp;冒険" />
        <nav class="ebookSeries_pagination">
          <a href="https://firecross.jp/ebook/series/42?sort=latest&amp;page=1">1</a>
          <a href="https://firecross.jp/ebook/series/42?sort=latest&amp;page=2">2</a>
        </nav>
        ${episodeBlock(9003, '第3話', '2026/9/17')}
        ${episodeBlock(9002, '第2話', '2026/9/3')}`,
    'https://firecross.jp/ebook/series/42?sort=latest&page=2': `
        <title>星の旅 | ファイアCROSS</title><meta name="description" content="夜空&amp;冒険" />
        ${episodeBlock(9001, '第1話', '2026/8/20')}`,
  },
  feed: {
    title: '星の旅',
    link: 'https://firecross.jp/ebook/series/42',
    description: '夜空&冒険',
    items: [
      {
        id: '9003',
        title: '第3話',
        url: 'https://firecross.jp/ebook/series/42#ep9003',
        date: '2026/9/17',
        thumbnail: 'https://firecross.jp/covers/9003.jpg',
      },
      {
        id: '9002',
        title: '第2話',
        url: 'https://firecross.jp/ebook/series/42#ep9002',
        date: '2026/9/3',
        thumbnail: 'https://firecross.jp/covers/9002.jpg',
      },
      {
        id: '9001',
        title: '第1話',
        url: 'https://firecross.jp/ebook/series/42#ep9001',
        date: '2026/8/20',
        thumbnail: 'https://firecross.jp/covers/9001.jpg',
      },
    ],
  },
};
