import {
  ACCEPT_LANGUAGES,
  BROWSER_USER_AGENT,
  HTTP_HEADERS,
  MIME_TYPES,
} from '../constants/http.ts';
import { PROVIDERS } from '../constants/providers.ts';
import { fallbackFeedTitle } from '../lib/feed-title.ts';
import { fetchText } from '../lib/http.ts';
import { Result, toError } from '../lib/result.ts';
import {
  drecomiPlusDehydratedStateSchema,
  drecomiPlusEpisodesDataSchema,
  drecomiPlusSeriesDetailSchema,
  type DrecomiPlusDehydratedState,
  type DrecomiPlusEpisode,
  type DrecomiPlusSeriesDetail,
} from '../schemas/drecomi-plus.ts';
import { parseSchema } from '../schemas/parse.ts';
import type { FeedItem } from '../types/feed.ts';
import { createProvider } from './create-provider.ts';

const pushPattern = /self\.__next_f\.push\(\[1,\s*("(?:[^"\\]|\\.)*")\]/g;
const flightRowPattern = /^[0-9a-f]+:/i;

type DrecomiSeriesState = {
  detail?: DrecomiPlusSeriesDetail | undefined;
  episodes: DrecomiPlusEpisode[];
};

const decodePushStream = (html: string): string => {
  let stream = '';
  for (const match of html.matchAll(pushPattern)) {
    const literal = match[1];
    if (literal === undefined) continue;
    try {
      const decoded = JSON.parse(literal);
      if (typeof decoded === 'string') stream += decoded;
    } catch {}
  }
  return stream;
};

const decodeFlightEntries = (html: string): string[] => {
  const entries: string[] = [];
  for (const row of decodePushStream(html).split('\n')) {
    if (flightRowPattern.test(row) || entries.length === 0) entries.push(row);
    else entries[entries.length - 1] += row;
  }
  return entries;
};

const stateCandidates = (entry: string): unknown[] => {
  const payload = entry.indexOf(':');
  if (payload <= 0) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(entry.slice(payload + 1));
  } catch {
    return [];
  }
  if (Array.isArray(parsed)) {
    const props = parsed[3];
    return typeof props === 'object' && props !== null ? [parsed, props] : [parsed];
  }
  return [parsed];
};

const dehydratedStates = (entries: string[]): DrecomiPlusDehydratedState[] =>
  entries.flatMap((entry) =>
    stateCandidates(entry).flatMap((candidate) => {
      const parsed = parseSchema(drecomiPlusDehydratedStateSchema, candidate);
      return Result.isSuccess(parsed) ? [parsed.value] : [];
    }),
  );

type DehydratedQuery = { hash: string; data: unknown };

const joinQueryParts = (parts: unknown[]): string =>
  parts.filter((part): part is string => typeof part === 'string').join(' ');

const queryHashString = (query: {
  queryHash?: string | unknown[] | undefined;
  queryKey?: unknown[] | undefined;
}): string => {
  if (typeof query.queryHash === 'string') return query.queryHash;
  if (Array.isArray(query.queryHash)) {
    const joined = joinQueryParts(query.queryHash);
    if (joined) return joined;
  }
  return query.queryKey ? joinQueryParts(query.queryKey) : '';
};

const queryCandidates = (states: DrecomiPlusDehydratedState[]): DehydratedQuery[] =>
  states.flatMap((state) =>
    (state.state.queries ?? []).flatMap((query) => {
      const hash = queryHashString(query);
      const data = query.state?.data;
      if (!hash || data === undefined) return [];
      return [{ hash, data }];
    }),
  );

const isSeriesDetailHash = (hash: string): boolean =>
  hash.includes('detail') &&
  !hash.includes('episodes') &&
  !hash.includes('volumes') &&
  !hash.includes('pickup');

const findSeriesState = (html: string, seriesCode: string): Result<DrecomiSeriesState, Error> => {
  let detail: DrecomiPlusSeriesDetail | undefined;
  const episodes = new Map<string, DrecomiPlusEpisode>();
  for (const { hash, data } of queryCandidates(dehydratedStates(decodeFlightEntries(html)))) {
    if (!hash.includes(seriesCode)) continue;
    if (isSeriesDetailHash(hash)) {
      const parsed = parseSchema(drecomiPlusSeriesDetailSchema, data);
      if (Result.isSuccess(parsed)) detail = parsed.value;
    }
    if (hash.includes('episodes')) {
      const parsed = parseSchema(drecomiPlusEpisodesDataSchema, data);
      if (Result.isSuccess(parsed)) {
        for (const item of parsed.value.items ?? []) {
          const code = episodeCode(item);
          if (code) episodes.set(code, item);
        }
      }
    }
  }
  return episodes.size > 0
    ? Result.succeed({ detail, episodes: [...episodes.values()] })
    : Result.fail(new Error(`drecomi-plus episode list not found for ${seriesCode}`));
};

const episodeCode = (episode: DrecomiPlusEpisode): string | undefined => {
  if (typeof episode.code !== 'string' && typeof episode.code !== 'number') return undefined;
  const code = String(episode.code).trim();
  return code || undefined;
};

const episodeNumber = (episode: DrecomiPlusEpisode): number => {
  if (typeof episode.episode_number === 'number') return episode.episode_number;
  if (typeof episode.episode_number === 'string') {
    const parsed = Number.parseFloat(episode.episode_number);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.POSITIVE_INFINITY;
};

const parseItems = (state: DrecomiSeriesState, seriesCode: string): FeedItem[] =>
  [...state.episodes]
    .sort(
      (a, b) =>
        episodeNumber(a) - episodeNumber(b) ||
        (episodeCode(a) ?? '').localeCompare(episodeCode(b) ?? ''),
    )
    .flatMap((episode) => {
      const code = episodeCode(episode);
      if (!code) return [];
      const date = episode.publish_at ?? episode.sale_start_at;
      return [
        {
          id: code,
          title: episode.name ?? `episode ${code}`,
          url: `${PROVIDERS.drecomiPlus.baseUrl}/series/${encodeURIComponent(seriesCode)}/episodes/${encodeURIComponent(code)}`,
          ...(date ? { date } : {}),
          ...(episode.thumbnail?.cdn_url ? { thumbnail: episode.thumbnail.cdn_url } : {}),
        },
      ];
    });

const browserHeaders = {
  [HTTP_HEADERS.accept]: MIME_TYPES.browserHtml,
  [HTTP_HEADERS.acceptLanguage]: ACCEPT_LANGUAGES.japaneseBrowser,
  [HTTP_HEADERS.referer]: `${PROVIDERS.drecomiPlus.baseUrl}/`,
  [HTTP_HEADERS.userAgent]: BROWSER_USER_AGENT,
};

export const drecomiPlusProvider = createProvider(PROVIDERS.drecomiPlus, async (identifier) =>
  Result.pipe(
    Result.try({
      try: () => {
        const seriesCode = identifier.trim();
        if (!seriesCode) throw new Error(`drecomi-plus series code is empty: ${identifier}`);
        return {
          seriesCode,
          link: `${PROVIDERS.drecomiPlus.baseUrl}/series/${encodeURIComponent(seriesCode)}`,
        };
      },
      catch: toError,
    }),
    Result.bind('html', ({ link }) => fetchText(link, { headers: browserHeaders })),
    Result.bind('state', ({ html, seriesCode }) => findSeriesState(html, seriesCode)),
    Result.map(({ link, seriesCode, state }) => ({
      title:
        state.detail?.name?.trim() || fallbackFeedTitle(PROVIDERS.drecomiPlus.siteName, seriesCode),
      link,
      description: state.detail?.summary ?? state.detail?.catch_copy ?? '',
      items: parseItems(state, seriesCode),
    })),
  ),
);
