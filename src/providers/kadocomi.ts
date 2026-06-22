import { PROVIDERS } from '../constants/providers.ts';
import { fallbackFeedTitle } from '../lib/feed-title.ts';
import { fetchJson } from '../lib/http.ts';
import { tryCatch } from '../lib/result.ts';
import { kadocomiWorkResponseSchema, type KadocomiWorkResponse } from '../schemas/kadocomi.ts';
import type { MangaFeed, Provider } from '../types/feed.ts';

type KadocomiEpisode = NonNullable<
  NonNullable<KadocomiWorkResponse['firstEpisodes']>['result']
>[number];

const hasEpisodeCode = (episode: KadocomiEpisode): episode is KadocomiEpisode & { code: string } =>
  typeof episode.code === 'string' && episode.code.trim().length > 0;

export const kadocomiProvider: Provider = {
  id: PROVIDERS.kadocomi.id,
  siteName: PROVIDERS.kadocomi.siteName,
  fetchFeed(workCode: string) {
    return tryCatch(async (): Promise<MangaFeed> => {
      const apiUrl = `${PROVIDERS.kadocomi.baseUrl}/api/contents/details/work?workCode=${encodeURIComponent(workCode)}`;
      const data = await fetchJson(apiUrl, kadocomiWorkResponseSchema);
      const title = data.work?.title ?? fallbackFeedTitle(PROVIDERS.kadocomi.siteName, workCode);
      const description = data.work?.catchphrase ?? data.work?.description ?? '';
      const items = (data.firstEpisodes?.result ?? [])
        .filter((episode) => episode.isActive !== false)
        .filter(hasEpisodeCode)
        .sort((a, b) => (a.internal?.episodeNo ?? 0) - (b.internal?.episodeNo ?? 0))
        .map((episode) => {
          const episodeCode = episode.code.trim();
          const subTitle = episode.subTitle?.trim();
          return {
            id: episodeCode,
            title: [episode.title ?? `episode ${episodeCode}`, subTitle].filter(Boolean).join(' '),
            url: `${PROVIDERS.kadocomi.baseUrl}/detail/${encodeURIComponent(workCode)}/episodes/${encodeURIComponent(episodeCode)}?episodeType=latest`,
            ...(episode.updateDate ? { date: episode.updateDate } : {}),
            ...(episode.thumbnail ? { thumbnail: episode.thumbnail } : {}),
          };
        });
      return {
        title,
        link: `${PROVIDERS.kadocomi.baseUrl}/detail/${encodeURIComponent(workCode)}?episodeType=latest`,
        description,
        items,
      };
    });
  },
};
