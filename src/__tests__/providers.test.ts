import { afterEach, describe, expect, it, vi } from 'vitest';
import { Result } from '../lib/result.ts';
import { comicDaysProvider } from '../providers/comic-days.ts';
import { ganganOnlineProvider } from '../providers/gangan-online.ts';
import { kadocomiProvider } from '../providers/kadocomi.ts';
import { yanmagaProvider } from '../providers/yanmaga.ts';

describe('providers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('skips Gangan ONLINE chapters with blank ids', async () => {
    const nextData = {
      props: {
        pageProps: {
          data: {
            default: {
              titleName: 'Gangan',
              chapters: [
                { id: '', mainText: 'blank' },
                { id: '   ', mainText: 'spaces' },
                { id: '  123  ', mainText: 'valid' },
              ],
            },
          },
        },
      },
    };
    const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>`;
    const fetchMock: typeof fetch = async () => new Response(html);
    vi.stubGlobal('fetch', fetchMock);

    const result = await ganganOnlineProvider.fetchFeed('2061');
    if (Result.isFailure(result)) throw result.error;

    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0]?.id).toBe('123');
  });

  it('skips Kadocomi episodes with blank codes', async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          work: { title: 'Kadocomi' },
          firstEpisodes: {
            result: [
              { code: '', title: 'blank' },
              { code: '   ', title: 'spaces' },
              { code: '  EP001  ', title: 'valid' },
            ],
          },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await kadocomiProvider.fetchFeed('KC_000733_S');
    if (Result.isFailure(result)) throw result.error;

    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0]?.id).toBe('EP001');
  });

  it('parses Yanmaga episodes from list item data attributes', async () => {
    const episode = (n: number, hash: string, date: string) => `
      <li class="mod-episode-item js-modal" data-episode-title="第${n}話" data-is-free="false" data-original-url="/comics/%E3%81%AD%E3%81%9A%E3%81%BF/${hash}">
        <div class="mod-episode-public">
          <a class="mod-episode-link" href="/comics/%E3%81%AD%E3%81%9A%E3%81%BF/${hash}">
            <div class="mod-episode-thumbnail">
              <img alt="第${n}話" src="https://cdn.example.com/thumb-${n}.jpg" />
            </div>
            <div class="mod-episode-body">
              <time class="mod-episode-date">${date}</time>
              <p class="mod-episode-title">第${n}話</p>
            </div>
          </a>
        </div>
      </li>`;
    const html = `
      <head><meta property="og:title" content="『ねずみの初恋』 | ヤンマガWeb" /></head>
      <ul class="detailv2-episodes">
        ${episode(1, 'aaa', '2023/11/06')}
        ${episode(112, 'zzz', '2026/07/13')}
      </ul>`;
    const fetchMock: typeof fetch = async () => new Response(html);
    vi.stubGlobal('fetch', fetchMock);

    const result = await yanmagaProvider.fetchFeed('ねずみの初恋');
    if (Result.isFailure(result)) throw result.error;

    expect(result.value.title).toBe('ねずみの初恋');
    expect(result.value.items).toHaveLength(2);
    expect(result.value.items[0]).toMatchObject({
      id: 'aaa',
      title: '第1話',
      url: 'https://yanmaga.jp/comics/%E3%81%AD%E3%81%9A%E3%81%BF/aaa',
      date: '2023/11/06',
    });
    expect(result.value.items[1]?.title).toBe('第112話');
  });

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
