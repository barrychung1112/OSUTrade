import { describe, expect, test } from "vitest";

import {
  buildMarketplaceUrl,
  getMarketplaceReturnPath,
  isMarketplaceReturnPath,
  readMarketplaceUrlState,
  resetMarketplacePage,
} from "./marketplaceUrlState";

describe("marketplace URL state", () => {
  test("reads a requested page and filters from the URL", () => {
    expect(
      readMarketplaceUrlState(
        "?page=3&q=desk+lamp&category=home&sort=asc&sale=1"
      )
    ).toEqual({
      page: 3,
      name: "desk lamp",
      category: "home",
      sort: "asc",
      saleOnly: true,
      clearanceOnly: false,
    });
  });

  test("uses safe defaults for invalid URL values", () => {
    expect(readMarketplaceUrlState("?page=-4&category=unknown&sort=up")).toEqual({
      page: 1,
      name: "",
      category: "all",
      sort: "none",
      saleOnly: false,
      clearanceOnly: false,
    });
  });

  test("serializes only non-default values in a stable URL", () => {
    expect(
      buildMarketplaceUrl({
        page: 3,
        name: "desk lamp",
        category: "home",
        sort: "asc",
        saleOnly: true,
        clearanceOnly: false,
      })
    ).toBe("/overview?page=3&q=desk+lamp&category=home&sort=asc&sale=1");
  });

  test("resets the page when a filter is changed", () => {
    expect(
      resetMarketplacePage({
        page: 4,
        name: "",
        category: "electronics",
        sort: "none",
        saleOnly: false,
        clearanceOnly: false,
      })
    ).toMatchObject({ page: 1, category: "electronics" });
  });

  test("allows only internal marketplace return paths", () => {
    expect(isMarketplaceReturnPath("/overview?page=3&category=home")).toBe(true);
    expect(isMarketplaceReturnPath("https://example.com/overview?page=3")).toBe(false);
    expect(isMarketplaceReturnPath("/seller")).toBe(false);
    expect(getMarketplaceReturnPath("/overview?page=3")).toBe("/overview?page=3");
    expect(getMarketplaceReturnPath("https://example.com")).toBe("/overview");
  });
});
