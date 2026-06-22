export const USER_AGENT = 'manga-rss-bridge/0.1.0';

export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const HTTP_HEADERS = {
  accept: 'Accept',
  acceptLanguage: 'Accept-Language',
  contentType: 'Content-Type',
  referer: 'Referer',
  userAgent: 'User-Agent',
} as const;

export const MIME_TYPES = {
  any: '*/*',
  json: 'application/json',
  rssXml: 'application/rss+xml; charset=utf-8',
  rssXmlList: 'application/rss+xml, application/xml, text/xml',
  browserHtml: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
} as const;

export const ACCEPT_LANGUAGES = {
  japaneseBrowser: 'ja,en-US;q=0.9,en;q=0.8',
} as const;
