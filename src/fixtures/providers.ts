import type { MangaFeed } from '../types/feed.ts';

export const nextDataPage = (data: unknown): string =>
  `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`;

export const ganganTitle = {
  titleName: '星の旅',
  author: '星野',
  description: '旅の記録',
  chapters: [{ id: 12, mainText: '第12話' }, { id: 'chapter/a' }, { mainText: '未公開' }],
};

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

export const pixivWork = { data: { official_work: { id: 42, name: '星の旅' } } };
export const pixivWorkUrl = 'https://comic.pixiv.net/api/app/works/v5/42';
export const pixivEpisodesUrl = 'https://comic.pixiv.net/api/app/works/42/episodes/v2';

type ProviderFixture = {
  id: string;
  identifier: string;
  responses: Record<string, string | Uint8Array>;
  feed: MangaFeed;
};

export const providerFixtures: ProviderFixture[] = [
  {
    id: 'comic-days',
    identifier: 'work/42',
    responses: {
      'https://comic-days.com/rss/series/work%2F42': `
        <rss><channel><title>星の旅</title><link>https://comic-days.com/series/42</link>
          <description>旅の記録</description>
          <item><title>第2話 &amp; 後編</title><link>https://comic-days.com/episode/202</link></item>
          <item><title>公開準備中</title></item>
        </channel></rss>`,
    },
    feed: {
      title: '星の旅',
      link: 'https://comic-days.com/series/42',
      description: '旅の記録',
      items: [{ id: '202', title: '第2話 & 後編', url: 'https://comic-days.com/episode/202' }],
    },
  },
  {
    id: 'firecross',
    identifier: 'work/42',
    responses: {
      'https://firecross.jp/ebook/series/work%2F42': `
        <title>星の旅 | ファイアCROSS</title><meta name="description" content="夜空&amp;冒険" />
        <div class="shop-item--episode"><a href="/ebook/episode/202.html">
          <div class="title"><b>第2話</b> 後編</div><time>2026年9月3日</time>
          <img data-src="/covers/202.jpg" /></a></div>
        <div class="shop-item--episode"><a href="/ebook/episode/202.html"><h3>重複</h3></a></div>
        <div class="shop-item--episode"><h3>公開準備中</h3></div>`,
    },
    feed: {
      title: '星の旅',
      link: 'https://firecross.jp/ebook/series/work%2F42',
      description: '夜空&冒険',
      items: [
        {
          id: '202',
          title: '第2話 後編',
          url: 'https://firecross.jp/ebook/episode/202.html',
          date: '2026年9月3日',
          thumbnail: 'https://firecross.jp/covers/202.jpg',
        },
      ],
    },
  },
  {
    id: 'gangan-online',
    identifier: 'work/42',
    responses: {
      'https://www.ganganonline.com/title/work%2F42': nextDataPage({ buildId: 'build-42' }),
      'https://www.ganganonline.com/_next/data/build-42/title/work%2F42.json': JSON.stringify({
        pageProps: { data: { default: ganganTitle } },
      }),
    },
    feed: {
      title: '星の旅',
      link: 'https://www.ganganonline.com/title/work%2F42',
      description: '星野\n旅の記録',
      items: [
        {
          id: '12',
          title: '第12話',
          url: 'https://www.ganganonline.com/title/work%2F42/chapter/12',
        },
        {
          id: 'chapter/a',
          title: 'chapter chapter/a',
          url: 'https://www.ganganonline.com/title/work%2F42/chapter/chapter%2Fa',
        },
      ],
    },
  },
  {
    id: 'gaugau',
    identifier: 'work/42',
    responses: {
      'https://gaugau.futabanet.jp/list/work/work%2F42/episodes': `
        <meta property="og:title" content="星の旅｜がうがうモンスター＋" />
        <meta content="夜空&amp;冒険" name="description" />
        <div class="episode__grid"><div class="episode__num">第2話</div>
          <div class="episode__title"><b>旅立ち</b></div><time>2026年09月03日</time>
          <img src="/covers/202.jpg" /></div>
        <div class="episode__grid"><div class="episode__num">第2話</div>
          <div class="episode__title">旅立ち</div></div>`,
    },
    feed: {
      title: '星の旅',
      link: 'https://gaugau.futabanet.jp/list/work/work%2F42/episodes',
      description: '夜空&冒険',
      items: [
        {
          id: 'episode-第2話-旅立ち',
          title: '第2話 旅立ち',
          url: 'https://gaugau.futabanet.jp/list/work/work%2F42/episodes#episode-第2話-旅立ち',
          date: '2026年09月03日',
          thumbnail: 'https://gaugau.futabanet.jp/covers/202.jpg',
        },
      ],
    },
  },
  {
    id: 'hayacomic',
    identifier: 'work/42',
    responses: {
      'https://hayacomic.jp/series/work%2F42': `
        <meta property="og:title" content="星の旅 | ハヤコミ" />
        <meta name="description" content="旅の記録" />
        <li class="series-eplist-item"><a href="/episodes/202">
          <span class="series-eplist-item-h-text">第2話 <b>後編</b></span>
          <div class="series-eplist-item-meta-date"> 2026/09/03 </div>
          <img src="/covers/202.jpg" /></a></li>
        <li class="series-eplist-item"><a href="/news/1">お知らせ</a></li>`,
    },
    feed: {
      title: '星の旅',
      link: 'https://hayacomic.jp/series/work%2F42',
      description: '旅の記録',
      items: [
        {
          id: '202',
          title: '第2話 後編',
          url: 'https://hayacomic.jp/episodes/202',
          date: '2026/09/03',
          thumbnail: 'https://hayacomic.jp/covers/202.jpg',
        },
      ],
    },
  },
  {
    id: 'jump-rookie',
    identifier: '42',
    responses: {
      'https://rookie.shonenjump.com/series/42': `
        <meta property="og:title" content="星の旅 - ジャンプルーキー！" />
        <meta name="description" content="旅の記録" />
        <li class="episode-wrapper"><a class="episode-content" href="/series/42/202">
          <span class="episode-title">第2話 <b>後編</b></span><img src="/covers/202.jpg" /></a></li>
        <li class="episode-wrapper"><a class="episode-content" href="/series/other/9">
          <span class="episode-title">別の作品</span></a></li>
        <li class="episode-wrapper"><a class="episode-content" href="/series/42/202">
          <span class="episode-title">重複</span></a></li>`,
    },
    feed: {
      title: '星の旅 - ジャンプルーキー！',
      link: 'https://rookie.shonenjump.com/series/42',
      description: '旅の記録',
      items: [
        {
          id: '202',
          title: '第2話 後編',
          url: 'https://rookie.shonenjump.com/series/42/202',
          thumbnail: 'https://rookie.shonenjump.com/covers/202.jpg',
        },
      ],
    },
  },
  {
    id: 'kadocomi',
    identifier: 'work/42',
    responses: {
      'https://comic-walker.com/api/contents/details/work?workCode=work%2F42': JSON.stringify({
        work: { title: '星の旅', catchphrase: '夜空の冒険', description: '長い紹介文' },
        firstEpisodes: {
          result: [
            {
              code: ' EP002 ',
              title: '第2話',
              subTitle: ' 後編 ',
              internal: { episodeNo: 2 },
              updateDate: '2026-09-03',
              thumbnail: 'https://cdn.example.com/202.jpg',
            },
            { code: 'hidden', title: '非公開', isActive: false, internal: { episodeNo: 1 } },
            { code: 'EP001', subTitle: ' ', internal: { episodeNo: 1 } },
            { code: 'intro', title: '予告' },
          ],
        },
      }),
    },
    feed: {
      title: '星の旅',
      link: 'https://comic-walker.com/detail/work%2F42?episodeType=latest',
      description: '夜空の冒険',
      items: [
        {
          id: 'intro',
          title: '予告',
          url: 'https://comic-walker.com/detail/work%2F42/episodes/intro?episodeType=latest',
        },
        {
          id: 'EP001',
          title: 'episode EP001',
          url: 'https://comic-walker.com/detail/work%2F42/episodes/EP001?episodeType=latest',
        },
        {
          id: 'EP002',
          title: '第2話 後編',
          url: 'https://comic-walker.com/detail/work%2F42/episodes/EP002?episodeType=latest',
          date: '2026-09-03',
          thumbnail: 'https://cdn.example.com/202.jpg',
        },
      ],
    },
  },
  {
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
  },
  {
    id: 'mangabox',
    identifier: 'work/42',
    responses: {
      'https://www.mangabox.me/reader/work%2F42/episodes/all/': `
        <title>星の旅｜マンガボックス</title><meta name="description" content="旅の記録" />
        <li class="_episodes__item"><a href="/reader/42/episodes/202">
          <div class="_volume_title">毎日¥0 無料 第2話 コイン <b>後編</b> 先読み</div>
          <img src="/covers/202.jpg" /></a></li>
        <li class="_episodes__item"><a href="/reader/42/episodes/203"><span>第3話</span></a></li>
        <li class="_episodes__item"><a href="/news/1">お知らせ</a></li>`,
    },
    feed: {
      title: '星の旅',
      link: 'https://www.mangabox.me/reader/work%2F42/episodes/all/',
      description: '旅の記録',
      items: [
        {
          id: '202',
          title: '第2話 後編',
          url: 'https://www.mangabox.me/reader/42/episodes/202',
          thumbnail: 'https://www.mangabox.me/covers/202.jpg',
        },
        { id: '203', title: '第3話', url: 'https://www.mangabox.me/reader/42/episodes/203' },
      ],
    },
  },
  {
    id: 'pixiv-comic',
    identifier: ' 42 ',
    responses: {
      [pixivWorkUrl]: JSON.stringify(pixivWork),
      [pixivEpisodesUrl]: JSON.stringify({
        data: {
          episodes: [
            {
              state: 'readable',
              episode: {
                id: '202',
                sub_title: ' 旅立ち ',
                read_start_at: 1790910000000,
                viewer_path: '/viewer/stories/202',
              },
            },
          ],
        },
      }),
    },
    feed: {
      title: '星の旅',
      link: 'https://comic.pixiv.net/works/42',
      description: '',
      items: [
        {
          id: '202',
          title: '旅立ち',
          url: 'https://comic.pixiv.net/viewer/stories/202',
          date: '2026-10-02T03:00:00.000Z',
        },
      ],
    },
  },
  {
    id: 'yanmaga',
    identifier: '星/旅',
    responses: {
      'https://yanmaga.jp/comics/%E6%98%9F%2F%E6%97%85?sort=older': `
        <title>星の旅</title><meta name="description" content="旅の記録" />
        <li class="mod-episode-item"><a href="/comics/stars/202"><h3>第2話 後編</h3>
          <time class="mod-episode-date">2026/09/03</time><img data-src="/covers/202.jpg" /></a></li>
        <li class="mod-episode-item"><a href="/comics/stars/101">
          <p class="mod-episode-title">第1話</p><time class="mod-episode-date">2026/09/01</time></a></li>
        <li class="mod-episode-item"><a href="/comics/stars/202"><h3>重複</h3></a></li>
        <li class="mod-episode-item"><p>公開準備中</p></li>`,
    },
    feed: {
      title: '星の旅',
      link: 'https://yanmaga.jp/comics/%E6%98%9F%2F%E6%97%85?sort=older',
      description: '旅の記録',
      items: [
        {
          id: '101',
          title: '第1話',
          url: 'https://yanmaga.jp/comics/stars/101',
          date: '2026/09/01',
        },
        {
          id: '202',
          title: '第2話 後編',
          url: 'https://yanmaga.jp/comics/stars/202',
          date: '2026/09/03',
          thumbnail: 'https://yanmaga.jp/covers/202.jpg',
        },
      ],
    },
  },
];
