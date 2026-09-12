import { describe, expect, test } from "vitest";

import {
  productCacheTag,
  publicProductInvalidationTargets,
  publicProductPaths,
  publicProductsCacheTag,
} from "./publicProductCache";

describe("public product cache contract", () => {
  test("uses one stable collection tag", () => {
    expect(publicProductsCacheTag).toBe("public-products");
  });

  test("builds a stable per-product tag", () => {
    expect(productCacheTag("desk lamp")).toBe("public-product:desk lamp");
  });

  test("returns every localized product URL that must be invalidated", () => {
    expect(publicProductPaths("product-1")).toEqual([
      "/en/product/product-1",
      "/zh-tw/product/product-1",
      "/zh-cn/product/product-1",
    ]);
  });

  test("includes collection, product, sitemap, and every localized route", () => {
    expect(publicProductInvalidationTargets("product-1")).toEqual({
      tags: ["public-products", "public-product:product-1"],
      paths: [
        "/sitemap.xml",
        "/en/product/product-1",
        "/zh-tw/product/product-1",
        "/zh-cn/product/product-1",
      ],
    });
  });
});
