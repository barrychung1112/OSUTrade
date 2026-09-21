import { describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ createAdminClient: vi.fn() }));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { GET } from "./route";

const sellerId = "d4a7706c-21b9-4b39-b4f6-3d355b46c0d3";

function request(url = `https://osutrade.com/api/sellers/${sellerId}`) {
  return new NextRequest(url);
}

function sellerQuery(data: unknown, error = null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function productQuery(data: unknown[], count = data.length, error = null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    gt: vi.fn(),
    order: vi.fn(),
    range: vi.fn().mockResolvedValue({ data, count, error }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gt.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return query;
}

describe("public seller profile API", () => {
  test("returns only the seller display name and active in-stock listings", async () => {
    const seller = sellerQuery({ id: sellerId, name: "Campus Seller", email: "private@example.com" });
    const products = productQuery([
      {
        product_id: "desk-1",
        name: "Desk",
        price: 30,
        category: "home",
        image_url: null,
        seller_id: sellerId,
        status: "available",
        quantity: 1,
      },
    ]);
    const from = vi.fn().mockReturnValueOnce(seller).mockReturnValueOnce(products);
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await GET(request(), { params: Promise.resolve({ sellerId }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.seller).toEqual({ id: sellerId, name: "Campus Seller" });
    expect(payload).not.toHaveProperty("email");
    expect(payload.data[0]).toMatchObject({ id: "desk-1", sellerId });
    expect(payload.total).toBe(1);
    expect(products.eq).toHaveBeenCalledWith("seller_id", sellerId);
    expect(products.eq).toHaveBeenCalledWith("status", "available");
    expect(products.gt).toHaveBeenCalledWith("quantity", 0);
  });

  test("returns not found for an unknown or invalid seller", async () => {
    const seller = sellerQuery(null);
    mocks.createAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(seller) });

    const missingResponse = await GET(request(), {
      params: Promise.resolve({ sellerId }),
    });
    const invalidResponse = await GET(request("https://osutrade.com/api/sellers/not-a-uuid"), {
      params: Promise.resolve({ sellerId: "not-a-uuid" }),
    });

    expect(missingResponse.status).toBe(404);
    expect(invalidResponse.status).toBe(404);
  });
});
