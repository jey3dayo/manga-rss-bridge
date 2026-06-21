# manga-rss-bridge

Self-hosted RSS bridge for manga chapter feeds.

This project turns public manga work/chapter metadata into RSS feeds that can be
subscribed to from readers such as FreshRSS. It is intended for personal,
self-hosted use.

## Supported Providers

- Gangan ONLINE: `/gangan-online/<title-id>.xml`
- カドコミ / ComicWalker: `/kadocomi/<work-code>.xml`
- コミックDAYS: `/comic-days/<series-id>.xml`
- ヤンマガWeb: `/yanmaga/<comic-slug>.xml`
- マンガワン: `/manga-one/<chapter-id>.xml`
- がうがうモンスター＋: `/gaugau/<work-id>.xml`
- ファイアCROSS: `/firecross/<series-id>.xml`
- ジャンプルーキー！: `/jump-rookie/<series-id>.xml`
- ハヤコミ: `/hayacomic/<series-id>.xml`
- マンガボックス: `/mangabox/<reader-id>.xml`

Examples:

```text
http://localhost:8080/gangan-online/2061.xml
http://localhost:8080/kadocomi/KC_000733_S.xml
http://localhost:8080/comic-days/10834108156754578626.xml
http://localhost:8080/yanmaga/%E3%81%AD%E3%81%9A%E3%81%BF%E3%81%AE%E5%88%9D%E6%81%8B.xml
http://localhost:8080/manga-one/157056.xml
http://localhost:8080/gaugau/5f500f137765618260000000.xml
http://localhost:8080/firecross/331.xml
http://localhost:8080/jump-rookie/zGZPbQ9GPgM.xml
http://localhost:8080/hayacomic/a947a3d0ec0a1.xml
http://localhost:8080/mangabox/251785.xml
```

## Development

```bash
pnpm install
pnpm dev
```

Check a feed:

```bash
curl http://localhost:8080/gangan-online/2061.xml
```

## Scripts

```bash
pnpm check
pnpm test
pnpm build
```

## Docker

```bash
docker build -t manga-rss-bridge .
docker run --rm -p 8080:8080 manga-rss-bridge
```

## GitHub Container Registry

Images are published to GHCR from `main` and `v*.*.*` tags.

```bash
docker pull ghcr.io/jey3dayo/manga-rss-bridge:latest
docker run --rm -p 8080:8080 ghcr.io/jey3dayo/manga-rss-bridge:latest
```

## Policy

This is an unofficial bridge. It does not bypass authentication, paid content,
DRM, or access controls. It only emits RSS from publicly available work/chapter
metadata. Users are responsible for respecting each source site's terms and for
setting reasonable fetch intervals.
