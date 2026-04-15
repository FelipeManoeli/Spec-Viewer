import path from "node:path";
import { loadConfig } from "../lib/config.js";
import { loadSpecs } from "../lib/specs.js";
import { extractFlag } from "../lib/args.js";

export async function cmdValidate(args: string[]): Promise<number> {
  const configOverride = extractFlag(args, "--config");
  const cwd = process.cwd();
  const { config, path: configPath, projectRoot } = await loadConfig(cwd, configOverride);

  const specsDir = path.resolve(projectRoot, config.paths.specs);
  const { specs, invalid } = loadSpecs(specsDir);

  process.stdout.write(`Config:      ${path.relative(cwd, configPath)} ✓\n`);
  process.stdout.write(`Specs dir:   ${path.relative(cwd, specsDir)}\n`);
  process.stdout.write(`Valid specs: ${specs.length}\n`);

  if (invalid.length > 0) {
    process.stderr.write(`\n✗ ${invalid.length} invalid spec file(s):\n`);
    for (const e of invalid) {
      process.stderr.write(`  - ${e.file}\n`);
      for (const msg of e.errors) process.stderr.write(`    ${msg}\n`);
    }
    return 1;
  }

  process.stdout.write("\n✓ All specs valid\n");
  return 0;
}

