import { PROVIDERS } from '../constants/providers.ts';
import { titleBeforeSeparator } from '../lib/feed-title.ts';
import { createHtmlListProvider } from './html-list.ts';

const cleanAccessLabel = (title: string): string =>
  title
    .replace(/毎日¥0/g, '')
    .replace(/無料|コイン|先読み/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const mangaboxProvider = createHtmlListProvider({
  id: PROVIDERS.mangabox.id,
  siteName: PROVIDERS.mangabox.siteName,
  url: (readerId) =>
    `${PROVIDERS.mangabox.baseUrl}/reader/${encodeURIComponent(readerId)}/episodes/all/`,
  itemClass: '_episodes__item',
  linkPattern: /<a[^>]+href=["']([^"']*\/reader\/[^"']+\/episodes\/[^"']+)["'][^>]*>/i,
  titlePattern:
    /<div[^>]+class=["'][^"']*_volume_[^"']*["'][^>]*>([\s\S]*?)<\/div>|<span[^>]*>([\s\S]*?)<\/span>/i,
  thumbnailPattern: /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
  cleanItemTitle: cleanAccessLabel,
  feedTitle: (html, identifier) =>
    titleBeforeSeparator(html, PROVIDERS.mangabox.siteName, identifier),
});
