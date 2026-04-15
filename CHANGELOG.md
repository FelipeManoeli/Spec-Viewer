# Changelog

## 0.1.2 — auto-install chromium during ./setup

Same fix gstack uses: `./setup` now downloads Playwright's chromium-headless-shell (~92MB) automatically so `/spec-capture` works on first invocation, no second prompt mid-flow. Verifies before installing (idempotent under `git pull && ./setup`) and verifies again after to surface the rare failure case.

- **`./setup`**: auto-runs `npx playwright install chromium` if the binary is missing. Pass `--skip-browser` to opt out (good for users who only need `/spec-init` and `/spec-build`).
- **`/spec-init` skill**: now expects chromium ready out-of-the-box, only prompts for the install command in the `--skip-browser` edge case.
- README updated to make the auto-install behavior explicit upfront.

The 0.1.1 friction (capture failing after the user invested time in auth setup) is now a one-time setup cost the user already accepted by running `./setup`.

## 0.1.1 — onboarding-friendly v0.1

Fixes from the first real-world dogfood (WatchCRM, agent-driven). Every issue surfaced in `notes/docs/spec-viewer-test-report.md` is addressed.

- **Accent color now adapts.** Previously the viewer's `--accent-light` and `--accent-dark` were hardcoded to emerald regardless of the configured `accentColor`, so any non-green theme rendered with mismatched UI highlights. Both variants are now derived from `--accent` via CSS `color-mix`, so any hex theme adapts automatically.
- **Playwright preflight.** `spec-viewer doctor` reports Playwright + chromium status with the exact install command if anything is missing. `spec-viewer capture` also preflights before any auth/spec work — no more discovering a missing 300MB binary at the end of the onboarding flow.
- **`--cwd` flag everywhere.** Every CLI subcommand (`init`, `build`, `capture`, `validate`, `config`, `doctor`) now honors `--cwd <dir>` so skills can invoke from any working directory. Previously `config get --cwd` silently returned `(unset)` because the flag was ignored.
- **Empty-screenshots CTA.** When the viewer renders with no captured screenshots, a banner at the top of the dashboard tells the user exactly which command to run next. No more wondering whether the build is broken.
- **`local.json.example` scaffolded.** `spec-init` now writes a commented example file showing the credentials shape, and CONVENTIONS.md documents the two-file split. Users no longer have to discover the local-override pattern by reading source.
- **`/spec-init` skill walks capture-readiness.** After scaffolding, the skill runs `doctor`, asks if a dev server is running, and chains into `/spec-capture` if everything is ready — so first-build produces a populated viewer instead of an empty one.

## 0.1.0 — initial release

Living screen-level documentation for any project, packaged as a Claude Code skill bundle.

- `@spec-viewer/core` — schema types, JSON Schema, validator.
- **Full viewer** ported from yasai: sidebar nav (modules → domains → screens), screen detail with annotated screenshot + element list, click-to-pan/zoom on screenshots, slide-up detail panel for business rules / errors / validation, ⌘K search across screens and elements. Single self-contained ~37KB HTML file with no framework.
- **Capture subsystem**: `spec-viewer capture` drives Playwright (optional peer dep) to navigate each spec, inject numbered badges, screenshot full-page, write per-screen `*-report.json` with badge coordinates. The viewer auto-overlays badges from these reports.
- i18n: English default with Japanese bundle (matching yasai's UI strings).
- `@spec-viewer/cli` — `init | build | capture | validate | doctor` with formatted problem/cause/fix errors.
- **Branding & theming**: 8 curated color presets shipped in core. `spec-viewer config get|set|presets|apply-preset` for safe, validated config edits via dotted paths. `spec-viewer init` accepts `--title`, `--accent`, `--preset`, `--locale` so the onboarding skill can pass user choices through.
- Claude Code skills: `/spec-init`, `/spec-theme`, `/spec-build`, `/spec-capture`, `/spec-validate`, `/spec-sync` (stub — design locked, impl v0.2).
- `setup` script: installs, builds, symlinks the repo into `~/.claude/skills/spec-viewer/`.
- Synthetic fixture: 3 screens across 2 modules, integration-tested end-to-end.
- Test suite: 33 tests across escape, taxonomy, validate, build, fixture-integration.

### Auth + config split (v0.1.5)
- **Auth strategies for capture**: `form` (Playwright fills the consumer's login form) and `storage` (pre-seeds localStorage / sessionStorage / cookies). `none` remains the default.
- **Two-file config**: `spec-viewer.config.json` (committed) holds structural bits like branding, taxonomy, paths, capture selectors. `spec-viewer.local.json` (gitignored, sibling to the committed file) holds per-user values like credentials. Local deep-merges over committed.
- **`${ENV_VAR}` substitution**: any string value in either file is substituted from `process.env` at load time. Missing vars fail loud.
- **`init` writes `.claude/spec-viewer/.gitignore`** with `local.json` and `spec-viewer-output/` so the split is enforced from day one.
- **`/spec-capture` skill** now scans the consumer codebase for login form selectors and seeded dev credentials before launching the browser.

### Deferred to v0.2
- `/spec-sync` reconciliation algorithm (designed in `notes/spec-sync-design.md`).
- `script` auth strategy (custom Playwright callback for OAuth / SSO / magic-link).
- Bun-compiled single-file binary.
- Features tab (renders empty state when no feature hierarchy).
- MCP server.
