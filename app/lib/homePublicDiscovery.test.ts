import { describe, expect, test } from "vitest";

import { getHomePublicDiscovery } from "./homePublicDiscovery";

describe("home public discovery", () => {
  test("derives recent and clearance cards from server-provided public products", () => {
    const products = [
      { id: "old", name: "Old desk", price: 20, status: "available", quantity: 1, createdAt: "2026-09-01T00:00:00.000Z" },
      { id: "new", name: "New desk", price: 30, status: "available", quantity: 1, createdAt: "2026-09-03T00:00:00.000Z" },
      { id: "free", name: "Free chair", price: 0, clearancePrice: 0, isClearance: true, status: "available", quantity: 1, createdAt: "2026-09-02T00:00:00.000Z" },
    ];

    expect(getHomePublicDiscovery(products)).toMatchObject({
      recent: [{ id: "new" }, { id: "free" }, { id: "old" }],
      clearance: [{ id: "free" }],
    });
  });
});
