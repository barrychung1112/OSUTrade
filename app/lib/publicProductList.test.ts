import { describe, expect, test } from "vitest";

import {
  getPublicProductList,
  parsePublicProductListParams,
} from "./publicProductList";

const products = [
  {
    id: "desk",
    name: "Desk",
    price: 40,
    category: "home",
    status: "available",
    quantity: 1,
    createdAt: "2026-09-03T00:00:00.000Z",
  },
  {
    id: "lamp",
    name: "Lamp",
    price: 10,
    originalPrice: 20,
    discountPercent: 50,
    category: "home",
    status: "available",
    quantity: 1,
    createdAt: "2026-09-02T00:00:00.000Z",
  },
  {
    id: "chair",
    name: "Chair",
    price: 5,
    clearancePrice: 0,
    isClearance: true,
    category: "home",
    status: "available",
    quantity: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
  },
];

describe("public product list parameters", () => {
  test("normalizes unsupported and out-of-range query values", () => {
    expect(
      parsePublicProductListParams({
        page: "0",
        limit: "1000",
        category: "not-a-category",
        sort: "drop table",
        sale: "1",
        clearance: "1",
      })
    ).toEqual({
      page: 1,
      limit: 48,
      category: undefined,
      sort: undefined,
      name: undefined,
      discounted: true,
      clearance: false,
    });
  });

  test("filters, sorts, and pages public products", () => {
    expect(
      getPublicProductList(products, {
        page: 1,
        limit: 1,
        category: "home",
        sort: "asc",
        discounted: false,
        clearance: false,
      })
    ).toMatchObject({
      total: 3,
      page: 1,
      limit: 1,
      data: [{ id: "chair" }],
    });
  });
});
