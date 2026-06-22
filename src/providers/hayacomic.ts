import { PROVIDERS } from '../constants/providers.ts';
import { titleBeforeSeparator } from '../lib/feed-title.ts';
import { createHtmlListProvider } from './html-list.ts';

export const hayacomicProvider = createHtmlListProvider({
  id: PROVIDERS.hayacomic.id,
  siteName: PROVIDERS.hayacomic.siteName,
  url: (seriesId) => `${PROVIDERS.hayacomic.baseUrl}/series/${encodeURIComponent(seriesId)}`,
  itemClass: 'series-eplist-item',
  linkPattern: /<a[^>]+href=["']([^"']*\/episodes\/[^"']+)["'][^>]*>/i,
  titlePattern:
    /<span[^>]+class=["'][^"']*series-eplist-item-h-text[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
  datePattern:
    /<div[^>]+class=["'][^"']*series-eplist-item-meta-date[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  thumbnailPattern: /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
  feedTitle: (html, identifier) =>
    titleBeforeSeparator(html, PROVIDERS.hayacomic.siteName, identifier),
});
