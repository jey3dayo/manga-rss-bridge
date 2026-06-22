import type { ProviderMetadata } from '../schemas/provider.ts';
import { extractMetaContent, extractTitle } from './html.ts';

export const fallbackFeedTitle = (provider: ProviderMetadata, identifier: string): string =>
  `${provider.siteName} ${identifier}`;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const normalizeSiteWrappedTitle = (
  title: string,
  provider: ProviderMetadata,
  identifier: string,
): string => {
  const trimmedTitle = title.trim();
  const siteWrappedTitle = new RegExp(`^${escapeRegExp(provider.siteName)}（(.*)）$`).exec(
    trimmedTitle,
  );
  if (siteWrappedTitle) {
    return siteWrappedTitle[1]?.trim() || fallbackFeedTitle(provider, identifier);
  }
  return trimmedTitle || fallbackFeedTitle(provider, identifier);
};

export const titleBeforeSeparator = (
  html: string,
  provider: ProviderMetadata,
  identifier: string,
): string => {
  const fallback = fallbackFeedTitle(provider, identifier);
  const title = (extractMetaContent(html, 'og:title') ?? extractTitle(html) ?? fallback)
    .split(/[｜|]/)[0]
    ?.trim();
  return title || fallback;
};
