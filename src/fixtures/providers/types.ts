import type { MangaFeed } from '../../types/feed.ts';

export type ProviderFixture = {
  id: string;
  identifier: string;
  responses: Record<string, string | Uint8Array>;
  feed: MangaFeed;
};
