import type { MangaFeed } from '../types/feed.ts';
import { Result } from './result.ts';

export const requireFeedItems = (source: string, feed: MangaFeed): Result<MangaFeed, Error> =>
  feed.items.length > 0
    ? Result.succeed(feed)
    : Result.fail(new Error(`${source}: episode list is empty`));
