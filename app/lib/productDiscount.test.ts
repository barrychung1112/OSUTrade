import { describe, expect, test } from "vitest";
import {
  calculateEffectivePrice,
  getProductPricing,
  parseClearancePrice,
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
    ).toEqual({
      originalPrice: 50,
      effectivePrice: 40,
      discountPercent: 20,
      clearancePrice: null,
      isClearance: false,
      isDiscounted: true,
    });
  });

  test("accepts only free, one-dollar, or cleared clearance values", () => {
    expect(parseClearancePrice(null)).toBeNull();
    expect(parseClearancePrice(0)).toBe(0);
    expect(parseClearancePrice(1)).toBe(1);
    expect(parseClearancePrice("0")).toBe(0);
    expect(parseClearancePrice("1")).toBe(1);
    expect(parseClearancePrice(false)).toBeUndefined();
    expect(parseClearancePrice(true)).toBeUndefined();
    expect(parseClearancePrice("")).toBeUndefined();
    expect(parseClearancePrice(2)).toBeUndefined();
  });

  test("uses free clearance ahead of a stored discount", () => {
    expect(
      getProductPricing({
        price: 50,
        discount_percent: 20,
        clearance_price: 0,
        effective_price: 0,
      })
    ).toEqual({
      originalPrice: 50,
      effectivePrice: 0,
      discountPercent: 20,
      clearancePrice: 0,
      isClearance: true,
      isDiscounted: false,
    });
  });

  test("falls back to the clearance price before calculating a discount", () => {
    expect(
      getProductPricing({
        price: 50,
        discount_percent: 20,
        clearance_price: 1,
      }).effectivePrice
    ).toBe(1);
  });
});

