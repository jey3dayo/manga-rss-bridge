import {
  ACCEPT_LANGUAGES,
  BROWSER_USER_AGENT,
  HTTP_HEADERS,
  MIME_TYPES,
} from '../constants/http.ts';
import { PROVIDERS } from '../constants/providers.ts';
import { titleBeforeSeparator } from '../lib/feed-title.ts';
import { createHtmlListProvider } from './html-list.ts';

const browserHeaders = {
  [HTTP_HEADERS.accept]: MIME_TYPES.browserHtml,
  [HTTP_HEADERS.acceptLanguage]: ACCEPT_LANGUAGES.japaneseBrowser,
  [HTTP_HEADERS.referer]: `${PROVIDERS.firecross.baseUrl}/`,
  [HTTP_HEADERS.userAgent]: BROWSER_USER_AGENT,
};

export const firecrossProvider = createHtmlListProvider({
  id: PROVIDERS.firecross.id,
  siteName: PROVIDERS.firecross.siteName,
  url: (seriesId) => `${PROVIDERS.firecross.baseUrl}/ebook/series/${encodeURIComponent(seriesId)}`,
  itemClass: 'shop-item--episode',
  linkPattern: /<a[^>]+href=["']([^"']+)["'][^>]*>/i,
  titlePattern:
    /<h[0-9][^>]*>([\s\S]*?)<\/h[0-9]>|<div[^>]+class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  datePattern: /(\d{4}[./年-]\d{1,2}[./月-]\d{1,2}日?)/,
  thumbnailPattern: /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/i,
  feedTitle: (html, identifier) => titleBeforeSeparator(html, PROVIDERS.firecross, identifier),
  init: { headers: browserHeaders },
});
