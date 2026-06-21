import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { Result } from './lib/result.ts';
import { renderRss } from './lib/rss.ts';
import { getProvider, listProviders } from './providers/index.ts';

const app = new Hono();

app.get('/healthz', (c) => c.text('ok\n'));

app.get('/', (c) =>
  c.json({
    name: 'manga-rss-bridge',
    providers: listProviders().map((provider) => provider.id),
  }),
);

app.get('/:provider/:feedPath', async (c) => {
  const providerId = c.req.param('provider');
  const feedPath = c.req.param('feedPath');
  if (!providerId || !feedPath.endsWith('.xml')) return c.text('not found\n', 404);
  const identifier = feedPath.slice(0, -'.xml'.length).trim();
  if (!identifier) return c.text('not found\n', 404);

  const provider = getProvider(providerId);
  if (!provider) return c.text('not found\n', 404);

  const feed = await provider.fetchFeed(identifier);
  if (Result.isFailure(feed)) {
    console.error('feed_error', { provider: providerId, identifier, error: feed.error });
    return c.text('feed fetch failed\n', 502);
  }

  return c.body(renderRss(feed.value, provider.id, identifier, provider.siteName), 200, {
    'Content-Type': 'application/rss+xml; charset=utf-8',
  });
});

const port = Number(process.env.PORT ?? '8080');

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`manga-rss-bridge listening on http://0.0.0.0:${info.port}`);
});
