import {
  ACCEPT_LANGUAGES,
  BROWSER_USER_AGENT,
  HTTP_HEADERS,
  MIME_TYPES,
} from '../constants/http.ts';
import { PROVIDERS } from '../constants/providers.ts';
import { fetchText } from '../lib/http.ts';
import { Result } from '../lib/result.ts';
import { parseNextData } from '../schemas/parse.ts';
import type { MangaFeed } from '../types/feed.ts';
import { coronaExNextDataSchema, type CoronaExComic } from '../schemas/corona-ex.ts';
import { createProvider } from './create-provider.ts';

const browserHeaders = {
  [HTTP_HEADERS.accept]: MIME_TYPES.browserHtml,
  [HTTP_HEADERS.acceptLanguage]: ACCEPT_LANGUAGES.japaneseBrowser,
  [HTTP_HEADERS.referer]: `${PROVIDERS.coronaEx.baseUrl}/`,
  [HTTP_HEADERS.userAgent]: BROWSER_USER_AGENT,
};

const comicIdPattern = /^[1-9]\d*$/;

const toFeed = (comic: CoronaExComic, comicId: string, link: string): Result<MangaFeed, Error> => {
  if (String(comic.id) !== comicId) {
    return Result.fail(
      new Error(`corona-ex comic id mismatch: expected ${comicId}, got ${String(comic.id)}`),
    );
  }
  const episode = comic.latest_episode;
  const publishedAt = new Date(episode.published_at);
  if (Number.isNaN(publishedAt.valueOf())) {
    return Result.fail(
      new Error(`corona-ex latest episode published_at is invalid: ${episode.published_at}`),
    );
  }
  return Result.succeed({
    title: comic.title,
    link,
    description: comic.description ?? '',
    items: [
      {
        id: String(episode.id),
        title: episode.title,
        url: `${PROVIDERS.coronaEx.baseUrl}/episodes/${encodeURIComponent(String(episode.id))}`,
        date: episode.published_at,
      },
    ],
  });
};

export const coronaExProvider = createProvider(PROVIDERS.coronaEx, async (identifier) => {
  const comicId = identifier.trim();
  if (!comicIdPattern.test(comicId)) {
    return Result.fail(new Error(`Invalid Corona EX comic ID: ${identifier}`));
  }
  const link = `${PROVIDERS.coronaEx.baseUrl}/comics/${encodeURIComponent(comicId)}`;
  return Result.pipe(
    fetchText(link, { headers: browserHeaders }),
    Result.andThen((html) => parseNextData(coronaExNextDataSchema, html, 'corona-ex')),
    Result.andThen((nextData) =>
      toFeed(nextData.props.pageProps.fallbackData.comic, comicId, link),
    ),
  );
});
