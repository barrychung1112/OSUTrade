import { describe, expect, test } from "vitest";
import {
  isPublicFavoriteProduct,
  normalizeFavoriteProductIds,
} from "./favorites";

describe("normalizeFavoriteProductIds", () => {
  test("trims, de-duplicates, and caps persisted product IDs", () => {
    expect(
      normalizeFavoriteProductIds(["  product-a  ", "product-a", 42, "", null], 2)
    ).toEqual(["product-a", "42"]);
  });
});

describe("isPublicFavoriteProduct", () => {
  test("only keeps available products with stock", () => {
    expect(isPublicFavoriteProduct({ status: "available", quantity: 1 })).toBe(true);
    expect(isPublicFavoriteProduct({ status: "available", quantity: 0 })).toBe(false);
    expect(isPublicFavoriteProduct({ status: "pending", quantity: 1 })).toBe(false);
  });
});
