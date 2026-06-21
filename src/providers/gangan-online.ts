import { z } from 'zod';
import { fetchJson, fetchText } from '../lib/http.js';
import { tryCatch } from '../lib/result.js';
import { ganganTitleSchema, type GanganTitle } from '../schemas/gangan-online.js';
import type { MangaFeed, Provider } from '../types/feed.js';

const nextDataSchema = z
  .object({
    buildId: z.string().optional(),
    props: z.unknown().optional(),
  })
  .passthrough();

const nextTitleDataSchema = z.object({
  pageProps: z.object({
    data: z.object({
      default: ganganTitleSchema,
    }),
  }),
});

const extractNextData = (html: string): z.infer<typeof nextDataSchema> => {
  const match = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s.exec(html);
  if (!match?.[1]) throw new Error('__NEXT_DATA__ not found');
  return nextDataSchema.parse(JSON.parse(match[1]));
};

const embeddedTitleSchema = z.object({
  props: z.object({
    pageProps: z.object({
      data: z.object({
        default: ganganTitleSchema,
      }),
    }),
  }),
});

const fetchTitle = async (titleId: string): Promise<GanganTitle> => {
  const pageUrl = `https://www.ganganonline.com/title/${encodeURIComponent(titleId)}`;
  const nextData = extractNextData(await fetchText(pageUrl));
  if (nextData.buildId) {
    const dataUrl = `https://www.ganganonline.com/_next/data/${nextData.buildId}/title/${encodeURIComponent(titleId)}.json`;
    return (await fetchJson(dataUrl, nextTitleDataSchema)).pageProps.data.default;
  }
  return embeddedTitleSchema.parse(nextData).props.pageProps.data.default;
};

export const ganganOnlineProvider: Provider = {
  id: 'gangan-online',
  siteName: 'Gangan ONLINE',
  fetchFeed(titleId: string) {
    return tryCatch(async (): Promise<MangaFeed> => {
      const title = await fetchTitle(titleId);
      const titleName = title.titleName ?? `Gangan ONLINE ${titleId}`;
      const description = title.description ?? '';
      const link = `https://www.ganganonline.com/title/${encodeURIComponent(titleId)}`;
      const items = (title.chapters ?? [])
        .filter((chapter) => chapter.id !== undefined)
        .map((chapter) => {
          const chapterId = String(chapter.id);
          return {
            id: chapterId,
            title: chapter.mainText ?? `chapter ${chapterId}`,
            url: `https://www.ganganonline.com/title/${encodeURIComponent(titleId)}/chapter/${encodeURIComponent(chapterId)}`,
          };
        });
      return {
        title: titleName,
        link,
        description: [title.author, description].filter(Boolean).join('\n'),
        items,
      };
    });
  },
};
