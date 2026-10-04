import { PROVIDERS } from '../constants/providers.ts';
import { fallbackFeedTitle } from '../lib/feed-title.ts';
import { fetchJson } from '../lib/http.ts';
import { Result, toError } from '../lib/result.ts';
import {
  kadocomiWorkResponseSchema,
  type KadocomiEpisode,
  type KadocomiWorkResponse,
} from '../schemas/kadocomi.ts';
import type { FeedItem } from '../types/feed.ts';
import { createProvider } from './create-provider.ts';

const hasEpisodeCode = (episode: KadocomiEpisode): episode is KadocomiEpisode & { code: string } =>
  typeof episode.code === 'string' && episode.code.trim().length > 0;

const parseItems = Result.fn({
  try: (data: KadocomiWorkResponse, workUrl: string): FeedItem[] =>
    (data.firstEpisodes?.result ?? [])
      .filter((episode) => episode.isActive !== false)
      .filter(hasEpisodeCode)
      .sort((a, b) => (a.internal?.episodeNo ?? 0) - (b.internal?.episodeNo ?? 0))
      .map((episode) => {
        const episodeCode = episode.code.trim();
        const subTitle = episode.subTitle?.trim();
        return {
          id: episodeCode,
          title: [episode.title ?? `episode ${episodeCode}`, subTitle].filter(Boolean).join(' '),
          url: `${workUrl}/episodes/${encodeURIComponent(episodeCode)}?episodeType=latest`,
          ...(episode.updateDate ? { date: episode.updateDate } : {}),
          ...(episode.thumbnail ? { thumbnail: episode.thumbnail } : {}),
        };
      }),
  catch: toError,
});

export const kadocomiProvider = createProvider(PROVIDERS.kadocomi, async (workCode) =>
  Result.pipe(
    Result.try({
      try: () => {
        const encodedWorkCode = encodeURIComponent(workCode);
        return {
          apiUrl: `${PROVIDERS.kadocomi.baseUrl}/api/contents/details/work?workCode=${encodedWorkCode}`,
          workUrl: `${PROVIDERS.kadocomi.baseUrl}/detail/${encodedWorkCode}`,
        };
      },
      catch: toError,
    }),
    Result.bind('data', ({ apiUrl }) => fetchJson(apiUrl, kadocomiWorkResponseSchema)),
    Result.bind('items', ({ data, workUrl }) => parseItems(data, workUrl)),
    Result.map(({ data, workUrl, items }) => ({
      title: data.work?.title ?? fallbackFeedTitle(PROVIDERS.kadocomi.siteName, workCode),
      link: `${workUrl}?episodeType=latest`,
      description: data.work?.catchphrase ?? data.work?.description ?? '',
      items,
    })),
  ),
);
