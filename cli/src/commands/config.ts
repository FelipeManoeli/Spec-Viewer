// `spec-viewer config <get|set|presets|apply-preset>` — surface for any agent
// (Claude skill or human) to read and write branding/config without hand-
// editing JSON. Edits go through the same validator the loader uses.

import { PRESETS, getPreset, isValidHexColor } from "@spec-viewer/core";
import { loadConfig } from "../lib/config.js";
import { errorExit, formatError } from "../lib/errors.js";
import { resolveCwd } from "../lib/args.js";
import {
  coerceForKey,
  getAt,
  readConfigJson,
  setAt,
  writeConfigJson,
} from "../lib/config-write.js";

const SUB_USAGE = `Usage:
  spec-viewer config get [key]
  spec-viewer config set <key> <value>
  spec-viewer config presets [list]
  spec-viewer config apply-preset <preset-id>

Keys use dot notation: branding.title, branding.accentColor, branding.locale,
paths.specs, capture.baseUrl, etc.

Values:
  - strings:  spec-viewer config set branding.title "WatchCRM Specs"
  - hex:      spec-viewer config set branding.accentColor "#10b981"
  - bool:     spec-viewer config set capture.viewport.headless true
  - JSON:     spec-viewer config set taxonomy.modules @'[{"id":"x","name":"X"}]'`;

export async function cmdConfig(args: string[]): Promise<number> {
  const sub = args[0];
  if (!sub || sub === "--help" || sub === "-h") {
    process.stdout.write(SUB_USAGE + "\n");
    return sub ? 0 : 64;
  }

  switch (sub) {
    case "get":
      return cmdGet(args.slice(1));
    case "set":
      return cmdSet(args.slice(1));
    case "presets":
      return cmdPresetsList();
    case "apply-preset":
      return cmdApplyPreset(args.slice(1));
    default:
      errorExit(`Unknown config subcommand: ${sub}\n\n${SUB_USAGE}`, 64);
  }
}

async function cmdGet(args: string[]): Promise<number> {
  const key = positional(args);
  const { config } = await loadConfig(resolveCwd(args));
  if (!key) {
    process.stdout.write(JSON.stringify(config, null, 2) + "\n");
    return 0;
  }
  const value = getAt(config, key);
  if (value === undefined) {
    process.stderr.write(`(unset)\n`);
    return 1;
  }
  if (typeof value === "string") process.stdout.write(value + "\n");
  else process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  return 0;
}

async function cmdSet(args: string[]): Promise<number> {
  const positionals = positionalAll(args);
  const [key, raw] = positionals;
  if (!key || raw === undefined) {
    errorExit(`Usage: spec-viewer config set <key> <value>\n\n${SUB_USAGE}`, 64);
  }
  const { path: configPath } = await loadConfig(resolveCwd(args));

  // Validate known keys with extra rules (helpful errors before generic
  // schema validation kicks in).
  if (key === "branding.accentColor" && !isValidHexColor(raw)) {
    errorExit(
      {
        problem: `branding.accentColor must be a hex color (got "${raw}")`,
        fix: "Use a 3- or 6-digit hex like #10b981 or #fff",
      },
      2
    );
  }
  if (key === "branding.locale" && raw !== "en" && raw !== "ja") {
    errorExit(
      {
        problem: `branding.locale must be "en" or "ja" (got "${raw}")`,
        fix: "Use --locale en or --locale ja",
      },
      2
    );
  }

  const cfg = readConfigJson(configPath);
  const value = coerceForKey(key, raw);
  setAt(cfg, key, value);
  writeConfigJson(configPath, cfg);
  process.stdout.write(`✓ ${key} = ${typeof value === "string" ? value : JSON.stringify(value)}\n`);
  return 0;
}

function cmdPresetsList(): number {
  const widest = Math.max(...PRESETS.map((p) => p.id.length));
  process.stdout.write("Available presets:\n\n");
  for (const p of PRESETS) {
    const swatch = chip(p.accentColor);
    process.stdout.write(`  ${swatch}  ${p.id.padEnd(widest)}  ${p.accentColor}  ${p.description}\n`);
  }
  process.stdout.write(
    "\nApply with: spec-viewer config apply-preset <id>\n"
  );
  return 0;
}

async function cmdApplyPreset(args: string[]): Promise<number> {
  const id = positional(args);
  if (!id) errorExit("Usage: spec-viewer config apply-preset <preset-id>", 64);
  const preset = getPreset(id);
  if (!preset) {
    errorExit(
      formatError({
        problem: `Unknown preset: ${id}`,
        fix: "Run `spec-viewer config presets` to list available presets",
      }),
      2
    );
  }
  const { path: configPath } = await loadConfig(resolveCwd(args));
  const cfg = readConfigJson(configPath);
  setAt(cfg, "branding.accentColor", preset.accentColor);
  writeConfigJson(configPath, cfg);
  process.stdout.write(
    `✓ Applied preset "${preset.name}" (${preset.accentColor})\n  Run \`spec-viewer build\` to re-render with the new color.\n`
  );
  return 0;
}

/**
 * Drop `--flag value` pairs from args and return the remaining positional
 * arguments. Lets `config get branding.accentColor --cwd /repo` work without
 * the --cwd value bleeding into the positional slot.
 */
function positionalAll(args: string[]): string[] {
  const FLAGS_WITH_VALUE = new Set(["--cwd", "--config"]);
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string;
    if (FLAGS_WITH_VALUE.has(a)) {
      i++; // skip the flag's value
      continue;
    }
    if (a.startsWith("--")) continue; // boolean flag
    out.push(a);
  }
  return out;
}
function positional(args: string[]): string | undefined {
  return positionalAll(args)[0];
}

// Tiny ANSI swatch so the presets list shows a real color block.
function chip(hex: string): string {
  const m = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(
    hex.length === 4 ? expandShortHex(hex) : hex
  );
  if (!m) return "  ";
  const r = parseInt(m[1] ?? "00", 16);
  const g = parseInt(m[2] ?? "00", 16);
  const b = parseInt(m[3] ?? "00", 16);
  return `\u001b[48;2;${r};${g};${b}m  \u001b[0m`;
}

function expandShortHex(s: string): string {
  if (!/^#[0-9a-fA-F]{3}$/.test(s)) return s;
  const a = s[1] ?? "0";
  const b = s[2] ?? "0";
  const c = s[3] ?? "0";
  return `#${a}${a}${b}${b}${c}${c}`;
}
