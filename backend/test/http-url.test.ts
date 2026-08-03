import { describe, expect, it } from "vitest";

import { httpUrl } from "../src/validation/http-url.js";

describe("httpUrl", () => {
  it("accepts http and https urls", () => {
    expect(httpUrl.parse("https://example.com/logo.png")).toBe(
      "https://example.com/logo.png"
    );
    expect(httpUrl.parse("http://cdn.example.com/a.png")).toBe(
      "http://cdn.example.com/a.png"
    );
  });

  it("normalizes empty values to null", () => {
    expect(httpUrl.parse("")).toBeNull();
    expect(httpUrl.parse(null)).toBeNull();
  });

  it("rejects non-http protocols", () => {
    for (const value of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "ftp://example.com/logo.png"
    ]) {
      expect(() => httpUrl.parse(value)).toThrow();
    }
  });

  it("rejects malformed urls", () => {
    expect(() => httpUrl.parse("not-a-url")).toThrow();
  });
});