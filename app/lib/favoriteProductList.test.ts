import { describe, expect, test } from "vitest";
import { filterFavoriteProducts } from "./favoriteProductList";

describe("filterFavoriteProducts", () => {
  test("filters and sorts the complete resolved favorites list in the browser", () => {
    const products = [
      {
        id: "desk-1",
        name: "Desk",
        nameTranslations: { en: "Desk", zhTw: "書桌" },
        price: 30,
        category: "home",
        discountPercent: 0,
        createdAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "lamp-1",
        name: "Lamp",
        nameTranslations: { en: "Lamp", zhTw: "檯燈" },
        price: 10,
        category: "home",
        discountPercent: 20,
        createdAt: "2026-09-02T00:00:00Z",
      },
      {
        id: "book-1",
        name: "Book",
        price: 1,
        category: "books",
        isClearance: true,
        createdAt: "2026-09-03T00:00:00Z",
      },
    ];

    expect(
      filterFavoriteProducts(products, {
        name: "燈",
        category: "all",
        sort: "none",
        saleOnly: false,
        clearanceOnly: false,
      }).map((product) => product.id)
    ).toEqual(["lamp-1"]);
    expect(
      filterFavoriteProducts(products, {
        name: "",
        category: "home",
        sort: "asc",
        saleOnly: false,
        clearanceOnly: false,
      }).map((product) => product.id)
    ).toEqual(["lamp-1", "desk-1"]);
    expect(
      filterFavoriteProducts(products, {
        name: "",
        category: "all",
        sort: "none",
        saleOnly: true,
        clearanceOnly: false,
      }).map((product) => product.id)
    ).toEqual(["lamp-1"]);
  });
});
