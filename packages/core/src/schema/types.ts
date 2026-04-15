// Spec schema types. Single source of truth for spec JSON shape.
// Every spec file + config file is validated against these types.

export const SCHEMA_VERSION = 1;

export interface SpecFile {
  $schema?: string;
  schemaVersion: typeof SCHEMA_VERSION;
  screen: string;
  title: string;
  route: string;
  module: string;
  description?: string;
  navigation?: Navigation;
  elements: Element[];
}

export interface Navigation {
  path: string;
  auth?: boolean;
  steps?: NavigationStep[];
}

export interface NavigationStep {
  label: string;
  action: "click" | "fill" | "waitFor" | "navigate";
  selector?: string;
  value?: string;
  target?: string;
}

export interface Element {
  label: string;
  selector: string;
  description?: string;
  details?: ElementDetails;
}

export interface ElementDetails {
  type?: ElementType;
  required?: boolean;
  businessRules?: string[];
  errorMessages?: string[];
  validation?: string;
  linkedScreen?: string | null;
  rawHtmlAllowed?: boolean;
}

export type ElementType =
  | "button"
  | "input"
  | "select"
  | "textarea"
  | "link"
  | "form"
  | "modal-trigger"
  | "checkbox"
  | "radio"
  | "toggle"
  | "tab"
  | "other";

// Config schema
export interface Config {
  branding: BrandingConfig;
  paths: PathsConfig;
  taxonomy: TaxonomyConfig;
  routing?: RoutingConfig;
  capture?: CaptureConfig;
  featureHierarchy?: FeatureHierarchyConfig | null;
  sync?: SyncConfig;
  extraction?: ExtractionConfig;
}

export interface BrandingConfig {
  title: string;
  accentColor?: string;
  locale?: "en" | "ja";
}

export interface PathsConfig {
  frontend?: string;
  specs: string;
  screenshots?: string;
  coverage?: string;
  output: string;
}

export interface TaxonomyConfig {
  modules: ModuleConfig[];
}

export interface ModuleConfig {
  id: string;
  name: string;
  domains?: string[];
}

export interface RoutingConfig {
  mode: "react-router" | "next-app" | "next-pages" | "file-glob" | "manual";
  routerConfigFile?: string;
  pageGlob?: string;
  routes?: Array<{ route: string; componentFile: string }>;
  overrides?: Record<string, string>;
  modalMap?: Record<string, string>;
}

export interface CaptureConfig {
  baseUrl: string;
  /**
   * Auth strategy used before the per-spec capture loop.
   * - "none"    — no auth (default; works for public/dev pages)
   * - "form"    — Playwright fills the consumer's login form once
   * - "storage" — pre-seed localStorage / sessionStorage / cookies before navigation
   */
  authStrategy?: "none" | "form" | "storage";
  auth?: AuthConfig;
  viewport?: { width: number; height: number };
}

/**
 * Auth configuration. Fields used depend on the chosen strategy. Most teams
 * keep selectors in the committed config and put values in the local override
 * (spec-viewer.local.json) which is gitignored by default.
 */
export interface AuthConfig {
  // form strategy
  loginPath?: string;
  fields?: Record<string, AuthField>;
  submitSelector?: string;
  /** Optional: relative path the SPA redirects to after a successful login. */
  successPath?: string;
  /** Optional: selector that should appear on a logged-in page (used as a wait condition). */
  successSelector?: string;
  /** Optional: extra ms to wait after submit (defaults to 0 — rely on successPath/successSelector). */
  postSubmitWaitMs?: number;

  // storage strategy
  localStorage?: Record<string, string>;
  sessionStorage?: Record<string, string>;
  cookies?: Array<AuthCookie>;
}

export interface AuthField {
  selector: string;
  /** Plain value, or `${ENV_VAR}` to substitute from process.env at load time. */
  value: string;
}

export interface AuthCookie {
  name: string;
  /** Plain value, or `${ENV_VAR}` to substitute from process.env at load time. */
  value: string;
  domain?: string;
  path?: string;
}

export interface FeatureHierarchyConfig {
  source: string;
}

export interface SyncConfig {
  concurrency?: number;
  cache?: boolean;
}

export interface ExtractionConfig {
  selectorKey?: string;
  componentAllowlist?: string[];
}

// Provenance sidecar (sits next to each spec file)
export interface ProvenanceMeta {
  schemaVersion: typeof SCHEMA_VERSION;
  lastSync: string;
  fields: Record<string, FieldProvenance>;
}

export interface FieldProvenance {
  source: "user" | "claude" | "merged";
  lastModified?: string;
  lastSync?: string;
  userPart?: string;
  claudePart?: string;
}

// Coverage report (produced by capture; consumed by builder)
export interface CoverageReport {
  screen: string;
  total: number;
  covered: number;
  elements: Record<string, { covered: boolean; note?: string }>;
  /**
   * Per-selector badge coordinates from the annotator. Optional because hand-
   * authored reports (or older capture runs) may not have positions.
   */
  foundCoords?: Record<string, { x: number; y: number }>;
}
