import { createHtmlListProvider, titleBeforeSeparator } from './html-list.ts';

export const hayacomicProvider = createHtmlListProvider({
  id: 'hayacomic',
  siteName: 'ハヤコミ',
  url: (seriesId) => `https://hayacomic.jp/series/${encodeURIComponent(seriesId)}`,
  itemClass: 'series-eplist-item',
  linkPattern: /<a[^>]+href=["']([^"']*\/episodes\/[^"']+)["'][^>]*>/i,
  titlePattern: /<span[^>]+class=["'][^"']*series-eplist-item-h-text[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
  datePattern: /<div[^>]+class=["'][^"']*series-eplist-item-meta-date[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  thumbnailPattern: /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
  feedTitle: (html, identifier) => titleBeforeSeparator(html, `ハヤコミ ${identifier}`),
});
