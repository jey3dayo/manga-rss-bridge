import { fetchJson } from '../lib/http.js';
import { tryCatch } from '../lib/result.js';
import { kadocomiWorkResponseSchema, type KadocomiWorkResponse } from '../schemas/kadocomi.js';
import type { MangaFeed, Provider } from '../types/feed.js';

type KadocomiEpisode = NonNullable<
  NonNullable<KadocomiWorkResponse['firstEpisodes']>['result']
>[number];

const hasEpisodeCode = (episode: KadocomiEpisode): episode is KadocomiEpisode & { code: string } =>
  typeof episode.code === 'string';

export const kadocomiProvider: Provider = {
  id: 'kadocomi',
  siteName: 'カドコミ',
  fetchFeed(workCode: string) {
    return tryCatch(async (): Promise<MangaFeed> => {
      const apiUrl = `https://comic-walker.com/api/contents/details/work?workCode=${encodeURIComponent(workCode)}`;
      const data = await fetchJson(apiUrl, kadocomiWorkResponseSchema);
      const title = data.work?.title ?? `カドコミ ${workCode}`;
      const description = data.work?.catchphrase ?? data.work?.description ?? '';
      const items = (data.firstEpisodes?.result ?? [])
        .filter((episode) => episode.isActive !== false)
        .filter(hasEpisodeCode)
        .sort((a, b) => (a.internal?.episodeNo ?? 0) - (b.internal?.episodeNo ?? 0))
        .map((episode) => {
          const episodeCode = episode.code;
          const subTitle = episode.subTitle?.trim();
          return {
            id: episodeCode,
            title: [episode.title ?? `episode ${episodeCode}`, subTitle].filter(Boolean).join(' '),
            url: `https://comic-walker.com/detail/${encodeURIComponent(workCode)}/episodes/${encodeURIComponent(episodeCode)}?episodeType=latest`,
            ...(episode.updateDate ? { date: episode.updateDate } : {}),
            ...(episode.thumbnail ? { thumbnail: episode.thumbnail } : {}),
          };
        });
      return {
        title,
        link: `https://comic-walker.com/detail/${encodeURIComponent(workCode)}?episodeType=latest`,
        description,
        items,
      };
    });
  },
};
