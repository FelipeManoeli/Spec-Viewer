// Annotation system: inject numbered badges into the live DOM, then read back
// their positions so the viewer can overlay them on the screenshot.
//
// Ported from yasai's e2e/screenshots/lib/annotator.ts (lift verbatim per the
// port map). Generic — no Matilda assumptions.

import type { Page } from "playwright";

export interface AnnotationElement {
  label: string;
  selector: string;
}

export interface FoundElement {
  label: string;
  selector: string;
  /** Badge X position in px, absolute in the full page. */
  bx: number;
  /** Badge Y position in px, absolute in the full page. */
  by: number;
}

export interface MissingElement {
  label: string;
  selector: string;
  reason: "not-visible" | "no-bounding-box" | "selector-error";
  error?: string;
}

export interface AnnotationResult {
  found: FoundElement[];
  missing: MissingElement[];
  total: number;
}

const BADGE_CSS = `
.annotation-badge {
  position: absolute;
  background: #F87171;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  z-index: 10000;
  pointer-events: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  font-family: system-ui, sans-serif;
}
`;

export async function injectAnnotations(
  page: Page,
  elements: AnnotationElement[]
): Promise<AnnotationResult> {
  const found: FoundElement[] = [];
  const missing: MissingElement[] = [];

  await page.addStyleTag({ content: BADGE_CSS });

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]!;
    const badgeNumber = String(i + 1).padStart(2, "0");

    try {
      const locator = page.locator(el.selector).first();
      const isVisible = await locator.isVisible({ timeout: 1000 }).catch(() => false);

      if (!isVisible) {
        missing.push({ label: el.label, selector: el.selector, reason: "not-visible" });
        continue;
      }

      const box = await locator.boundingBox();
      if (!box) {
        missing.push({ label: el.label, selector: el.selector, reason: "no-bounding-box" });
        continue;
      }

      const badgeX = Math.max(4, box.x - 30);
      const badgeY = box.y + box.height / 2 - 12;

      // page.evaluate runs in the browser context. We don't ship DOM lib in
      // the CLI tsconfig, so use a plain function expression — Playwright
      // serialises the source to the page.
      await page.evaluate(injectBadgeScript, { number: badgeNumber, x: badgeX, y: badgeY });

      found.push({ label: el.label, selector: el.selector, bx: badgeX, by: badgeY });
    } catch (error) {
      missing.push({
        label: el.label,
        selector: el.selector,
        reason: "selector-error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { found, missing, total: elements.length };
}

export async function removeAnnotations(page: Page): Promise<void> {
  await page.evaluate(removeBadgesScript);
}

// ---- Browser-context scripts (serialised by Playwright; cannot reference
// CLI-side state). Type-cast to `unknown` to bypass the missing DOM lib.
const injectBadgeScript = (args: { number: string; x: number; y: number }): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = (globalThis as any).document;
  const badge = doc.createElement("div");
  badge.className = "annotation-badge";
  badge.textContent = args.number;
  badge.style.left = `${args.x}px`;
  badge.style.top = `${args.y}px`;
  doc.body.appendChild(badge);
};

const removeBadgesScript = (): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = (globalThis as any).document;
  doc
    .querySelectorAll(".annotation-badge")
    .forEach((el: { remove: () => void }) => el.remove());
};
