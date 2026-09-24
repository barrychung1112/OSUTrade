import { describe, expect, test } from "vitest";
import {
  buildSellerProfileHref,
  normalizeSellerProfileReturnTo,
} from "./sellerProfileReturn";

describe("seller profile return paths", () => {
  test("keeps marketplace state when linking to a seller profile", () => {
    expect(
      buildSellerProfileHref("seller-1", "/overview?page=2&q=desk&favorites=1")
    ).toBe("/sellers/seller-1?returnTo=%2Foverview%3Fpage%3D2%26q%3Ddesk%26favorites%3D1");
  });

  test("falls back to the marketplace for unsafe return paths", () => {
    expect(normalizeSellerProfileReturnTo("https://example.com")).toBe("/overview");
    expect(normalizeSellerProfileReturnTo("//example.com")).toBe("/overview");
    expect(normalizeSellerProfileReturnTo("/overview-elsewhere")).toBe("/overview");
  });
});
