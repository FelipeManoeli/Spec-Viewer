// Safe config edit. Reads the JSON config, applies a path-based mutation,
// validates the result, writes back atomically (tmp + rename).
//
// We deliberately only support .json configs for `config set`. Editing TS
// configs by mechanical mutation is fragile (preserving comments, formatters,
// etc.); if a user opts into TS config they edit by hand or via their IDE.

import fs from "node:fs";
import path from "node:path";
import { validateConfig } from "@spec-viewer/core";
import type { Config } from "@spec-viewer/core";
import { formatError } from "./errors.js";

export function readConfigJson(absPath: string): Config {
  if (!absPath.endsWith(".json")) {
    throw new Error(
      formatError({
        problem: `Config write only supports JSON configs (got ${path.basename(absPath)})`,
        cause: "TS config files are not mechanically edited",
        fix: "Edit the TS file directly, or convert to spec-viewer.config.json",
      })
    );
  }
  const raw = fs.readFileSync(absPath, "utf8");
  return JSON.parse(raw) as Config;
}

export function writeConfigJson(absPath: string, cfg: Config): void {
  const result = validateConfig(cfg);
  if (!result.ok) {
    throw new Error(
      formatError({
        problem: "Resulting config would be invalid; refusing to write",
        cause: result.errors.map((e) => `${e.path}: ${e.message}`).join("; "),
        fix: "Check the value you passed to `config set`",
      })
    );
  }
  const json = JSON.stringify(cfg, null, 2) + "\n";
  const tmp = absPath + ".tmp";
  fs.writeFileSync(tmp, json);
  fs.renameSync(tmp, absPath);
}

/** Get a value at a dotted path. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAt(obj: any, dottedPath: string): unknown {
  if (!dottedPath) return obj;
  const parts = dottedPath.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/** Set a value at a dotted path, creating intermediate objects as needed. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setAt(obj: any, dottedPath: string, value: unknown): void {
  if (!dottedPath) throw new Error("dottedPath required");
  const parts = dottedPath.split(".");
  let cur = obj as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i] as string;
    const next = cur[k];
    if (next === null || next === undefined || typeof next !== "object") {
      cur[k] = {};
    }
    cur = cur[k] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1] as string] = value;
}

/** Coerce a CLI string value into the right JS type for known fields. */
export function coerceForKey(dottedPath: string, raw: string): unknown {
  // Booleans and numbers can be requested via the same syntax: true / false /
  // numeric strings parse; everything else stays as a string. JSON literal
  // (e.g. arrays / objects) is also accepted via a leading `@` prefix.
  if (raw.startsWith("@")) {
    try {
      return JSON.parse(raw.slice(1));
    } catch {
      throw new Error(
        formatError({
          problem: `Could not parse JSON literal for ${dottedPath}`,
          cause: raw,
          fix: 'Use @-prefixed valid JSON, e.g. @\'["a","b"]\' or wrap in quotes',
        })
      );
    }
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}
