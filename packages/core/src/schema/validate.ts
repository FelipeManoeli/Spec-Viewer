// Zero-dependency schema validation. Intentionally small.
// We do not pull in Ajv or zod in v0.1 — the schema is narrow and stable enough
// that a hand-rolled validator keeps startup fast and dependencies minimal.
// If the schema grows, revisit.

import type { Config, SpecFile } from "./types.js";
import { SCHEMA_VERSION } from "./types.js";

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  errors: ValidationError[];
}

type Issue = ValidationError;

function err(path: string, message: string): Issue {
  return { path, message };
}

export function validateSpec(input: unknown): ValidationResult<SpecFile> {
  const errors: Issue[] = [];
  if (!isObject(input)) {
    return { ok: false, errors: [err("$", "spec must be an object")] };
  }
  const v = input;

  requireNumber(v, "schemaVersion", errors);
  if ("schemaVersion" in v && v["schemaVersion"] !== SCHEMA_VERSION) {
    errors.push(
      err("schemaVersion", `expected ${SCHEMA_VERSION}, got ${String(v["schemaVersion"])}`)
    );
  }
  requireString(v, "screen", errors);
  requireString(v, "title", errors);
  requireString(v, "route", errors);
  requireString(v, "module", errors);
  optionalString(v, "description", errors);

  if (!("elements" in v) || !Array.isArray(v["elements"])) {
    errors.push(err("elements", "required, must be an array"));
  } else {
    v["elements"].forEach((el, i) => validateElement(el, `elements[${i}]`, errors));
  }

  if ("navigation" in v && v["navigation"] !== undefined) {
    validateNavigation(v["navigation"], "navigation", errors);
  }

  // Validation above is exhaustive for SpecFile shape. The double cast
  // (`as unknown as`) is required because TS cannot narrow from
  // Record<string, unknown> directly; we know the runtime check is sufficient.
  return errors.length === 0
    ? { ok: true, value: input as unknown as SpecFile, errors: [] }
    : { ok: false, errors };
}

export function validateConfig(input: unknown): ValidationResult<Config> {
  const errors: Issue[] = [];
  if (!isObject(input)) {
    return { ok: false, errors: [err("$", "config must be an object")] };
  }
  const v = input;

  if (!isObject(v["branding"])) {
    errors.push(err("branding", "required, must be an object"));
  } else {
    const b = v["branding"];
    requireString(b, "title", errors, "branding.");
    if ("locale" in b && b["locale"] !== undefined && b["locale"] !== "en" && b["locale"] !== "ja") {
      errors.push(err("branding.locale", `must be "en" or "ja" (got ${JSON.stringify(b["locale"])})`));
    }
  }

  if (!isObject(v["paths"])) {
    errors.push(err("paths", "required, must be an object"));
  } else {
    requireString(v["paths"], "specs", errors, "paths.");
    requireString(v["paths"], "output", errors, "paths.");
  }

  if (isObject(v["capture"])) {
    const c = v["capture"];
    requireString(c, "baseUrl", errors, "capture.");
    if ("authStrategy" in c && c["authStrategy"] !== undefined) {
      const allowed = ["none", "form", "storage"];
      if (typeof c["authStrategy"] !== "string" || !allowed.includes(c["authStrategy"])) {
        errors.push(
          err(
            "capture.authStrategy",
            `must be one of ${allowed.join(", ")} (got ${JSON.stringify(c["authStrategy"])})`
          )
        );
      }
    }
  }

  if (!isObject(v["taxonomy"])) {
    errors.push(err("taxonomy", "required, must be an object"));
  } else if (!Array.isArray(v["taxonomy"]["modules"])) {
    errors.push(err("taxonomy.modules", "required, must be an array"));
  } else {
    v["taxonomy"]["modules"].forEach((m, i) => {
      const base = `taxonomy.modules[${i}]`;
      if (!isObject(m)) {
        errors.push(err(base, "must be an object"));
        return;
      }
      requireString(m, "id", errors, `${base}.`);
      requireString(m, "name", errors, `${base}.`);
    });
  }

  return errors.length === 0
    ? { ok: true, value: input as unknown as Config, errors: [] }
    : { ok: false, errors };
}

function validateElement(el: unknown, path: string, errors: Issue[]): void {
  if (!isObject(el)) {
    errors.push(err(path, "must be an object"));
    return;
  }
  requireString(el, "label", errors, `${path}.`);
  requireString(el, "selector", errors, `${path}.`);
  optionalString(el, "description", errors, `${path}.`);

  if ("details" in el && el["details"] !== undefined) {
    if (!isObject(el["details"])) {
      errors.push(err(`${path}.details`, "must be an object when present"));
    } else {
      const d = el["details"];
      if ("businessRules" in d && d["businessRules"] !== undefined && !isArrayOfString(d["businessRules"])) {
        errors.push(err(`${path}.details.businessRules`, "must be string[]"));
      }
      if ("errorMessages" in d && d["errorMessages"] !== undefined && !isArrayOfString(d["errorMessages"])) {
        errors.push(err(`${path}.details.errorMessages`, "must be string[]"));
      }
    }
  }
}

function validateNavigation(nav: unknown, path: string, errors: Issue[]): void {
  if (!isObject(nav)) {
    errors.push(err(path, "must be an object"));
    return;
  }
  requireString(nav, "path", errors, `${path}.`);
}

// Helpers
function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
function isArrayOfString(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((s) => typeof s === "string");
}
function requireString(
  v: Record<string, unknown>,
  key: string,
  errors: Issue[],
  prefix = ""
): void {
  if (!(key in v) || typeof v[key] !== "string" || v[key] === "") {
    errors.push(err(`${prefix}${key}`, "required, must be non-empty string"));
  }
}
function optionalString(
  v: Record<string, unknown>,
  key: string,
  errors: Issue[],
  prefix = ""
): void {
  if (key in v && v[key] !== undefined && typeof v[key] !== "string") {
    errors.push(err(`${prefix}${key}`, "must be a string when present"));
  }
}
function requireNumber(v: Record<string, unknown>, key: string, errors: Issue[]): void {
  if (!(key in v) || typeof v[key] !== "number") {
    errors.push(err(key, "required, must be a number"));
  }
}
