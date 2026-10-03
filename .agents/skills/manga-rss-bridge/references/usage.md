# Manga RSS Bridge Usage

Manga RSS Bridge turns public manga work and chapter metadata into RSS feeds for self-hosted use. Users subscribe to provider-specific XML routes from an RSS reader such as FreshRSS.

## Quick Start

Install dependencies and start the local server:

```bash
pnpm install
pnpm dev
```

Open or request a feed:

```bash
curl http://localhost:8080/gangan-online/2061.xml
```

## Provider Routes

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

## Docker

Build and run locally:

```bash
docker build -t manga-rss-bridge .
docker run --rm -p 8080:8080 manga-rss-bridge
```

Run the GHCR image:

```bash
docker pull ghcr.io/jey3dayo/manga-rss-bridge:latest
docker run --rm -p 8080:8080 ghcr.io/jey3dayo/manga-rss-bridge:latest
```

## Common Checks

```bash
pnpm check
pnpm test
pnpm build
```

When mise is available, prefer:

```bash
mise run check
mise run ci
```

## Policy

This is an unofficial bridge for personal self-hosted use. It must not bypass authentication, paid content, DRM, or access controls. It should only read publicly available work or chapter metadata, and users should set reasonable fetch intervals.

## FreshRSS Homelab Operations

Use this section when adding, verifying, quarantining, or troubleshooting manga chapter feeds for FreshRSS through the homelab `manga-feeds` service.

Expected outcome: one FreshRSS feed per manga title, where each chapter appears as a separate RSS item. Do not use changedetection.io RSS for chapter-level manga feeds; changedetection.io is only for coarse page-change alerts.

For this user, default new `manga-feeds` subscriptions to `Comic - Manga RSS`. Use `changedetection.io` only when quarantine is explicitly requested. Other FreshRSS setups can choose a category with `--category`; do not treat quarantine as this user's default. Never move existing feeds or categories automatically, through either the UI or the database.

FreshRSS subscription URLs:

```text
http://manga-feeds.freshrss.svc.cluster.local:8080/gangan-online/<title-id>.xml
http://manga-feeds.freshrss.svc.cluster.local:8080/yanmaga/<slug>.xml
http://manga-feeds.freshrss.svc.cluster.local:8080/pixiv-comic/<work-id>.xml
```

Provider notes:

- Gangan ONLINE: title ID comes from `https://www.ganganonline.com/title/<title-id>`.
- ヤンマガWeb: slug comes from `https://yanmaga.jp/comics/<slug>`.
- Pixivコミック: work ID comes from `https://comic.pixiv.net/works/<work-id>`. The provider uses only the publicly exposed work/episode metadata APIs, does not fetch episode content or images, and does not use login-required preview APIs. The site's internal API may change.

Check service reachability:

```bash
kubectl -n freshrss get deployment,svc,pod -l app=manga-feeds
kubectl -n freshrss run manga-feeds-check --rm -i --restart=Never \
  --image=curlimages/curl:8.11.1 -- \
  curl -fsS http://manga-feeds:8080/<provider>/<identifier>.xml
```

Set the target account and exact subscription URL, then check whether it is
already registered. For the homelab SQLite setup, this read-only query prints
only matching feed IDs, names, and categories. It does not export unrelated feeds
or URLs that may contain private tokens. Replace the example account and URL
before running it; keep them for the import and verification below.

```bash
freshrss_user='<user>'
feed_url='http://manga-feeds.freshrss.svc.cluster.local:8080/pixiv-comic/8789.xml'
kubectl -n freshrss exec deployment/freshrss -- php -r '
$path = "/var/www/FreshRSS/data/users/" . $argv[1] . "/db.sqlite";
if (!is_file($path)) { throw new RuntimeException("User database not found"); }
$db = new PDO("sqlite:" . $path);
$db->exec("PRAGMA query_only = ON");
$q = $db->prepare("SELECT f.id, f.name, c.name AS category FROM feed f LEFT JOIN category c ON c.id = f.category WHERE f.url = ?");
$q->execute([$argv[2]]);
foreach ($q as $r) { echo $r["id"] . "|" . $r["name"] . "|" . $r["category"] . "\n"; }
' "$freshrss_user" "$feed_url"
```

If a match exists, skip the import and verify that feed. Do not re-register or
move it to another category automatically. Multiple matches or a failed query
require investigation; only a successful query with no matches permits a new
single-title import. For a non-SQLite setup, check that exact URL in the FreshRSS
subscription UI instead of applying these SQL examples.

Generate OPML with the bundled TypeScript script on a machine with Node.js 24.3+ (24.x).
Check `node --version` first. The script uses only Node built-ins, so a copied
skill does not need `pnpm install`, a build, or a global TypeScript runner.
The `.mts` extension keeps it usable in both ESM and CommonJS projects.
Run it from the skill directory, or replace the script path with its full path.
In this repository, that path is
`.apm/skills/manga-rss-bridge/scripts/generate_freshrss_opml.mts`.
Node availability on the homelab/Pi is not assumed: generate the file on your
Node-equipped workstation and then copy it to FreshRSS as shown below.

The CLI options are unchanged, and the default category is now `Comic - Manga RSS`.
Existing commands need to replace `python3` with `node` and the `.py` suffix with
`.mts`. The example omits `--category` to use the default; add
`--category changedetection.io` only for an explicitly requested quarantine.

```bash
node scripts/generate_freshrss_opml.mts \
  --provider pixiv-comic \
  --work-id 8789 \
  --feed-title "楠木さんは高校デビューに失敗している" \
  --output /tmp/manga-feed.opml
```

After import is authorized and the duplicate check is clear, confirm the generated
OPML contains only the requested title and exact `xmlUrl`. Import that file for
the selected account; never substitute a full OPML export or import unrelated feeds:

```bash
pod=$(kubectl -n freshrss get pod -l app=freshrss \
  --field-selector=status.phase=Running \
  -o jsonpath='{.items[0].metadata.name}')
kubectl -n freshrss cp /tmp/manga-feed.opml "$pod:/tmp/manga-feed.opml"
kubectl -n freshrss exec "$pod" -- \
  php /var/www/FreshRSS/cli/import-for-user.php \
    --user="$freshrss_user" \
    --filename=/tmp/manga-feed.opml
```

Refresh and verify only the target feed from the FreshRSS UI when that is the
requested scope. The CLI command below refreshes the selected **account**, not
one feed; use it only when an account-wide refresh has been explicitly approved.
Check the installed CLI's `--help` before relying on version-specific feed filters.

```bash
kubectl -n freshrss exec deployment/freshrss -- \
  php /var/www/FreshRSS/cli/actualize-user.php --user="$freshrss_user"
```

After the requested refresh, verify the target feed's category and article count
using exact URL equality. This query does not print article bodies or unrelated
subscriptions. Do not hard-code the historical count of 12 articles: public
availability can change. Inspect that feed's recent chapter titles and official
links in the UI if further verification is needed.

```bash
kubectl -n freshrss exec deployment/freshrss -- php -r '
$path = "/var/www/FreshRSS/data/users/" . $argv[1] . "/db.sqlite";
if (!is_file($path)) { throw new RuntimeException("User database not found"); }
$db = new PDO("sqlite:" . $path);
$db->exec("PRAGMA query_only = ON");
$q = $db->prepare("SELECT f.id, f.name, c.name AS category, COUNT(e.id) AS articles FROM feed f LEFT JOIN category c ON c.id = f.category LEFT JOIN entry e ON e.id_feed = f.id WHERE f.url = ? GROUP BY f.id, f.name, c.name");
$q->execute([$argv[2]]);
foreach ($q as $r) { echo $r["id"] . "|" . $r["name"] . "|" . $r["category"] . "|" . $r["articles"] . "\n"; }
' "$freshrss_user" "$feed_url"
```

Safety notes:

- Do not print full FreshRSS OPML exports.
- Do not commit generated OPML files.
- Do not delete existing changedetection.io feeds or move existing categories automatically.
- OPML/import/refresh examples are instructions for authorized operations, not a request to repeat an existing registration.
- This repo-local guide is the source of truth. Refresh downstream skill copies through APM after publishing source changes; do not hand-edit generated copies.
