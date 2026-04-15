---
name: spec-sync
version: 0.1.1
description: Reconcile screen specs against the frontend code. Walk routes, extract elements, fill semantics, propose a unified diff for user review.
---

# /spec-sync

The reconciliation loop. This is why you installed spec-viewer.

**v0.1 status:** skill surface only. The underlying algorithm is locked in [notes/spec-sync-design.md](../../../notes/spec-sync-design.md) but the `$SV sync` subcommand is not yet implemented. Until then, this skill produces a clear "not yet implemented, use manual authoring" message. Do not improvise.

## Prerequisite

Read `~/.claude/skills/spec-viewer/_shared/PREAMBLE.md`.

## Steps (v0.1 — stub)

1. Detect the binary per the shared preamble.
2. Run:
   ```bash
   "$SV" --help 2>&1 | grep -q "^  sync" || echo "NOT_IMPLEMENTED"
   ```
3. If `NOT_IMPLEMENTED`: tell the user "`$SV sync` is not yet available in v0.1. For now, author spec JSON files manually in `.claude/spec-viewer/specs/` following the schema, then run `/spec-build`. Automated sync lands in v0.2."
4. Do not attempt to hand-write specs on the user's behalf unless they explicitly ask; that's the v0.2 flow.

## Steps (v0.2+ — planned)

1. Run `$SV sync` (dry-run). Reads config, walks routes via ts-morph, extracts elements, calls the semantic-filling agent, writes proposals to `specs-proposed/` + `sync-report.json`.
2. Read `sync-report.json`. Present a single unified diff summary to the user via AskUserQuestion:
   - X screens new, Y modified, Z removed (flagged only), N user-protected proposals
   - Per-screen counts of business rules added / error messages added
3. Offer three options:
   - **Apply** → `$SV sync --apply`
   - **Apply and prune** (delete flagged-removed) → `$SV sync --apply --prune`
   - **Skip** — leave the proposals in `specs-proposed/` for manual review
4. Report outcome.

## Completion

- **DONE** — proposals written (dry-run) or applied per user choice.
- **NEEDS_CONTEXT** — config missing; route `$SV init` first.
- **BLOCKED** — v0.1 stub path: tell user manual authoring is the current path.
