import fs from "node:fs";
import path from "node:path";
import { build } from "@spec-viewer/core";
import type { CoverageReport } from "@spec-viewer/core";
import { loadConfig } from "../lib/config.js";
import { loadSpecs } from "../lib/specs.js";
import { errorExit } from "../lib/errors.js";
import { extractFlag } from "../lib/args.js";

export async function cmdBuild(args: string[]): Promise<number> {
  const configOverride = extractFlag(args, "--config");
  const cwd = process.cwd();
  const { config, projectRoot } = await loadConfig(cwd, configOverride);

  const specsDir = path.resolve(projectRoot, config.paths.specs);
  const { specs, invalid } = loadSpecs(specsDir);

  if (invalid.length > 0) {
    process.stderr.write(
      `✗ ${invalid.length} spec file(s) failed validation:\n` +
        invalid.map((e) => `  - ${e.file}\n    ${e.errors.join("\n    ")}`).join("\n") +
        "\n"
    );
    if (specs.length === 0) {
      errorExit(
        {
          problem: "All specs failed validation; nothing to build",
          fix: "Fix the errors above, or run `spec-viewer validate` for details",
        },
        2
      );
    }
  }

  const outputDir = path.resolve(projectRoot, config.paths.output);
  fs.mkdirSync(outputDir, { recursive: true });

  // Pick up capture artefacts when present.
  const screenshotsAbs = config.paths.screenshots
    ? path.resolve(projectRoot, config.paths.screenshots)
    : path.join(outputDir, "screenshots");
  const coverageAbs = config.paths.coverage
    ? path.resolve(projectRoot, config.paths.coverage)
    : path.join(outputDir, "reports");

  const screenshots = collectScreenshots(screenshotsAbs, outputDir);
  const { coverage, badgeCoords } = collectCoverage(coverageAbs);

  const result = build({ config, specs, screenshots, coverage, badgeCoords });

  const outFile = path.join(outputDir, "index.html");
  fs.writeFileSync(outFile, result.html);

  const rel = path.relative(cwd, outFile);
  process.stdout.write(
    [
      `✓ Built ${specs.length} screen(s) → ${rel}`,
      `  Screenshots: ${Object.keys(screenshots).length} found`,
      `  Coverage:    ${Object.keys(coverage).length} reports`,
      ...(result.warnings.length > 0
        ? ["", "Warnings:", ...result.warnings.map((w) => `  ! ${w}`)]
        : []),
      "",
    ].join("\n")
  );
  return 0;
}

function collectScreenshots(dir: string, outputDir: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(dir)) return out;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".png")) continue;
    const screenId = file.replace(/\.png$/, "");
    // Path the browser will load — relative to the output dir (where index.html
    // is written). If screenshots already live inside the output dir we can
    // just say `screenshots/<screen>.png`; otherwise compute a relative path.
    const abs = path.join(dir, file);
    out[screenId] = path.relative(outputDir, abs);
  }
  return out;
}

function collectCoverage(dir: string): {
  coverage: Record<string, CoverageReport>;
  badgeCoords: Record<string, Record<string, { x: number; y: number }>>;
} {
  const coverage: Record<string, CoverageReport> = {};
  const badgeCoords: Record<string, Record<string, { x: number; y: number }>> = {};
  if (!fs.existsSync(dir)) return { coverage, badgeCoords };

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith("-report.json")) continue;
    const screenId = file.replace(/-report\.json$/, "");
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as CoverageReport;
      coverage[screenId] = {
        screen: raw.screen ?? screenId,
        total: raw.total,
        covered: raw.covered,
        elements: raw.elements ?? {},
      };
      if (raw.foundCoords) badgeCoords[screenId] = raw.foundCoords;
    } catch {
      // Bad report file — silently skip; the build still succeeds without coverage.
    }
  }
  return { coverage, badgeCoords };
}

