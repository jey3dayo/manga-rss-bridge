import { PROVIDERS } from '../constants/providers.ts';
import { titleBeforeSeparator } from '../lib/feed-title.ts';
import { fetchText } from '../lib/http.ts';
import {
  absoluteUrl,
  extractBlocksByClass,
  extractMetaContent,
  stripTags,
  uniqueByUrl,
} from '../lib/html.ts';
import { Result, toError } from '../lib/result.ts';
import type { FeedItem } from '../types/feed.ts';
import { createProvider } from './create-provider.ts';

const fragmentId = (value: string): string =>
  `episode-${value.replaceAll(/[^\p{L}\p{N}]+/gu, '-').replaceAll(/^-|-$/g, '')}`;

const parseItems = Result.fn({
  try: (html: string, link: string): FeedItem[] =>
    uniqueByUrl(
      extractBlocksByClass(html, 'episode__grid').map((block, index) => {
        const number = stripTags(
          /<div[^>]+class=["'][^"']*episode__num[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(
            block,
          )?.[1] ?? `episode ${index + 1}`,
        );
        const title = stripTags(
          /<div[^>]+class=["'][^"']*episode__title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(
            block,
          )?.[1] ?? '',
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
    ),
  catch: toError,
});

export const gaugauProvider = createProvider(PROVIDERS.gaugau, async (workId) =>
  Result.pipe(
    Result.try({
      try: () => ({
        link: `${PROVIDERS.gaugau.baseUrl}/list/work/${encodeURIComponent(workId)}/episodes`,
      }),
      catch: toError,
    }),
    Result.bind('html', ({ link }) => fetchText(link)),
    Result.bind('items', ({ html, link }) => parseItems(html, link)),
    Result.map(({ html, link, items }) => ({
      title: titleBeforeSeparator(html, PROVIDERS.gaugau.siteName, workId),
      link,
      description: extractMetaContent(html, 'description') ?? '',
      items,
    })),
  ),
);
