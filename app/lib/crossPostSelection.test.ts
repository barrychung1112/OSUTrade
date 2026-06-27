import { describe, expect, test } from "vitest";
import {
  maxCrossPostProducts,
  reconcileCrossPostSelection,
  selectAllAvailable,
  toggleCrossPostSelection,
} from "./crossPostSelection";

const products = [
  ...Array.from({ length: 12 }, (_, index) => ({
    id: `p-${index + 1}`,
    status: "available",
  })),
  { id: "pending-product", status: "pending" },
];

describe("cross-post selection", () => {
  test("selects the first ten available products in display order", () => {
    expect(maxCrossPostProducts).toBe(10);
    expect(selectAllAvailable(products)).toEqual(
      Array.from({ length: 10 }, (_, index) => `p-${index + 1}`)
    );
  });

  test("reconciles selection with products that still exist and remain available", () => {
    expect(
      reconcileCrossPostSelection(
        ["p-3", "pending-product", "p-1", "missing", "p-3"],
        products
      )
    ).toEqual(["p-3", "p-1"]);
  });

  test("does not add an eleventh product", () => {
    const firstTenIds = Array.from(
      { length: 10 },
      (_, index) => `p-${index + 1}`
    );

    expect(toggleCrossPostSelection(firstTenIds, "p-11", true)).toEqual(
      firstTenIds
    );
  });

  test("adds a unique product and removes a selected product", () => {
    expect(toggleCrossPostSelection(["p-1"], "p-2", true)).toEqual([
      "p-1",
      "p-2",
    ]);
    expect(toggleCrossPostSelection(["p-1", "p-2"], "p-1", false)).toEqual([
      "p-2",
    ]);
    expect(toggleCrossPostSelection(["p-1"], "p-1", true)).toEqual(["p-1"]);
  });
});
