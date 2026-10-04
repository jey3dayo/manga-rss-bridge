import type { ProviderFixture } from './types.ts';

const varint = (value: number): number[] => {
  const bytes: number[] = [];
  let remaining = value;
  while (remaining >= 128) {
    bytes.push((remaining % 128) + 128);
    remaining = Math.floor(remaining / 128);
  }
  return [...bytes, remaining];
};

const textEncoder = new TextEncoder();

const lengthDelimited = (field: number, value: number[] | string): number[] => {
  const bytes = typeof value === 'string' ? [...textEncoder.encode(value)] : value;
  return [...varint(field * 8 + 2), ...varint(bytes.length), ...bytes];
};

type ChapterFixture = {
  id?: number;
  title?: string;
  thumbnail?: string;
  date?: string;
};

// Public chapter-list metadata only. Field numbers follow the provider's wire format.
export const mangaOneChapterList = (chapters: ChapterFixture[], totalCount = 0): Uint8Array =>
  new Uint8Array(
    lengthDelimited(1, [
      ...chapters.flatMap((chapter) =>
        lengthDelimited(1, [
          ...(chapter.id === undefined ? [] : [8, ...varint(chapter.id)]),
          ...(chapter.title === undefined ? [] : lengthDelimited(2, chapter.title)),
          ...(chapter.thumbnail === undefined ? [] : lengthDelimited(4, chapter.thumbnail)),
          ...(chapter.date === undefined ? [] : lengthDelimited(5, chapter.date)),
        ]),
      ),
      40,
      ...varint(totalCount),
    ]),
  );

export const mangaOneApiUrl = (page: number): string =>
  `https://manga-one.com/api/client?rq=viewer%2Fchapter_list&title_id=42&type=chapter&page=${page}&limit=100&sort_type=desc`;

export const mangaOnePage = `
  <meta property="og:title" content="星の旅 第3話" />
  <meta name="description" content="夜空&amp;冒険" />
  <meta property="og:image" content="https://cdn.example.com/cover.jpg" />
  <link rel="canonical" href="https://manga-one.com/manga/42/chapter/303" />`;

export const mangaOneFixture: ProviderFixture = {
  id: 'manga-one',
  identifier: '303',
  responses: {
    'https://manga-one.com/viewer/303': mangaOnePage,
    [mangaOneApiUrl(1)]: mangaOneChapterList(
      [
        {
          id: 303,
          title: ' 第3話 ',
          date: '2026-09-03',
          thumbnail: 'https://cdn.example.com/303.jpg',
        },
        { id: 202, title: '第2話', date: '2026-09-02' },
        { id: 999 },
      ],
      3,
    ),
    [mangaOneApiUrl(2)]: mangaOneChapterList(
      [
        { id: 202, title: '第2話', date: '2026-09-02' },
        { id: 101, title: '第1話', date: '2026-09-01' },
      ],
      3,
    ),
  },
  feed: {
    title: '星の旅',
    link: 'https://manga-one.com/manga/42/chapter/303',
    description: '夜空&冒険',
    items: [
      {
        id: '101',
        title: '第1話',
        url: 'https://manga-one.com/manga/42/chapter/101',
        date: '2026-09-01',
      },
      {
        id: '202',
        title: '第2話',
        url: 'https://manga-one.com/manga/42/chapter/202',
        date: '2026-09-02',
      },
      {
        id: '303',
        title: '第3話',
        url: 'https://manga-one.com/manga/42/chapter/303',
        date: '2026-09-03',
        thumbnail: 'https://cdn.example.com/303.jpg',
      },
    ],
  },
};
