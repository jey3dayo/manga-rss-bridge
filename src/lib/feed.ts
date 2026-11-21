import type { MangaFeed } from '../types/feed.ts';
import { Result } from './result.ts';

/**
 * Providers whose parsing has no schema-level validation use this guard so a
 * page that yields no episodes (structure change, bot wall, error page served
 * with 200) fails the feed request instead of returning an empty feed.
 */
export const requireFeedItems = (source: string, feed: MangaFeed): Result<MangaFeed, Error> =>
  feed.items.length > 0
    ? Result.succeed(feed)
    : Result.fail(new Error(`${source}: episode list is empty`));
