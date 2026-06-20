import { describe, expect, test } from "vitest";
import { canLoadMoreProducts } from "./productPagination";

describe("canLoadMoreProducts", () => {
  test("prevents loading more during replacement fetches", () => {
    expect(
      canLoadMoreProducts({
        hasMore: true,
        loading: true,
        loadingMore: false,
      })
    ).toBe(false);
  });

  test("allows loading more only when more products exist and no fetch is running", () => {
    expect(
      canLoadMoreProducts({
        hasMore: true,
        loading: false,
        loadingMore: false,
      })
    ).toBe(true);
  });
});
