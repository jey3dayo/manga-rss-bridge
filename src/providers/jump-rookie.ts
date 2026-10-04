import { PROVIDERS } from '../constants/providers.ts';
import { fallbackFeedTitle } from '../lib/feed-title.ts';
import { fetchText } from '../lib/http.ts';
import { absoluteUrl, extractMetaContent, stripTags, uniqueByUrl } from '../lib/html.ts';
import { Result, toError } from '../lib/result.ts';
import type { FeedItem } from '../types/feed.ts';
import { createProvider } from './create-provider.ts';

const extractEpisodeBlocks = (html: string): string[] => {
  const starts = [
    ...html.matchAll(/<li[^>]+class=["'][^"']*episode-wrapper[^"']*["'][^>]*>/g),
  ].flatMap((match) => (match.index === undefined ? [] : [match.index]));
  return starts.map((start, index) => html.slice(start, starts[index + 1] ?? html.length));
};

const parseItems = Result.fn({
  try: (html: string, baseUrl: string, seriesId: string): FeedItem[] =>
    uniqueByUrl(
      extractEpisodeBlocks(html).flatMap((block) => {
        const match =
          /<a[^>]+class=["'][^"']*episode-content[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/i.exec(
            block,
          );
        const href = match?.[1];
        if (!href?.includes(`/series/${seriesId}/`)) return [];
        const url = absoluteUrl(href, baseUrl);
        const title =
          /<span[^>]+class=["'][^"']*episode-title[^"']*["'][^>]*>([\s\S]*?)<\/span>/i.exec(
            block,
          )?.[1] ?? stripTags(block);
        const thumbnail = /<img[^>]+src=["']([^"']+)["'][^>]*>/i.exec(block)?.[1];
        return {
          id: new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? url,
          title: stripTags(title),
          url,
          ...(thumbnail ? { thumbnail: absoluteUrl(thumbnail, baseUrl) } : {}),
        };
      }),
    ),
  catch: toError,
});

export const jumpRookieProvider = createProvider(PROVIDERS.jumpRookie, async (seriesId) =>
  Result.pipe(
    Result.try({
      try: () => ({
        link: `${PROVIDERS.jumpRookie.baseUrl}/series/${encodeURIComponent(seriesId)}`,
      }),
      catch: toError,
    }),
    Result.bind('html', ({ link }) => fetchText(link)),
    Result.bind('items', ({ html, link }) => parseItems(html, link, seriesId)),
    Result.map(({ html, link, items }) => ({
      title:
        extractMetaContent(html, 'og:title') ??
        fallbackFeedTitle(PROVIDERS.jumpRookie.siteName, seriesId),
      link,
      description: extractMetaContent(html, 'description') ?? '',
      items,
    })),
  ),
);
