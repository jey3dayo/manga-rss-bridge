import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Result } from '../lib/result.ts';
import { yanmagaProvider } from './yanmaga.ts';

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
});
