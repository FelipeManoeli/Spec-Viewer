export * from "./schema/index.js";
export { build, type BuildInput, type BuildResult } from "./builder/build.js";
export {
  buildViewerData,
  type ViewerData,
  type ViewerDataResult,
  type ViewerModule,
  type ViewerScreen,
  type ViewerElement,
  type ViewerCoverage,
  type BuildDataInput,
} from "./builder/data.js";
export { escapeHtml } from "./builder/escape.js";
export { resolveScreen, resolveDomain, type ResolvedScreen } from "./builder/taxonomy.js";
export { renderViewer, type RenderInput } from "./viewer/template.js";
export { stringsFor, EN, JA, type Strings } from "./viewer/strings.js";
export {
  PRESETS,
  DEFAULT_ACCENT_COLOR,
  getPreset,
  listPresetIds,
  isValidHexColor,
  type Preset,
} from "./branding/presets.js";

// Helper for defining typed configs in consumer projects.
import type { Config } from "./schema/types.js";
export function defineConfig(c: Config): Config {
  return c;
}
