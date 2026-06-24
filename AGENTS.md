# peck-cli

Spec-driven development CLI. ESM-only Node.js package built with tsup.

## Commands

| Command | Description |
|---|---|
| `peck init` | Scaffolds `.opencode/` with agents, skills, config |
| `peck update` | Syncs agents/skills to latest bundled versions (with `.bak` backups), bumps `peck.json` version |
| `peck story create <name>` | Creates branch `NNN-slug`, story dir, outputs JSON |
| `peck story list` | Lists all stories from `stories/` |
| `peck story load <id>` | Checks out story branch, outputs JSON with `FILES` |
| `peck code-review commit` | Reads report from stdin, commits empty review commit |
| `peck acceptance-review commit` | Same, with `review(acceptance):` prefix |

## Build & test

```
npm run build       # tsup → dist/index.js (ESM bundle)
npm test            # build first, then vitest run
npm run test:watch  # vitest watch mode (no build)
npm run dev         # tsup --watch
```

Tests assume `dist/index.js` exists — always build first. Tests require git (create tmp repos via `git init`).

## Architecture

- **Entrypoint**: `src/index.ts` — commander CLI, 5 command modules
- **Commands**: `src/commands/init.ts`, `update.ts`, `story.ts`, `review.ts`
- **Lib**: `src/lib/git.ts` (git helpers), `config.ts` (`.opencode/peck.json`), `assets.ts` (shared agent/skill maps + `installFiles`), `fatal.ts`
- **Assets**: `src/assets/agents/*.md`, `templates/*.md`, `skills/reflect/SKILL.md` — bundled as strings via tsup `text` loader
- **Story dirs**: `stories/<NNN-slug>/story.md`
- **Product file**: `docs/product.md`
- **Peck config**: `.opencode/peck.json` (`version`, `default_branch`)
- **OpenCode config**: `.opencode/opencode.jsonc` — disables default `plan`/`build` agents, adds subagent-completion plugin

## Review system

- Both `code-review commit` and `acceptance-review commit` read report markdown from stdin
- Verdict detection: bold `**Pass**`/`**Fail**` preferred, last occurrence wins; falls back to bare `pass`/`fail`
- Review commits are **empty** (same tree as HEAD) via `git commit-tree` — staged files stay staged
- Failures print full report to stdout; passes print summary only

## Verdict detection order (in `src/commands/review.ts`)

1. Bold `**Pass**` / `**Fail**` tokens (last wins)
2. Bare `pass` / `fail` words (fallback, last wins)
3. Any match before none (`null` = Unknown)

## Quirks

- No lint or typecheck scripts in `package.json`
- `*.md` files are imported as strings (tsup `text` loader, declared in `src/types/md.d.ts`)
- `CANDIDATE_BRANCHES` for auto-detection: `['master', 'main', 'dev']`
- `--no-gpg-sign` flag used in test git commits (test env may lack GPG)
- Story branches truncated to 244 chars
- `peck init` is idempotent — skips existing files
- `peck update` overwrites agents/skills with latest bundled content; saves the previous version to `<name>.bak` (only when content differs); bumps `peck.json` version, preserves `default_branch`; never touches `opencode.jsonc`; requires an existing `peck.json` (run `peck init` first)

## Benchmarks

See `benchmarks/AGENTS.md`. Run via `benchmarks/run.sh` or `run-parallel.sh`.
