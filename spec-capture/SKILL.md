---
name: spec-capture
version: 0.1.2
description: Drive a real browser via Playwright to screenshot and annotate every spec, producing coverage reports
---

# /spec-capture

Runs the live frontend through Playwright. For each spec: navigates to the route, injects numbered badges over every declared selector, takes a full-page screenshot, writes a coverage report. The viewer (`/spec-build`) picks these up automatically.

## Prerequisite

Read `~/.claude/skills/spec-viewer/_shared/PREAMBLE.md`.

Capture requires Playwright installed in the consumer project (or globally). If missing, the binary prints a clear install command — relay it to the user; do not try to install silently (browser binaries are ~300MB).

## Steps

1. Detect the binary per the shared preamble.

2. **Auth onboarding** — check `config.capture.authStrategy`:
   - `"none"` (or unset) and the app under test has a login wall? Offer to set it up. See "Auth setup" below.
   - `"form"` or `"storage"` already configured? Confirm the login URL/credentials briefly with the user before launching the browser.

3. Confirm `config.capture.baseUrl` points at a running dev server. If unsure, ask the user via AskUserQuestion before launching the browser.

4. Run:
   ```bash
   "$SV" capture
   ```
   For a single screen:
   ```bash
   "$SV" capture --route <screen-id>
   ```

5. Capture writes:
   - PNG screenshots → `config.paths.screenshots` (default `spec-viewer-output/screenshots/`)
   - Coverage reports + badge coords → `config.paths.coverage` (default `spec-viewer-output/reports/`)

6. Recommend the user run `/spec-build` next so the viewer picks up the new artefacts.

## Auth setup

If the app is behind a login wall, scan the consumer codebase to propose an auth config. Look for:

- **Login form file** — grep for `LoginPage`, `useAuth`, `signIn`, `loginSchema` under `src/`, `app/`, `apps/*/src/`. Read the file to extract:
  - `loginPath` from the route definition
  - `fields[name].selector` — most teams use `<input name="email">` / `<input name="password">`. If the form uses react-hook-form, the `register("email")` call tells you the name attribute.
  - `submitSelector` — usually `button[type=submit]`
  - `successPath` — the `navigate(...)` call in the success branch (e.g. `/`, `/dashboard`)

- **Seeded credentials** — read `seed.ts`, `seeds/*.ts`, `db/seeds/`, `prisma/seed.*`, `packages/db/src/seed.ts`, etc. Look for a `users` insert and a comment near it documenting the dev password (e.g. "bcrypt hash of 'password123'"). Note all seeded users; pick the admin if asked, otherwise the most permissive role.

- **Token storage shape** — read `auth-tokens.ts`, `auth.ts`, `useAuth.ts`. Note whether the SPA stores a refresh token in `localStorage`, `sessionStorage`, or as a cookie. This informs whether to use the `form` or `storage` strategy:
  - **`form`** is right for almost all apps. After login the SPA stores its own tokens; capture inherits them.
  - **`storage`** is right when the SPA reads a token on boot and you have a way to mint one outside the browser (rare).

**Configure via the split config:**

- Selectors and login path go in the **committed** config (`spec-viewer.config.json`):
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

- Credentials go in the **gitignored** local override (`.claude/spec-viewer/local.json`):
  ```json
  {
    "capture": {
      "auth": {
        "fields": {
          "email":    { "value": "andre.oka@sourcecode.co.jp" },
          "password": { "value": "password123" }
        }
      }
    }
  }
  ```

- Or with env vars (works in either file):
  ```json
  { "value": "${WATCHCRM_DEV_PASSWORD}" }
  ```

Apply via `"$SV" config set` calls (the CLI writes only to the committed config; for `local.json` either tell the user to create it manually or write it directly with the Write tool).

## Known v0.1.5 limitations

- `script` strategy (custom Playwright callback) is deferred to v0.2 — needed for OAuth/SSO/magic-link flows.
- Multi-step navigation (`spec.navigation.steps`) is honored but not yet retried on flake.
- Capture is not bundled into the single-file binary (Playwright + chromium can't embed). It always runs through Node.

## Completion

- **DONE** — all targeted screens captured; report counts match.
- **DONE_WITH_CONCERNS** — some screens failed; report failures by screen id and why (selector misses, navigation timeout, etc.).
- **BLOCKED** — Playwright missing: relay the install command from the binary's error message and stop.
- **BLOCKED** — `config.capture.baseUrl` unreachable: ask the user to start their dev server.
