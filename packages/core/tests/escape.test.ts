import { describe, expect, it } from "vitest";
import { escapeHtml } from "../src/builder/escape.js";

describe("escapeHtml", () => {
  it("escapes the five standard chars", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
    );
  });

  it("escapes ampersand before other chars", () => {
    expect(escapeHtml("Tom & Jerry <3")).toBe("Tom &amp; Jerry &lt;3");
  });

  it("leaves plain text untouched", () => {
    expect(escapeHtml("Hello, World")).toBe("Hello, World");
  });

  it("escapes double quotes for attributes", () => {
    expect(escapeHtml('" onerror="alert(1)"')).toBe(
      "&quot; onerror=&quot;alert(1)&quot;"
    );
  });

  it("handles empty strings", () => {
    expect(escapeHtml("")).toBe("");
  });
});
