# AGENTS.md

## Overview

Use `./CLAUDE.md` as the master document for repository-local agent instructions.

## Instructions

- Read order for repository-local guidance: `AGENTS.md` -> `CLAUDE.md` -> linked documents from `CLAUDE.md`.
- Keep this file as a thin router only.
- Definition of Done quality checks follow this project's quality gate checklist: prefer `mise run check` once `mise.toml` is available; run `mise run ci` for full local confidence. Use the matching `pnpm` scripts only when mise is unavailable.
- Put day-to-day agent guidance, coding standards, workflows, and project-rule links in `CLAUDE.md`.
- For product, architecture, commands, and verification scope, use `README.md` as the source of truth after reading `CLAUDE.md`.
- If a configured external notification tool is unavailable in the current agent runtime, report that limitation instead of blocking the task.
- Do not deviate from `CLAUDE.md` or the documents it routes to unless explicitly instructed.
