import type { MangaFeed } from '../types/feed.ts';

export const escapedRssFeedFixture: MangaFeed = {
  title: 'A & B',
  link: 'https://example.com/work',
  description: 'desc <tag>',
  items: [
    {
      id: '1',
      title: '第1話 <start>',
      url: 'https://example.com/1',
      date: '2026-06-22T00:00:00Z',
    },
  ],
};
