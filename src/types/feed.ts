import type { Result } from '../lib/result.js';

export type FeedItem = {
  id: string;
  title: string;
  url: string;
  date?: string;
  thumbnail?: string;
};

export type MangaFeed = {
  title: string;
  link: string;
  description: string;
  items: FeedItem[];
};

export type Provider = {
  id: string;
  siteName: string;
  fetchFeed(identifier: string): Promise<Result<MangaFeed, Error>>;
};
