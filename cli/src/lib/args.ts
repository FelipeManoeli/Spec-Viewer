// Tiny shared flag extractor for CLI subcommands. Not a full parser — just
// `--name value` lookups. Returns the value following the flag, or undefined.

export function extractFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}
