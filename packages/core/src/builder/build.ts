// Top-level builder: assembles config + specs + capture artefacts and returns
// the standalone HTML viewer. No filesystem I/O; caller passes data in.

import { DEFAULT_ACCENT_COLOR } from "../branding/presets.js";
import { buildViewerData, type BuildDataInput } from "./data.js";
import { renderViewer } from "../viewer/template.js";
import { stringsFor } from "../viewer/strings.js";

// `BuildInput` is identical to `BuildDataInput` — the builder is just a thin
// wrapper that turns the data-shape result into HTML. Keep one type.
export type BuildInput = BuildDataInput;

export interface BuildResult {
  html: string;
  warnings: string[];
}

export function build(input: BuildInput): BuildResult {
  const { config } = input;
  const { data, warnings } = buildViewerData(input);
  const strings = stringsFor(config.branding.locale);
  const html = renderViewer({
    title: config.branding.title,
    accent: config.branding.accentColor ?? DEFAULT_ACCENT_COLOR,
    locale: config.branding.locale ?? "en",
    strings,
    data,
  });
  return { html, warnings };
}
