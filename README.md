# Spec Viewer

Living documentation for your app. Claude maintains the screen specs; you ship a self-contained HTML viewer of every screen, every interactive element, every business rule.

## Skills

| Command | Purpose |
| --- | --- |
| `/spec-init` | Scaffold spec-viewer config + specs folder in the current project (interactive: branding, locale) |
| `/spec-theme` | Change the project name, accent color, locale. Pick a preset, infer from the codebase, or set custom values |
| `/spec-capture` | Drive a real browser via Playwright: navigate every spec, inject numbered badges, screenshot, write coverage report. Auth-aware (form login + storage). |
| `/spec-build` | Render the standalone HTML viewer from your specs (auto-loads any capture artefacts) |
| `/spec-validate` | Check every spec and the config against the schema |
| `/spec-sync` | (v0.2 — design locked, impl pending) Walk the frontend with `ts-morph`, diff against existing specs, propose updates |

## Install — 30 seconds

**Requirements:** [Claude Code](https://docs.anthropic.com/en/docs/claude-code), Node >= 20, `npm`. Playwright is auto-installed as an optional peer dep (only needed for `/spec-capture`).

Open Claude Code and paste:

> Install spec-viewer: run **`git clone --single-branch --depth 1 git@github.com:FelipeManoeli/Spec-Viewer.git ~/.claude/skills/spec-viewer && cd ~/.claude/skills/spec-viewer && ./setup`** then tell me when it's ready. The skills are `/spec-init`, `/spec-theme`, `/spec-capture`, `/spec-build`, `/spec-validate`, and `/spec-sync`. Once installed, restart the Claude Code session so it picks up the new skills.

That's it. Each skill is registered at `~/.claude/skills/<name>/SKILL.md` via symlink — `git pull && ./setup` upgrades cleanly.

## Quickstart in your project

```bash
# In your repo (any TypeScript / JavaScript app)
/spec-init
# → asks: project name, accent color (preset / infer-from-codebase / custom), locale
# → writes .claude/spec-viewer/{config.json, CONVENTIONS.md, specs/home.json, .gitignore}

/spec-build
# → renders spec-viewer-output/index.html. Open it in your browser.

# Optional — capture annotated screenshots from a running dev server:
/spec-capture
# → if the app has a login wall, the skill scans your codebase for the login form
#   and proposes auth config (selectors in committed config, credentials in gitignored local override)
```

## How it works

- **Self-contained HTML output.** One ~37KB `index.html` per build. No framework, no server, no DB. Drop it on S3 or any static host. This is the moat: every adopter ships a viewer their stakeholders can sign off on, no infrastructure.
- **Two-file config split.** `spec-viewer.config.json` (committed) holds branding, taxonomy, paths, capture selectors. `spec-viewer.local.json` (gitignored, sibling of the committed file) holds per-user values like credentials. Local deep-merges over committed. Discovery looks in repo root first, then `.claude/spec-viewer/`.
- **`${ENV_VAR}` substitution.** Any string in either config file can reference `process.env`. Missing variables fail loud at config load, not at runtime.
- **XSS protection by default.** Every spec string is HTML-escaped at render time. Embedded JSON is `\u003c`/`\u003e`-escaped so no spec content can break out of the viewer's `<script>` tag. CSS accent values are validated against an allow-list with a safe fallback.
- **Auth-aware capture.** `/spec-capture` supports two strategies: `form` (Playwright fills your login form once before the spec loop) and `storage` (pre-seed localStorage / sessionStorage / cookies). Selectors live in the committed config; values live in the gitignored local file or env vars.
- **Color presets + theming.** 8 curated palettes (emerald, indigo, sky, violet, rose, amber, teal, slate). `/spec-theme` can also scan your existing tailwind config / CSS custom properties / theme files and propose matching values.
- **Schema validated.** Hand-rolled validator (no Ajv/zod runtime dep) checks every spec and config field. `spec-viewer config set` runs validation before writing back.

## Project layout (after install)

```
~/.claude/skills/spec-viewer/        # this repo, source of truth
  bin/spec-viewer                     # binary shim → cli/dist/bin.js
  _shared/PREAMBLE.md                 # invocation conventions for skills
  spec-init/SKILL.md
  spec-theme/SKILL.md
  spec-capture/SKILL.md
  spec-build/SKILL.md
  spec-validate/SKILL.md
  spec-sync/SKILL.md
  packages/core/                      # pure builder library
  cli/                                # Node CLI: init, build, capture, validate, doctor, config

~/.claude/skills/spec-init/SKILL.md  → symlink into the repo above
~/.claude/skills/spec-theme/SKILL.md → ...
~/.claude/skills/spec-capture/SKILL.md
~/.claude/skills/spec-build/SKILL.md
~/.claude/skills/spec-validate/SKILL.md
~/.claude/skills/spec-sync/SKILL.md
```

In each consumer project (after `/spec-init`):

```
your-project/
  .claude/spec-viewer/
    config.json            # committed: branding, taxonomy, capture selectors
    local.json             # gitignored: credentials, per-user overrides (optional)
    CONVENTIONS.md         # human-authored hints for /spec-sync (v0.2)
    specs/
      home.json            # one file per screen
    .gitignore             # local.json + spec-viewer-output/
  spec-viewer-output/      # built artefact (gitignored)
    index.html
    screenshots/           # if /spec-capture ran
    reports/               # if /spec-capture ran
```

## Direct CLI usage

The `spec-viewer` binary works without Claude Code if you prefer scripting:

```
spec-viewer init                              scaffold (defaults)
spec-viewer init --title "X" --preset rose    scaffold with branding flags
spec-viewer build                             render the viewer HTML
spec-viewer capture                           Playwright: navigate, annotate, screenshot
spec-viewer capture --route id                capture a single screen
spec-viewer config get [key]                  read config (full JSON or single field via dotted path)
spec-viewer config set <key> <value>          update via dotted path; validated before write
spec-viewer config presets                    list color presets with ANSI swatches
spec-viewer config apply-preset <id>          one-shot accent change
spec-viewer validate                          check specs and config against the schema
spec-viewer doctor                            environment + config-discovery health check
spec-viewer --version
```

## Auth setup (form login)

For an app like WatchCRM with email/password login:

`.claude/spec-viewer/config.json` (committed):

```json
{
  "capture": {
    "baseUrl": "http://localhost:3000",
    "authStrategy": "form",
    "auth": {
      "loginPath": "/login",
      "fields": {
        "email":    { "selector": "input[name=email]" },
        "password": { "selector": "input[name=password]" }
      },
      "submitSelector": "button[type=submit]",
      "successPath": "/"
    }
  }
}
```

`.claude/spec-viewer/local.json` (gitignored — created by you):

```json
{
  "capture": {
    "auth": {
      "fields": {
        "email":    { "value": "dev@example.com" },
        "password": { "value": "${DEV_PASSWORD}" }
      }
    }
  }
}
```

`/spec-capture` will navigate to `/login`, fill the form, click submit, wait for redirect to `/`, then run the per-spec capture loop with the resulting session sticky.

## Upgrade

```
cd ~/.claude/skills/spec-viewer
git pull && ./setup
```

Setup is idempotent: re-running it is safe.

## Status

v0.1 — viewer + capture + branding + auth shipped. `/spec-sync` (the AI-driven spec reconciliation loop) is designed but not yet implemented; targeted for v0.2.

## License

MIT. See [LICENSE](./LICENSE).
