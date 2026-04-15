import { describe, expect, it } from "vitest";
import { validateSpec, validateConfig } from "../src/schema/validate.js";

describe("validateSpec", () => {
  const valid = {
    schemaVersion: 1,
    screen: "home",
    title: "Home",
    route: "/",
    module: "core",
    elements: [{ label: "CTA", selector: "[data-testid=cta]" }],
  };

  it("accepts a minimal valid spec", () => {
    const r = validateSpec(valid);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("rejects missing schemaVersion", () => {
    const { schemaVersion: _sv, ...without } = valid;
    const r = validateSpec(without);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path === "schemaVersion")).toBe(true);
  });

  it("rejects wrong schemaVersion", () => {
    const r = validateSpec({ ...valid, schemaVersion: 2 });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path === "schemaVersion")).toBe(true);
  });

  it("rejects missing elements array", () => {
    const { elements: _e, ...without } = valid;
    const r = validateSpec(without);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path === "elements")).toBe(true);
  });

  it("validates business rules must be string array", () => {
    const r = validateSpec({
      ...valid,
      elements: [{ label: "X", selector: "#x", details: { businessRules: [1, 2] } }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path === "elements[0].details.businessRules")).toBe(true);
  });
});

describe("validateConfig", () => {
  const valid = {
    branding: { title: "X" },
    paths: { specs: ".specs", output: "out" },
    taxonomy: { modules: [{ id: "a", name: "A" }] },
  };

  it("accepts a minimal config", () => {
    expect(validateConfig(valid).ok).toBe(true);
  });

  it("rejects missing branding.title", () => {
    const r = validateConfig({ ...valid, branding: {} });
    expect(r.ok).toBe(false);
  });

  it("rejects empty modules array is allowed structurally but usable", () => {
    // An empty modules array is structurally valid (user may be starting fresh)
    const r = validateConfig({ ...valid, taxonomy: { modules: [] } });
    expect(r.ok).toBe(true);
  });
});
