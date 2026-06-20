import { describe, expect, it } from "vitest";
import { buildHomeMarketSignals } from "./homeMarketSignals";
import type { Product } from "./products";

describe("buildHomeMarketSignals", () => {
  it("summarizes public marketplace inventory into visitor-facing signals", () => {
    const now = new Date("2026-06-20T12:00:00.000Z");
    const products: Product[] = [
      {
        id: "desk",
        name: "Desk",
        price: 25,
        category: "home",
        quantity: 1,
        createdAt: "2026-06-19T12:00:00.000Z",
      },
      {
        id: "lamp",
        name: "Lamp",
        price: 18,
        category: "home",
        quantity: 3,
        createdAt: "2026-06-14T12:00:00.000Z",
      },
      {
        id: "monitor",
        name: "Monitor",
        price: 70,
        category: "electronics",
        quantity: 2,
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    ];

    expect(buildHomeMarketSignals(products, now)).toEqual({
      activeListings: 3,
      availableItems: 6,
      addedThisWeek: 2,
      popularCategory: "home",
      recentlyAddedName: "Desk",
    });
  });

  it("returns empty signals when there are no products", () => {
    expect(buildHomeMarketSignals([], new Date("2026-06-20T12:00:00.000Z"))).toEqual({
      activeListings: 0,
      availableItems: 0,
      addedThisWeek: 0,
      popularCategory: null,
      recentlyAddedName: null,
    });
  });
});
