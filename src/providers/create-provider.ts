import { tryCatch } from '../lib/result.ts';
import type { MangaFeed, Provider } from '../types/feed.ts';

export const createProvider = (
  { id, siteName }: Pick<Provider, 'id' | 'siteName'>,
  fetchFeed: (identifier: string) => Promise<MangaFeed>,
): Provider => ({
  id,
  siteName,
  fetchFeed: (identifier) => tryCatch(() => fetchFeed(identifier)),
});
