export const APP_NAME = 'manga-rss-bridge';

export const DEFAULT_PORT = 8080;

export const LISTEN_HOST = '0.0.0.0';

export const ROUTES = {
  health: '/healthz',
  root: '/',
  feed: '/:provider/:feedPath',
} as const;

export const FEED_FILE_EXTENSION = '.xml';

export const RESPONSE_TEXT = {
  ok: 'ok\n',
  notFound: 'not found\n',
  feedFetchFailed: 'feed fetch failed\n',
} as const;

export const LOG_EVENTS = {
  feedError: 'feed_error',
} as const;
