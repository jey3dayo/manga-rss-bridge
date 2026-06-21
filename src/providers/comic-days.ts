import { fetchText } from '../lib/http.ts';
import { tryCatch } from '../lib/result.ts';
import type { MangaFeed, Provider } from '../types/feed.ts';

const decodeXml = (value: string): string =>
  value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');

const extractTag = (xml: string, tagName: string): string | undefined => {
  const match = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`).exec(xml);
  return match?.[1] ? decodeXml(match[1].trim()) : undefined;
};

const extractAttribute = (xml: string, tagName: string, attributeName: string): string | undefined => {
  const tagMatch = new RegExp(`<${tagName}\\s+([^>]*)/?>`).exec(xml);
  if (!tagMatch?.[1]) return undefined;
  const attributeMatch = new RegExp(`${attributeName}="([^"]*)"`).exec(tagMatch[1]);
  return attributeMatch?.[1] ? decodeXml(attributeMatch[1].trim()) : undefined;
};

const normalizeTitle = (title: string, seriesId: string): string => {
  const comicDaysTitle = /^コミックDAYS（(.+)）$/.exec(title);
  return comicDaysTitle?.[1]?.trim() || title || `コミックDAYS ${seriesId}`;
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
  id: 'comic-days',
  siteName: 'コミックDAYS',
  fetchFeed(seriesId: string) {
    return tryCatch(async (): Promise<MangaFeed> => {
      const rssUrl = `https://comic-days.com/rss/series/${encodeURIComponent(seriesId)}`;
      const xml = await fetchText(rssUrl, {
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml',
        },
      });
      const title = normalizeTitle(extractTag(xml, 'title') ?? '', seriesId);
      const description = extractTag(xml, 'description') ?? '';
      const link = extractTag(xml, 'link') ?? `https://comic-days.com/series/${encodeURIComponent(seriesId)}`;
      return {
        title,
        link,
        description,
        items: extractItems(xml),
      };
    });
  },
};
