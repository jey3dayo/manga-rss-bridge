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
  const siteWrappedTitle = new RegExp(`^${escapeRegExp(provider.siteName)}（(.+)）$`).exec(title);
  return siteWrappedTitle?.[1]?.trim() || title || fallbackFeedTitle(provider, identifier);
};

export const titleBeforeSeparator = (
  html: string,
  provider: ProviderMetadata,
  identifier: string,
): string => {
  const fallback = fallbackFeedTitle(provider, identifier);
  return (
    (extractMetaContent(html, 'og:title') ?? extractTitle(html) ?? fallback)
      .split(/[｜|]/)[0]
      ?.trim() ?? fallback
  );
};
