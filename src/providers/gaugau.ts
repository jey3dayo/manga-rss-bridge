import { fetchText } from '../lib/http.ts';
import {
  absoluteUrl,
  extractBlocksByClass,
  extractMetaContent,
  stripTags,
  uniqueByUrl,
} from '../lib/html.ts';
import { tryCatch } from '../lib/result.ts';
import type { FeedItem, MangaFeed, Provider } from '../types/feed.ts';
import { titleBeforeSeparator } from './html-list.ts';

const fragmentId = (value: string): string =>
  `episode-${value.replaceAll(/[^\p{L}\p{N}]+/gu, '-').replaceAll(/^-|-$/g, '')}`;

const parseItems = (html: string, link: string): FeedItem[] =>
  uniqueByUrl(
    extractBlocksByClass(html, 'episode__grid').map((block, index) => {
      const number = stripTags(
        /<div[^>]+class=["'][^"']*episode__num[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(block)?.[1] ??
          `episode ${index + 1}`,
      );
      const title = stripTags(
        /<div[^>]+class=["'][^"']*episode__title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(block)?.[1] ?? '',
      );
      const date = /(\d{4}年\d{2}月\d{2}日|\d{4}[/-]\d{1,2}[/-]\d{1,2})/.exec(block)?.[1];
      const thumbnail = /<img[^>]+src=["']([^"']+)["'][^>]*>/i.exec(block)?.[1];
      const id = fragmentId([number, title].filter(Boolean).join('-')) || `episode-${index + 1}`;
      return {
        id,
        title: [number, title].filter(Boolean).join(' '),
        url: `${link}#${id}`,
        ...(date ? { date } : {}),
        ...(thumbnail ? { thumbnail: absoluteUrl(thumbnail, link) } : {}),
      };
    }),
  );

export const gaugauProvider: Provider = {
  id: 'gaugau',
  siteName: 'がうがうモンスター＋',
  fetchFeed(workId: string) {
    return tryCatch(async (): Promise<MangaFeed> => {
      const link = `https://gaugau.futabanet.jp/list/work/${encodeURIComponent(workId)}/episodes`;
      const html = await fetchText(link);
      return {
        title: titleBeforeSeparator(html, `がうがうモンスター＋ ${workId}`),
        link,
        description: extractMetaContent(html, 'description') ?? '',
        items: parseItems(html, link),
      };
    });
  },
};
