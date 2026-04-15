// `spec-viewer capture` — drive a real browser via Playwright, navigate to
// each spec's route, inject numbered badges, take a screenshot, write a
// per-screen `*-report.json`.
//
// Playwright is an OPTIONAL peer dep. We dynamic-import to keep `spec-viewer
// build/init/validate` working on machines without Playwright installed.
//
// v0.1 supports only `authStrategy: "none"` (or unset). Cookie/OAuth/basic
// auth land in v0.2 with first-class hooks.

import fs from "node:fs";
import path from "node:path";
import { errorExit, formatError } from "../lib/errors.js";
import { loadConfig } from "../lib/config.js";
import { loadSpecs } from "../lib/specs.js";
import { extractFlag, resolveCwd } from "../lib/args.js";
import type { SpecFile, CoverageReport, NavigationStep } from "@spec-viewer/core";

interface CaptureOptions {
  configOverride?: string;
  routeFilter?: string;
}

export async function cmdCapture(args: string[]): Promise<number> {
  const opts: CaptureOptions = {};
  const configVal = extractFlag(args, "--config");
  if (configVal) opts.configOverride = configVal;
  const routeVal = extractFlag(args, "--route");
  if (routeVal) opts.routeFilter = routeVal;

  const cwd = resolveCwd(args);
  const { config, projectRoot } = await loadConfig(cwd, opts.configOverride);

  if (!config.capture) {
    errorExit({
      problem: "No capture configuration",
      cause: "config.capture is not set",
      fix: 'Add `capture: { baseUrl: "http://localhost:3000" }` to your config',
    }, 2);
  }

  const baseUrl = config.capture.baseUrl;
  const authStrategy = config.capture.authStrategy ?? "none";

  const specsDir = path.resolve(projectRoot, config.paths.specs);
  const screenshotsDir = path.resolve(
    projectRoot,
    config.paths.screenshots ?? "spec-viewer-output/screenshots"
  );
  const coverageDir = path.resolve(
    projectRoot,
    config.paths.coverage ?? "spec-viewer-output/reports"
  );

  const { specs, invalid } = loadSpecs(specsDir);
  if (invalid.length > 0) {
    process.stderr.write(`! ${invalid.length} spec(s) failed validation; skipping them.\n`);
  }

  const targetSpecs = opts.routeFilter
    ? specs.filter((s) => s.screen === opts.routeFilter)
    : specs;
  if (targetSpecs.length === 0) {
    errorExit({
      problem: opts.routeFilter
        ? `No spec found for screen "${opts.routeFilter}"`
        : "No specs to capture",
      fix: opts.routeFilter
        ? "Check the screen id; run `spec-viewer validate` to list known specs"
        : "Run `spec-viewer init` to scaffold one, or author specs in " + path.relative(cwd, specsDir),
    }, 2);
  }

  fs.mkdirSync(screenshotsDir, { recursive: true });
  fs.mkdirSync(coverageDir, { recursive: true });

  // Lazy-load Playwright so a missing install only errors if you run capture.
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (e) {
    errorExit(
      {
        problem: "Playwright is not installed",
        cause: "spec-viewer capture requires the optional `playwright` package",
        fix: "Install it in your project: `npm install --save-dev playwright && npx playwright install chromium`",
      },
      2
    );
  }

  // Lazy-load annotator + auth after Playwright resolves so they aren't
  // pulled in on machines that never run capture.
  const { injectAnnotations } = await import("../lib/annotator.js");
  const { runAuth } = await import("../lib/auth.js");

  const viewport = config.capture.viewport ?? { width: 1920, height: 1080 };
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport, baseURL: baseUrl });
  const page = await ctx.newPage();

  let captured = 0;
  let failed = 0;

  try {
    if (authStrategy !== "none") {
      process.stdout.write(`▸ auth: ${authStrategy}\n`);
      await runAuth({
        browser,
        ctx,
        page,
        capture: config.capture,
        log: (line) => process.stdout.write(`  ${line}\n`),
      });
    }

    for (const spec of targetSpecs) {
      const ok = await captureScreen(page, spec, baseUrl, {
        screenshotsDir,
        coverageDir,
        injectAnnotations,
      }).catch((err) => {
        process.stderr.write(`✗ ${spec.screen}: ${err instanceof Error ? err.message : String(err)}\n`);
        return false;
      });
      if (ok) captured++;
      else failed++;
    }
  } finally {
    await browser.close();
  }

  process.stdout.write(
    [
      "",
      `✓ Captured ${captured} screen(s)${failed > 0 ? `, ${failed} failed` : ""}`,
      `  Screenshots: ${path.relative(cwd, screenshotsDir)}/`,
      `  Reports:     ${path.relative(cwd, coverageDir)}/`,
      "",
      "Next: run `spec-viewer build` to render the viewer.",
      "",
    ].join("\n")
  );
  return failed > 0 ? 1 : 0;
}

interface CaptureCtx {
  screenshotsDir: string;
  coverageDir: string;
  injectAnnotations: typeof import("../lib/annotator.js").injectAnnotations;
}

async function captureScreen(
  page: import("playwright").Page,
  spec: SpecFile,
  baseUrl: string,
  ctx: CaptureCtx
): Promise<boolean> {
  process.stdout.write(`▸ ${spec.screen}  (${spec.route})\n`);

  // Navigate. Use spec.navigation.path if present, else spec.route.
  const navPath = spec.navigation?.path ?? spec.route;
  const url = navPath.startsWith("http") ? navPath : new URL(navPath, baseUrl).toString();
  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Run navigation steps if specified.
  if (spec.navigation?.steps) {
    for (const step of spec.navigation.steps) {
      await runStep(page, step);
    }
  }

  // Brief settle so transitions/animations finish.
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);

  // Inject badges + collect coordinates.
  const annotation = await ctx.injectAnnotations(
    page,
    spec.elements.map((e) => ({ label: e.label, selector: e.selector }))
  );

  // Screenshot.
  const shotPath = path.join(ctx.screenshotsDir, `${spec.screen}.png`);
  await page.screenshot({ path: shotPath, fullPage: true });

  // Coverage report.
  const elements: CoverageReport["elements"] = {};
  for (const f of annotation.found) elements[f.selector] = { covered: true };
  for (const m of annotation.missing) {
    const entry: { covered: boolean; note?: string } = { covered: false };
    if (m.error || m.reason) entry.note = m.error ?? m.reason;
    elements[m.selector] = entry;
  }
  const report: CoverageReport = {
    screen: spec.screen,
    total: annotation.total,
    covered: annotation.found.length,
    elements,
    foundCoords: Object.fromEntries(annotation.found.map((f) => [f.selector, { x: f.bx, y: f.by }])),
  };
  fs.writeFileSync(
    path.join(ctx.coverageDir, `${spec.screen}-report.json`),
    JSON.stringify(report, null, 2) + "\n"
  );

  process.stdout.write(
    `  ${annotation.found.length}/${annotation.total} elements found  →  ${path.basename(shotPath)}\n`
  );
  return true;
}

async function runStep(page: import("playwright").Page, step: NavigationStep): Promise<void> {
  switch (step.action) {
    case "click":
      if (!step.selector) throw new Error("click step requires `selector`");
      await page.locator(step.selector).first().click();
      break;
    case "fill":
      if (!step.selector) throw new Error("fill step requires `selector`");
      await page.locator(step.selector).first().fill(step.value ?? "");
      break;
    case "waitFor":
      if (step.selector) {
        await page.locator(step.selector).first().waitFor({ timeout: 5000 });
      } else if (step.value) {
        await page.waitForTimeout(parseInt(step.value, 10) || 0);
      }
      break;
    case "navigate":
      if (!step.target) throw new Error("navigate step requires `target`");
      await page.goto(step.target, { waitUntil: "domcontentloaded" });
      break;
    default:
      throw new Error(`Unknown navigation action: ${(step as { action: string }).action}`);
  }
}
