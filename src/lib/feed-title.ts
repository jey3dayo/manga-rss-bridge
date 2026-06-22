import { extractMetaContent, extractTitle } from './html.ts';

export const fallbackFeedTitle = (siteName: string, identifier: string): string =>
  `${siteName} ${identifier}`;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const normalizeSiteWrappedTitle = (
  title: string,
  siteName: string,
  identifier: string,
): string => {
  const siteWrappedTitle = new RegExp(`^${escapeRegExp(siteName)}（(.+)）$`).exec(title);
  return siteWrappedTitle?.[1]?.trim() || title || fallbackFeedTitle(siteName, identifier);
};

export const titleBeforeSeparator = (
  html: string,
  siteName: string,
  identifier: string,
): string => {
  const fallback = fallbackFeedTitle(siteName, identifier);
  return (
    (extractMetaContent(html, 'og:title') ?? extractTitle(html) ?? fallback)
      .split(/[｜|]/)[0]
      ?.trim() ?? fallback
  );
};
