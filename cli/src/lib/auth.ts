// Auth strategies for `spec-viewer capture`. Run once before the per-spec loop.
//
// `form`    — Playwright fills the consumer's login form, hits submit, waits
//             for either a successPath redirect or a successSelector.
// `storage` — pre-seed localStorage / sessionStorage / cookies before the
//             first navigation. Used when the SPA reads a token on boot.
//
// Both strategies share the same Playwright `BrowserContext` + `Page` as the
// capture loop, so the resulting session sticks for every screen.

import type { Browser, BrowserContext, Page } from "playwright";
import type { AuthConfig, CaptureConfig } from "@spec-viewer/core";
import { formatError } from "./errors.js";

export interface AuthRunInput {
  browser: Browser;
  ctx: BrowserContext;
  page: Page;
  capture: CaptureConfig;
  /** Used to log a friendly per-step message; no-op if omitted. */
  log?: (line: string) => void;
}

export async function runAuth(input: AuthRunInput): Promise<void> {
  const strategy = input.capture.authStrategy ?? "none";
  const log = input.log ?? (() => undefined);

  if (strategy === "none") return;

  if (!input.capture.auth) {
    throw new Error(
      formatError({
        problem: `authStrategy is "${strategy}" but config.capture.auth is missing`,
        fix: 'Add a `capture.auth` block, or set authStrategy to "none"',
      })
    );
  }

  if (strategy === "form") {
    await runFormAuth(input.page, input.capture);
    log(`✓ form login complete`);
    return;
  }
  if (strategy === "storage") {
    await runStorageAuth(input.ctx, input.page, input.capture);
    log(`✓ storage seed complete`);
    return;
  }

  throw new Error(
    formatError({
      problem: `Unknown auth strategy: ${strategy}`,
      fix: 'Use one of: "none", "form", "storage"',
    })
  );
}

async function runFormAuth(page: Page, capture: CaptureConfig): Promise<void> {
  const auth = requireAuth(capture);
  if (!auth.loginPath) authError("loginPath", 'e.g. "/login"');
  if (!auth.fields || Object.keys(auth.fields).length === 0) {
    authError("fields", 'e.g. { email: { selector: "input[name=email]", value: "..." } }');
  }
  if (!auth.submitSelector) authError("submitSelector", 'e.g. "button[type=submit]"');

  const url = new URL(auth.loginPath, capture.baseUrl).toString();
  await page.goto(url, { waitUntil: "domcontentloaded" });

  for (const [name, field] of Object.entries(auth.fields ?? {})) {
    if (!field.selector) authError(`fields.${name}.selector`, "");
    if (field.value === undefined || field.value === null) authError(`fields.${name}.value`, "");
    await page.locator(field.selector).first().fill(field.value);
  }

  await Promise.all([
    waitForLoginSettle(page, capture, auth),
    page.locator(auth.submitSelector).first().click(),
  ]);

  if (auth.postSubmitWaitMs && auth.postSubmitWaitMs > 0) {
    await page.waitForTimeout(auth.postSubmitWaitMs);
  }
}

async function waitForLoginSettle(page: Page, capture: CaptureConfig, auth: AuthConfig): Promise<void> {
  // Prefer explicit successSelector. Fall back to successPath redirect.
  // Last resort: networkidle (best-effort).
  if (auth.successSelector) {
    await page.locator(auth.successSelector).first().waitFor({ timeout: 10_000 });
    return;
  }
  if (auth.successPath) {
    const target = new URL(auth.successPath, capture.baseUrl).toString();
    await page.waitForURL(target, { timeout: 10_000 });
    return;
  }
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
}

async function runStorageAuth(ctx: BrowserContext, page: Page, capture: CaptureConfig): Promise<void> {
  const auth = requireAuth(capture);

  // Cookies first — context-level, set before any navigation.
  if (auth.cookies && auth.cookies.length > 0) {
    const url = new URL("/", capture.baseUrl);
    const cookies = auth.cookies.map((c) => {
      const out: Parameters<BrowserContext["addCookies"]>[0][number] = {
        name: c.name,
        value: c.value,
        domain: c.domain ?? url.hostname,
        path: c.path ?? "/",
      };
      return out;
    });
    await ctx.addCookies(cookies);
  }

  // localStorage / sessionStorage need a page in the right origin. Navigate
  // to baseUrl, set storage, navigate back to "/" so per-spec navigation
  // starts fresh with the storage in place.
  if (
    (auth.localStorage && Object.keys(auth.localStorage).length > 0) ||
    (auth.sessionStorage && Object.keys(auth.sessionStorage).length > 0)
  ) {
    await page.goto(capture.baseUrl, { waitUntil: "domcontentloaded" });
    await page.evaluate(seedStorageScript, {
      local: auth.localStorage ?? {},
      session: auth.sessionStorage ?? {},
    });
  }
}

// ---- helpers ----
function requireAuth(c: CaptureConfig): AuthConfig {
  if (!c.auth) {
    throw new Error(
      formatError({
        problem: "Auth config missing",
        fix: "Add config.capture.auth",
      })
    );
  }
  return c.auth;
}

function authError(field: string, hint: string): never {
  throw new Error(
    formatError({
      problem: `capture.auth.${field} is required for the chosen strategy`,
      fix: hint ? `Set it (${hint})` : `Set it in config.capture.auth`,
    })
  );
}

// Browser-context script. Cast through `any` because we don't ship DOM lib.
const seedStorageScript = (args: { local: Record<string, string>; session: Record<string, string> }): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = globalThis as any;
  for (const [k, v] of Object.entries(args.local)) w.localStorage.setItem(k, v);
  for (const [k, v] of Object.entries(args.session)) w.sessionStorage.setItem(k, v);
};
