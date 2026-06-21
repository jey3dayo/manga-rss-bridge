# manga-rss-bridge

Self-hosted RSS bridge for manga chapter feeds.

This project turns public manga work/chapter metadata into RSS feeds that can be
subscribed to from readers such as FreshRSS. It is intended for personal,
self-hosted use.

## Supported Providers

- Gangan ONLINE: `/gangan-online/<title-id>.xml`
- カドコミ / ComicWalker: `/kadocomi/<work-code>.xml`

Examples:

```text
http://localhost:8080/gangan-online/2061.xml
http://localhost:8080/kadocomi/KC_000733_S.xml
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

## Policy

This is an unofficial bridge. It does not bypass authentication, paid content,
DRM, or access controls. It only emits RSS from publicly available work/chapter
metadata. Users are responsible for respecting each source site's terms and for
setting reasonable fetch intervals.
