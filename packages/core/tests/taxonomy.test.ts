import { describe, expect, it } from "vitest";
import { resolveDomain, resolveScreen } from "../src/builder/taxonomy.js";
import type { Config, SpecFile } from "../src/schema/types.js";

const config: Config = {
  branding: { title: "Test" },
  paths: { specs: ".specs", output: "out" },
  taxonomy: {
    modules: [
      { id: "contacts", name: "Contacts", domains: ["contact", "tag"] },
      { id: "deals", name: "Deals", domains: ["deal", "deal-stage", "pipeline"] },
    ],
  },
};

function spec(overrides: Partial<SpecFile>): SpecFile {
  return {
    schemaVersion: 1,
    screen: "x",
    title: "X",
    route: "/x",
    module: "contacts",
    elements: [],
    ...overrides,
  };
}

describe("resolveDomain", () => {
  it("returns undefined when no domains configured", () => {
    expect(resolveDomain("contact-list", undefined)).toBeUndefined();
  });

  it("matches exact screen id", () => {
    expect(resolveDomain("contact", ["contact", "tag"])).toBe("contact");
  });

  it("matches prefix with dash separator", () => {
    expect(resolveDomain("contact-list", ["contact"])).toBe("contact");
  });

  it("prefers longest-match prefix", () => {
    expect(resolveDomain("deal-stage-edit", ["deal", "deal-stage"])).toBe("deal-stage");
  });

  it("returns undefined on no match", () => {
    expect(resolveDomain("unrelated-screen", ["contact", "tag"])).toBeUndefined();
  });
});

describe("resolveScreen", () => {
  it("resolves module + domain", () => {
    const r = resolveScreen(spec({ screen: "contact-detail", module: "contacts" }), config);
    expect(r.moduleId).toBe("contacts");
    expect(r.moduleName).toBe("Contacts");
    expect(r.domain).toBe("contact");
  });

  it("flags unknown module", () => {
    const r = resolveScreen(spec({ screen: "x", module: "no-such-module" }), config);
    expect(r.moduleName).toMatch(/^Unknown module:/);
  });
});
