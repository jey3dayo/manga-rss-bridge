import { Hono } from 'hono';
import { HTTP_HEADERS, MIME_TYPES } from './constants/http.ts';
import {
  APP_NAME,
  FEED_FILE_EXTENSION,
  LOG_EVENTS,
  RESPONSE_TEXT,
  ROUTES,
} from './constants/server.ts';
import { Result } from './lib/result.ts';
import { renderRss } from './lib/rss.ts';
import type { Provider } from './types/feed.ts';

export const createApp = (providers: readonly Provider[]) => {
  const registry = new Map(providers.map((provider) => [provider.id, provider]));
  const app = new Hono();

  app.get(ROUTES.health, (c) => c.text(RESPONSE_TEXT.ok));

  app.get(ROUTES.root, (c) =>
    c.json({
      name: APP_NAME,
      providers: [...registry.keys()],
    }),
  );

  app.get(ROUTES.feed, async (c) => {
    const providerId = c.req.param('provider');
    const feedPath = c.req.param('feedPath');
    if (!providerId || !feedPath.endsWith(FEED_FILE_EXTENSION)) {
      return c.text(RESPONSE_TEXT.notFound, 404);
    }
    const identifier = feedPath.slice(0, -FEED_FILE_EXTENSION.length).trim();
    if (!identifier) return c.text(RESPONSE_TEXT.notFound, 404);

    const provider = registry.get(providerId);
    if (!provider) return c.text(RESPONSE_TEXT.notFound, 404);

    const feed = await provider.fetchFeed(identifier);
    if (Result.isFailure(feed)) {
      console.error(LOG_EVENTS.feedError, { provider: providerId, identifier, error: feed.error });
      return c.text(RESPONSE_TEXT.feedFetchFailed, 502);
    }

    return c.body(renderRss(feed.value, provider.id, identifier, provider.siteName), 200, {
      [HTTP_HEADERS.contentType]: MIME_TYPES.rssXml,
    });
  });

  return app;
};
