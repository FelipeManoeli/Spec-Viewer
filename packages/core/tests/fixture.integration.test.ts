// End-to-end integration test: load the synthetic fixture from disk,
// run the builder, assert the output contains every screen + has no
// unescaped script tags.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { build, validateConfig, validateSpec } from "../src/index.js";
import type { Config, SpecFile } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.resolve(__dirname, "../../../fixtures/synthetic/.claude/spec-viewer");

function loadFixture(): { config: Config; specs: SpecFile[] } {
  const configRaw = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, "config.json"), "utf8")) as unknown;
  const cfgResult = validateConfig(configRaw);
  if (!cfgResult.ok || !cfgResult.value) {
    throw new Error(`Fixture config invalid: ${JSON.stringify(cfgResult.errors)}`);
  }

  const specsDir = path.join(FIXTURE_ROOT, "specs");
  const files = fs.readdirSync(specsDir).filter((f) => f.endsWith(".json"));
  const specs: SpecFile[] = [];
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(specsDir, file), "utf8")) as unknown;
    const r = validateSpec(raw);
    if (!r.ok || !r.value) {
      throw new Error(`Fixture spec ${file} invalid: ${JSON.stringify(r.errors)}`);
    }
    specs.push(r.value);
  }
  return { config: cfgResult.value, specs };
}

const FIXED_AT = "2026-04-15T19:00:00.000Z";

describe("fixture integration", () => {
  it("builds the synthetic fixture to a single valid HTML document", () => {
    const { config, specs } = loadFixture();
    expect(specs.length).toBe(3);

    const r = build({ config, specs, generatedAt: FIXED_AT });
    expect(r.warnings).toEqual([]);
    expect(r.html).toContain("Synthetic Fixture Specs");
    // Specs are embedded in the data JSON; titles + rules should appear.
    expect(r.html).toContain('"title":"Home"');
    expect(r.html).toContain('"title":"Contacts"');
    expect(r.html).toContain('"title":"Contact Detail"');
    expect(r.html).toContain("Requires contact:write permission");

    // The viewer ships exactly one <script> tag containing the embedded data
    // and the runtime. Spec-derived content must NOT introduce additional ones.
    const scriptOpens = r.html.match(/<script[\s>]/gi) ?? [];
    expect(scriptOpens.length).toBe(1);
    const scriptCloses = r.html.match(/<\/script>/gi) ?? [];
    expect(scriptCloses.length).toBe(1);
  });

  it("produces deterministic output across runs given a fixed timestamp", () => {
    const { config, specs } = loadFixture();
    const a = build({ config, specs, generatedAt: FIXED_AT });
    const b = build({ config, specs, generatedAt: FIXED_AT });
    expect(a.html).toBe(b.html);
  });
});
