import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import {
  APP_NAME,
  DEFAULT_PORT,
  FEED_FILE_EXTENSION,
  LISTEN_HOST,
  LOG_EVENTS,
  RESPONSE_TEXT,
  ROUTES,
} from './constants/server.ts';
import { HTTP_HEADERS, MIME_TYPES } from './constants/http.ts';
import { Result } from './lib/result.ts';
import { renderRss } from './lib/rss.ts';
import { getProvider, listProviders } from './providers/index.ts';

const app = new Hono();

app.get(ROUTES.health, (c) => c.text(RESPONSE_TEXT.ok));

app.get(ROUTES.root, (c) =>
  c.json({
    name: APP_NAME,
    providers: listProviders().map((provider) => provider.id),
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

  const provider = getProvider(providerId);
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

const port = Number(process.env.PORT ?? DEFAULT_PORT);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`${APP_NAME} listening on http://${LISTEN_HOST}:${info.port}`);
});
