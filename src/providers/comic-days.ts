import { HTTP_HEADERS, MIME_TYPES } from '../constants/http.ts';
import { PROVIDERS } from '../constants/providers.ts';
import { normalizeSiteWrappedTitle } from '../lib/feed-title.ts';
import { fetchText } from '../lib/http.ts';
import { decodeHtml } from '../lib/html.ts';
import { tryCatch } from '../lib/result.ts';
import type { MangaFeed, Provider } from '../types/feed.ts';

const extractTag = (xml: string, tagName: string): string | undefined => {
  const match = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`).exec(xml);
  return match?.[1] ? decodeHtml(match[1].trim()) : undefined;
};

const extractAttribute = (
  xml: string,
  tagName: string,
  attributeName: string,
): string | undefined => {
  const tagMatch = new RegExp(`<${tagName}\\s+([^>]*)/?>`).exec(xml);
  if (!tagMatch?.[1]) return undefined;
  const attributeMatch = new RegExp(`${attributeName}="([^"]*)"`).exec(tagMatch[1]);
  return attributeMatch?.[1] ? decodeHtml(attributeMatch[1].trim()) : undefined;
};

const extractItems = (xml: string): MangaFeed['items'] => {
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  return [...itemMatches].flatMap((match) => {
    const itemXml = match[1];
    if (!itemXml) return [];
    const title = extractTag(itemXml, 'title');
    const url = extractTag(itemXml, 'link');
    if (!title || !url) return [];
    const guid = extractTag(itemXml, 'guid');
    const id = guid?.split(':').at(-1)?.trim() || url.split('/').at(-1)?.trim();
    if (!id) return [];
    const date = extractTag(itemXml, 'pubDate');
    const thumbnail = extractAttribute(itemXml, 'enclosure', 'url');
    return {
      id,
      title,
      url,
      ...(date ? { date } : {}),
      ...(thumbnail ? { thumbnail } : {}),
    };
  });
};

export const comicDaysProvider: Provider = {
  id: PROVIDERS.comicDays.id,
  siteName: PROVIDERS.comicDays.siteName,
  fetchFeed(seriesId: string) {
    return tryCatch(async (): Promise<MangaFeed> => {
      const rssUrl = `${PROVIDERS.comicDays.baseUrl}/rss/series/${encodeURIComponent(seriesId)}`;
      const xml = await fetchText(rssUrl, {
        headers: {
          [HTTP_HEADERS.accept]: MIME_TYPES.rssXmlList,
        },
      });
      const title = normalizeSiteWrappedTitle(
        extractTag(xml, 'title') ?? '',
        PROVIDERS.comicDays.siteName,
        seriesId,
      );
      const description = extractTag(xml, 'description') ?? '';
      const link =
        extractTag(xml, 'link') ??
        `${PROVIDERS.comicDays.baseUrl}/series/${encodeURIComponent(seriesId)}`;
      return {
        title,
        link,
        description,
        items: extractItems(xml),
      };
    });
  },
};
