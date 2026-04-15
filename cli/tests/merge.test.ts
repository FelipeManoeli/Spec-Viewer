import { describe, expect, it } from "vitest";
import { deepMerge, substituteEnv } from "../src/lib/merge.js";

describe("deepMerge", () => {
  it("returns the override when base is not an object", () => {
    expect(deepMerge<unknown>("a", "b")).toBe("b");
    expect(deepMerge<unknown>(1, 2)).toBe(2);
  });

  it("merges flat keys, override wins", () => {
    expect(deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("recurses into nested plain objects", () => {
    expect(
      deepMerge({ branding: { title: "X", accent: "#000" } }, { branding: { accent: "#fff" } })
    ).toEqual({ branding: { title: "X", accent: "#fff" } });
  });

  it("replaces arrays wholesale (does not concat)", () => {
    expect(deepMerge({ list: [1, 2, 3] }, { list: [9] })).toEqual({ list: [9] });
  });

  it("ignores undefined override", () => {
    expect(deepMerge({ a: 1 }, undefined)).toEqual({ a: 1 });
  });

  it("does not mutate the base object", () => {
    const base = { a: { b: 1 } };
    deepMerge(base, { a: { b: 2 } });
    expect(base.a.b).toBe(1);
  });
});

describe("substituteEnv", () => {
  it("substitutes ${VAR} in strings", () => {
    expect(substituteEnv("hello ${NAME}", { NAME: "world" })).toBe("hello world");
  });

  it("walks nested objects and arrays", () => {
    const out = substituteEnv(
      { auth: { fields: { email: { value: "${USER_EMAIL}" } }, list: ["${A}", "x"] } },
      { USER_EMAIL: "a@b", A: "1" }
    );
    expect(out).toEqual({ auth: { fields: { email: { value: "a@b" } }, list: ["1", "x"] } });
  });

  it("leaves strings without ${...} alone", () => {
    expect(substituteEnv("plain", {})).toBe("plain");
  });

  it("throws when an env var is missing", () => {
    expect(() => substituteEnv("${MISSING}", {})).toThrow(/MISSING/);
  });

  it("supports multiple substitutions in one string", () => {
    expect(substituteEnv("${A}-${B}", { A: "x", B: "y" })).toBe("x-y");
  });
});
