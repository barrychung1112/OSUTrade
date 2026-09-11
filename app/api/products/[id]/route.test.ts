import { describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  canUseDemoProducts: vi.fn(),
  getPublicProduct: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/app/lib/demoProducts", () => ({
  canUseDemoProducts: mocks.canUseDemoProducts,
  findDemoProduct: vi.fn(),
}));
vi.mock("@/app/lib/publicProduct", () => ({
  getPublicProduct: mocks.getPublicProduct,
}));

import { GET } from "./route";

const request = new NextRequest("https://osutrade.example/api/products/p-1");

describe("public product API", () => {
  test("does not expose an unavailable product", async () => {
    mocks.canUseDemoProducts.mockReturnValue(false);
    mocks.getPublicProduct.mockResolvedValue(null);
    mocks.createClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                product_id: "p-1", name: "Sold desk", price: 20,
                category: "home", image_url: null, seller_id: "seller-1",
                status: "sold", quantity: 1,
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const response = await GET(request, { params: Promise.resolve({ id: "p-1" }) });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "Product not found." });
  });
});
