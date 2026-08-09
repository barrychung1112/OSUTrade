import { describe, expect, it } from "vitest";

import { toProductRecord, type ProductRow } from "./productRecord";

const baseRow: ProductRow = {
  product_id: "product-1",
  name: "Desk",
  description: "A sturdy study desk",
  price: 100,
  category: "home",
  image_url: "https://example.com/fallback.jpg",
  seller_id: "seller-1",
  status: "available",
  quantity: 1,
};

describe("product record normalization", () => {
  it("uses effective discount pricing and preserves image order", () => {
    expect(
      toProductRecord({
        ...baseRow,
        discount_percent: 20,
        image_urls: [
          "https://example.com/first.jpg",
          "https://example.com/second.jpg",
        ],
      })
    ).toMatchObject({
      id: "product-1",
      price: 80,
      originalPrice: 100,
      effectivePrice: 80,
      discountPercent: 20,
      imageUrl: "https://example.com/first.jpg",
      imageUrls: [
        "https://example.com/first.jpg",
        "https://example.com/second.jpg",
      ],
    });
  });

  it("keeps zero-dollar clearance pricing", () => {
    expect(
      toProductRecord({
        ...baseRow,
        clearance_price: 0,
      })
    ).toMatchObject({
      price: 0,
      originalPrice: 100,
      clearancePrice: 0,
      isClearance: true,
    });
  });
});
