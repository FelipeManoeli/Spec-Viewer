// Tiny shared flag extractor for CLI subcommands. Not a full parser — just
// `--name value` lookups. Returns the value following the flag, or undefined.

export function extractFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}

/**
 * Resolve the working directory for a command. Honors `--cwd <dir>` if passed
 * (skills pass this when invoking from outside the project root); otherwise
 * falls back to process.cwd().
 *
 * If the path is relative, it's resolved against process.cwd() so callers
 * don't have to pre-absolutize.
 */
import path from "node:path";
import fs from "node:fs";
import { errorExit } from "./errors.js";

export function resolveCwd(args: string[]): string {
  const flag = extractFlag(args, "--cwd");
  if (!flag) return process.cwd();
  const abs = path.resolve(process.cwd(), flag);
  if (!fs.existsSync(abs)) {
    errorExit(
      {
        problem: `--cwd path does not exist: ${flag}`,
        fix: "Pass an existing directory",
      },
      2
    );
  }
  return abs;
}
