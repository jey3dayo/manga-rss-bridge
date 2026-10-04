import { BROWSER_USER_AGENT, HTTP_HEADERS } from '../constants/http.ts';
import { PROVIDERS } from '../constants/providers.ts';
import { fetchJson } from '../lib/http.ts';
import { Result, type ResultAsync, toError } from '../lib/result.ts';
import {
  pixivComicEpisodesResponseSchema,
  pixivComicWorkResponseSchema,
  type PixivComicEpisodesResponse,
  type PixivComicWorkResponse,
} from '../schemas/pixiv-comic.ts';
import { createProvider } from './create-provider.ts';

const workIdPattern = /^[1-9]\d*$/;

type PixivMetadata = {
  workResponse: PixivComicWorkResponse;
  episodesResponse: PixivComicEpisodesResponse;
};

const fetchMetadata = (workId: string): ResultAsync<PixivMetadata, Error> => {
  const workUrl = `${PROVIDERS.pixivComic.baseUrl}/api/app/works/v5/${workId}`;
  const episodesUrl = `${PROVIDERS.pixivComic.baseUrl}/api/app/works/${workId}/episodes/v2`;
  const headers = {
    [HTTP_HEADERS.userAgent]: BROWSER_USER_AGENT,
    [HTTP_HEADERS.origin]: PROVIDERS.pixivComic.baseUrl,
    [HTTP_HEADERS.referer]: `${PROVIDERS.pixivComic.baseUrl}/works/${workId}`,
    [HTTP_HEADERS.xRequestedWith]: 'XMLHttpRequest',
  };
  const requests = {
    workResponse: fetchJson(workUrl, pixivComicWorkResponseSchema, { headers }),
    episodesResponse: fetchJson(episodesUrl, pixivComicEpisodesResponseSchema, { headers }),
  };
  return new Promise((resolve) => {
    const fail = (error: unknown) => resolve(Result.fail(toError(error)));
    // sequence awaits in key order; either concurrent request must still fail fast.
    for (const request of Object.values(requests)) {
      request.then((result) => {
        if (Result.isFailure(result)) resolve(result);
      }, fail);
    }
    Result.sequence(requests).then(resolve, fail);
  });
};

export const pixivComicProvider = createProvider(PROVIDERS.pixivComic, async (identifier) => {
  const workId = identifier.trim();
  if (!workIdPattern.test(workId)) {
    return Result.fail(new Error(`Invalid Pixiv Comic work ID: ${identifier}`));
  }
  return Result.pipe(
    fetchMetadata(workId),
    Result.map(({ workResponse, episodesResponse }) => {
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
    }),
  );
});
