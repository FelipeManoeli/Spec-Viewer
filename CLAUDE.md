# spec-viewer — agent conventions

Rules for agents working inside this repo.

## Architecture

- **`packages/core`** is pure. No filesystem, no network, no env. All I/O lives in the CLI.
- **`cli/`** is the only place that reads/writes files. Commands in `cli/src/commands/*.ts`; shared helpers in `cli/src/lib/*.ts`.
- **`spec-init/`, `spec-build/`, `spec-capture/`, `spec-validate/`, `spec-theme/`, `spec-sync/`** — each is a top-level dir with one `SKILL.md` inside. The `setup` script symlinks each into `~/.claude/skills/<name>/SKILL.md` so Claude Code discovers it. New skill = new top-level dir; the dir name IS the slash command.
- **`_shared/`** holds invocation conventions every skill reads (currently `PREAMBLE.md`).
- **`fixtures/synthetic/`** is shipped test data. Don't use it as a scratchpad.

## Testing

- Vitest. Unit tests next to the source they cover (`packages/core/tests/`).
- Every bug fix gets a test that would have caught it.
- Do not mock what you can test for real (the fixture-build integration test is the canonical example).
- Run: `npm test` at repo root.

## Error messages

Every user-facing failure uses the `UserError` shape from `cli/src/lib/errors.ts`:
- problem (what)
- cause (why)
- fix (how to resolve)

No raw stack traces reaching the user. No `Error: ENOENT`.

## Schema changes

The spec schema is load-bearing. Before changing:

1. Bump `SCHEMA_VERSION` in `packages/core/src/schema/types.ts`.
2. Update `schema.json` to match.
3. Write a migrator in `packages/core/src/schema/migrate/<from>-to-<to>.ts`.
4. Add fixture specs exercising the old shape.
5. Update docs + CHANGELOG.

## XSS

All strings from specs (labels, descriptions, business rules, error messages, titles) are rendered via `escapeHtml` in `packages/core/src/builder/build.ts`. The `details.rawHtmlAllowed` flag is the only opt-out; it must not be defaulted on.

The XSS test in `packages/core/tests/build.test.ts` is a regression guard. Do not delete it.

## TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. Keep them on.
- Prefer `readonly` and discriminated unions over generic `any`.
- When adding a new field to the schema: add to `types.ts`, `schema.json`, and `validate.ts` in the same PR.

## Commits

- One subject line, lowercase tag, imperative. See `~/.claude/rules/commit-style.md` if uncertain.
- Specific tag over generic `feat:`. Reach for `add:`, `fix:`, `refactor:`, `docs:`, `chore:`.

## Not yet implemented (v0.2+)

- `spec-viewer sync` (the reconciliation loop) — design locked in [notes/spec-sync-design.md](../notes/spec-sync-design.md).
- Cookie / OAuth / basic auth strategies for `spec-viewer capture` (v0.1 supports `none`).
- Bun-compiled single-file binary.
- Features tab UI (renders empty state when no feature hierarchy).
- MCP server.
- i18n beyond en/ja fallback.

## Capture conventions

- `spec-viewer capture` writes screenshots to `config.paths.screenshots` (default `spec-viewer-output/screenshots/`) and per-screen reports to `config.paths.coverage` (default `spec-viewer-output/reports/`). Reports are named `<screen>-report.json` and include `foundCoords` for badge placement.
- `spec-viewer build` looks in those same paths automatically — no flags needed.
- Playwright is an `optionalDependencies` entry in `cli/package.json`. Build/init/validate must work without it.
- Browser-context code in `cli/src/lib/annotator.ts` and `cli/src/lib/auth.ts` is serialised by Playwright. Do NOT import Node modules inside those callbacks.

## Auth conventions

- Three strategies live in `cli/src/lib/auth.ts`: `none`, `form`, `storage`. The capture command dispatches once before the per-spec loop on the same `BrowserContext`/`Page` so the resulting session sticks for every screen.
- Adding a new strategy: extend the `authStrategy` union in `packages/core/src/schema/types.ts`, update `validateConfig`'s enum check, add a runner branch in `runAuth`, document in `/spec-capture` SKILL.md.
- Auth values containing `${ENV_VAR}` references are substituted at config-load time (`cli/src/lib/merge.ts`). Don't re-substitute downstream.

## Config split conventions

- Two-file model: `<dir>/config.json` (committed) + `<dir>/local.json` (gitignored). `local.json` deep-merges over `config.json`. Arrays replace, objects merge.
- `loadConfig` substitutes env vars AFTER the merge. A value can be a `${VAR}` reference in either file.
- Discovery only looks for `local.json` (and `spec-viewer.local.json`/`local.ts`/`spec-viewer.local.ts`) in the SAME DIRECTORY as the committed config. Don't add cross-directory lookup — it complicates the mental model.
- `spec-viewer config set` writes only to the committed file. For local-only edits the user (or a skill) must edit `local.json` directly.

If a user asks for these in v0.1, point them at the plan and offer the manual authoring path.
