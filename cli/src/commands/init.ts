import fs from "node:fs";
import path from "node:path";
import { getPreset, isValidHexColor } from "@spec-viewer/core";
import { errorExit } from "../lib/errors.js";

const DEFAULT_TITLE = "My Project Specs";
const DEFAULT_ACCENT = "#10b981";
const DEFAULT_LOCALE: "en" | "ja" = "en";

interface InitOptions {
  title: string;
  accent: string;
  locale: "en" | "ja";
  force: boolean;
}

function parseFlags(args: string[]): InitOptions {
  const opts: InitOptions = {
    title: DEFAULT_TITLE,
    accent: DEFAULT_ACCENT,
    locale: DEFAULT_LOCALE,
    force: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--force") opts.force = true;
    else if (a === "--title" && args[i + 1]) {
      opts.title = args[i + 1] as string;
      i++;
    } else if (a === "--accent" && args[i + 1]) {
      opts.accent = args[i + 1] as string;
      i++;
    } else if (a === "--preset" && args[i + 1]) {
      const p = getPreset(args[i + 1] as string);
      if (!p) {
        errorExit(
          {
            problem: `Unknown preset: ${args[i + 1]}`,
            fix: "Run `spec-viewer config presets` to list available presets",
          },
          2
        );
      }
      opts.accent = p.accentColor;
      i++;
    } else if (a === "--locale" && args[i + 1]) {
      const l = args[i + 1];
      if (l !== "en" && l !== "ja") {
        errorExit({ problem: `Unsupported locale: ${l}`, fix: "Use --locale en or --locale ja" }, 2);
      }
      opts.locale = l;
      i++;
    }
  }
  if (!isValidHexColor(opts.accent)) {
    errorExit(
      { problem: `Invalid --accent value: ${opts.accent}`, fix: "Pass a 3- or 6-digit hex like #10b981" },
      2
    );
  }
  return opts;
}

function buildConfigTemplate(opts: InitOptions): Record<string, unknown> {
  return {
    $schema: "https://spec-viewer.dev/schema/config.v1.json",
    branding: {
      title: opts.title,
      accentColor: opts.accent,
      locale: opts.locale,
    },
    paths: {
      frontend: "src",
      specs: ".claude/spec-viewer/specs",
      output: "spec-viewer-output",
    },
    taxonomy: {
      modules: [{ id: "core", name: "Core", domains: [] }],
    },
  };
}

const EXAMPLE_SPEC = {
  $schema: "https://spec-viewer.dev/schema/v1.json",
  schemaVersion: 1,
  screen: "home",
  title: "Home",
  route: "/",
  module: "core",
  description: "Example spec. Replace with real screens via /spec-sync.",
  elements: [
    {
      label: "Call to action",
      selector: "[data-testid=cta]",
      description: "Primary action on the home page",
      details: {
        type: "button",
        required: false,
        businessRules: [],
        errorMessages: [],
      },
    },
  ],
};

const CONVENTIONS = `# spec-viewer conventions

This file is read by \`/spec-sync\` every run. Tell Claude how your project works
so generated specs match your code conventions.

## Selector key
We use \`data-testid\` for test selectors.

## Validation library
We use zod. Schemas live alongside form components.

## Permission model
Describe your permission check pattern (e.g., \`can('write', 'contacts')\`).

## Elements to skip
- Storybook-only components
- Dev-tools panels
`;

export async function cmdInit(args: string[]): Promise<number> {
  const cwd = process.cwd();
  const opts = parseFlags(args);
  const dir = path.join(cwd, ".claude/spec-viewer");
  const configPath = path.join(dir, "config.json");
  const specsDir = path.join(dir, "specs");
  const conventionsPath = path.join(dir, "CONVENTIONS.md");
  const examplePath = path.join(specsDir, "home.json");

  if (fs.existsSync(configPath) && !opts.force) {
    errorExit(
      {
        problem: `Config already exists at ${path.relative(cwd, configPath)}`,
        cause: "spec-viewer init will not overwrite existing config",
        fix: "Pass --force to overwrite, or edit the existing file directly",
      },
      2
    );
  }

  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(specsDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(buildConfigTemplate(opts), null, 2) + "\n");
  fs.writeFileSync(examplePath, JSON.stringify(EXAMPLE_SPEC, null, 2) + "\n");
  if (!fs.existsSync(conventionsPath)) {
    fs.writeFileSync(conventionsPath, CONVENTIONS);
  }

  // .gitignore inside the spec-viewer dir keeps per-user state out of the
  // committed config split. Only write if absent to preserve user edits.
  const gitignorePath = path.join(dir, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(
      gitignorePath,
      [
        "# spec-viewer per-user override (never commit secrets)",
        "local.json",
        "spec-viewer.local.json",
        "",
        "# generated viewer artefacts",
        "spec-viewer-output/",
        "",
      ].join("\n")
    );
  }

  process.stdout.write(
    [
      "✓ spec-viewer initialized",
      "",
      `  Config:      ${path.relative(cwd, configPath)}`,
      `  Specs dir:   ${path.relative(cwd, specsDir)}/`,
      `  Example:     ${path.relative(cwd, examplePath)}`,
      `  Conventions: ${path.relative(cwd, conventionsPath)}`,
      `  Gitignore:   ${path.relative(cwd, gitignorePath)}`,
      "",
      `  Title:       ${opts.title}`,
      `  Accent:      ${opts.accent}`,
      `  Locale:      ${opts.locale}`,
      "",
      "Next:",
      "  - /spec-theme        customize branding (or scan codebase for matching colors)",
      "  - /spec-capture      configure auth + capture screenshots from a running app",
      "  - /spec-build        render the viewer",
      "",
    ].join("\n")
  );
  return 0;
}
