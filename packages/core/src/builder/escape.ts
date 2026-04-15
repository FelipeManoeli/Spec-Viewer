// HTML escaping for all user-supplied spec strings.
// Mandatory per the eng review: Claude-authored JSON must not be able to inject
// script tags or event handlers into the sign-off artifact.
// Opt-out via element.details.rawHtmlAllowed on a per-element basis.

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

export function escapeAttr(input: string): string {
  return escapeHtml(input);
}
