import { describe, expect, it } from "vitest";

import { shouldBypassProductImageOptimization } from "./productImageOptimization";

describe("product image optimization", () => {
  it("bypasses Vercel optimization for product images hosted by Supabase", () => {
    expect(
      shouldBypassProductImageOptimization(
        "https://kigqkrmjzwqrxlpoukfb.supabase.co/storage/v1/object/public/product-images/item.jpg"
      )
    ).toBe(true);
  });

  it("keeps optimization enabled for local and unrelated images", () => {
    expect(shouldBypassProductImageOptimization("/images/Bike_0.jpg")).toBe(false);
    expect(
      shouldBypassProductImageOptimization("https://placehold.co/600x400")
    ).toBe(false);
  });
});
