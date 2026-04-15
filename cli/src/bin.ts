#!/usr/bin/env node
import { cmdInit } from "./commands/init.js";
import { cmdBuild } from "./commands/build.js";
import { cmdValidate } from "./commands/validate.js";
import { cmdDoctor } from "./commands/doctor.js";
import { cmdCapture } from "./commands/capture.js";
import { cmdConfig } from "./commands/config.js";
import { errorExit } from "./lib/errors.js";
import { CLI_VERSION } from "./version.js";

const SUBCOMMANDS = {
  init: cmdInit,
  build: cmdBuild,
  validate: cmdValidate,
  doctor: cmdDoctor,
  capture: cmdCapture,
  config: cmdConfig,
} as const;

const USAGE = `spec-viewer v${CLI_VERSION}

Usage: spec-viewer <command> [options]

Commands:
  init        Scaffold spec-viewer config + specs folder in the current project
  build       Render the viewer HTML from your specs
  capture     Drive a browser via Playwright; screenshot + annotate each spec
  config      Read or update config (get/set/presets/apply-preset)
  validate    Check specs and config against the schema
  doctor      Print environment health (node version, config discovery, writable paths)

Global options:
  --help, -h        Show this message
  --version, -v     Print CLI version
  --config <path>   Override config file discovery

Run "spec-viewer <command> --help" for command-specific options.`;

async function main(argv: string[]): Promise<number> {
  const args = argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(USAGE);
    return 0;
  }

  if (args[0] === "--version" || args[0] === "-v") {
    console.log(CLI_VERSION);
    return 0;
  }

  const name = args[0] as keyof typeof SUBCOMMANDS;
  const handler = SUBCOMMANDS[name];
  if (!handler) {
    errorExit(`Unknown command: ${String(args[0])}\n\n${USAGE}`, 64);
  }

  return handler(args.slice(1));
}

main(process.argv).then(
  (code) => process.exit(code),
  (err) => {
    errorExit(err instanceof Error ? err.message : String(err), 1);
  }
);
