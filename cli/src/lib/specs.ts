// Read all spec files from a directory. Returns validated SpecFile objects
// plus a list of files that failed validation.

import fs from "node:fs";
import path from "node:path";
import { validateSpec } from "@spec-viewer/core";
import type { SpecFile } from "@spec-viewer/core";

export interface SpecLoadResult {
  specs: SpecFile[];
  invalid: Array<{ file: string; errors: string[] }>;
}

export function loadSpecs(dir: string): SpecLoadResult {
  const result: SpecLoadResult = { specs: [], invalid: [] };
  if (!fs.existsSync(dir)) return result;

  const files = walk(dir).filter((f) => f.endsWith(".json") && !f.includes("/.meta/"));
  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
      const v = validateSpec(raw);
      if (v.ok && v.value) {
        result.specs.push(v.value);
      } else {
        result.invalid.push({
          file,
          errors: v.errors.map((e) => `${e.path}: ${e.message}`),
        });
      }
    } catch (e) {
      result.invalid.push({
        file,
        errors: [`JSON parse error: ${e instanceof Error ? e.message : String(e)}`],
      });
    }
  }

  // Deterministic order: sort by screen id.
  result.specs.sort((a, b) => a.screen.localeCompare(b.screen));
  return result;
}

// Skip noisy directories defensively. Specs normally live under
// `.claude/spec-viewer/specs/` but a misconfigured `paths.specs` could land
// us in a repo root — don't recurse into the obvious sinks.
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".next", "vendor", "coverage"]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
      out.push(...walk(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}
