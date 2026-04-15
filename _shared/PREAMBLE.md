# spec-viewer skills — shared preamble

Read this before running any `/spec-*` skill.

## Binary discovery

Claude invokes the `spec-viewer` binary via Bash. Discovery order:

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
SV=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/spec-viewer/bin/spec-viewer" ] && SV="$_ROOT/.claude/skills/spec-viewer/bin/spec-viewer"
[ -z "$SV" ] && [ -x ~/.claude/skills/spec-viewer/bin/spec-viewer ] && SV=~/.claude/skills/spec-viewer/bin/spec-viewer
if [ -z "$SV" ]; then
  echo "NEEDS_SETUP" && exit 1
fi
```

If `NEEDS_SETUP`: tell the user to run `./setup` from the spec-viewer repo once (~10 seconds). Do not attempt to install silently.

## Config discovery

The binary handles config discovery. All skills defer to `spec-viewer` for locating the config. Discovery order (first match wins):

1. `spec-viewer.config.json` (repo root)
2. `spec-viewer.config.ts` (repo root)
3. `.claude/spec-viewer/config.json`
4. `.claude/spec-viewer/config.ts`

If no config exists, `/spec-init` must be run first.

## Interaction rules

- **Auto-confirm safe operations:** read-only commands (`validate`, `doctor`, dry-run `sync`) never prompt.
- **Prompt before destructive operations:** `sync --apply`, `init --force`, `sync --apply --prune` always present the diff and ask for user approval via AskUserQuestion.
- **Batch, don't spam:** one AskUserQuestion per skill invocation, not one per screen or per element. Generate the full proposal, show it as a unified diff, ask once.
- **No silent overwrites:** if a user-authored field would be replaced, surface the proposal in the diff and let the user decide.

## Conventions file

`.claude/spec-viewer/CONVENTIONS.md` (scaffolded by `/spec-init`) tells Claude project-specific patterns (selector keys, validation libraries, permission models, files to skip). `/spec-sync` reads this every run.

## Error handling

When `spec-viewer` exits non-zero, show the user the exact error output. Do not paraphrase. Formatted errors include problem + cause + fix — all three matter.

## Schema reference

- Spec JSON Schema: `~/.claude/skills/spec-viewer/schema/spec.schema.json` (or relative to the binary)
- Config types: `@spec-viewer/core/schema`
