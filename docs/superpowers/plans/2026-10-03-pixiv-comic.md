# PixivコミックRSS対応 Implementation Plan

> **For agentic workers:** Execute the tasks in order using the repository's TypeScript patterns and TDD. Keep all steps on `feature/pixiv-comic-provider`.

**Goal:** Add `/pixiv-comic/<work-id>.xml`, support that route in the FreshRSS OPML generator, and subscribe work 8789 in FreshRSS after the bridge is deployed.

**Architecture:** A new Zod schema validates the public Pixiv Comic work and episode-list API. A provider fetches the public work record and episode list with same-origin browser headers, filters rows to published/readable episodes, then maps only public metadata to `MangaFeed`. The existing RSS renderer and FreshRSS importer remain the shared paths.

**Tech Stack:** TypeScript 6, Node.js 24, Zod, Vitest, Python 3 stdlib, Hono, FreshRSS CLI, Kubernetes.

## Global Constraints

- Only use public work/chapter metadata and official Pixiv Comic links.
- Do not retrieve or distribute episode content, images, purchase data, or logged-in preview API responses.
- Skip episode-list placeholders and unpublished rows; require readable state, a valid episode ID, publication timestamp, title, and official viewer path.
- Preserve existing provider behavior and do not modify generated `dist/` output by hand.
- Use `.apm/skills/manga-rss-bridge` as the source for the local registration skill; do not hand-edit generated `.agents/skills/**`.
- Register the final feed in FreshRSS category `Comic - Manga RSS`.

---

### Task 1: Add failing Pixiv provider behavior tests

**Files:**

- Modify: `src/__tests__/providers.test.ts`

**Interfaces:**

- Consumes: the proposed `pixivComicProvider.fetchFeed(workId)` provider contract.
- Produces: assertions defining how work metadata and episode rows become `MangaFeed`.

- [ ] Add a test with `vi.stubGlobal('fetch', ...)` returning a work response for `GET /api/app/works/v5/8789` and an episode response for `GET /api/app/works/8789/episodes/v2`.
- [ ] Include two readable dated episode rows and one `not_publishing` placeholder without an episode object.
- [ ] Assert title `楠木さんは高校デビューに失敗している`, official work link, author description, item IDs/titles/viewer URLs, ISO dates, and exclusion of the placeholder.
- [ ] Assert both fetches use `Origin`, `Referer`, and `X-Requested-With: XMLHttpRequest` headers.
- [ ] Run `pnpm exec vitest run src/__tests__/providers.test.ts`; expected RED: Pixiv provider import is unavailable.

### Task 2: Implement and register the Pixiv provider

**Files:**

- Create: `src/schemas/pixiv-comic.ts`
- Create: `src/providers/pixiv-comic.ts`
- Modify: `src/constants/providers.ts`
- Modify: `src/constants/http.ts`
- Modify: `src/providers/index.ts`
- Test: `src/__tests__/providers.test.ts`

**Interfaces:**

- Consumes: `Provider`, `MangaFeed`, `fetchJson`, and `tryCatch`.
- Produces: `pixivComicProvider` with ID `pixiv-comic` and route dispatch via `getProvider`.

- [ ] Define schemas for `data.official_work` (`id`, `name`, optional `author`) and `data.episodes[]` (`state`, optional episode/message). Episode metadata includes `id`, `numbering_title`, `sub_title`, nullable `read_start_at`, and `viewer_path`.
- [ ] Add provider metadata `{ id: 'pixiv-comic', siteName: 'pixivコミック', baseUrl: 'https://comic.pixiv.net' }` and HTTP header names for Origin and X-Requested-With.
- [ ] Fetch both API endpoints with browser user agent, JSON Accept, same-origin Origin/Referer, and X-Requested-With; use no cookies or authentication.
- [ ] Reject non-positive/non-numeric work IDs; filter out rows unless row state is `readable` and episode ID/title/date/viewer path are valid. Build official viewer links only from relative `/viewer/stories/` paths.
- [ ] Convert `read_start_at` milliseconds to ISO strings and format title from `numbering_title` plus non-empty `sub_title`.
- [ ] Register provider in `src/providers/index.ts`; add tests for invalid ID and malformed API response.
- [ ] Re-run the focused provider test; expected GREEN.

### Task 3: Add OPML generator support and skill guidance

**Files:**

- Modify: `.apm/skills/manga-rss-bridge/scripts/generate_freshrss_opml.py`
- Modify: `.apm/skills/manga-rss-bridge/SKILL.md`
- Modify: `.apm/skills/manga-rss-bridge/references/usage.md`
- Generated output: update via the repository's APM install/sync command if available; do not edit `.agents/skills/**` directly.
- Test: add `tests/test_generate_freshrss_opml.py` using Python `unittest`.

**Interfaces:**

- Consumes: existing `--provider`, `--feed-title`, `--category`, and `--output` options.
- Produces: provider choice `pixiv-comic`, a `--work-id` argument, and a valid OPML feed URL.

- [ ] Add `pixiv-comic` URL generation using the in-cluster base URL and `https://comic.pixiv.net/works/<work-id>`.
- [ ] Require positive decimal `--work-id` when `--provider pixiv-comic`; preserve existing Gangan and Yanmaga flag behavior.
- [ ] Add unit tests for the URL/HTML URL/description and the generated OPML category/title values.
- [ ] Update the skill source and usage reference with `/pixiv-comic/<work-id>.xml` and a `--work-id 8789` example; state that the API is public metadata only and may change.
- [ ] Regenerate `.agents/skills/manga-rss-bridge` from `.apm` source using APM tooling, if available.
- [ ] Run `python3 -m unittest discover -s tests` and verify the CLI output parses as OPML.

### Task 4: Document and run project quality gates

**Files:**

- Modify: `README.md`
- Test: all project tests.

- [ ] Add Pixiv Comic to supported providers and examples; document that the provider uses public metadata and does not fetch chapter content/images or logged-in preview endpoints.
- [ ] Run the project gates: `mise run ci` when tools are available; otherwise the equivalent `pnpm` format, lint, check, test, and build scripts.
- [ ] Build the container image and run a local HTTP smoke test for `/pixiv-comic/8789.xml`; validate RSS XML and the expected item count.

### Task 5: Deploy and register the target feed

**Files:**

- No FreshRSS database edits. Use the bundled OPML generator and FreshRSS import CLI.

- [ ] Publish/build an image using the repository's existing GHCR workflow and follow the homelab's normal image update/apply workflow; confirm the running manga-feeds pod is healthy and the new route responds HTTP 200.
- [ ] Confirm no matching subscription exists in the filtered FreshRSS export.
- [ ] Generate one-feed OPML for provider `pixiv-comic`, work ID `8789`, feed title `楠木さんは高校デビューに失敗している`, category `Comic - Manga RSS`.
- [ ] Import, actualize, and verify feed URL, category, zero fetch error, and non-zero article count through FreshRSS CLI/database metadata only.
- [ ] Remove temporary OPML files after verification.
