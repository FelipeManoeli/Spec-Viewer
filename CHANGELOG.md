# Changelog

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
