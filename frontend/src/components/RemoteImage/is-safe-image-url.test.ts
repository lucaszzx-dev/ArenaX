import { describe, expect, it } from "vitest";

import { isSafeImageUrl } from "./is-safe-image-url";

describe("isSafeImageUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isSafeImageUrl("https://exemplo.com/escudo.png")).toBe(true);
    expect(isSafeImageUrl("http://cdn.exemplo.com/avatar.jpg")).toBe(true);
  });

  it("rejects empty or null values", () => {
    expect(isSafeImageUrl(null)).toBe(false);
    expect(isSafeImageUrl(undefined)).toBe(false);
    expect(isSafeImageUrl("")).toBe(false);
    expect(isSafeImageUrl("   ")).toBe(false);
  });

  it("rejects non-http protocols", () => {
    expect(isSafeImageUrl("ftp://exemplo.com/escudo.png")).toBe(false);
    expect(isSafeImageUrl("file:///C:/foto.png")).toBe(false);
    expect(isSafeImageUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeImageUrl("data:image/png;base64,AAA")).toBe(false);
  });

  it("rejects unparsable values", () => {
    expect(isSafeImageUrl("not a url")).toBe(false);
    expect(isSafeImageUrl("exemplo.com/escudo.png")).toBe(false);
  });
});
