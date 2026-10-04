import { Result, type ResultAsync, tryCatch } from '../lib/result.ts';
import type { MangaFeed, Provider } from '../types/feed.ts';

export const createProvider = (
  { id, siteName }: Pick<Provider, 'id' | 'siteName'>,
  fetchFeed: (identifier: string) => ResultAsync<MangaFeed, Error>,
): Provider => ({
  id,
  siteName,
  fetchFeed: (identifier) =>
    Result.pipe(
      tryCatch(() => fetchFeed(identifier)),
      Result.andThen((result) => result),
    ),
});
