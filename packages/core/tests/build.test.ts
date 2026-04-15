import { describe, expect, it } from "vitest";
import { build, buildViewerData } from "../src/index.js";
import type { Config, SpecFile } from "../src/index.js";

const config: Config = {
  branding: { title: "Demo Specs", accentColor: "#3b82f6", locale: "en" },
  paths: { specs: ".specs", output: "out" },
  taxonomy: {
    modules: [{ id: "core", name: "Core", domains: ["home"] }],
  },
};

const spec: SpecFile = {
  schemaVersion: 1,
  screen: "home",
  title: "Home",
  route: "/",
  module: "core",
  description: "Landing page",
  elements: [
    {
      label: "Sign in",
      selector: "[data-testid=signin]",
      description: "Opens the sign-in modal",
      details: { type: "button", businessRules: ["Only visible when logged out"], linkedScreen: "signin-modal" },
    },
  ],
};

const FIXED_AT = "2026-04-15T19:00:00.000Z";

describe("build", () => {
  it("renders an empty viewer when no specs provided", () => {
    const r = build({ config, specs: [], generatedAt: FIXED_AT });
    expect(r.html).toContain("<!DOCTYPE html>");
    expect(r.html).toContain("Demo Specs");
    // Header stats: 0 screens · 0 elements
    expect(r.html).toContain("0 screens");
    expect(r.html).toContain("0 elements");
    expect(r.warnings).toEqual([]);
  });

  it("renders a standalone HTML document for a single spec", () => {
    const r = build({ config, specs: [spec], generatedAt: FIXED_AT });
    expect(r.html).toContain("<!DOCTYPE html>");
    expect(r.html).toContain("Demo Specs");
    expect(r.html).toContain('"id":"home"');
    expect(r.html).toContain('"title":"Home"');
    expect(r.html).toContain("Only visible when logged out");
    expect(r.html).toContain("1 screens");
    expect(r.html).toContain("1 elements");
    expect(r.warnings).toEqual([]);
  });

  it("escapes app-title in static HTML and prevents script-tag breakout from embedded JSON", () => {
    // App title (config.branding.title) is rendered into the static HTML shell
    // (<title> + <h1>), so it MUST be HTML-escaped at render time.
    const evilTitleConfig: Config = {
      ...config,
      branding: { title: "<svg/onload=alert(1)>", accentColor: "#3b82f6", locale: "en" },
    };
    const r1 = build({ config: evilTitleConfig, specs: [spec], generatedAt: FIXED_AT });
    expect(r1.html).not.toContain("<svg/onload=alert(1)>");
    expect(r1.html).toContain("&lt;svg/onload=alert(1)&gt;");

    // Spec content (titles, labels, etc.) is embedded as JSON inside <script>;
    // the runtime calls escHtml on every render. The static-output guarantee
    // here is: spec strings cannot break out of the <script> tag.
    const malicious: SpecFile = {
      ...spec,
      screen: "evil",
      title: "evil-title",
      elements: [
        {
          label: "label",
          selector: "x",
          description: "</script><script>alert('breakout')</script>",
          details: { businessRules: ["</script><img src=x onerror=alert(2)>"] },
        },
      ],
    };
    const r2 = build({ config, specs: [malicious], generatedAt: FIXED_AT });
    // The embedded JSON must escape </ to <\/ so a closing tag never appears
    // inside the data block.
    const scriptOpens = r2.html.match(/<script[\s>]/gi) ?? [];
    expect(scriptOpens.length).toBe(1);
    const scriptCloses = r2.html.match(/<\/script>/gi) ?? [];
    expect(scriptCloses.length).toBe(1);
  });

  it("flags specs with unknown modules as warnings", () => {
    const orphan: SpecFile = { ...spec, module: "not-a-module" };
    const r = build({ config, specs: [orphan], generatedAt: FIXED_AT });
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toContain("not-a-module");
  });

  it("includes screenshot URLs in the embedded data when provided", () => {
    const r = build({
      config,
      specs: [spec],
      screenshots: { home: "screenshots/home.png" },
      generatedAt: FIXED_AT,
    });
    expect(r.html).toContain('"img":"screenshots/home.png"');
  });

  it("includes coverage in the embedded data when provided", () => {
    const r = build({
      config,
      specs: [spec],
      coverage: { home: { screen: "home", total: 4, covered: 3, elements: {} } },
      generatedAt: FIXED_AT,
    });
    // Coverage gets serialized as { t, f, m, p }.
    expect(r.html).toContain('"t":4');
    expect(r.html).toContain('"f":3');
    expect(r.html).toContain('"p":"75"');
  });

  it("places badge coordinates from the badgeCoords map onto elements", () => {
    const r = build({
      config,
      specs: [spec],
      badgeCoords: {
        home: { "[data-testid=signin]": { x: 100, y: 200 } },
      },
      generatedAt: FIXED_AT,
    });
    expect(r.html).toContain('"bx":100');
    expect(r.html).toContain('"by":200');
  });

  it("is deterministic (byte-identical on repeat) given a fixed generatedAt", () => {
    const a = build({ config, specs: [spec], generatedAt: FIXED_AT });
    const b = build({ config, specs: [spec], generatedAt: FIXED_AT });
    expect(a.html).toBe(b.html);
  });
});

describe("buildViewerData", () => {
  it("computes overall coverage across screens", () => {
    const cfg: Config = {
      ...config,
      taxonomy: { modules: [{ id: "core", name: "Core" }] },
    };
    const s1: SpecFile = { ...spec, screen: "a" };
    const s2: SpecFile = { ...spec, screen: "b" };
    const { data } = buildViewerData({
      config: cfg,
      specs: [s1, s2],
      coverage: {
        a: { screen: "a", total: 2, covered: 2, elements: {} },
        b: { screen: "b", total: 4, covered: 2, elements: {} },
      },
      generatedAt: FIXED_AT,
    });
    expect(data.totalScreens).toBe(2);
    expect(data.overallCoverage).toBe(75); // (100+50)/2
  });

  it("groups screens into a synthetic Unassigned module when module is unknown", () => {
    const cfg: Config = {
      ...config,
      taxonomy: { modules: [{ id: "core", name: "Core" }] },
    };
    const orphan: SpecFile = { ...spec, screen: "lost", module: "ghost" };
    const { data } = buildViewerData({ config: cfg, specs: [orphan], generatedAt: FIXED_AT });
    expect(data.modules.length).toBe(1);
    expect(data.modules[0]?.id).toBe("__spec_viewer_unassigned__");
    expect(data.modules[0]?.name).toBe("Unassigned");
  });

  it("derives module domains from screen-id prefixes when configured", () => {
    const cfg: Config = {
      ...config,
      taxonomy: {
        modules: [{ id: "core", name: "Core", domains: ["home", "about"] }],
      },
    };
    const a: SpecFile = { ...spec, screen: "home", module: "core" };
    const b: SpecFile = { ...spec, screen: "home-detail", module: "core" };
    const c: SpecFile = { ...spec, screen: "about-team", module: "core" };
    const { data } = buildViewerData({ config: cfg, specs: [a, b, c], generatedAt: FIXED_AT });
    const m = data.modules[0];
    expect(m?.domains).toBeDefined();
    expect(m?.domains?.length).toBe(2);
    const homeDom = m?.domains?.find((d) => d.id === "home");
    expect(homeDom?.sids.sort()).toEqual(["home", "home-detail"]);
  });
});
