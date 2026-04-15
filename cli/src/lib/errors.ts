// First-class error messages. Every user-facing failure formatted as:
//   ✗ Problem
//     Cause: ...
//     Fix:   ...
// Never throw raw stack traces at users.

export interface UserError {
  problem: string;
  cause?: string;
  fix?: string;
}

export function formatError(e: UserError): string {
  const lines = [`✗ ${e.problem}`];
  if (e.cause) lines.push(`  Cause: ${e.cause}`);
  if (e.fix) lines.push(`  Fix:   ${e.fix}`);
  return lines.join("\n");
}

export function errorExit(message: string | UserError, code = 1): never {
  const text = typeof message === "string" ? message : formatError(message);
  process.stderr.write(`${text}\n`);
  process.exit(code);
}
