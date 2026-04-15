---
name: spec-theme
version: 0.1.0
description: Configure project name, accent color, and locale. Pick a preset, infer from the existing codebase, or set custom values.
---

# /spec-theme

Interactive theming for the spec-viewer. Use any time the user wants to change the project title, accent color, or locale. The skill never edits config files directly — every change flows through `spec-viewer config set` so the schema validator runs and bad values are caught early.

## Prerequisite

Read `~/.claude/skills/spec-viewer/_shared/PREAMBLE.md`.

## Step 1 — Show current config

Detect the binary, print current branding via the formatted-output mode:

```bash
"$SV" config get
```

Pull `branding.title`, `branding.accentColor`, `branding.locale` out of the JSON for the next prompt.

## Step 2 — Ask the user how they want to theme

Use AskUserQuestion. Re-ground the user, simplify the choice, recommend explicit-explore as the default:

> Project: `{repo}` · current title: `{title}` · accent: `{accent}` · locale: `{locale}`.
>
> How do you want to theme the spec-viewer?
>
> RECOMMENDATION: Choose B if your project already has a defined visual style — using existing tokens makes the spec viewer feel native to your brand. Choose A if you want to ship something quickly. Choose C only if you have specific values in mind.

Options:
- A) Pick from presets (8 curated palettes)  *(Completeness: 7/10)*
- B) Infer from this codebase (recommended)  *(Completeness: 10/10)*
- C) Enter custom values

## Step 3a — Presets path

Run:
```bash
"$SV" config presets
```

Show the list to the user and ask via AskUserQuestion which preset to apply. Recommend `emerald` if they have no preference (it's the proven Matilda default).

Apply the chosen preset:
```bash
"$SV" config apply-preset <id>
```

Optionally also offer to update the title and locale:
```bash
"$SV" config set branding.title "<New Title>"
"$SV" config set branding.locale en   # or ja
```

## Step 3b — Codebase inference (recommended)

Look for project styling sources, in this order. Stop at the first hit, but always verify with the user before applying.

1. **Tailwind v3 config**: `tailwind.config.{js,ts,cjs,mjs}` — look for `theme.colors.primary`, `theme.extend.colors.brand`, or any obvious brand color.
2. **Tailwind v4 / shadcn**: `app/globals.css`, `src/index.css`, or any CSS file with `@theme` blocks or `--primary`, `--accent`, `--brand` custom properties.
3. **Styled-components / theme files**: `src/theme.{ts,js}`, `theme.config.*`, `*.theme.{ts,js}` — look for an exported `theme.colors.primary` or similar.
4. **Plain CSS variables**: any `.css` file with `:root { --primary: ...; }` patterns.
5. **package.json**: pull the project name as a candidate for the spec-viewer title.

Use Glob + Grep, do NOT scan `node_modules`, `dist`, `build`, `.next`, `vendor`, `coverage`.

Synthesize a proposal:

> I scanned the codebase and found:
>   - Title: "{name}" (from package.json)
>   - Accent: `{hex}` ({source location})
>   - Locale: `{en|ja}` (inferred from default text language, or unchanged)
>
> Apply these values?

If yes:
```bash
"$SV" config set branding.title "<title>"
"$SV" config set branding.accentColor "<hex>"
# locale only if changed
"$SV" config set branding.locale en
```

If no candidates found, fall back to presets (Step 3a) and tell the user why ("no Tailwind config, no theme files, no design tokens found").

## Step 3c — Custom values

Ask via AskUserQuestion (one field at a time if necessary, or a single combined prompt if the user is ready):
- Title (free text)
- Accent (hex like `#10b981`, validated by the binary)
- Locale (en | ja)

Apply each via `"$SV" config set ...`. The binary will reject an invalid hex with a clear error — relay it.

## Step 4 — Rebuild and confirm

After any change, suggest the user run `/spec-build` to regenerate the viewer with the new theme. If they say yes, run it.

## Completion

- **DONE** — config updated; user has the new branding visible in the rebuilt viewer.
- **DONE_WITH_CONCERNS** — partial update (e.g., title applied, color skipped because no valid candidate). List what landed and what didn't.
- **BLOCKED** — config is TS-format and `set` refuses to edit it. Tell the user to convert to JSON or edit the TS file by hand.
