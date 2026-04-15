import { describe, expect, it } from "vitest";
import { PRESETS, getPreset, isValidHexColor, listPresetIds } from "../src/index.js";

describe("presets", () => {
  it("ships at least 6 presets", () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(6);
  });

  it("every preset has a unique id", () => {
    const ids = PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every preset has a valid hex accent", () => {
    for (const p of PRESETS) expect(isValidHexColor(p.accentColor)).toBe(true);
  });

  it("getPreset returns the preset by id", () => {
    expect(getPreset("emerald")?.accentColor).toBe("#10b981");
  });

  it("getPreset returns undefined for unknown id", () => {
    expect(getPreset("not-a-preset")).toBeUndefined();
  });

  it("listPresetIds returns ids in stable order", () => {
    expect(listPresetIds()[0]).toBe(PRESETS[0]?.id);
  });
});

describe("isValidHexColor", () => {
  it.each(["#fff", "#FFF", "#abcdef", "#012345"])("accepts %s", (v) => {
    expect(isValidHexColor(v)).toBe(true);
  });

  it.each(["abcdef", "#abcd", "#1234567", "rgb(0,0,0)", "", "#xyz"])(
    "rejects %s",
    (v) => {
      expect(isValidHexColor(v)).toBe(false);
    }
  );
});
