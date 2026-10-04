import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { APP_NAME, DEFAULT_PORT, LISTEN_HOST } from './constants/server.ts';
import { listProviders } from './providers/index.ts';

const app = createApp(listProviders());
const port = Number(process.env.PORT ?? DEFAULT_PORT);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`${APP_NAME} listening on http://${LISTEN_HOST}:${info.port}`);
});
