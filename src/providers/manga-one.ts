import { BROWSER_USER_AGENT, HTTP_HEADERS, MIME_TYPES } from '../constants/http.ts';
import { PROVIDERS } from '../constants/providers.ts';
import { fallbackFeedTitle } from '../lib/feed-title.ts';
import { fetchBytes, fetchText } from '../lib/http.ts';
import { extractMetaContent } from '../lib/html.ts';
import { Result, type ResultAsync, toError } from '../lib/result.ts';
import { mangaOnePageMetadataSchema } from '../schemas/manga-one.ts';
import { parseSchema } from '../schemas/parse.ts';
import type { FeedItem } from '../types/feed.ts';
import { createProvider } from './create-provider.ts';

const browserHeaders = {
  [HTTP_HEADERS.userAgent]: BROWSER_USER_AGENT,
};

type ProtobufField = {
  field: number;
  wireType: number;
  value: number | Uint8Array;
};

type MangaOneChapter = {
  id: string;
  title: string;
  date?: string;
  thumbnail?: string;
};

const extractTitleId = (html: string): number | undefined => {
  const match = /\/manga\/(\d+)\/chapter\/\d+|\\"title_id\\":(\d+)|"title_id":(\d+)/.exec(html);
  const value = match?.[1] ?? match?.[2] ?? match?.[3];
  return value ? Number(value) : undefined;
};

const extractCanonical = (html: string): string | undefined => {
  const match = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i.exec(html);
  return match?.[1];
};

const readVarint = (data: Uint8Array, startOffset: number): [number, number] => {
  let offset = startOffset;
  let shift = 0;
  let value = 0;
  while (offset < data.length) {
    const byte = data[offset];
    if (byte === undefined) break;
    offset += 1;
    value |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return [value, offset];
    shift += 7;
  }
  throw new Error('unterminated protobuf varint');
};

const readFields = (data: Uint8Array): ProtobufField[] => {
  const fields: ProtobufField[] = [];
  let offset = 0;
  while (offset < data.length) {
    const [key, keyOffset] = readVarint(data, offset);
    offset = keyOffset;
    const field = key >> 3;
    const wireType = key & 7;
    if (wireType === 0) {
      const [value, nextOffset] = readVarint(data, offset);
      fields.push({ field, wireType, value });
      offset = nextOffset;
    } else if (wireType === 1) {
      fields.push({ field, wireType, value: data.slice(offset, offset + 8) });
      offset += 8;
    } else if (wireType === 2) {
      const [size, valueOffset] = readVarint(data, offset);
      offset = valueOffset;
      fields.push({ field, wireType, value: data.slice(offset, offset + size) });
      offset += size;
    } else if (wireType === 5) {
      fields.push({ field, wireType, value: data.slice(offset, offset + 4) });
      offset += 4;
    } else {
      throw new Error(`unsupported protobuf wire type: ${wireType}`);
    }
  }
  return fields;
};

const textDecoder = new TextDecoder();

const decodeText = (value: number | Uint8Array): string =>
  typeof value === 'number' ? '' : textDecoder.decode(value).trim();

const parseChapter = (data: Uint8Array): MangaOneChapter | undefined => {
  const chapter: Partial<MangaOneChapter> = {};
  for (const field of readFields(data)) {
    if (field.field === 1 && field.wireType === 0 && typeof field.value === 'number') {
      chapter.id = String(field.value);
    } else if (field.field === 2 && field.wireType === 2) {
      chapter.title = decodeText(field.value);
    } else if (field.field === 4 && field.wireType === 2) {
      chapter.thumbnail = decodeText(field.value);
    } else if (field.field === 5 && field.wireType === 2) {
      chapter.date = decodeText(field.value);
    }
  }
  return chapter.id && chapter.title
    ? { id: chapter.id, title: chapter.title, ...chapter }
    : undefined;
};

const parseChapterList = Result.fn({
  try: (data: Uint8Array): { chapters: MangaOneChapter[]; totalCount: number } => {
    const chapters: MangaOneChapter[] = [];
    let totalCount = 0;
    for (const field of readFields(data)) {
      if (field.field !== 1 || field.wireType !== 2 || !(field.value instanceof Uint8Array))
        continue;
      for (const child of readFields(field.value)) {
        if (child.field === 1 && child.wireType === 2 && child.value instanceof Uint8Array) {
          const chapter = parseChapter(child.value);
          if (chapter) chapters.push(chapter);
        } else if (child.field === 5 && child.wireType === 0 && typeof child.value === 'number') {
          totalCount = child.value;
        }
      }
    }
    return { chapters, totalCount };
  },
  catch: toError,
});

const fetchChapters = async (
  titleId: number,
  chapterId: string,
): ResultAsync<FeedItem[], Error> => {
  const seen = new Set<string>();
  const items: FeedItem[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const params = new URLSearchParams({
      rq: 'viewer/chapter_list',
      title_id: String(titleId),
      type: 'chapter',
      page: String(page),
      limit: '100',
      sort_type: 'desc',
    });
    const pageResult = await Result.pipe(
      fetchBytes(`${PROVIDERS.mangaOne.baseUrl}/api/client?${params}`, {
        headers: {
          ...browserHeaders,
          [HTTP_HEADERS.accept]: MIME_TYPES.any,
          [HTTP_HEADERS.referer]: `${PROVIDERS.mangaOne.baseUrl}/manga/${titleId}/chapter/${chapterId}`,
        },
      }),
      Result.andThen(parseChapterList),
    );
    if (Result.isFailure(pageResult)) return pageResult;
    const { chapters, totalCount } = pageResult.value;
    let newCount = 0;
    for (const chapter of chapters) {
      if (seen.has(chapter.id)) continue;
      seen.add(chapter.id);
      newCount += 1;
      items.push({
        id: chapter.id,
        title: chapter.title,
        url: `${PROVIDERS.mangaOne.baseUrl}/manga/${titleId}/chapter/${chapter.id}`,
        ...(chapter.date ? { date: chapter.date } : {}),
        ...(chapter.thumbnail ? { thumbnail: chapter.thumbnail } : {}),
      });
    }
    if (newCount === 0 || (totalCount > 0 && items.length >= totalCount)) break;
  }
  return Result.succeed(items.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')));
};

export const mangaOneProvider = createProvider(PROVIDERS.mangaOne, async (identifier) => {
  const viewerUrl = `${PROVIDERS.mangaOne.baseUrl}/viewer/${encodeURIComponent(identifier)}`;
  return Result.pipe(
    fetchText(viewerUrl, { headers: browserHeaders }),
    Result.andThen((html) =>
      parseSchema(mangaOnePageMetadataSchema, {
        title: extractMetaContent(html, 'og:title') ?? extractMetaContent(html, 'twitter:title'),
        description:
          extractMetaContent(html, 'description') ?? extractMetaContent(html, 'og:description'),
        canonical: extractCanonical(html) ?? extractMetaContent(html, 'og:url'),
        image: extractMetaContent(html, 'og:image') ?? extractMetaContent(html, 'twitter:image'),
        titleId: extractTitleId(html),
      }),
    ),
    Result.andThen((metadata) => {
      if (!metadata.titleId) return Result.fail(new Error('MangaONE title id not found'));
      const itemUrl =
        metadata.canonical ??
        `${PROVIDERS.mangaOne.baseUrl}/manga/${metadata.titleId}/chapter/${encodeURIComponent(identifier)}`;
      return Result.pipe(
        fetchChapters(metadata.titleId, identifier),
        Result.map((items) => ({
          title:
            metadata.title?.replace(/\s+第.+$/, '') ??
            fallbackFeedTitle(PROVIDERS.mangaOne.siteName, identifier),
          link: itemUrl,
          description: metadata.description ?? '',
          items:
            items.length > 0
              ? items
              : [
                  {
                    id: identifier,
                    title: metadata.title ?? `chapter ${identifier}`,
                    url: itemUrl,
                    ...(metadata.image ? { thumbnail: metadata.image } : {}),
                  },
                ],
        })),
      );
    }),
  );
});
