import { describe, expect, it } from "vitest";
import { HOME_SALE_PRODUCTS_URL } from "./homeSaleProducts";

describe("HOME_SALE_PRODUCTS_URL", () => {
  it("requests only discounted products for the homepage", () => {
    const url = new URL(HOME_SALE_PRODUCTS_URL, "https://osutrade.com");

    expect(url.pathname).toBe("/api/products");
    expect(url.searchParams.get("discounted")).toBe("true");
    expect(url.searchParams.get("limit")).toBe("4");
    expect(url.searchParams.get("sort")).toBe("asc");
  });
});
