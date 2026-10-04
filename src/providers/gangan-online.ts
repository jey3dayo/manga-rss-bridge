import { PROVIDERS } from '../constants/providers.ts';
import { fallbackFeedTitle } from '../lib/feed-title.ts';
import { fetchJson, fetchText } from '../lib/http.ts';
import {
  ganganEmbeddedTitleSchema,
  ganganNextDataSchema,
  ganganTitleDataSchema,
  type GanganNextData,
  type GanganTitle,
} from '../schemas/gangan-online.ts';
import { createProvider } from './create-provider.ts';

const extractNextData = (html: string): GanganNextData => {
  const match = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s.exec(html);
  if (!match?.[1]) throw new Error('__NEXT_DATA__ not found');
  return ganganNextDataSchema.parse(JSON.parse(match[1]));
};

const fetchTitle = async (titleId: string): Promise<GanganTitle> => {
  const pageUrl = `${PROVIDERS.ganganOnline.baseUrl}/title/${encodeURIComponent(titleId)}`;
  const nextData = extractNextData(await fetchText(pageUrl));
  if (nextData.buildId) {
    const dataUrl = `${PROVIDERS.ganganOnline.baseUrl}/_next/data/${nextData.buildId}/title/${encodeURIComponent(titleId)}.json`;
    return (await fetchJson(dataUrl, ganganTitleDataSchema)).pageProps.data.default;
  }
  return ganganEmbeddedTitleSchema.parse(nextData).props.pageProps.data.default;
};

export const ganganOnlineProvider = createProvider(PROVIDERS.ganganOnline, async (titleId) => {
  const title = await fetchTitle(titleId);
  const titleName = title.titleName ?? fallbackFeedTitle(PROVIDERS.ganganOnline.siteName, titleId);
  const description = title.description ?? '';
  const link = `${PROVIDERS.ganganOnline.baseUrl}/title/${encodeURIComponent(titleId)}`;
  const items = (title.chapters ?? [])
    .filter((chapter) => chapter.id !== undefined)
    .flatMap((chapter) => {
      const chapterId = String(chapter.id).trim();
      if (!chapterId) return [];
      return {
        id: chapterId,
        title: chapter.mainText ?? `chapter ${chapterId}`,
        url: `${PROVIDERS.ganganOnline.baseUrl}/title/${encodeURIComponent(titleId)}/chapter/${encodeURIComponent(chapterId)}`,
      };
    });
  return {
    title: titleName,
    link,
    description: [title.author, description].filter(Boolean).join('\n'),
    items,
  };
});
