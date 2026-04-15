---
name: spec-init
version: 0.1.0
description: Scaffold spec-viewer config and specs folder in the current project
---

# /spec-init

Scaffolds `.claude/spec-viewer/` in the user's project with a config, an example spec, and a CONVENTIONS.md file. Run this once per project before `/spec-sync`.

## Prerequisite

Read `~/.claude/skills/spec-viewer/_shared/PREAMBLE.md` first — binary discovery, config rules, interaction patterns.

## Steps

1. **Detect the binary**:
   ```bash
   _ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
   SV=""
   [ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/spec-viewer/bin/spec-viewer" ] && SV="$_ROOT/.claude/skills/spec-viewer/bin/spec-viewer"
   [ -z "$SV" ] && SV=~/.claude/skills/spec-viewer/bin/spec-viewer
   [ -x "$SV" ] || { echo "NEEDS_SETUP"; exit 1; }
   ```

2. **Check for existing config**. If `.claude/spec-viewer/config.json` already exists, ask the user via AskUserQuestion whether to overwrite (then pass `--force`) or stop.

3. **Branding onboarding** — ask the user (one AskUserQuestion):

   > Project: `{repo}`. The spec-viewer needs a name and an accent color before scaffolding.
   >
   > RECOMMENDATION: Choose B — letting Claude scan your codebase produces a viewer that visually matches your product, which matters for stakeholder sign-off.

   Options:
   - A) Use defaults (My Project Specs, emerald green) — fastest path
   - B) Match the existing codebase (recommended) — Claude scans for design tokens
   - C) I'll specify (free text title + hex accent)
   - D) Pick from presets

   For each branch, gather `title`, `accent`, `locale`. Hand-off to `/spec-theme` Step 3a/3b/3c if helpful — that skill has the codebase-inference logic. Either run `/spec-theme` first then `init`, or gather values inline and pass them via flags.

4. **Run init with the chosen values**:
   ```bash
   "$SV" init --title "<title>" --accent "<hex>" --locale en
   ```
   Or, with a preset:
   ```bash
   "$SV" init --title "<title>" --preset emerald --locale en
   ```

5. **Report what was created** (config path, specs dir, example spec, CONVENTIONS.md, `local.json.example`, `.gitignore`, applied branding).

6. **Capture-readiness onboarding.** A built viewer with no screenshots looks broken (no thumbnails, no badges). Walk the user through capture before they hit `/spec-build`:

   a. Run `"$SV" doctor` and inspect the Playwright section.
      - If `! browser binary missing` or `! package not installed`, surface the exact `Fix:` line via AskUserQuestion:
        > Capture (annotated screenshots) needs Playwright + chromium. They aren't installed yet. The fix is `<copied command>` (~300MB download, ~1 minute).
        > A) Install now (recommended)  B) Skip — I'll capture later

   b. If Playwright is ready, ask about the dev server:
      > Do you have a dev server running for this project? Capture needs it (otherwise the viewer renders with placeholder boxes and no real screenshots).
      > A) Yes, it's running at <baseUrl>  B) No — I'll capture later  C) Walk me through starting it (look at package.json scripts and propose the dev command)

   c. If both Playwright AND a dev server are ready, chain into `/spec-capture` immediately so the user sees a populated viewer on first build.

   d. Otherwise, run `"$SV" build` so the user gets *something* to look at — the viewer now shows an empty-state CTA banner pointing at `/spec-capture` so the next steps are obvious.

7. **Tell the user what's next**: either "your viewer is at `<output>/index.html`" (capture ran) or "run `/spec-capture` once your dev server is up, then `/spec-build`" (capture skipped).

## Completion

- **DONE** — config + specs dir + example + conventions all exist with user-confirmed branding; capture either ran or user knows the exact next step (with install commands if needed).
- **DONE_WITH_CONCERNS** — capture skipped because Playwright or dev-server not ready; user has the install/start commands.
- **BLOCKED** — binary missing; tell user to run `./setup` in the spec-viewer repo.
