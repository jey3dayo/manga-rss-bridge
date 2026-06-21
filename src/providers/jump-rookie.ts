import { fetchText } from '../lib/http.ts';
import { absoluteUrl, extractMetaContent, stripTags, uniqueByUrl } from '../lib/html.ts';
import { tryCatch } from '../lib/result.ts';
import type { FeedItem, MangaFeed, Provider } from '../types/feed.ts';

const extractEpisodeBlocks = (html: string): string[] => {
  const starts = [...html.matchAll(/<li[^>]+class=["'][^"']*episode-wrapper[^"']*["'][^>]*>/g)].flatMap(
    (match) => (match.index === undefined ? [] : [match.index]),
  );
  return starts.map((start, index) => html.slice(start, starts[index + 1] ?? html.length));
};

const parseItems = (html: string, baseUrl: string, seriesId: string): FeedItem[] =>
  uniqueByUrl(
    extractEpisodeBlocks(html).flatMap((block) => {
      const match = /<a[^>]+class=["'][^"']*episode-content[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/i.exec(
        block,
      );
      const href = match?.[1];
      if (!href || !href.includes(`/series/${seriesId}/`)) return [];
      const url = absoluteUrl(href, baseUrl);
      const title =
        /<span[^>]+class=["'][^"']*episode-title[^"']*["'][^>]*>([\s\S]*?)<\/span>/i.exec(block)?.[1] ??
        stripTags(block);
      const thumbnail = /<img[^>]+src=["']([^"']+)["'][^>]*>/i.exec(block)?.[1];
      return {
        id: new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? url,
        title: stripTags(title),
        url,
        ...(thumbnail ? { thumbnail: absoluteUrl(thumbnail, baseUrl) } : {}),
      };
    }),
  );

export const jumpRookieProvider: Provider = {
  id: 'jump-rookie',
  siteName: 'ジャンプルーキー！',
  fetchFeed(seriesId: string) {
    return tryCatch(async (): Promise<MangaFeed> => {
      const link = `https://rookie.shonenjump.com/series/${encodeURIComponent(seriesId)}`;
      const html = await fetchText(link);
      return {
        title: extractMetaContent(html, 'og:title') ?? `ジャンプルーキー ${seriesId}`,
        link,
        description: extractMetaContent(html, 'description') ?? '',
        items: parseItems(html, link, seriesId),
      };
    });
  },
};
