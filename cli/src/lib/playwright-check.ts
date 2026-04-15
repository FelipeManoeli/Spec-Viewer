// Detect whether Playwright + the chromium binary are present BEFORE we try
// to launch a browser. Saves the user from running the full onboarding flow,
// configuring auth, and only then hitting:
//   browserType.launch: Executable doesn't exist at .../chrome-headless-shell

import fs from "node:fs";

export type PlaywrightStatus =
  | { ok: true; executablePath: string }
  | { ok: false; reason: "package-missing" | "binary-missing"; detail: string; fix: string };

/**
 * Probe Playwright availability without launching the browser. Cheap and
 * dependency-tolerant: dynamic import means a missing optional dep won't
 * fail at module load.
 */
export async function checkPlaywright(): Promise<PlaywrightStatus> {
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return {
      ok: false,
      reason: "package-missing",
      detail: "the optional `playwright` package is not installed",
      fix: "Install it once: `npm install --save-dev playwright && npx playwright install chromium`",
    };
  }
  let executablePath: string;
  try {
    executablePath = chromium.executablePath();
  } catch (e) {
    return {
      ok: false,
      reason: "binary-missing",
      detail: e instanceof Error ? e.message : String(e),
      fix: "Run once: `npx playwright install chromium`",
    };
  }
  if (!fs.existsSync(executablePath)) {
    return {
      ok: false,
      reason: "binary-missing",
      detail: `expected at ${executablePath}`,
      fix: "Run once: `npx playwright install chromium`",
    };
  }
  return { ok: true, executablePath };
}
