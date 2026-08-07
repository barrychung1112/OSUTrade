import { describe, expect, test } from "vitest";
import {
  HOME_CLEARANCE_PRODUCTS_URL,
  HOME_RECENT_PRODUCTS_URL,
} from "./homeDiscoveryProducts";

describe("homepage discovery queries", () => {
  test("loads the latest available inventory", () => {
    expect(HOME_RECENT_PRODUCTS_URL).toBe("/api/products?limit=4");
  });

  test("loads clearance inventory independently", () => {
    expect(HOME_CLEARANCE_PRODUCTS_URL).toBe(
      "/api/products?limit=4&sort=asc&clearance=true"
    );
  });
});
