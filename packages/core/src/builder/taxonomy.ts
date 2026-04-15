// Module / domain resolution. Config-driven, not hardcoded.

import type { Config, SpecFile } from "../schema/types.js";

export interface ResolvedScreen {
  spec: SpecFile;
  moduleId: string;
  moduleName: string;
  domain?: string;
}

export function resolveScreen(spec: SpecFile, config: Config): ResolvedScreen {
  const module = config.taxonomy.modules.find((m) => m.id === spec.module);
  if (!module) {
    // Module declared in spec doesn't exist in config. We surface this loudly at
    // build time but do not crash the build — the screen renders under "Unknown".
    return {
      spec,
      moduleId: spec.module,
      moduleName: `Unknown module: ${spec.module}`,
    };
  }

  const domain = resolveDomain(spec.screen, module.domains);
  const result: ResolvedScreen = {
    spec,
    moduleId: module.id,
    moduleName: module.name,
  };
  if (domain !== undefined) result.domain = domain;
  return result;
}

// Longest-prefix match — if screen id starts with any declared domain prefix,
// that's the domain. Matches Matilda's convention (documented).
export function resolveDomain(screenId: string, domains?: string[]): string | undefined {
  if (!domains || domains.length === 0) return undefined;
  const sorted = [...domains].sort((a, b) => b.length - a.length);
  for (const d of sorted) {
    if (screenId === d || screenId.startsWith(`${d}-`) || screenId.startsWith(`${d}/`)) {
      return d;
    }
  }
  return undefined;
}
