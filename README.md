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
- pixivコミック: `/pixiv-comic/<work-id>.xml`

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
http://localhost:8080/pixiv-comic/8789.xml
```

The Pixiv Comic provider reads publicly exposed work and episode metadata only. It links to the official viewer and does not fetch episode text, images, or login-required preview data; Pixiv may change its undocumented web API.

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
pnpm test:opml
pnpm build
```

`pnpm test` runs the service TypeScript suite. `pnpm test:opml` runs the offline
TypeScript OPML generator suite, including the standalone Node.js 24.3+ (24.x) CLI.
Node 24.3 is the minimum because earlier releases emit type-stripping warnings
and do not satisfy the CLI test contract. CI checks both 24.3.0 and 24.19.0.
Neither suite requires Python. `pnpm check` typechecks the service, generator,
and tests; `pnpm build` still emits only the service under `dist/`.

Use `mise run ci` for the full format, lint, typecheck, service test,
OPML test, and build gate. Install dependencies first with
`mise exec -- pnpm install --frozen-lockfile`.
Pull requests run this same aggregate gate in the read-only CI workflow.
Stale or missing dependencies fail before scripts run. Run the explicit install
command above after a dependency change; quality gates do not implicitly install
packages from parallel formatter or linter tasks.

### Diagnosing a slow CI gate

Record the OS, shell, `mise --version`, `mise exec -- node --version`, and
`mise exec -- pnpm --version`. A missing `pnpm` outside mise does not establish
why a mise task timed out.

Run the gate with labelled output and a bounded execution time:

```bash
mise run --output prefix --timeout 2m ci
```

If it stalls, run each leaf task separately with the same options:
`format:biome:check`, `lint:md`, `lint:biome`, `check`, `test`, `test:opml`, and
`build`. Keep the full output, elapsed times, and exit status. Compare
`mise run --jobs 1 --output prefix --timeout 2m ci` if the individual tasks pass
but the aggregate stalls. A timeout or task-start message is not a successful
gate; keep the original environment's failure open until it is reproduced or
verified there.

## FreshRSS OPML

The bundled generator creates an OPML file for one manga title. It defaults to
this user's `Comic - Manga RSS` category. Use `--category changedetection.io`
only when quarantine is explicitly requested; other setups can pass their own
category. Generating a file does not change existing FreshRSS feeds or categories.

```bash
node .apm/skills/manga-rss-bridge/scripts/generate_freshrss_opml.mts \
  --provider pixiv-comic \
  --work-id 8789 \
  --feed-title "楠木さんは高校デビューに失敗している" \
  --output /tmp/manga-feed.opml
```

Before an authorized import, check for the exact subscription URL to avoid
registering it twice. Follow the [FreshRSS operations guide](.apm/skills/manga-rss-bridge/references/usage.md#freshrss-homelab-operations)
for single-title import, refresh scope, and target-feed-only article checks.
The guide is the source of truth for copied skills and consumer documentation.

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
