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

import ProductListPage, { generateMetadata } from "./page";

describe("Marketplace product list page", () => {
  test("uses the canonical marketplace URL for empty search parameters", async () => {
    const metadata = await generateMetadata({ searchParams: Promise.resolve({}) });

    expect(metadata.title).toContain("Oregon State Students");
    expect(metadata.title).not.toContain("Oregon State University");
    expect(metadata.alternates?.canonical).toBe("/overview");
    expect(metadata.robots).toBeUndefined();
  });

  test("keeps filtered marketplace URLs out of search indexes", async () => {
    const metadata = await generateMetadata({
      searchParams: Promise.resolve({ q: "desk", page: "2" }),
    });

    expect(metadata.alternates?.canonical).toBe("/overview");
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  test("uses the live product list for the initial marketplace page", async () => {
    mocks.listLivePublicProducts.mockResolvedValue([]);
    mocks.listPublicProducts.mockResolvedValue([]);

    await ProductListPage({ searchParams: Promise.resolve({ page: "1" }) });

    expect(mocks.listLivePublicProducts).toHaveBeenCalledOnce();
    expect(mocks.listPublicProducts).not.toHaveBeenCalled();
  });
});
