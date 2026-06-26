import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createAdminClient: vi.fn(),
  generateCrossPostCopies: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/app/lib/crossPostCopy", () => ({
  generateCrossPostCopies: mocks.generateCrossPostCopies,
}));

import { POST } from "./route";

function request(body: Record<string, unknown> = {}) {
  return new NextRequest(
    "https://osutrade.example/api/seller/products/product-1/cross-post",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("seller cross-post route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unauthenticated requests before querying products", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await POST(request(), {
      params: Promise.resolve({ id: "product-1" }),
    });

    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  test("loads only the seller-owned product and builds its canonical URL", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });
    const single = vi.fn().mockResolvedValue({
      data: {
        product_id: "product-1",
        name: "Desk lamp",
        description: "Good condition",
        price: 18,
        category: "home",
        image_url: null,
        seller_id: "seller-1",
        status: "available",
        quantity: 1,
        contact_phone: "541-555-0142",
        contact_line_id: null,
        contact_wechat_id: null,
      },
      error: null,
    });
    const eq = vi.fn();
    eq.mockReturnValueOnce({ eq }).mockReturnValueOnce({ single });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select }),
    });
    mocks.generateCrossPostCopies.mockResolvedValue({
      source: "fallback",
      copies: [],
    });

    const response = await POST(
      request({
        includeContactInfo: true,
        productUrl: "https://attacker.example/not-the-listing",
      }),
      { params: Promise.resolve({ id: "product-1" }) }
    );

    expect(response.status).toBe(200);
    expect(eq).toHaveBeenNthCalledWith(1, "product_id", "product-1");
    expect(eq).toHaveBeenNthCalledWith(2, "seller_id", "seller-1");
    expect(mocks.generateCrossPostCopies).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "product-1",
        sellerId: "seller-1",
        sellerContact: expect.objectContaining({ phone: "541-555-0142" }),
      }),
      {
        includeContactInfo: true,
        productUrl: "https://osutrade.example/product/product-1",
      }
    );
  });
});
