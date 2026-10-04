import { PROVIDERS } from '../constants/providers.ts';
import { fallbackFeedTitle } from '../lib/feed-title.ts';
import { fetchJson, fetchText } from '../lib/http.ts';
import { Result, type ResultAsync, toError } from '../lib/result.ts';
import {
  ganganEmbeddedTitleSchema,
  ganganNextDataSchema,
  ganganTitleDataSchema,
  type GanganNextData,
  type GanganTitle,
} from '../schemas/gangan-online.ts';
import { parseSchema } from '../schemas/parse.ts';
import type { FeedItem } from '../types/feed.ts';
import { createProvider } from './create-provider.ts';

const extractNextData = (html: string): Result<GanganNextData, Error> => {
  const match = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s.exec(html);
  if (!match?.[1]) return Result.fail(new Error('__NEXT_DATA__ not found'));
  const json = match[1];
  return Result.pipe(
    Result.try({ try: (): unknown => JSON.parse(json), catch: toError }),
    Result.andThen((data) => parseSchema(ganganNextDataSchema, data)),
  );
};

const fetchTitle = (pageUrl: string, encodedTitleId: string): ResultAsync<GanganTitle, Error> =>
  Result.pipe(
    fetchText(pageUrl),
    Result.andThen(extractNextData),
    Result.andThen(async (nextData) => {
      if (nextData.buildId) {
        const dataUrl = `${PROVIDERS.ganganOnline.baseUrl}/_next/data/${nextData.buildId}/title/${encodedTitleId}.json`;
        return Result.pipe(
          fetchJson(dataUrl, ganganTitleDataSchema),
          Result.map((data) => data.pageProps.data.default),
        );
      }
      return Result.pipe(
        parseSchema(ganganEmbeddedTitleSchema, nextData),
        Result.map((data) => data.props.pageProps.data.default),
      );
    }),
  );

const parseItems = Result.fn({
  try: (title: GanganTitle, link: string): FeedItem[] =>
    (title.chapters ?? [])
      .filter((chapter) => chapter.id !== undefined)
      .flatMap((chapter) => {
        const chapterId = String(chapter.id).trim();
        if (!chapterId) return [];
        return {
          id: chapterId,
          title: chapter.mainText ?? `chapter ${chapterId}`,
          url: `${link}/chapter/${encodeURIComponent(chapterId)}`,
        };
      }),
  catch: toError,
});

export const ganganOnlineProvider = createProvider(PROVIDERS.ganganOnline, async (titleId) =>
  Result.pipe(
    Result.try({
      try: () => {
        const encodedTitleId = encodeURIComponent(titleId);
        return {
          encodedTitleId,
          link: `${PROVIDERS.ganganOnline.baseUrl}/title/${encodedTitleId}`,
        };
      },
      catch: toError,
    }),
    Result.bind('title', ({ link, encodedTitleId }) => fetchTitle(link, encodedTitleId)),
    Result.bind('items', ({ title, link }) => parseItems(title, link)),
    Result.map(({ title, link, items }) => ({
      title: title.titleName ?? fallbackFeedTitle(PROVIDERS.ganganOnline.siteName, titleId),
      link,
      description: [title.author, title.description ?? ''].filter(Boolean).join('\n'),
      items,
    })),
  ),
);
