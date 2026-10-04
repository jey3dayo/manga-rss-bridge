import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.ts';
import { escapedRssFeedFixture } from './fixtures/rss.ts';
import { tryCatch } from './lib/result.ts';
import { listProviders } from './providers/index.ts';
import type { Provider } from './types/feed.ts';

const makeProvider = (id = 'fixture'): Provider => ({
  id,
  siteName: 'Fixture & Site',
  fetchFeed: vi.fn<Provider['fetchFeed']>(() => tryCatch(async () => escapedRssFeedFixture)),
});

describe('app routes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T00:00:00Z'));
    vi.stubGlobal('fetch', () => {
      throw new Error('Route tests must not make external requests');
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('serves the exact health response without fetching a feed', async () => {
    const provider = makeProvider();

    const response = await createApp([provider]).request('/healthz');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/plain;charset=UTF-8');
    expect(await response.text()).toBe('ok\n');
    expect(provider.fetchFeed).not.toHaveBeenCalled();
  });

  it('preserves the public provider list and its order', async () => {
    const response = await createApp(listProviders()).request('/');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(await response.json()).toEqual({
      name: 'manga-rss-bridge',
      providers: [
        'comic-days',
        'firecross',
        'gaugau',
        'gangan-online',
        'hayacomic',
        'jump-rookie',
        'kadocomi',
        'manga-one',
        'mangabox',
        'pixiv-comic',
        'yanmaga',
      ],
    });
  });

  it('renders the exact RSS response for the selected provider', async () => {
    const provider = makeProvider();
    const other = makeProvider('other');

    const response = await createApp([other, provider]).request('/fixture/work.xml');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/rss+xml; charset=utf-8');
    expect(provider.fetchFeed).toHaveBeenCalledExactlyOnceWith('work');
    expect(other.fetchFeed).not.toHaveBeenCalled();
    expect(await response.text()).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0">',
        '  <channel>',
        '    <title>A &amp; B - Fixture &amp; Site</title>',
        '    <link>https://example.com/work</link>',
        '    <description>desc &lt;tag&gt;</description>',
        '    <lastBuildDate>Sun, 04 Oct 2026 00:00:00 GMT</lastBuildDate>',
        '    <item>',
        '      <title>A &amp; B - 第1話 &lt;start&gt;</title>',
        '      <link>https://example.com/1</link>',
        '      <guid isPermaLink="false">fixture:work:1</guid>',
        '      <description>desc &lt;tag&gt;</description>',
        '      <pubDate>Mon, 22 Jun 2026 00:00:00 GMT</pubDate>',
        '    </item>',
        '  </channel>',
        '</rss>',
      ].join('\n'),
    );
  });

  it.each([
    { path: '%E3%81%AD%E3%81%9A%E3%81%BF_%E5%88%9D%E6%81%8B.xml', identifier: 'ねずみ_初恋' },
    { path: '%20%20work%20%20.xml', identifier: 'work' },
    { path: 'work%2Fchapter.xml', identifier: 'work/chapter' },
    { path: 'work%252Fchapter.xml', identifier: 'work%2Fchapter' },
    { path: 'work%2Bchapter.xml', identifier: 'work+chapter' },
    { path: 'work.xml.xml', identifier: 'work.xml' },
  ])('decodes and trims $path once before provider dispatch', async ({ path, identifier }) => {
    const provider = makeProvider();

    const response = await createApp([provider]).request(`/fixture/${path}`);

    expect(response.status).toBe(200);
    expect(provider.fetchFeed).toHaveBeenCalledExactlyOnceWith(identifier);
    expect(await response.text()).toContain(`fixture:${identifier}:1`);
  });

  it('returns the exact 502 response and logs a provider Result failure', async () => {
    const provider = makeProvider();
    const error = new Error('upstream failed');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(provider.fetchFeed).mockImplementation(() =>
      tryCatch(async () => {
        throw error;
      }),
    );

    const response = await createApp([provider]).request('/fixture/%20work%20.xml');

    expect(response.status).toBe(502);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=UTF-8');
    expect(await response.text()).toBe('feed fetch failed\n');
    expect(log).toHaveBeenCalledExactlyOnceWith('feed_error', {
      provider: 'fixture',
      identifier: 'work',
      error,
    });
  });

  it.each([
    '/missing/work.xml',
    '/fixture/work',
    '/fixture/work.XML',
    '/fixture/.xml',
    '/fixture/%20%20.xml',
  ])('returns the custom 404 for invalid feed route %s', async (path) => {
    const provider = makeProvider();

    const response = await createApp([provider]).request(path);

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=UTF-8');
    expect(await response.text()).toBe('not found\n');
    expect(provider.fetchFeed).not.toHaveBeenCalled();
  });

  it.each([
    { path: '/missing', method: 'GET' },
    { path: '/fixture/work.xml/extra', method: 'GET' },
    { path: '/fixture/work.xml', method: 'POST' },
  ])('preserves the framework 404 for unmatched $method $path', async ({ path, method }) => {
    const provider = makeProvider();

    const response = await createApp([provider]).request(path, { method });

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=UTF-8');
    expect(await response.text()).toBe('404 Not Found');
    expect(provider.fetchFeed).not.toHaveBeenCalled();
  });
});
