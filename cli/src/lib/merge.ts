// Deep-merge for plain JSON-like objects. Arrays are replaced (not concatenated)
// so a local override of `taxonomy.modules` wholly replaces the committed list,
// matching how most users expect overrides to work.

export function deepMerge<T>(base: T, override: unknown): T {
  if (override === undefined || override === null) return base;
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override as T;
  }
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (k in out && isPlainObject(out[k]) && isPlainObject(v)) {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/**
 * Substitute `${ENV_VAR}` references in any string field with the matching
 * process.env value. Walks nested objects and arrays. Unknown env vars throw
 * so missing creds fail loud at config load, not at capture time.
 */
export function substituteEnv<T>(value: T, env: Record<string, string | undefined> = process.env): T {
  return walk(value, env) as T;
}

function walk(value: unknown, env: Record<string, string | undefined>): unknown {
  if (typeof value === "string") return substString(value, env);
  if (Array.isArray(value)) return value.map((v) => walk(v, env));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v, env);
    return out;
  }
  return value;
}

function substString(s: string, env: Record<string, string | undefined>): string {
  return s.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, name: string) => {
    const v = env[name];
    if (v === undefined) {
      throw new Error(
        `Environment variable \${${name}} is referenced in config but not set. ` +
          "Set it in your shell or remove the reference."
      );
    }
    return v;
  });
}
