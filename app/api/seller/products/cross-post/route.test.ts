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
    "https://osutrade.example/api/seller/products/cross-post",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function productRow(id: string, name: string) {
  return {
    product_id: id,
    name,
    description: `${name} description`,
    name_en: name,
    name_zh_tw: `${name} 繁中`,
    name_zh_cn: `${name} 简中`,
    description_en: `${name} description`,
    description_zh_tw: `${name} 繁中描述`,
    description_zh_cn: `${name} 简中描述`,
    price: id === "p-1" ? 10 : 20,
    clearance_price: null,
    discount_percent: 0,
    effective_price: id === "p-1" ? 10 : 20,
    category: "home",
    image_url: null,
    image_urls: [],
    seller_id: "seller-1",
    status: "available",
    quantity: 1,
    contact_phone: "541-555-0101",
    contact_line_id: "private-line",
    contact_wechat_id: "private-wechat",
  };
}

function mockProductQuery(data: ReturnType<typeof productRow>[], error: unknown = null) {
  const query = {
    select: vi.fn(),
    in: vi.fn(),
    eq: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.eq
    .mockReturnValueOnce(query)
    .mockResolvedValueOnce({ data, error });
  const from = vi.fn().mockReturnValue(query);
  mocks.createAdminClient.mockReturnValue({ from });
  return { query, from };
}

describe("seller batch cross-post route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateCrossPostCopies.mockResolvedValue({
      source: "fallback",
      copies: [],
    });
  });

  test("rejects unauthenticated requests before querying products", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await POST(request({ productIds: ["p-1"] }));

    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  test("rejects empty and oversized selections", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });

    const emptyResponse = await POST(request({ productIds: [] }));
    const oversizedResponse = await POST(
      request({
        productIds: Array.from({ length: 11 }, (_, index) => `p-${index}`),
      })
    );

    expect(emptyResponse.status).toBe(400);
    expect(oversizedResponse.status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  test("queries unique available seller products and preserves requested order", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });
    const p1 = productRow("p-1", "Desk lamp");
    const p2 = productRow("p-2", "Mini fridge");
    const { query } = mockProductQuery([p1, p2]);

    const response = await POST(
      request({
        productIds: ["p-2", "p-1", "p-2"],
        productUrl: "https://attacker.example/not-used",
      })
    );

    expect(response.status).toBe(200);
    const selectedColumns = query.select.mock.calls[0]?.[0] as string;
    expect(selectedColumns).toContain("product_id");
    expect(selectedColumns).toContain("clearance_price");
    expect(selectedColumns).toContain("discount_percent");
    expect(selectedColumns).toContain("effective_price");
    expect(selectedColumns).not.toBe("*");
    expect(selectedColumns).not.toContain("contact_");
    expect(query.in).toHaveBeenCalledWith("product_id", ["p-2", "p-1"]);
    expect(query.eq).toHaveBeenNthCalledWith(1, "seller_id", "seller-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "status", "available");
    expect(mocks.generateCrossPostCopies).toHaveBeenCalledWith([
      {
        product: expect.objectContaining({ id: "p-2", name: "Mini fridge" }),
        productUrl: "https://osutrade.example/product/p-2",
      },
      {
        product: expect.objectContaining({ id: "p-1", name: "Desk lamp" }),
        productUrl: "https://osutrade.example/product/p-1",
      },
    ]);

    const generatedListings = mocks.generateCrossPostCopies.mock.calls[0]?.[0];
    expect(generatedListings[0].product).not.toHaveProperty("sellerContact");
    expect(JSON.stringify(generatedListings)).not.toContain("private-line");
  });

  test("uses clearance pricing in generated cross-post listings", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });
    const clearanceProduct = {
      ...productRow("p-1", "Desk lamp"),
      price: 10,
      clearance_price: 1,
      discount_percent: 20,
      effective_price: 10,
    };
    mockProductQuery([clearanceProduct]);

    const response = await POST(request({ productIds: ["p-1"] }));

    expect(response.status).toBe(200);
    expect(mocks.generateCrossPostCopies).toHaveBeenCalledWith([
      {
        product: expect.objectContaining({ id: "p-1", price: 1 }),
        productUrl: "https://osutrade.example/product/p-1",
      },
    ]);
  });

  test("rejects the full selection when any product is missing or stale", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });
    mockProductQuery([productRow("p-1", "Desk lamp")]);

    const response = await POST(
      request({ productIds: ["p-1", "missing-product"] })
    );

    expect(response.status).toBe(400);
    expect(mocks.generateCrossPostCopies).not.toHaveBeenCalled();
  });
});
