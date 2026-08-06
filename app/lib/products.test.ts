import { afterEach, describe, expect, test, vi } from "vitest";
import { fetchProducts } from "./products";

const mockFetch = vi.fn();

global.fetch = mockFetch;

describe("fetchProducts", () => {
  afterEach(() => {
    mockFetch.mockReset();
  });

  test("passes pagination and filter options to the products API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ id: "monitor", name: "Monitor", price: 30 }],
        total: 27,
        page: 2,
        limit: 12,
      }),
    });

    const result = await fetchProducts({
      page: 2,
      limit: 12,
      name: "monitor arm",
      category: "electronics",
      sort: "asc",
      discounted: true,
      clearance: true,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/products?page=2&limit=12&name=monitor+arm&category=electronics&sort=asc&discounted=true&clearance=true",
      expect.objectContaining({ cache: "no-store" })
    );
    expect(result).toMatchObject({
      data: [{ id: "monitor" }],
      total: 27,
      page: 2,
      limit: 12,
    });
  });
});
