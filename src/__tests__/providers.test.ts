import { afterEach, describe, expect, it, vi } from 'vitest';
import { Result } from '../lib/result.ts';
import { comicDaysProvider } from '../providers/comic-days.ts';
import { ganganOnlineProvider } from '../providers/gangan-online.ts';
import { kadocomiProvider } from '../providers/kadocomi.ts';
import { pixivComicProvider } from '../providers/pixiv-comic.ts';
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

  it('preserves underscores in Yanmaga identifiers', async () => {
    let requestedUrl: string | undefined;
    const fetchMock: typeof fetch = async (input) => {
      requestedUrl = String(input);
      return new Response(
        '<head><meta property="og:title" content="『キミイロ×ライバー』 | ヤンマガWeb" /></head>',
      );
    };
    vi.stubGlobal('fetch', fetchMock);

    const result = await yanmagaProvider.fetchFeed('キミイロライバー_今夜もベルに教えてください');
    if (Result.isFailure(result)) throw result.error;

    expect(requestedUrl).toBe(
      'https://yanmaga.jp/comics/%E3%82%AD%E3%83%9F%E3%82%A4%E3%83%AD%E3%83%A9%E3%82%A4%E3%83%90%E3%83%BC_%E4%BB%8A%E5%A4%9C%E3%82%82%E3%83%99%E3%83%AB%E3%81%AB%E6%95%99%E3%81%88%E3%81%A6%E3%81%8F%E3%81%A0%E3%81%95%E3%81%84?sort=older',
    );
    expect(result.value.title).toBe('キミイロ×ライバー');
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

  it('builds a Pixiv Comic feed from published episode metadata only', async () => {
    const calls: { url: string; headers: Headers }[] = [];
    const fetchMock: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, headers: new Headers(init?.headers) });
      if (url.endsWith('/api/app/works/v5/8789')) {
        return new Response(
          JSON.stringify({
            data: {
              official_work: {
                id: 8789,
                name: '楠木さんは高校デビューに失敗している',
                author: 'みいみつき',
              },
            },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.endsWith('/api/app/works/8789/episodes/v2')) {
        return new Response(
          JSON.stringify({
            data: {
              episodes: [
                {
                  state: 'readable',
                  episode: {
                    id: 249922,
                    numbering_title: '第58話',
                    sub_title: 'そんなの知ってるっての',
                    read_start_at: 1790910000000,
                    viewer_path: '/viewer/stories/249922',
                  },
                },
                {
                  state: 'readable',
                  episode: {
                    id: 247033,
                    numbering_title: '第57話',
                    sub_title: 'ほんと何もかも恵まれてる子',
                    read_start_at: 1788490800000,
                    viewer_path: '/viewer/stories/247033',
                  },
                },
                { state: 'not_publishing', message: '非公開エピソード' },
                {
                  state: 'readable',
                  episode: {
                    id: 1,
                    numbering_title: '未公開',
                    read_start_at: null,
                    viewer_path: '/viewer/stories/1',
                  },
                },
                {
                  state: 'readable',
                  episode: {
                    id: 2,
                    numbering_title: '不正なリンク',
                    read_start_at: 1790910000000,
                    viewer_path: 'https://example.com/private',
                  },
                },
              ],
            },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('not found', { status: 404 });
    };
    vi.stubGlobal('fetch', fetchMock);

    const result = await pixivComicProvider.fetchFeed('8789');
    if (Result.isFailure(result)) throw result.error;

    expect(result.value.title).toBe('楠木さんは高校デビューに失敗している');
    expect(result.value.link).toBe('https://comic.pixiv.net/works/8789');
    expect(result.value.description).toBe('みいみつき');
    expect(result.value.items).toEqual([
      {
        id: '249922',
        title: '第58話 そんなの知ってるっての',
        url: 'https://comic.pixiv.net/viewer/stories/249922',
        date: '2026-10-02T03:00:00.000Z',
      },
      {
        id: '247033',
        title: '第57話 ほんと何もかも恵まれてる子',
        url: 'https://comic.pixiv.net/viewer/stories/247033',
        date: '2026-09-04T03:00:00.000Z',
      },
    ]);
    expect(calls).toHaveLength(2);
    expect(calls.map((call) => call.url)).toEqual([
      'https://comic.pixiv.net/api/app/works/v5/8789',
      'https://comic.pixiv.net/api/app/works/8789/episodes/v2',
    ]);
    for (const call of calls) {
      expect(call.headers.get('origin')).toBe('https://comic.pixiv.net');
      expect(call.headers.get('referer')).toBe('https://comic.pixiv.net/works/8789');
      expect(call.headers.get('x-requested-with')).toBe('XMLHttpRequest');
    }
  });

  it('rejects invalid Pixiv Comic work IDs without making a request', async () => {
    let requestCount = 0;
    vi.stubGlobal('fetch', async () => {
      requestCount += 1;
      return new Response('{}');
    });

    const result = await pixivComicProvider.fetchFeed('8789/../../private');

    expect(Result.isFailure(result)).toBe(true);
    expect(requestCount).toBe(0);
  });
});
