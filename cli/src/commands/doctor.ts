import fs from "node:fs";
import path from "node:path";
import { CLI_VERSION } from "../version.js";
import { DISCOVERY_PATHS } from "../lib/config.js";
import { checkPlaywright } from "../lib/playwright-check.js";

export async function cmdDoctor(_args: string[]): Promise<number> {
  const cwd = process.cwd();
  const lines: string[] = [];
  lines.push(`spec-viewer v${CLI_VERSION}`);
  lines.push("");
  lines.push(`Node:          ${process.version}`);
  lines.push(`Platform:      ${process.platform} ${process.arch}`);
  lines.push(`CWD:           ${cwd}`);
  lines.push("");

  lines.push("Config discovery:");
  let foundConfig: string | null = null;
  for (const rel of DISCOVERY_PATHS) {
    const abs = path.resolve(cwd, rel);
    const exists = fs.existsSync(abs);
    lines.push(`  ${exists ? "✓" : " "} ${rel}${exists ? "  ← using" : ""}`);
    if (exists && !foundConfig) foundConfig = abs;
  }
  if (!foundConfig) {
    lines.push("  (none found — run `spec-viewer init`)");
  }

  lines.push("");
  // Playwright check: capture is the only place Playwright is required, so
  // surface it as informational unless the user is about to run capture.
  lines.push("Playwright (needed for /spec-capture):");
  const pw = await checkPlaywright();
  if (pw.ok) {
    lines.push(`  ✓ chromium ready at ${pw.executablePath}`);
  } else {
    lines.push(`  ! ${pw.reason === "package-missing" ? "package not installed" : "browser binary missing"}`);
    lines.push(`    ${pw.detail}`);
    lines.push(`    Fix: ${pw.fix}`);
  }
  lines.push("");

  const nodeMajor = Number(process.version.slice(1).split(".")[0]);
  if (nodeMajor < 20) {
    lines.push("✗ Node >= 20 required");
    process.stdout.write(lines.join("\n") + "\n");
    return 1;
  }
  lines.push("✓ Environment OK");
  process.stdout.write(lines.join("\n") + "\n");
  return 0;
}
