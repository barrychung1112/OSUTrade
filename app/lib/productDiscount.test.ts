import { describe, expect, test } from "vitest";
import {
  calculateEffectivePrice,
  getProductPricing,
  parseProductDiscount,
} from "./productDiscount";

describe("product discounts", () => {
  test("accepts only supported preset discounts", () => {
    expect(parseProductDiscount(20)).toBe(20);
    expect(parseProductDiscount(15)).toBeNull();
  });

  test("rounds the effective price to cents", () => {
    expect(calculateEffectivePrice(19.99, 30)).toBe(13.99);
  });

  test("uses the database-generated effective price when available", () => {
    expect(
      getProductPricing({ price: 50, discount_percent: 20, effective_price: 40 })
    ).toEqual({ originalPrice: 50, effectivePrice: 40, discountPercent: 20 });
  });
});

