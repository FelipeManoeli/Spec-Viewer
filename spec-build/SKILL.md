---
name: spec-build
version: 0.1.2
description: Render the spec-viewer HTML artifact from the current spec set
---

# /spec-build

Produces the shareable HTML viewer from the project's spec JSON files.

## Prerequisite

Read `~/.claude/skills/spec-viewer/_shared/PREAMBLE.md`.

## Steps

1. Detect the binary per the shared preamble.
2. Run:
   ```bash
   "$SV" build
   ```
3. The binary prints the output path and any warnings. Relay them verbatim.
4. If the user asks to view it: `open <output-path>/index.html` on macOS, or open via their preferred method.

## Expected exit codes

- `0`: build succeeded (possibly with warnings)
- `2`: all specs failed validation; nothing built. Suggest `/spec-validate` to see details.

## Completion

- **DONE** — `index.html` written; path reported to user.
- **DONE_WITH_CONCERNS** — built but warnings present (unknown module, missing screenshots). Show warnings.
- **BLOCKED** — no valid specs. Point user to `/spec-validate`.
