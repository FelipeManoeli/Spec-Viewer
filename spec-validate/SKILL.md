---
name: spec-validate
version: 0.1.0
description: Check spec files and config against the schema
---

# /spec-validate

Runs schema validation over every spec file and the config. Exits non-zero if anything fails.

## Prerequisite

Read `~/.claude/skills/spec-viewer/_shared/PREAMBLE.md`.

## Steps

1. Detect the binary per the shared preamble.
2. Run:
   ```bash
   "$SV" validate
   ```
3. On success: report count of valid specs.
4. On failure: show each invalid file and its specific errors (the binary already formats them as problem/cause/fix).

## Completion

- **DONE** — all specs valid.
- **BLOCKED** — one or more specs invalid. Show errors; ask the user whether to edit manually or (once v0.2 ships) re-run `/spec-sync` to regenerate.
