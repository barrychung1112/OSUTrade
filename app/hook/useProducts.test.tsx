import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchProducts: vi.fn(),
}));

vi.mock("../lib/products", () => ({
  fetchProducts: mocks.fetchProducts,
}));

import { useProducts } from "./useProducts";

describe("useProducts", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("loads the requested URL page with the configured page size", async () => {
    mocks.fetchProducts.mockResolvedValue({
      data: [{ id: "product-41", name: "Desk", price: 10 }],
      total: 82,
      page: 3,
      limit: 20,
    });

    const { result } = renderHook(() =>
      useProducts({ page: 3, limit: 20 } as any)
    );

    await waitFor(() =>
      expect(mocks.fetchProducts).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3, limit: 20 })
      )
    );

    await waitFor(() =>
      expect(result.current.products).toEqual([
        expect.objectContaining({ id: "product-41" }),
      ])
    );
    expect(result.current.page).toBe(3);
  });

  test("uses a server-provided listing page without fetching again on mount", () => {
    const { result } = renderHook(() =>
      useProducts(
        { page: 2, limit: 20 },
        {
          data: [{ id: "product-21", name: "Desk", price: 10 }],
          total: 82,
          page: 2,
          limit: 20,
        }
      )
    );

    expect(result.current.products).toEqual([
      expect.objectContaining({ id: "product-21" }),
    ]);
    expect(mocks.fetchProducts).not.toHaveBeenCalled();
  });
});
