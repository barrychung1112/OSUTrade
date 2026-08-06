import { describe, expect, test, vi } from "vitest";
import {
  applyProductClearanceFilter,
  isClearanceDiscoveryProduct,
} from "./productClearance";

describe("clearance discovery", () => {
  test("filters explicit clearance or an effective one-dollar price", () => {
    const query = { or: vi.fn().mockReturnThis() };

    expect(applyProductClearanceFilter(query)).toBe(query);
    expect(query.or).toHaveBeenCalledWith(
      "clearance_price.not.is.null,effective_price.eq.1"
    );
  });

  test("includes ordinary one-dollar products without marking them explicit clearance", () => {
    expect(
      isClearanceDiscoveryProduct({ price: 1, isClearance: false })
    ).toBe(true);
    expect(
      isClearanceDiscoveryProduct({ price: 5, isClearance: true })
    ).toBe(true);
    expect(
      isClearanceDiscoveryProduct({ price: 5, isClearance: false })
    ).toBe(false);
  });
});
