import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Result } from '../lib/result.ts';
import { comicDaysProvider } from './comic-days.ts';

beforeEach(() => {
  // Every test is offline: unexpected requests can never reach the network.
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async () => {
      throw new Error('Network disabled: install an explicit response fixture');
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('providers', () => {
  it('parses Comic DAYS official RSS', async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(
        `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>コミックDAYS（狩猟のユメカ）</title>
            <link>https://comic-days.com/episode/10834108156754637588</link>
            <description>人&amp;獣の物語</description>
            <item>
              <title>第１話</title>
              <link>https://comic-days.com/episode/10834108156754637588</link>
              <guid isPermalink="false">comicdays:episode:10834108156754637588</guid>
              <pubDate>Mon, 24 Feb 2020 15:00:00 +0000</pubDate>
              <enclosure url="https://cdn-img.comic-days.com/public/episode-thumbnail/sample.jpg" length="0" type="image/jpeg" />
            </item>
          </channel>
        </rss>`,
        { headers: { 'Content-Type': 'application/rss+xml' } },
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await comicDaysProvider.fetchFeed('10834108156754578626');
    if (Result.isFailure(result)) throw result.error;

    expect(result.value.title).toBe('狩猟のユメカ');
    expect(result.value.description).toBe('人&獣の物語');
    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0]).toMatchObject({
      id: '10834108156754637588',
      title: '第１話',
      url: 'https://comic-days.com/episode/10834108156754637588',
      date: 'Mon, 24 Feb 2020 15:00:00 +0000',
      thumbnail: 'https://cdn-img.comic-days.com/public/episode-thumbnail/sample.jpg',
    });
  });
});
