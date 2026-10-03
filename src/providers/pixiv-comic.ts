import { BROWSER_USER_AGENT, HTTP_HEADERS } from '../constants/http.ts';
import { PROVIDERS } from '../constants/providers.ts';
import { fetchJson } from '../lib/http.ts';
import { tryCatch } from '../lib/result.ts';
import {
  pixivComicEpisodesResponseSchema,
  pixivComicWorkResponseSchema,
} from '../schemas/pixiv-comic.ts';
import type { MangaFeed, Provider } from '../types/feed.ts';

const workIdPattern = /^[1-9]\d*$/;

export const pixivComicProvider: Provider = {
  id: PROVIDERS.pixivComic.id,
  siteName: PROVIDERS.pixivComic.siteName,
  fetchFeed(identifier: string) {
    return tryCatch(async (): Promise<MangaFeed> => {
      const workId = identifier.trim();
      if (!workIdPattern.test(workId)) {
        throw new Error(`Invalid Pixiv Comic work ID: ${identifier}`);
      }

      const workUrl = `${PROVIDERS.pixivComic.baseUrl}/api/app/works/v5/${workId}`;
      const episodesUrl = `${PROVIDERS.pixivComic.baseUrl}/api/app/works/${workId}/episodes/v2`;
      const headers = {
        [HTTP_HEADERS.userAgent]: BROWSER_USER_AGENT,
        [HTTP_HEADERS.origin]: PROVIDERS.pixivComic.baseUrl,
        [HTTP_HEADERS.referer]: `${PROVIDERS.pixivComic.baseUrl}/works/${workId}`,
        [HTTP_HEADERS.xRequestedWith]: 'XMLHttpRequest',
      };
      const [workResponse, episodesResponse] = await Promise.all([
        fetchJson(workUrl, pixivComicWorkResponseSchema, { headers }),
        fetchJson(episodesUrl, pixivComicEpisodesResponseSchema, { headers }),
      ]);

      const work = workResponse.data.official_work;
      const items = episodesResponse.data.episodes.flatMap(({ state, episode }) => {
        if (state !== 'readable' || !episode || !episode.read_start_at) return [];

        const episodeId = String(episode.id);
        const expectedViewerPath = `/viewer/stories/${episodeId}`;
        if (episode.viewer_path !== expectedViewerPath) return [];

        const title = [episode.numbering_title, episode.sub_title]
          .map((part) => part?.trim())
          .filter((part): part is string => Boolean(part))
          .join(' ');
        if (!title) return [];

        const publishedAt = new Date(episode.read_start_at);
        if (Number.isNaN(publishedAt.valueOf())) return [];

        return [
          {
            id: episodeId,
            title,
            url: `${PROVIDERS.pixivComic.baseUrl}${expectedViewerPath}`,
            date: publishedAt.toISOString(),
          },
        ];
      });

      return {
        title: work.name,
        link: `${PROVIDERS.pixivComic.baseUrl}/works/${workId}`,
        description: work.author ?? '',
        items,
      };
    });
  },
};
