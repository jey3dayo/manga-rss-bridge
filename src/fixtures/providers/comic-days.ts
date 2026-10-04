import type { ProviderFixture } from './types.ts';

export const comicDaysFixture: ProviderFixture = {
  id: 'comic-days',
  identifier: 'work/42',
  responses: {
    'https://comic-days.com/rss/series/work%2F42': `
        <rss><channel><title>星の旅</title><link>https://comic-days.com/series/42</link>
          <description>旅の記録</description>
          <item><title>第2話 &amp; 後編</title><link>https://comic-days.com/episode/202</link></item>
          <item><title>公開準備中</title></item>
        </channel></rss>`,
  },
  feed: {
    title: '星の旅',
    link: 'https://comic-days.com/series/42',
    description: '旅の記録',
    items: [{ id: '202', title: '第2話 & 後編', url: 'https://comic-days.com/episode/202' }],
  },
};
