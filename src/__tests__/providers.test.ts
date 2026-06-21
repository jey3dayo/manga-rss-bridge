import { afterEach, describe, expect, it, vi } from 'vitest';
import { Result } from '../lib/result.ts';
import { ganganOnlineProvider } from '../providers/gangan-online.ts';
import { kadocomiProvider } from '../providers/kadocomi.ts';

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
});
