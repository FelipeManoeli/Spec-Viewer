// Config discovery. Searches from cwd upward-aware, but since config is always
// project-local, we just probe the expected filenames in a fixed order.
// Discovery order (from the plan):
//   1. spec-viewer.config.json  (root)
//   2. spec-viewer.config.ts    (root, opt-in — requires tsx)
//   3. .claude/spec-viewer/config.json
//   4. .claude/spec-viewer/config.ts

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateConfig } from "@spec-viewer/core";
import type { Config } from "@spec-viewer/core";
import { formatError, type UserError } from "./errors.js";
import { deepMerge, substituteEnv } from "./merge.js";

/**
 * Config discovery order, root-level first so orgs that gitignore `.claude/`
 * don't silently lose their spec config.
 */
export const DISCOVERY_PATHS = [
  "spec-viewer.config.json",
  "spec-viewer.config.ts",
  ".claude/spec-viewer/config.json",
  ".claude/spec-viewer/config.ts",
];

export interface LoadedConfig {
  config: Config;
  /** The committed config file actually loaded. */
  path: string;
  /** The local override file, if one was found and merged. */
  localPath?: string;
  /**
   * Directory all config-relative paths resolve against.
   *
   * If the config lives inside `.claude/spec-viewer/`, the project root is
   * two levels up (the consumer repo root). Otherwise it's the directory
   * containing the config file. This keeps `paths.output: "spec-viewer-output"`
   * landing at the project root regardless of config location.
   */
  projectRoot: string;
}

function projectRootFor(configAbs: string): string {
  const dir = path.dirname(configAbs);
  // .claude/spec-viewer/config.{json,ts} → go up two levels
  if (/[\\/]\.claude[\\/]spec-viewer$/.test(dir)) {
    return path.resolve(dir, "..", "..");
  }
  return dir;
}

export async function loadConfig(cwd: string, override?: string): Promise<LoadedConfig> {
  const candidates = override ? [override] : DISCOVERY_PATHS;
  for (const rel of candidates) {
    const abs = path.resolve(cwd, rel);
    if (!fs.existsSync(abs)) continue;

    // Load the committed config.
    const baseRaw = await loadConfigFile(abs);

    // Look for a sibling local override (parent dir of the committed file).
    const dir = path.dirname(abs);
    const localCandidates = [
      path.join(dir, "spec-viewer.local.json"),
      path.join(dir, "local.json"),
      path.join(dir, "spec-viewer.local.ts"),
      path.join(dir, "local.ts"),
    ];
    let localPath: string | undefined;
    let localRaw: unknown;
    for (const lc of localCandidates) {
      if (fs.existsSync(lc)) {
        localPath = lc;
        localRaw = await loadConfigFile(lc);
        break;
      }
    }

    const merged = localRaw === undefined ? baseRaw : deepMerge(baseRaw, localRaw);

    // Substitute ${ENV_VAR} after merging so values can be supplied either way.
    let resolved: unknown;
    try {
      resolved = substituteEnv(merged);
    } catch (e) {
      throw new Error(
        formatError({
          problem: `Config references an unset environment variable`,
          cause: e instanceof Error ? e.message : String(e),
          fix: "Set the variable in your shell, or remove the ${...} reference",
        })
      );
    }

    const result = validateConfig(resolved);
    if (!result.ok) {
      throw new Error(
        formatError({
          problem: `Config file is invalid: ${rel}${localPath ? ` (merged with ${path.relative(cwd, localPath)})` : ""}`,
          cause: result.errors.map((e) => `${e.path}: ${e.message}`).join("; "),
          fix: "Fix the fields above; see https://spec-viewer.dev/schema for the config schema",
        })
      );
    }
    const out: LoadedConfig = {
      config: result.value as Config,
      path: abs,
      projectRoot: projectRootFor(abs),
    };
    if (localPath) out.localPath = localPath;
    return out;
  }

  const err: UserError = {
    problem: "No spec-viewer config found",
    cause: `Searched: ${candidates.join(", ")}`,
    fix: "Run `spec-viewer init` to scaffold one, or pass --config <path>",
  };
  throw new Error(formatError(err));
}

async function loadConfigFile(abs: string): Promise<unknown> {
  if (abs.endsWith(".json")) {
    const raw = fs.readFileSync(abs, "utf8");
    try {
      return JSON.parse(raw);
    } catch (e) {
      throw new Error(
        formatError({
          problem: `Config file is not valid JSON: ${abs}`,
          cause: e instanceof Error ? e.message : String(e),
          fix: "Fix the JSON syntax. Common issues: trailing commas, unescaped quotes",
        })
      );
    }
  }
  if (abs.endsWith(".ts")) {
    // TS configs are opt-in. Consumer must have tsx installed.
    // We use dynamic import via the TS loader if available; otherwise bail.
    try {
      const mod = (await import(pathToFileURL(abs).href)) as { default?: unknown };
      return mod.default ?? mod;
    } catch (e) {
      throw new Error(
        formatError({
          problem: `Could not load TypeScript config: ${abs}`,
          cause: e instanceof Error ? e.message : String(e),
          fix: "Run with a TS loader (tsx, ts-node) or convert to spec-viewer.config.json",
        })
      );
    }
  }
  throw new Error(`Unsupported config extension: ${abs}`);
}
