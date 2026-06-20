import { describe, expect, test, vi } from "vitest";
import { applyProductListSort } from "./productSort";

function createQuery() {
  return {
    order: vi.fn(function order() {
      return this;
    }),
  };
}

describe("applyProductListSort", () => {
  test("uses newest first as the stable default order", () => {
    const query = createQuery();

    applyProductListSort(query, null);

    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(query.order).toHaveBeenCalledWith("product_id", { ascending: false });
  });

  test("adds stable secondary ordering for price sorts", () => {
    const query = createQuery();

    applyProductListSort(query, "asc");

    expect(query.order).toHaveBeenNthCalledWith(1, "price", {
      ascending: true,
    });
    expect(query.order).toHaveBeenNthCalledWith(2, "created_at", {
      ascending: false,
    });
    expect(query.order).toHaveBeenNthCalledWith(3, "product_id", {
      ascending: false,
    });
  });
});
