import { PROVIDERS } from '../constants/providers.ts';
import { fallbackFeedTitle } from '../lib/feed-title.ts';
import { fetchJson, fetchText } from '../lib/http.ts';
import { Result, type ResultAsync, toError } from '../lib/result.ts';
import {
  ganganEmbeddedTitleSchema,
  ganganNextDataSchema,
  ganganTitleDataSchema,
  type GanganTitle,
} from '../schemas/gangan-online.ts';
import { parseNextData, parseSchema } from '../schemas/parse.ts';
import type { FeedItem } from '../types/feed.ts';
import { createProvider } from './create-provider.ts';

const fetchTitle = (pageUrl: string, encodedTitleId: string): ResultAsync<GanganTitle, Error> =>
  Result.pipe(
    fetchText(pageUrl),
    Result.andThen((html) => parseNextData(ganganNextDataSchema, html, 'gangan-online')),
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

const isNextUpdateNotice = (mainText: string | undefined): boolean =>
  mainText?.startsWith('次回更新') ?? false;

const parseItems = Result.fn({
  try: (title: GanganTitle, link: string): FeedItem[] =>
    (title.chapters ?? [])
      .filter((chapter) => chapter.id !== undefined)
      .filter((chapter) => !isNextUpdateNotice(chapter.mainText))
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
