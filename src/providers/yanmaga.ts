import { fetchText } from '../lib/http.ts';
import {
  absoluteUrl,
  extractBlocksByClass,
  extractMetaContent,
  extractTitle,
  stripTags,
  uniqueByUrl,
} from '../lib/html.ts';
import { tryCatch } from '../lib/result.ts';
import type { FeedItem, MangaFeed, Provider } from '../types/feed.ts';

const parseEpisodeItems = (html: string, baseUrl: string): FeedItem[] =>
  uniqueByUrl(
    extractBlocksByClass(html, 'mod-episode').flatMap((block) => {
      const href = /<a[^>]+href=["']([^"']+)["'][^>]*>/i.exec(block)?.[1];
      if (!href) return [];
      const url = absoluteUrl(href, baseUrl);
      const title =
        /<p[^>]+class=["'][^"']*mod-episode-title[^"']*["'][^>]*>([\s\S]*?)<\/p>/i.exec(block)?.[1] ??
        /<h[0-9][^>]*>([\s\S]*?)<\/h[0-9]>/i.exec(block)?.[1];
      const date = /<time[^>]*class=["'][^"']*mod-episode-date[^"']*["'][^>]*>([\s\S]*?)<\/time>/i.exec(block)?.[1];
      const thumbnail = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/i.exec(block)?.[1];
      return {
        id: new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? url,
        title: title ? stripTags(title) : new URL(url).pathname,
        url,
        ...(date ? { date: stripTags(date) } : {}),
        ...(thumbnail ? { thumbnail: absoluteUrl(thumbnail, baseUrl) } : {}),
      };
    }),
  ).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

export const yanmagaProvider: Provider = {
  id: 'yanmaga',
  siteName: 'ヤンマガWeb',
  fetchFeed(identifier: string) {
    return tryCatch(async (): Promise<MangaFeed> => {
      const slug = identifier.replaceAll('_', '×');
      const link = `https://yanmaga.jp/comics/${encodeURIComponent(slug)}?sort=older`;
      const html = await fetchText(link);
      return {
        title:
          extractMetaContent(html, 'og:title')?.replace(/『|』|【無料公開中】|ヤンマガWeb/g, '').trim() ??
          extractTitle(html) ??
          identifier,
        link,
        description: extractMetaContent(html, 'description') ?? '',
        items: parseEpisodeItems(html, link),
      };
    });
  },
};
