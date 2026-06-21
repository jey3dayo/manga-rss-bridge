import type { FeedItem, MangaFeed } from '../types/feed.ts';

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const formatDate = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const formatDateParts = (year: string, month: string, day: string): string | undefined => {
    const yearNumber = Number(year);
    const monthNumber = Number(month);
    const dayNumber = Number(day);
    const parsed = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));
    if (
      parsed.getUTCFullYear() !== yearNumber ||
      parsed.getUTCMonth() !== monthNumber - 1 ||
      parsed.getUTCDate() !== dayNumber
    ) {
      return undefined;
    }
    return parsed.toUTCString();
  };
  const slash = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(value);
  if (slash?.[1] && slash[2] && slash[3]) {
    const [, year, month, day] = slash;
    return formatDateParts(year, month, day);
  }
  const japanese = /^(\d{4})年(\d{1,2})月(\d{1,2})日$/.exec(value);
  if (japanese?.[1] && japanese[2] && japanese[3]) {
    const [, year, month, day] = japanese;
    return formatDateParts(year, month, day);
  }
  const date = new Date(value);
  if (!Number.isNaN(date.valueOf())) return date.toUTCString();
  return undefined;
};

const renderItem = (
  feed: MangaFeed,
  providerId: string,
  identifier: string,
  item: FeedItem,
): string => {
  const descriptionText = item.thumbnail
    ? `<img src="${item.thumbnail}" alt=""/><br/>${feed.description}`
    : feed.description;
  const description = escapeXml(descriptionText);
  const pubDate = formatDate(item.date);
  return [
    '    <item>',
    `      <title>${escapeXml(`${feed.title} - ${item.title}`)}</title>`,
    `      <link>${escapeXml(item.url)}</link>`,
    `      <guid isPermaLink="false">${escapeXml(`${providerId}:${identifier}:${item.id}`)}</guid>`,
    `      <description>${description}</description>`,
    pubDate ? `      <pubDate>${pubDate}</pubDate>` : undefined,
    '    </item>',
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
};

export const renderRss = (
  feed: MangaFeed,
  providerId: string,
  identifier: string,
  siteName: string,
): string => {
  const items = feed.items.map((item) => renderItem(feed, providerId, identifier, item));
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${escapeXml(`${feed.title} - ${siteName}`)}</title>`,
    `    <link>${escapeXml(feed.link)}</link>`,
    `    <description>${escapeXml(feed.description)}</description>`,
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    ...items,
    '  </channel>',
    '</rss>',
  ].join('\n');
};
