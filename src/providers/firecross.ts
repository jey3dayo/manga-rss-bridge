import {
  ACCEPT_LANGUAGES,
  BROWSER_USER_AGENT,
  HTTP_HEADERS,
  MIME_TYPES,
} from '../constants/http.ts';
import { PROVIDERS } from '../constants/providers.ts';
import { requireFeedItems } from '../lib/feed.ts';
import { titleBeforeSeparator } from '../lib/feed-title.ts';
import { fetchText } from '../lib/http.ts';
import { absoluteUrl, extractBlocksByClass, extractMetaContent, stripTags } from '../lib/html.ts';
import { Result } from '../lib/result.ts';
import type { FeedItem } from '../types/feed.ts';
import { createProvider } from './create-provider.ts';

const browserHeaders = {
  [HTTP_HEADERS.accept]: MIME_TYPES.browserHtml,
  [HTTP_HEADERS.acceptLanguage]: ACCEPT_LANGUAGES.japaneseBrowser,
  [HTTP_HEADERS.referer]: `${PROVIDERS.firecross.baseUrl}/`,
  [HTTP_HEADERS.userAgent]: BROWSER_USER_AGENT,
};

const init: RequestInit = { headers: browserHeaders };

// The series page lists 20 episodes per page, oldest first by default. The
// `sort=latest` view lists them newest first, so page 1 always carries the
// newest episodes even before older pages are merged in.
const MAX_PAGES = 50;

const pageUrl = (seriesId: string, page: number): string =>
  `${PROVIDERS.firecross.baseUrl}/ebook/series/${encodeURIComponent(seriesId)}?sort=latest&page=${page}`;

const parseMaxPage = (html: string): number => {
  // Pagination hrefs escape the query separator as &amp;, so accept ';' too.
  const pages = [...html.matchAll(/[?&;]page=(\d+)/g)].map((match) => Number(match[1]));
  return Math.min(Math.max(1, ...pages), MAX_PAGES);
};

const parseEpisodes = (html: string, seriesUrl: string): FeedItem[] =>
  extractBlocksByClass(html, 'shop-item--episode').flatMap((block) => {
    // Episode entries no longer expose a per-episode link; the stable
    // identity is the episode ID in the block's data-id attribute, and the
    // block itself is anchored as #ep<id> on the series page.
    const episodeId = /data-id="(\d+)"/.exec(block)?.[1];
    if (!episodeId) return [];
    const title = /shop-item-info-name">([^<]+)/.exec(block)?.[1];
    const release = /shop-item-info-release">([^<]+)/
      .exec(block)?.[1]
      ?.replace(/^公開：/, '')
      .trim();
    const thumbnail = /<img[^>]+src="([^"]+)"/i.exec(block)?.[1];
    return {
      id: episodeId,
      title: title ? stripTags(title) : episodeId,
      url: `${seriesUrl}#ep${episodeId}`,
      ...(release ? { date: release } : {}),
      ...(thumbnail ? { thumbnail: absoluteUrl(thumbnail, seriesUrl) } : {}),
    };
  });

const fetchPages = async (seriesId: string): Promise<Result<string[], Error>> => {
  const first = await fetchText(pageUrl(seriesId, 1), init);
  if (Result.isFailure(first)) return first;
  const pages = [first.value];
  const maxPage = parseMaxPage(first.value);
  for (let page = 2; page <= maxPage; page += 1) {
    const result = await fetchText(pageUrl(seriesId, page), init);
    if (Result.isFailure(result)) return result;
    pages.push(result.value);
  }
  return Result.succeed(pages);
};

export const firecrossProvider = createProvider(PROVIDERS.firecross, async (seriesId) => {
  const seriesUrl = `${PROVIDERS.firecross.baseUrl}/ebook/series/${encodeURIComponent(seriesId)}`;
  const pages = await fetchPages(seriesId);
  if (Result.isFailure(pages)) return pages;
  const [firstPage = ''] = pages.value;
  const episodesByPage = pages.value.map((html) => parseEpisodes(html, seriesUrl));
  // An entirely empty page means the listing structure changed (or a bot
  // wall was served with 200), so fail instead of returning a partial feed.
  const emptyPage = episodesByPage.findIndex((episodes) => episodes.length === 0);
  if (emptyPage >= 0) {
    return Result.fail(
      new Error(`firecross: episode list is empty on page ${emptyPage + 1} of series ${seriesId}`),
    );
  }
  const seen = new Set<string>();
  const items = episodesByPage.flat().filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return requireFeedItems('firecross', {
    title: titleBeforeSeparator(firstPage, PROVIDERS.firecross.siteName, seriesId),
    link: seriesUrl,
    description: extractMetaContent(firstPage, 'description') ?? '',
    items,
  });
});
