import { describe, expect, it } from "vitest";
import {
  canBatchEditSellerProduct,
  filterAndSortSellerProducts,
} from "./sellerProductWorkspace";

const products = [
  { id: "1", name: "Desk", price: 25, quantity: 1, status: "available" as const, createdAt: "2026-08-01" },
  { id: "2", name: "Lamp", nameTranslations: { zhTw: "檯燈" }, price: 10, quantity: 4, status: "pending" as const, createdAt: "2026-08-03" },
  { id: "3", name: "Chair", price: 15, quantity: 2, status: "sold" as const, createdAt: "2026-08-02" },
];

describe("filterAndSortSellerProducts", () => {
  it("filters by status and translated product names", () => {
    expect(
      filterAndSortSellerProducts(products, {
        query: "檯燈",
        status: "pending",
        sort: "newest",
      }).map((product) => product.id)
    ).toEqual(["2"]);
  });

  it("sorts visible products by stock", () => {
    expect(
      filterAndSortSellerProducts(products, {
        query: "",
        status: "all",
        sort: "stockDesc",
      }).map((product) => product.id)
    ).toEqual(["2", "3", "1"]);
  });

  it("excludes unavailable and active-request products from batch edits", () => {
    expect(canBatchEditSellerProduct(products[0])).toBe(true);
    expect(
      canBatchEditSellerProduct({ ...products[0], hasActiveRequest: true })
    ).toBe(false);
    expect(canBatchEditSellerProduct(products[1])).toBe(false);
  });
});
