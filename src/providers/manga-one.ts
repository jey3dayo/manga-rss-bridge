import { fetchBytes, fetchText } from '../lib/http.ts';
import { extractMetaContent } from '../lib/html.ts';
import { tryCatch } from '../lib/result.ts';
import { mangaOnePageMetadataSchema } from '../schemas/manga-one.ts';
import type { FeedItem, MangaFeed, Provider } from '../types/feed.ts';

const browserHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
  return chapter.id && chapter.title ? { id: chapter.id, title: chapter.title, ...chapter } : undefined;
};

const parseChapterList = (data: Uint8Array): { chapters: MangaOneChapter[]; totalCount: number } => {
  const chapters: MangaOneChapter[] = [];
  let totalCount = 0;
  for (const field of readFields(data)) {
    if (field.field !== 1 || field.wireType !== 2 || !(field.value instanceof Uint8Array)) continue;
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
};

const fetchChapters = async (titleId: number, chapterId: string): Promise<FeedItem[]> => {
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
    const data = await fetchBytes(`https://manga-one.com/api/client?${params}`, {
      headers: {
        ...browserHeaders,
        Accept: '*/*',
        Referer: `https://manga-one.com/manga/${titleId}/chapter/${chapterId}`,
      },
    });
    const { chapters, totalCount } = parseChapterList(data);
    let newCount = 0;
    for (const chapter of chapters) {
      if (seen.has(chapter.id)) continue;
      seen.add(chapter.id);
      newCount += 1;
      items.push({
        id: chapter.id,
        title: chapter.title,
        url: `https://manga-one.com/manga/${titleId}/chapter/${chapter.id}`,
        ...(chapter.date ? { date: chapter.date } : {}),
        ...(chapter.thumbnail ? { thumbnail: chapter.thumbnail } : {}),
      });
    }
    if (newCount === 0 || (totalCount > 0 && items.length >= totalCount)) break;
  }
  return items.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
};

export const mangaOneProvider: Provider = {
  id: 'manga-one',
  siteName: 'マンガワン',
  fetchFeed(identifier: string) {
    return tryCatch(async (): Promise<MangaFeed> => {
      const viewerUrl = `https://manga-one.com/viewer/${encodeURIComponent(identifier)}`;
      const html = await fetchText(viewerUrl, { headers: browserHeaders });
      const metadata = mangaOnePageMetadataSchema.parse({
        title: extractMetaContent(html, 'og:title') ?? extractMetaContent(html, 'twitter:title'),
        description: extractMetaContent(html, 'description') ?? extractMetaContent(html, 'og:description'),
        canonical: extractCanonical(html) ?? extractMetaContent(html, 'og:url'),
        image: extractMetaContent(html, 'og:image') ?? extractMetaContent(html, 'twitter:image'),
        titleId: extractTitleId(html),
      });
      if (!metadata.titleId) throw new Error('MangaONE title id not found');
      const itemUrl =
        metadata.canonical ??
        `https://manga-one.com/manga/${metadata.titleId}/chapter/${encodeURIComponent(identifier)}`;
      const items = await fetchChapters(metadata.titleId, identifier);
      return {
        title: metadata.title?.replace(/\s+第.+$/, '') ?? `マンガワン ${identifier}`,
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
      };
    });
  },
};
