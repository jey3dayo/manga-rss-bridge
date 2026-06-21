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

type HtmlListProviderOptions = {
  id: string;
  siteName: string;
  url(identifier: string): string;
  itemClass: string;
  linkPattern: RegExp;
  titlePattern?: RegExp;
  datePattern?: RegExp;
  thumbnailPattern?: RegExp;
  feedTitle(html: string, identifier: string): string;
  cleanItemTitle?: (title: string) => string;
  init?: RequestInit;
};

const firstMatch = (html: string, pattern: RegExp): string | undefined => {
  const match = pattern.exec(html);
  const value = match ? match.slice(1).find((group) => group !== undefined) : undefined;
  return value ? stripTags(value) : undefined;
};

const firstAttr = (html: string, pattern: RegExp, base: string): string | undefined => {
  const match = pattern.exec(html);
  return match?.[1] ? absoluteUrl(match[1], base) : undefined;
};

const idFromUrl = (url: string): string => {
  const parsed = new URL(url);
  return parsed.pathname
    .split('/')
    .filter(Boolean)
    .at(-1)
    ?.replace(/\.html?$/, '') ?? url;
};

const parseItems = (html: string, baseUrl: string, options: HtmlListProviderOptions): FeedItem[] =>
  uniqueByUrl(
    extractBlocksByClass(html, options.itemClass).flatMap((block) => {
      const url = firstAttr(block, options.linkPattern, baseUrl);
      if (!url) return [];
      const title = options.titlePattern ? firstMatch(block, options.titlePattern) : stripTags(block);
      const rawTitle = title ?? '';
      const cleanTitle = options.cleanItemTitle?.(rawTitle) ?? rawTitle;
      const date = options.datePattern ? firstMatch(block, options.datePattern) : undefined;
      const thumbnail = options.thumbnailPattern
        ? firstAttr(block, options.thumbnailPattern, baseUrl)
        : undefined;
      return {
        id: idFromUrl(url),
        title: cleanTitle || rawTitle || idFromUrl(url),
        url,
        ...(date ? { date } : {}),
        ...(thumbnail ? { thumbnail } : {}),
      };
    }),
  );

export const createHtmlListProvider = (options: HtmlListProviderOptions): Provider => ({
  id: options.id,
  siteName: options.siteName,
  fetchFeed(identifier: string) {
    return tryCatch(async (): Promise<MangaFeed> => {
      const link = options.url(identifier);
      const html = await fetchText(link, options.init);
      const description = extractMetaContent(html, 'description') ?? '';
      return {
        title: options.feedTitle(html, identifier),
        link,
        description,
        items: parseItems(html, link, options),
      };
    });
  },
});

export const titleBeforeSeparator = (html: string, fallback: string): string =>
  (extractMetaContent(html, 'og:title') ?? extractTitle(html) ?? fallback).split(/[｜|]/)[0]?.trim() ??
  fallback;
