# Manga RSS Bridge Agent Guide

Use [README.md](README.md) as the source of truth for product overview, setup, provider list, command details, and verification scope.
This file is the short repository-local workflow guide for agents.

## First Actions

- Read `AGENTS.md` first when your runtime routes through it, then this file, then linked source documents.
- Check `git status --short` before editing. Preserve unrelated user or generated changes.
- Prefer existing files and local patterns. Keep changes scoped to the requested task.
- Default type verification before finishing: `mise run check`.
- Use `mise run ci` when broad confidence, PR handoff, release, or build-output validation matters.
- If mise is unavailable, fall back to the matching `pnpm` scripts.

## Source Of Truth

| Target | Source of truth | Use |
| --- | --- | --- |
| Agent runtime entry | [AGENTS.md](AGENTS.md) | Thin router for runtimes that read `AGENTS.md` before repository-local guidance |
| Agent workflow and source routing | [CLAUDE.md](CLAUDE.md) | Repository-local workflow, quality gates, and source ownership |
| Product scope, setup, usage, supported providers | [README.md](README.md) | User-facing overview, examples, commands, and policy |
| Tool versions and scripts | [mise.toml](mise.toml) and [package.json](package.json) | Toolchain versions, mise task aliases, package manager, Node engine, scripts, and dependency contract |
| Runtime constants | `src/constants/*.ts` | Shared literals such as headers, provider IDs, and stable defaults |
| Test fixtures | `src/fixtures/*.ts` | Reusable sample inputs for tests and parser coverage |
| Runtime schemas | `src/schemas/*.ts` | Zod schemas for external provider responses and runtime boundaries |
| Result boundary | `src/lib/result.ts` and provider `fetchFeed` contracts | Provider errors should be returned as `Result`, not leaked as uncaught exceptions |
| RSS rendering | `src/lib/rss.ts` | XML escaping, RSS shape, guid, and pubDate formatting |
| Provider registry | `src/providers/index.ts` | Public provider IDs and dispatch routing |
| Generated artifacts | `dist/` | Build output only; do not edit directly |

## Quality Gates

- `mise run check` is the TypeScript type gate.
- `mise run ci` is the full aggregate gate and runs `format:check`, `lint`, `check`, `test`, and `build`.
- `mise run format` applies Biome formatting.
- `mise run format:check` and `mise run lint` are the Biome read-only gates.
- `mise run format`, `mise run format:check`, `mise run lint`, `mise run lint:fix`, `mise run check`, `mise run test`, `mise run build`, and `mise run dev` map to the existing package scripts.
- If mise is unavailable, use the equivalent `pnpm` script directly.
- Before publishing or Docker handoff, also build the Docker image or document why it was not run.

## High-Signal Rules

- Prefer TypeScript over Python for new OSS code in this repository.
- Prefer `type` aliases for object shapes, unions, and contracts. Use `interface` only for declaration merging or external augmentation.
- Keep external provider response validation in Zod schemas under `src/schemas/*.ts`.
- Derive runtime-boundary types from schemas with `z.infer` or `z.output`.
- Provider implementations should return `Result<MangaFeed, Error>` through the provider contract.
- Avoid `as` assertions except at narrow boundary points after validation or filtering.
- Do not add code that bypasses authentication, paid content, DRM, or access controls.
- Keep provider fetch intervals and README wording respectful of source-site terms.
- Put temporary research artifacts under `tmp/` when this repository has one; otherwise use `/tmp` and do not commit generated OPML or scraped dumps.

## Provider Pattern

When adding a provider:

1. Add a schema file in `src/schemas/<provider>.ts` for the external JSON boundary, if the provider uses JSON.
2. Add `src/providers/<provider>.ts` implementing `Provider`.
3. Register it in `src/providers/index.ts`.
4. Add README examples and policy notes if user-facing behavior changes.
5. Add focused Vitest coverage for RSS rendering or provider parsing helpers. Prefer fixtures over live network tests.
6. Run `mise run ci`, or the equivalent `pnpm` scripts if mise is unavailable.

## Task Tracking

- Keep durable user-facing changes in README or release notes when those files exist.
- Do not grow TODO-style docs unless the repository has an explicit TODO file.
- If a durable answer is a rule, update this file instead of burying it in implementation notes.
