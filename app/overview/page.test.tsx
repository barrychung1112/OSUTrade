import { describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listPublicProducts: vi.fn(),
  listLivePublicProducts: vi.fn(),
}));

vi.mock("../lib/publicProduct", () => ({
  listPublicProducts: mocks.listPublicProducts,
  listLivePublicProducts: mocks.listLivePublicProducts,
}));

vi.mock("./MarketplaceClient", () => ({
  default: () => null,
}));

import ProductListPage from "./page";

describe("Marketplace product list page", () => {
  test("uses the live product list for the initial marketplace page", async () => {
    mocks.listLivePublicProducts.mockResolvedValue([]);
    mocks.listPublicProducts.mockResolvedValue([]);

    await ProductListPage({ searchParams: Promise.resolve({ page: "1" }) });

    expect(mocks.listLivePublicProducts).toHaveBeenCalledOnce();
    expect(mocks.listPublicProducts).not.toHaveBeenCalled();
  });
});
