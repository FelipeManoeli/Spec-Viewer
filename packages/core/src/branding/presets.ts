// Curated color presets. Each preset names a palette the user can apply via
// `spec-viewer config apply-preset <id>` or interactively via /spec-theme.
//
// v0.1 keeps the branding surface narrow: id, name, accentColor, description.
// We can extend with secondaryColor / fontFamily / logo later without breaking
// existing presets — new fields just default to undefined.

export interface Preset {
  id: string;
  name: string;
  accentColor: string;
  description: string;
}

/**
 * Single source of truth for the fallback accent — used when config doesn't
 * specify one, when init is run without flags, and when the renderer rejects
 * a malformed accent. Keep all three in sync via this constant.
 */
export const DEFAULT_ACCENT_COLOR = "#10b981";

export const PRESETS: readonly Preset[] = [
  { id: "emerald",  name: "Emerald",  accentColor: DEFAULT_ACCENT_COLOR, description: "Friendly green. Yasai default." },
  { id: "indigo",   name: "Indigo",   accentColor: "#6366f1", description: "Modern purple-blue, fits SaaS dashboards." },
  { id: "sky",      name: "Sky",      accentColor: "#0ea5e9", description: "Clean light blue, neutral and trustworthy." },
  { id: "violet",   name: "Violet",   accentColor: "#8b5cf6", description: "Vibrant purple, stands out in screenshots." },
  { id: "rose",     name: "Rose",     accentColor: "#f43f5e", description: "Warm coral, energetic." },
  { id: "amber",    name: "Amber",    accentColor: "#f59e0b", description: "Bright orange, attention-grabbing." },
  { id: "teal",     name: "Teal",     accentColor: "#14b8a6", description: "Cool aqua, easy on the eyes." },
  { id: "slate",    name: "Slate",    accentColor: "#475569", description: "Neutral grey, professional and quiet." },
] as const;

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function listPresetIds(): string[] {
  return PRESETS.map((p) => p.id);
}

/** Loose hex check used for user-supplied accent colors. */
export function isValidHexColor(s: string): boolean {
  return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(s);
}
