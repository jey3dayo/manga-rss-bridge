import { createHtmlListProvider, titleBeforeSeparator } from './html-list.ts';

const browserHeaders = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  Referer: 'https://firecross.jp/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

export const firecrossProvider = createHtmlListProvider({
  id: 'firecross',
  siteName: 'ファイアCROSS',
  url: (seriesId) => `https://firecross.jp/ebook/series/${encodeURIComponent(seriesId)}`,
  itemClass: 'shop-item--episode',
  linkPattern: /<a[^>]+href=["']([^"']+)["'][^>]*>/i,
  titlePattern: /<h[0-9][^>]*>([\s\S]*?)<\/h[0-9]>|<div[^>]+class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  datePattern: /(\d{4}[./年-]\d{1,2}[./月-]\d{1,2}日?)/,
  thumbnailPattern: /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/i,
  feedTitle: (html, identifier) => titleBeforeSeparator(html, `ファイアCROSS ${identifier}`),
  init: { headers: browserHeaders },
});
