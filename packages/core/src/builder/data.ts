// Transform our SpecFile[] + capture artefacts into the viewer's `D` shape.
//
// The viewer JS expects:
//
//   D = {
//     modules: [{ id, name, screens: [{ id, title, route, el: [...], img?, cov? }],
//                 domains?: [{ id, name, sids }], totalEl, avgCov }],
//     features: [],
//     reverseFeatureMap: {},
//     totalScreens, totalElements, overallCoverage, generatedAt
//   }
//
// We compute `domains` from screen IDs using config.taxonomy. Coverage and
// badge coordinates come from per-screen capture reports (optional).

import type { Config, CoverageReport, ModuleConfig, SpecFile } from "../schema/types.js";
import { resolveDomain } from "./taxonomy.js";

export interface ViewerData {
  modules: ViewerModule[];
  features: unknown[];
  reverseFeatureMap: Record<string, string[]>;
  totalScreens: number;
  totalElements: number;
  overallCoverage: number;
  generatedAt: string;
}

export interface ViewerModule {
  id: string;
  name: string;
  screens: ViewerScreen[];
  domains?: ViewerDomain[];
  totalEl: number;
  avgCov: number;
}

export interface ViewerDomain {
  id: string;
  name: string;
  sids: string[];
}

export interface ViewerScreen {
  id: string;
  title: string;
  route: string;
  el: ViewerElement[];
  img?: string;
  cov?: ViewerCoverage;
}

export interface ViewerElement {
  n: string; // zero-padded badge number
  l: string; // label
  s: string; // selector
  d?: string; // description
  dt?: ViewerDetails;
  bx?: number;
  by?: number;
  modal?: { mod: string; sc: string; title: string };
}

export interface ViewerDetails {
  type?: string;
  required?: boolean;
  businessRules?: string[];
  errorMessages?: string[];
  validation?: string;
  stateRule?: string;
  notes?: string;
  displayCondition?: string;
}

export interface ViewerCoverage {
  t: number; // total
  f: number; // found
  m: number; // missing
  p: string; // percent string e.g. "85"
}

export interface BuildDataInput {
  config: Config;
  specs: SpecFile[];
  /** Map from screen id → relative path of screenshot. */
  screenshots?: Record<string, string>;
  /** Map from screen id → coverage report. */
  coverage?: Record<string, CoverageReport>;
  /** Map from element selector → { screen, badgeX, badgeY } from a capture report. */
  badgeCoords?: Record<string, Record<string, { x: number; y: number }>>;
  /** Optional override for generatedAt (mainly for stable test snapshots). */
  generatedAt?: string;
}

export interface ViewerDataResult {
  data: ViewerData;
  warnings: string[];
}

export function buildViewerData(input: BuildDataInput): ViewerDataResult {
  const { config, specs } = input;
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const warnings: string[] = [];

  // Single pass: bucket specs by module, collecting orphans + warnings.
  const moduleConfigs = new Map<string, ModuleConfig>();
  for (const m of config.taxonomy.modules) moduleConfigs.set(m.id, m);
  const buckets = new Map<string, SpecFile[]>();
  const orphans: SpecFile[] = [];
  for (const s of specs) {
    if (moduleConfigs.has(s.module)) {
      const arr = buckets.get(s.module) ?? [];
      arr.push(s);
      buckets.set(s.module, arr);
    } else {
      orphans.push(s);
      warnings.push(
        `Screen "${s.screen}" declares module "${s.module}" which is not in config.taxonomy`
      );
    }
  }

  const modules: ViewerModule[] = [];
  let totalScreens = 0;
  let totalElements = 0;
  let coverageSum = 0;
  let coverageCount = 0;

  const accumulate = (m: ViewerModule): void => {
    modules.push(m);
    totalScreens += m.screens.length;
    for (const sc of m.screens) {
      totalElements += sc.el.length;
      if (sc.cov) {
        coverageSum += parseFloat(sc.cov.p);
        coverageCount++;
      }
    }
  };

  for (const cfgMod of config.taxonomy.modules) {
    const moduleSpecs = buckets.get(cfgMod.id);
    if (moduleSpecs && moduleSpecs.length > 0) {
      accumulate(buildModule(cfgMod, moduleSpecs, input));
    }
  }
  if (orphans.length > 0) {
    // Non-guessable id so a real user module never collides with the synthetic bucket.
    accumulate(
      buildModule({ id: "__spec_viewer_unassigned__", name: "Unassigned", domains: [] }, orphans, input)
    );
  }

  const overallCoverage = coverageCount > 0 ? Math.round(coverageSum / coverageCount) : 0;

  return {
    data: {
      modules,
      features: [],
      reverseFeatureMap: {},
      totalScreens,
      totalElements,
      overallCoverage,
      generatedAt,
    },
    warnings,
  };
}

function buildModule(cfg: ModuleConfig, specs: SpecFile[], input: BuildDataInput): ViewerModule {
  // Sort specs by screen id for deterministic output.
  const sorted = [...specs].sort((a, b) => a.screen.localeCompare(b.screen));
  const screens: ViewerScreen[] = sorted.map((s) => buildScreen(s, input));

  // Build domain groupings if cfg.domains present.
  let domains: ViewerDomain[] | undefined;
  if (cfg.domains && cfg.domains.length > 0) {
    const buckets = new Map<string, string[]>();
    for (const sc of screens) {
      const dom = resolveDomain(sc.id, cfg.domains);
      const key = dom ?? "_other";
      const arr = buckets.get(key) ?? [];
      arr.push(sc.id);
      buckets.set(key, arr);
    }
    domains = [];
    for (const dId of cfg.domains) {
      const sids = buckets.get(dId);
      if (sids && sids.length > 0) domains.push({ id: dId, name: titleCase(dId), sids });
    }
    const other = buckets.get("_other");
    if (other && other.length > 0) domains.push({ id: "_other", name: "Other", sids: other });
    if (domains.length <= 1) domains = undefined; // viewer hides single-domain UI
  }

  let totalEl = 0;
  let covSum = 0;
  let covCount = 0;
  for (const sc of screens) {
    totalEl += sc.el.length;
    if (sc.cov) {
      covSum += parseFloat(sc.cov.p);
      covCount++;
    }
  }
  const avgCov = covCount > 0 ? Math.round(covSum / covCount) : 0;

  const result: ViewerModule = { id: cfg.id, name: cfg.name, screens, totalEl, avgCov };
  if (domains) result.domains = domains;
  return result;
}

function buildScreen(spec: SpecFile, input: BuildDataInput): ViewerScreen {
  const screenshots = input.screenshots ?? {};
  const coverage = input.coverage ?? {};
  const badgeCoords = input.badgeCoords?.[spec.screen] ?? {};

  const elements: ViewerElement[] = spec.elements.map((el, i) => {
    const num = String(i + 1).padStart(2, "0");
    const ve: ViewerElement = {
      n: num,
      l: el.label,
      s: el.selector,
    };
    if (el.description !== undefined) ve.d = el.description;
    if (el.details) ve.dt = mapDetails(el.details);

    const coord = badgeCoords[el.selector];
    if (coord) {
      ve.bx = coord.x;
      ve.by = coord.y;
    }

    // linkedScreen → modal pointer (resolved later in Phase 5 of /spec-sync;
    // for v0.1 just embed the screen id and assume same module).
    if (el.details?.linkedScreen) {
      ve.modal = { mod: spec.module, sc: el.details.linkedScreen, title: el.details.linkedScreen };
    }

    return ve;
  });

  const sc: ViewerScreen = {
    id: spec.screen,
    title: spec.title,
    route: spec.route,
    el: elements,
  };

  const shot = screenshots[spec.screen];
  if (shot) sc.img = shot;

  const cov = coverage[spec.screen];
  if (cov) {
    const pct = cov.total > 0 ? Math.round((cov.covered / cov.total) * 100) : 0;
    sc.cov = {
      t: cov.total,
      f: cov.covered,
      m: cov.total - cov.covered,
      p: String(pct),
    };
  }

  return sc;
}

function mapDetails(d: NonNullable<SpecFile["elements"][number]["details"]>): ViewerDetails {
  const out: ViewerDetails = {};
  if (d.type) out.type = d.type;
  if (d.required) out.required = d.required;
  if (d.businessRules) out.businessRules = [...d.businessRules];
  if (d.errorMessages) out.errorMessages = [...d.errorMessages];
  if (d.validation) out.validation = d.validation;
  return out;
}

function titleCase(s: string): string {
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
